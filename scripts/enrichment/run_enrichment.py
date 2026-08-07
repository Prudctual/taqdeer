#!/usr/bin/env python3
"""عفريت إثراء مجاني بطبقات A–E — يعمل خفيفاً على السيرفر 24 ساعة."""

from __future__ import annotations

import csv
import io
import json
import os
import sqlite3
import sys
import time
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(ROOT / "python"))

from fotmob_client import (  # noqa: E402
    LEAGUE_PRIMARY,
    extract_enrichment,
    match_details,
    matches_by_date,
)
from name_match import names_match, slugify as _slug  # noqa: E402
from team_matcher import get_mapped, put_mapped  # noqa: E402
from engine.sharp_market import detect_steam  # noqa: E402
from engine.weather_engine import weather_goal_multiplier  # noqa: E402

DB_PATH = os.environ.get("DATABASE_URL", "file:./data/taqdeer.db")
if DB_PATH.startswith("file:"):
    DB_PATH = DB_PATH[5:]
if not os.path.isabs(DB_PATH):
    DB_PATH = str(ROOT / DB_PATH.lstrip("./"))

LOCK_PATH = Path(os.environ.get("TAQDEER_ENRICH_LOCK", str(ROOT / "data" / "enrich.lock")))
STADIUMS_PATH = ROOT / "scripts" / "data" / "stadiums.json"
# كاش دائم تحت data/ — لا يُمسح مع /tmp في النشر
os.environ.setdefault("TAQDEER_ENRICH_CACHE", str(ROOT / "data" / "enrich-cache"))
META_PREFIX = "enrich_"

# فترات الطبقات (ثوانٍ)
INTERVAL_A = int(os.environ.get("ENRICH_INTERVAL_A", str(45 * 60)))
INTERVAL_B = int(os.environ.get("ENRICH_INTERVAL_B", str(2 * 3600)))
INTERVAL_C = int(os.environ.get("ENRICH_INTERVAL_C", str(3 * 3600)))
INTERVAL_D = int(os.environ.get("ENRICH_INTERVAL_D", str(18 * 60)))
INTERVAL_E = int(os.environ.get("ENRICH_INTERVAL_E", str(24 * 3600)))
LOOP_SLEEP = int(os.environ.get("ENRICH_LOOP_SLEEP", "60"))
ONCE = "--once" in sys.argv


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().strftime("%Y-%m-%dT%H:%M:%SZ")


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=10000")
    _ensure_schema(conn)
    return conn


def _ensure_schema(conn: sqlite3.Connection) -> None:
    """جداول الإثراء إن شغّل العفريت قبل migrate JS."""
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS match_enrichment (
          match_id TEXT PRIMARY KEY,
          weather_temp_c REAL,
          weather_precip_mm REAL,
          weather_wind_kmh REAL,
          weather_multiplier REAL,
          weather_summary TEXT,
          lineup_json TEXT,
          lineup_confirmed INTEGER NOT NULL DEFAULT 0,
          steam_side TEXT,
          steam_magnitude REAL,
          sofascore_event_id TEXT,
          source TEXT,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS player_availability (
          id TEXT PRIMARY KEY,
          team_id TEXT NOT NULL,
          match_id TEXT,
          player_name TEXT NOT NULL,
          position TEXT,
          status TEXT NOT NULL,
          reason TEXT,
          source TEXT NOT NULL DEFAULT 'sofascore',
          as_of TEXT NOT NULL,
          UNIQUE(team_id, match_id, player_name)
        );
        CREATE TABLE IF NOT EXISTS referee_profiles (
          name TEXT PRIMARY KEY,
          matches_n INTEGER NOT NULL DEFAULT 0,
          avg_yellows REAL NOT NULL DEFAULT 0,
          avg_reds REAL NOT NULL DEFAULT 0,
          strictness REAL NOT NULL DEFAULT 1.0,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS external_id_map (
          source TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          local_id TEXT NOT NULL,
          external_id TEXT NOT NULL,
          label TEXT,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (source, entity_type, local_id)
        );
        CREATE TABLE IF NOT EXISTS app_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        """
    )
    # أعمدة بطاقات إن نقصت
    cols = {r[1] for r in conn.execute("PRAGMA table_info(matches)").fetchall()}
    for name, typ in (
        ("yellow_home", "INTEGER"),
        ("yellow_away", "INTEGER"),
        ("red_home", "INTEGER"),
        ("red_away", "INTEGER"),
        ("odds_open_home", "REAL"),
        ("odds_open_draw", "REAL"),
        ("odds_open_away", "REAL"),
        ("referee_name", "TEXT"),
    ):
        if name not in cols:
            try:
                conn.execute(f"ALTER TABLE matches ADD COLUMN {name} {typ}")
            except Exception:
                pass
    conn.commit()


def meta_get(conn: sqlite3.Connection, key: str) -> float:
    row = conn.execute("SELECT value FROM app_meta WHERE key=?", (META_PREFIX + key,)).fetchone()
    if not row:
        return 0.0
    try:
        return float(row[0])
    except Exception:
        return 0.0


def meta_set(conn: sqlite3.Connection, key: str, value: float | str) -> None:
    conn.execute(
        """
        INSERT INTO app_meta(key, value) VALUES (?,?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
        """,
        (META_PREFIX + key, str(value)),
    )
    conn.commit()


def due(conn: sqlite3.Connection, key: str, interval: int) -> bool:
    return (time.time() - meta_get(conn, key)) >= interval


class FileLock:
    def __init__(self, path: Path):
        self.path = path
        self.fd = None

    def acquire(self) -> bool:
        import fcntl

        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.fd = open(self.path, "w")
        try:
            fcntl.flock(self.fd.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.fd.write(str(os.getpid()))
            self.fd.flush()
            return True
        except BlockingIOError:
            self.fd.close()
            self.fd = None
            return False

    def release(self) -> None:
        if self.fd:
            import fcntl

            fcntl.flock(self.fd.fileno(), fcntl.LOCK_UN)
            self.fd.close()
            self.fd = None


def load_stadiums() -> dict:
    if not STADIUMS_PATH.exists():
        return {}
    return json.loads(STADIUMS_PATH.read_text(encoding="utf-8"))


def upsert_enrichment(conn: sqlite3.Connection, match_id: str, **fields) -> None:
    row = conn.execute("SELECT match_id FROM match_enrichment WHERE match_id=?", (match_id,)).fetchone()
    fields["updated_at"] = now_iso()
    if not row:
        cols = ["match_id"] + list(fields.keys())
        placeholders = ",".join("?" * len(cols))
        conn.execute(
            f"INSERT INTO match_enrichment ({','.join(cols)}) VALUES ({placeholders})",
            [match_id, *fields.values()],
        )
    else:
        sets = ", ".join(f"{k}=?" for k in fields)
        conn.execute(
            f"UPDATE match_enrichment SET {sets} WHERE match_id=?",
            [*fields.values(), match_id],
        )


# --- Tier A: odds CSV + steam ---
UK_FIXTURES = "https://www.football-data.co.uk/fixtures.csv"
# Div codes → league ids
DIV_TO_LEAGUE = {
    "E0": "pl",
    "SP1": "pd",
    "D1": "bl1",
    "I1": "sa",
    "F1": "fl1",
    "P1": "ppd",
    "N1": "ded",
    "T1": "tur1",
}


def _norm_csv_row(r: dict) -> dict:
    return {(k or "").lstrip("\ufeff").strip(): v for k, v in r.items()}


def tier_a_odds_steam(conn: sqlite3.Connection) -> None:
    print("[A] fixtures.csv + steam…", flush=True)
    try:
        with urllib.request.urlopen(UK_FIXTURES, timeout=40) as resp:
            text = resp.read().decode("utf-8-sig", errors="replace")
    except Exception as e:
        print(f"  [A] fetch failed: {e}", flush=True)
        meta_set(conn, "tier_a", time.time())
        return

    reader = csv.DictReader(io.StringIO(text))
    updated = 0
    for raw in reader:
        r = _norm_csv_row(raw)
        div = (r.get("Div") or "").strip()
        lid = DIV_TO_LEAGUE.get(div)
        if not lid:
            continue
        home = r.get("HomeTeam") or r.get("Home")
        away = r.get("AwayTeam") or r.get("Away")
        date_raw = r.get("Date")
        if not home or not away or not date_raw:
            continue

        def num(k: str):
            v = r.get(k)
            if v is None or v == "":
                return None
            try:
                return float(v)
            except Exception:
                return None

        # open = book (PS/B365/PP); current = market Avg (fallback book)
        open_csv_h = num("PSH") or num("B365H") or num("PPH")
        open_csv_d = num("PSD") or num("B365D") or num("PPD")
        open_csv_a = num("PSA") or num("B365A") or num("PPA")
        oh = num("AvgH") or open_csv_h
        od = num("AvgD") or open_csv_d
        oa = num("AvgA") or open_csv_a
        if not oh or not od or not oa:
            continue
        book_h = open_csv_h or oh
        book_d = open_csv_d or od
        book_a = open_csv_a or oa

        rows = conn.execute(
            """
            SELECT m.id, m.home_team_id, m.away_team_id, t1.name_en AS hn, t2.name_en AS an,
                   m.odds_home, m.odds_draw, m.odds_away,
                   m.odds_open_home, m.odds_open_draw, m.odds_open_away
            FROM matches m
            JOIN teams t1 ON t1.id = m.home_team_id
            JOIN teams t2 ON t2.id = m.away_team_id
            WHERE m.league_id=? AND m.status IN ('SCHEDULED','TIMED')
              AND datetime(m.utc_date) >= datetime('now', '-1 day')
            """,
            (lid,),
        ).fetchall()

        match_row = None
        for m in rows:
            if names_match(m["hn"], home) and names_match(m["an"], away):
                match_row = m
                break
        if not match_row:
            continue

        mid = match_row["id"]
        # Freeze open once from book; repair rows frozen as Avg when book differs
        conn.execute(
            """
            UPDATE matches SET
              odds_home=?, odds_draw=?, odds_away=?,
              odds_open_home = CASE
                WHEN odds_open_home IS NULL THEN ?
                WHEN ABS(odds_open_home - ?) < 1e-9
                     AND ABS(odds_open_home - ?) >= 1e-9 THEN ?
                ELSE odds_open_home
              END,
              odds_open_draw = CASE
                WHEN odds_open_draw IS NULL THEN ?
                WHEN ABS(odds_open_draw - ?) < 1e-9
                     AND ABS(odds_open_draw - ?) >= 1e-9 THEN ?
                ELSE odds_open_draw
              END,
              odds_open_away = CASE
                WHEN odds_open_away IS NULL THEN ?
                WHEN ABS(odds_open_away - ?) < 1e-9
                     AND ABS(odds_open_away - ?) >= 1e-9 THEN ?
                ELSE odds_open_away
              END
            WHERE id=?
            """,
            (
                oh, od, oa,
                book_h, oh, book_h, book_h,
                book_d, od, book_d, book_d,
                book_a, oa, book_a, book_a,
                mid,
            ),
        )
        frozen = conn.execute(
            "SELECT odds_open_home, odds_open_draw, odds_open_away FROM matches WHERE id=?",
            (mid,),
        ).fetchone()
        use_open = (
            float(frozen["odds_open_home"] if frozen["odds_open_home"] is not None else book_h),
            float(frozen["odds_open_draw"] if frozen["odds_open_draw"] is not None else book_d),
            float(frozen["odds_open_away"] if frozen["odds_open_away"] is not None else book_a),
        )
        steam = detect_steam(use_open, (oh, od, oa))
        upsert_enrichment(
            conn,
            mid,
            steam_side=steam.get("side"),
            steam_magnitude=steam.get("magnitude"),
            source="football-data.co.uk",
        )
        updated += 1

    conn.commit()
    print(f"  [A] odds/steam updated: {updated}", flush=True)
    meta_set(conn, "tier_a", time.time())


# --- Tier B: weather ---
def fetch_open_meteo(lat: float, lon: float, kickoff: datetime) -> dict | None:
    # ساعة المباراة
    start = kickoff.strftime("%Y-%m-%d")
    url = (
        "https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        "&hourly=temperature_2m,precipitation,windspeed_10m"
        f"&start_date={start}&end_date={start}&timezone=UTC"
    )
    try:
        with urllib.request.urlopen(url, timeout=25) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        print(f"  [B] meteo fail: {e}", flush=True)
        return None
    hourly = data.get("hourly") or {}
    times = hourly.get("time") or []
    temps = hourly.get("temperature_2m") or []
    precip = hourly.get("precipitation") or []
    wind = hourly.get("windspeed_10m") or []
    if not times:
        return None
    # أقرب ساعة
    target = kickoff.replace(minute=0, second=0, microsecond=0)
    best_i = 0
    best_d = 10**9
    for i, t in enumerate(times):
        try:
            dt = datetime.fromisoformat(t).replace(tzinfo=timezone.utc)
        except Exception:
            continue
        d = abs((dt - target).total_seconds())
        if d < best_d:
            best_d = d
            best_i = i
    return {
        "temp_c": temps[best_i] if best_i < len(temps) else None,
        "precip_mm": precip[best_i] if best_i < len(precip) else None,
        "wind_kmh": wind[best_i] if best_i < len(wind) else None,
    }


def tier_b_weather(conn: sqlite3.Connection) -> None:
    print("[B] Open-Meteo weather…", flush=True)
    stadiums = load_stadiums()
    rows = conn.execute(
        """
        SELECT id, home_team_id, utc_date FROM matches
        WHERE status IN ('SCHEDULED','TIMED')
          AND datetime(utc_date) BETWEEN datetime('now') AND datetime('now', '+8 days')
        ORDER BY utc_date
        """
    ).fetchall()
    n = 0
    for m in rows:
        coords = stadiums.get(m["home_team_id"])
        if not coords:
            # جرّب بدون بادئة دوري جزئياً
            for k, v in stadiums.items():
                if k.endswith(m["home_team_id"].split("-", 1)[-1]) or m["home_team_id"] in k:
                    coords = v
                    break
        if not coords:
            continue
        try:
            ko = datetime.fromisoformat(m["utc_date"].replace("Z", "+00:00"))
        except Exception:
            continue
        w = fetch_open_meteo(float(coords["lat"]), float(coords["lon"]), ko)
        if not w:
            continue
        mult = weather_goal_multiplier(
            temp_c=w.get("temp_c"),
            precip_mm=w.get("precip_mm"),
            wind_kmh=w.get("wind_kmh"),
        )
        parts = []
        if w.get("temp_c") is not None:
            parts.append(f"{w['temp_c']:.0f}°C")
        if w.get("precip_mm") is not None:
            parts.append(f"مطر {w['precip_mm']:.1f}مم")
        if w.get("wind_kmh") is not None:
            parts.append(f"رياح {w['wind_kmh']:.0f}كم/س")
        upsert_enrichment(
            conn,
            m["id"],
            weather_temp_c=w.get("temp_c"),
            weather_precip_mm=w.get("precip_mm"),
            weather_wind_kmh=w.get("wind_kmh"),
            weather_multiplier=mult,
            weather_summary=" · ".join(parts) if parts else None,
            source="open-meteo",
        )
        n += 1
        time.sleep(0.15)
    conn.commit()
    print(f"  [B] weather rows: {n}", flush=True)
    meta_set(conn, "tier_b", time.time())


# --- FotMob matching helpers ---
def find_local_match_for_fotmob(
    conn: sqlite3.Connection,
    fm: dict,
) -> sqlite3.Row | None:
    league_id = fm.get("league_id")
    if not league_id:
        return None
    utc = fm.get("utc_time") or ""
    day = utc[:10] if utc else now_utc().strftime("%Y-%m-%d")

    row = conn.execute(
        """
        SELECT m.* FROM match_enrichment e
        JOIN matches m ON m.id = e.match_id
        WHERE e.sofascore_event_id = ?
        LIMIT 1
        """,
        (str(fm.get("fotmob_id")),),
    ).fetchone()
    if row:
        return row

    hn, an = fm.get("home_name") or "", fm.get("away_name") or ""
    rows = conn.execute(
        """
        SELECT m.*, t1.name_en AS hn, t2.name_en AS an
        FROM matches m
        JOIN teams t1 ON t1.id=m.home_team_id
        JOIN teams t2 ON t2.id=m.away_team_id
        WHERE m.league_id=?
          AND m.status IN ('SCHEDULED','TIMED','IN_PLAY','PAUSED')
          AND substr(m.utc_date,1,10) BETWEEN date(?, '-1 day') AND date(?, '+1 day')
        """,
        (league_id, day, day),
    ).fetchall()
    for m in rows:
        if names_match(m["hn"], hn) and names_match(m["an"], an):
            if fm.get("home_id"):
                put_mapped(conn, "team", m["home_team_id"], str(fm["home_id"]), hn)
            if fm.get("away_id"):
                put_mapped(conn, "team", m["away_team_id"], str(fm["away_id"]), an)
            return m
    return None


def apply_fotmob_to_match(
    conn: sqlite3.Connection,
    match: sqlite3.Row,
    fotmob_id: int,
    details: dict,
) -> bool:
    parsed = extract_enrichment(details)
    home_side = parsed["home"]
    away_side = parsed["away"]
    confirmed = bool(parsed["confirmed"])
    payload = {
        "confirmed": confirmed,
        "home": home_side,
        "away": away_side,
        "fotmob_id": fotmob_id,
    }
    fields: dict = {
        "lineup_json": json.dumps(payload, ensure_ascii=False),
        "lineup_confirmed": 1 if confirmed else 0,
        "sofascore_event_id": str(fotmob_id),  # عمود عام لمعرّف خارجي
        "source": "fotmob",
    }
    w = parsed.get("weather") or {}
    if w.get("temp_c") is not None or w.get("summary"):
        mult = weather_goal_multiplier(
            temp_c=w.get("temp_c"),
            precip_mm=w.get("precip_mm"),
            wind_kmh=w.get("wind_kmh"),
        )
        fields.update(
            {
                "weather_temp_c": w.get("temp_c"),
                "weather_precip_mm": w.get("precip_mm"),
                "weather_wind_kmh": w.get("wind_kmh"),
                "weather_multiplier": mult,
                "weather_summary": w.get("summary"),
            }
        )
    upsert_enrichment(conn, match["id"], **fields)
    put_mapped(conn, "event", match["id"], str(fotmob_id), "fotmob")

    conn.execute("DELETE FROM player_availability WHERE match_id=?", (match["id"],))
    as_of = now_iso()
    for team_id, missing in (
        (match["home_team_id"], home_side["missing"]),
        (match["away_team_id"], away_side["missing"]),
    ):
        for mp in missing:
            conn.execute(
                """
                INSERT INTO player_availability
                  (id, team_id, match_id, player_name, position, status, reason, source, as_of)
                VALUES (?,?,?,?,?,?,?,?,?)
                ON CONFLICT(team_id, match_id, player_name) DO UPDATE SET
                  status=excluded.status,
                  reason=excluded.reason,
                  position=excluded.position,
                  as_of=excluded.as_of
                """,
                (
                    str(uuid.uuid4()),
                    team_id,
                    match["id"],
                    mp["player_name"],
                    mp.get("position"),
                    mp["status"],
                    mp.get("reason"),
                    "fotmob",
                    as_of,
                ),
            )

    ref = parsed.get("referee")
    if isinstance(ref, str) and ref.strip():
        conn.execute(
            "UPDATE matches SET referee_name=COALESCE(referee_name, ?) WHERE id=?",
            (ref.strip(), match["id"]),
        )
    elif isinstance(ref, dict) and ref.get("name"):
        conn.execute(
            "UPDATE matches SET referee_name=COALESCE(referee_name, ?) WHERE id=?",
            (ref["name"], match["id"]),
        )
    return confirmed


def iter_fotmob_matches(days: int = 8):
    """اليوم + (days-1) أيام قادمة — يغطي نافذة SQL لـ 7 أيام كاملة."""
    today = now_utc().date()
    for i in range(days):
        d = (today + timedelta(days=i)).strftime("%Y%m%d")
        for fm in matches_by_date(d):
            yield fm


def tier_c_injuries(conn: sqlite3.Connection) -> None:
    print("[C] FotMob injuries/missing (8d window)…", flush=True)
    n = 0
    errors = 0
    seen = set()
    for fm in iter_fotmob_matches(8):
        fid = fm.get("fotmob_id")
        if not fid or fid in seen:
            continue
        seen.add(fid)
        local = find_local_match_for_fotmob(conn, fm)
        if not local:
            continue
        details = match_details(fid, ttl_sec=1800)
        if not details:
            errors += 1
            continue
        apply_fotmob_to_match(conn, local, int(fid), details)
        n += 1
    conn.commit()
    print(f"  [C] fotmob applied: {n} (detail_misses={errors}) leagues={len(LEAGUE_PRIMARY)}", flush=True)
    meta_set(conn, "tier_c", time.time())


def tier_d_lineups_imminent(conn: sqlite3.Connection) -> None:
    print("[D] FotMob confirmed lineups T-6h…", flush=True)
    rows = conn.execute(
        """
        SELECT m.id, m.league_id, m.home_team_id, m.away_team_id, m.utc_date,
               e.sofascore_event_id, e.lineup_confirmed
        FROM matches m
        LEFT JOIN match_enrichment e ON e.match_id = m.id
        WHERE m.status IN ('SCHEDULED','TIMED')
          AND datetime(m.utc_date) BETWEEN datetime('now') AND datetime('now', '+6 hours')
        ORDER BY m.utc_date
        """
    ).fetchall()
    newly_confirmed = []
    # فهرس fotmob لليوم
    fm_by_local: dict[str, int] = {}
    for fm in iter_fotmob_matches(1):
        local = find_local_match_for_fotmob(conn, fm)
        if local and fm.get("fotmob_id"):
            fm_by_local[local["id"]] = int(fm["fotmob_id"])

    for m in rows:
        fid = m["sofascore_event_id"] or fm_by_local.get(m["id"])
        if not fid:
            continue
        details = match_details(fid, ttl_sec=120, force=True)
        if not details:
            continue
        was = int(m["lineup_confirmed"] or 0)
        confirmed = apply_fotmob_to_match(conn, m, int(fid), details)
        if confirmed and not was:
            newly_confirmed.append(m["id"])
    conn.commit()
    print(f"  [D] imminent checked={len(rows)} newly_confirmed={len(newly_confirmed)}", flush=True)
    if newly_confirmed:
        meta_set(conn, "enrich_repredict_matches", ",".join(newly_confirmed))
        print(f"  [D] flag repredict: {newly_confirmed[:5]}", flush=True)
        # إعادة توقع فورية خفيفة (لا walk-forward)
        try:
            import subprocess

            subprocess.run(
                [
                    str(ROOT / ".venv" / "bin" / "python"),
                    str(ROOT / "scripts" / "fit-and-predict.py"),
                    "--repredict-flagged",
                ],
                cwd=str(ROOT),
                timeout=600,
                check=False,
            )
        except Exception as e:
            print(f"  [D] narrow repredict spawn failed: {e}", flush=True)
    meta_set(conn, "tier_d", time.time())


def tier_e_referees(conn: sqlite3.Connection) -> None:
    print("[E] rebuild referee_profiles…", flush=True)
    rows = conn.execute(
        """
        SELECT referee_name AS name,
               COUNT(*) AS n,
               AVG(COALESCE(yellow_home,0)+COALESCE(yellow_away,0)) AS avg_y,
               AVG(COALESCE(red_home,0)+COALESCE(red_away,0)) AS avg_r
        FROM matches
        WHERE status='FINISHED' AND referee_name IS NOT NULL AND trim(referee_name) != ''
          AND (yellow_home IS NOT NULL OR yellow_away IS NOT NULL)
        GROUP BY referee_name
        """
    ).fetchall()
    ts = now_iso()
    for r in rows:
        avg_y = float(r["avg_y"] or 0)
        avg_r = float(r["avg_r"] or 0)
        strict = (avg_y / 4.0) if avg_y > 0 else 1.0
        conn.execute(
            """
            INSERT INTO referee_profiles(name, matches_n, avg_yellows, avg_reds, strictness, updated_at)
            VALUES (?,?,?,?,?,?)
            ON CONFLICT(name) DO UPDATE SET
              matches_n=excluded.matches_n,
              avg_yellows=excluded.avg_yellows,
              avg_reds=excluded.avg_reds,
              strictness=excluded.strictness,
              updated_at=excluded.updated_at
            """,
            (r["name"], int(r["n"]), avg_y, avg_r, strict, ts),
        )
    conn.commit()
    print(f"  [E] referee profiles: {len(rows)}", flush=True)
    meta_set(conn, "tier_e", time.time())


def run_cycle(force_all: bool = False) -> None:
    conn = connect()
    try:
        if force_all or due(conn, "tier_a", INTERVAL_A):
            tier_a_odds_steam(conn)
        if force_all or due(conn, "tier_b", INTERVAL_B):
            tier_b_weather(conn)
        if force_all or due(conn, "tier_c", INTERVAL_C):
            tier_c_injuries(conn)
        if force_all or due(conn, "tier_d", INTERVAL_D):
            tier_d_lineups_imminent(conn)
        if force_all or due(conn, "tier_e", INTERVAL_E):
            tier_e_referees(conn)
    finally:
        conn.close()


def main() -> None:
    lock = FileLock(LOCK_PATH)
    if not lock.acquire():
        print("enrichment already running — exit", flush=True)
        return
    try:
        print(f"taqdeer-enrich start db={DB_PATH} once={ONCE}", flush=True)
        if ONCE:
            run_cycle(force_all=True)
            return
        while True:
            try:
                run_cycle(force_all=False)
            except Exception as e:
                print(f"enrich cycle error: {e}", flush=True)
            time.sleep(LOOP_SLEEP)
    finally:
        lock.release()


if __name__ == "__main__":
    main()
