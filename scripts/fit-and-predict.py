#!/usr/bin/env python3
"""Pitchlab v2: Dixon-Coles + Pi-ratings + Elo + Form + Market + temperature calibration."""

from __future__ import annotations

import json
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(line_buffering=True)

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))

MAX_TRAIN = 1000
HALF_LIFE = 140.0
MODEL_VERSION = "ensemble-v3"

from engine.calibrate import apply_temperature, fit_temperature, odds_to_probs  # noqa: E402
from engine.dixon_coles import MatchObs, fit_dixon_coles, top_scores  # noqa: E402
from engine.elo import EloMatch, update_elo  # noqa: E402
from engine.ensemble import (  # noqa: E402
    blend_components,
    fit_weights,
    predict_match,
    value_signal,
)
from engine.evaluate import summarize  # noqa: E402
from engine.form import FormMatch, TeamForm, rolling_form  # noqa: E402
from engine.pi_ratings import PiMatch, update_pi  # noqa: E402
from engine.xg_engine import compute_advanced_metrics  # noqa: E402


DB_PATH = ROOT / "data" / "taqdeer.db"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_live_enrichment(conn: sqlite3.Connection, match_id: str, referee_name: str | None) -> dict:
    """إشارات حية للمباريات القادمة فقط — لا تُستخدم في walk-forward التاريخي."""
    out: dict = {
        "weather": None,
        "home_missing": None,
        "away_missing": None,
        "referee_profile": None,
        "open_odds": None,
    }
    mrow = conn.execute(
        """
        SELECT odds_open_home, odds_open_draw, odds_open_away, home_team_id, away_team_id
        FROM matches WHERE id=?
        """,
        (match_id,),
    ).fetchone()
    if mrow and mrow["odds_open_home"] and mrow["odds_open_draw"] and mrow["odds_open_away"]:
        out["open_odds"] = (
            float(mrow["odds_open_home"]),
            float(mrow["odds_open_draw"]),
            float(mrow["odds_open_away"]),
        )

    try:
        erow = conn.execute(
            """
            SELECT weather_temp_c, weather_precip_mm, weather_wind_kmh, weather_multiplier
            FROM match_enrichment WHERE match_id=?
            """,
            (match_id,),
        ).fetchone()
    except sqlite3.OperationalError:
        erow = None

    if erow and (
        erow["weather_temp_c"] is not None
        or erow["weather_precip_mm"] is not None
        or erow["weather_wind_kmh"] is not None
        or erow["weather_multiplier"] is not None
    ):
        out["weather"] = {
            "temp_c": erow["weather_temp_c"],
            "precip_mm": erow["weather_precip_mm"],
            "wind_kmh": erow["weather_wind_kmh"],
            "multiplier": erow["weather_multiplier"],
        }

    try:
        missing = conn.execute(
            """
            SELECT team_id, player_name, position, status, reason
            FROM player_availability WHERE match_id=?
            """,
            (match_id,),
        ).fetchall()
    except sqlite3.OperationalError:
        missing = []
    if missing and mrow:
        out["home_missing"] = [
            dict(r)
            for r in missing
            if r["team_id"] == mrow["home_team_id"]
        ]
        out["away_missing"] = [
            dict(r)
            for r in missing
            if r["team_id"] == mrow["away_team_id"]
        ]

    if referee_name:
        try:
            pref = conn.execute(
                """
                SELECT name, matches_n, avg_yellows, avg_reds, strictness
                FROM referee_profiles WHERE name=?
                """,
                (referee_name,),
            ).fetchone()
        except sqlite3.OperationalError:
            pref = None
        if pref:
            out["referee_profile"] = dict(pref)

    return out


def ensure_columns(conn: sqlite3.Connection) -> None:
    cols = {r[1] for r in conn.execute("PRAGMA table_info(matches)")}
    for name, typ in [
        ("odds_home", "REAL"),
        ("odds_draw", "REAL"),
        ("odds_away", "REAL"),
        ("shots_home", "REAL"),
        ("shots_away", "REAL"),
        ("sot_home", "REAL"),
        ("sot_away", "REAL"),
        ("fouls_home", "REAL"),
        ("fouls_away", "REAL"),
        ("corners_home", "REAL"),
        ("corners_away", "REAL"),
        ("xg_home", "REAL"),
        ("xg_away", "REAL"),
        ("xa_home", "REAL"),
        ("xa_away", "REAL"),
        ("ppda_home", "REAL"),
        ("ppda_away", "REAL"),
        ("odds_open_home", "REAL"),
        ("odds_open_draw", "REAL"),
        ("odds_open_away", "REAL"),
        ("referee_name", "TEXT"),
    ]:
        if name not in cols:
            conn.execute(f"ALTER TABLE matches ADD COLUMN {name} {typ}")
    pcols = {r[1] for r in conn.execute("PRAGMA table_info(predictions)")}
    for name, typ in [
        ("analytics_json", "TEXT"),
        ("xpts_home", "REAL"),
        ("xpts_away", "REAL"),
        ("market_home", "REAL"),
        ("market_draw", "REAL"),
        ("market_away", "REAL"),
    ]:
        if name not in pcols:
            conn.execute(f"ALTER TABLE predictions ADD COLUMN {name} {typ}")
    mcols = {r[1] for r in conn.execute("PRAGMA table_info(model_metrics)")}
    if "model_version" not in mcols:
        conn.execute("ALTER TABLE model_metrics ADD COLUMN model_version TEXT")
    if "rps" not in mcols:
        conn.execute("ALTER TABLE model_metrics ADD COLUMN rps REAL")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS prediction_snapshots (
          id TEXT PRIMARY KEY,
          match_id TEXT UNIQUE NOT NULL REFERENCES matches(id),
          league_id TEXT NOT NULL,
          utc_date TEXT NOT NULL,
          p_home REAL NOT NULL,
          p_draw REAL NOT NULL,
          p_away REAL NOT NULL,
          p_btts_yes REAL NOT NULL,
          p_over25 REAL NOT NULL,
          lambda_home REAL NOT NULL,
          lambda_away REAL NOT NULL,
          elo_home REAL NOT NULL,
          elo_away REAL NOT NULL,
          confidence REAL NOT NULL,
          model_version TEXT NOT NULL,
          snapshot_at TEXT NOT NULL
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_snapshots_match ON prediction_snapshots(match_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_snapshots_league ON prediction_snapshots(league_id)")


def empty_form() -> TeamForm:
    return TeamForm(0, 0, 0, 0, 0, 0, 0)


def repredict_flagged(conn: sqlite3.Connection) -> int:
    """إعادة توقع ضيقة للمباريات المؤكَّد تشكيلتها — بلا walk-forward كامل."""
    row = conn.execute(
        "SELECT value FROM app_meta WHERE key='enrich_repredict_matches'"
    ).fetchone()
    if not row or not (row["value"] or "").strip():
        return 0
    ids = [x.strip() for x in str(row["value"]).split(",") if x.strip()]
    if not ids:
        return 0
    print(f"narrow repredict: {len(ids)} matches…", flush=True)
    placeholders = ",".join("?" * len(ids))
    matches = conn.execute(
        f"""
        SELECT id, league_id, home_team_id, away_team_id,
               odds_home, odds_draw, odds_away, referee_name
        FROM matches WHERE id IN ({placeholders})
        """,
        ids,
    ).fetchall()
    by_league: dict[str, list] = {}
    for m in matches:
        by_league.setdefault(m["league_id"], []).append(m)

    n_written = 0
    for lid, targets in by_league.items():
        finished = conn.execute(
            """
            SELECT id, home_team_id, away_team_id, home_goals, away_goals, utc_date,
                   odds_home, odds_draw, odds_away,
                   shots_home, shots_away, sot_home, sot_away,
                   fouls_home, fouls_away, corners_home, corners_away, season
            FROM matches
            WHERE league_id = ? AND status = 'FINISHED'
              AND home_goals IS NOT NULL AND away_goals IS NOT NULL
            ORDER BY utc_date ASC
            """,
            (lid,),
        ).fetchall()
        if len(finished) < 20:
            continue
        # إعادة استخدام مسار التدريب المبسط عبر استدعاء predict بعد fit سريع
        # — نحدّث predictions لهذه الـids فقط
        train = finished[-MAX_TRAIN:]
        ref = datetime.now(timezone.utc)

        def days_ago(utc: str) -> float:
            try:
                dt = datetime.fromisoformat(utc.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return max(0.0, (ref - dt).total_seconds() / 86400.0)
            except Exception:
                return 0.0

        obs = [
            MatchObs(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
                days_ago=days_ago(m["utc_date"]),
            )
            for m in train
        ]
        model = fit_dixon_coles(obs, half_life_days=HALF_LIFE, league_id=lid)

        elo_matches = [
            EloMatch(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
                date=m["utc_date"],
            )
            for m in train
        ]
        ratings, _ = update_elo(elo_matches)
        pi_matches = [
            PiMatch(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
            )
            for m in train
        ]
        pi_state = update_pi(pi_matches)
        form_matches = [
            FormMatch(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
                sot_home=m["sot_home"],
                sot_away=m["sot_away"],
                date=m["utc_date"],
            )
            for m in train
        ]
        forms = rolling_form(form_matches, window=5)
        ts = now_iso()
        for t in targets:
            odds = None
            if t["odds_home"] and t["odds_draw"] and t["odds_away"]:
                odds = (float(t["odds_home"]), float(t["odds_draw"]), float(t["odds_away"]))
            enrich = load_live_enrichment(conn, t["id"], t["referee_name"])
            pred = predict_match(
                home=t["home_team_id"],
                away=t["away_team_id"],
                dc=model,
                elo_home=ratings.get(t["home_team_id"], 1500.0),
                elo_away=ratings.get(t["away_team_id"], 1500.0),
                pi=pi_state,
                form_home=forms.get(t["home_team_id"], empty_form()),
                form_away=forms.get(t["away_team_id"], empty_form()),
                market_odds=odds,
                temperature=1.0,
                dc_shots=None,
                league_id=lid,
                weather=enrich["weather"],
                home_missing=enrich["home_missing"],
                away_missing=enrich["away_missing"],
                referee_profile=enrich["referee_profile"],
                open_odds=enrich["open_odds"],
            )
            conn.execute("DELETE FROM predictions WHERE match_id=?", (t["id"],))
            market = pred["components"]["market"]["p"]
            analytics = {
                "version": MODEL_VERSION,
                "components": json.loads(json.dumps(pred["components"], default=list)),
                "edge": pred["edge"],
                "value": pred["value"],
                "weights": pred["weights"],
                "xpts": [pred["xpts_home"], pred["xpts_away"]],
                "double_chance": pred.get("double_chance"),
                "narrow_repredict": True,
            }
            tops = top_scores(pred["matrix"], 8)
            conn.execute(
                """
                INSERT INTO predictions (
                  id, match_id, lambda_home, lambda_away,
                  p_home, p_draw, p_away, p_btts_yes, p_over25,
                  top_scores_json, score_matrix_json,
                  elo_home, elo_away, confidence, model_version,
                  created_at, updated_at,
                  analytics_json, xpts_home, xpts_away,
                  market_home, market_draw, market_away
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    str(uuid.uuid4()),
                    t["id"],
                    pred["lambda_home"],
                    pred["lambda_away"],
                    pred["p_home"],
                    pred["p_draw"],
                    pred["p_away"],
                    pred["p_btts_yes"],
                    pred["p_over25"],
                    json.dumps(tops),
                    json.dumps(pred["matrix"].tolist()),
                    ratings.get(t["home_team_id"], 1500.0),
                    ratings.get(t["away_team_id"], 1500.0),
                    pred["confidence"],
                    MODEL_VERSION,
                    ts,
                    ts,
                    json.dumps(analytics, ensure_ascii=False),
                    pred["xpts_home"],
                    pred["xpts_away"],
                    market[0] if market else None,
                    market[1] if market else None,
                    market[2] if market else None,
                ),
            )
            n_written += 1
    conn.execute("DELETE FROM app_meta WHERE key='enrich_repredict_matches'")
    conn.commit()
    print(f"narrow repredict wrote {n_written}", flush=True)
    return n_written


def main() -> None:
    if not DB_PATH.exists():
        print("DB missing. Run: bun run sync")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 10000")
    ensure_columns(conn)

    if "--repredict-flagged" in sys.argv:
        repredict_flagged(conn)
        conn.close()
        return

    leagues = conn.execute("SELECT id, code, name_ar FROM leagues").fetchall()
    print(f"{MODEL_VERSION} fitting {len(leagues)} leagues…")

    conn.execute("DELETE FROM predictions")
    conn.execute("DELETE FROM elo_snapshots")
    conn.execute("DELETE FROM team_strengths")
    conn.execute("DELETE FROM model_metrics")

    all_probs = []
    all_outcomes = []
    value_backtests: dict[str, dict] = {}

    for league in leagues:
        lid = league["id"]
        finished = conn.execute(
            """
            SELECT id, home_team_id, away_team_id, home_goals, away_goals, utc_date,
                   odds_home, odds_draw, odds_away,
                   odds_open_home, odds_open_draw, odds_open_away,
                   shots_home, shots_away, sot_home, sot_away,
                   fouls_home, fouls_away, corners_home, corners_away, season
            FROM matches
            WHERE league_id = ? AND status = 'FINISHED'
              AND home_goals IS NOT NULL AND away_goals IS NOT NULL
            ORDER BY utc_date ASC
            """,
            (lid,),
        ).fetchall()
        if len(finished) < 20:
            print(f"  skip {lid}: {len(finished)} matches")
            continue

        # Compute and persist advanced event metrics (xG, xA, PPDA) into DB
        for m in finished:
            adv = compute_advanced_metrics(
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
                shots_home=m["shots_home"],
                shots_away=m["shots_away"],
                sot_home=m["sot_home"],
                sot_away=m["sot_away"],
                fouls_home=m["fouls_home"],
                fouls_away=m["fouls_away"],
                corners_home=m["corners_home"],
                corners_away=m["corners_away"],
            )
            conn.execute(
                """
                UPDATE matches
                SET xg_home = ?, xg_away = ?, xa_home = ?, xa_away = ?, ppda_home = ?, ppda_away = ?
                WHERE id = ?
                """,
                (
                    adv["xg_home"],
                    adv["xg_away"],
                    adv["xa_home"],
                    adv["xa_away"],
                    adv["ppda_home"],
                    adv["ppda_away"],
                    m["id"],
                ),
            )

        elo_source = list(finished)
        train = finished[-MAX_TRAIN:]
        ref = datetime.now(timezone.utc)

        elo_matches = [
            EloMatch(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
                date=m["utc_date"],
            )
            for m in elo_source
        ]
        pi_matches = [
            PiMatch(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
            )
            for m in elo_source
        ]
        form_matches = [
            FormMatch(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
                shots_home=m["shots_home"],
                shots_away=m["shots_away"],
                sot_home=m["sot_home"],
                sot_away=m["sot_away"],
                date=m["utc_date"],
            )
            for m in elo_source
        ]

        obs = []
        for m in train:
            dt = datetime.fromisoformat(m["utc_date"].replace("Z", "+00:00"))
            days = max((ref - dt).total_seconds() / 86400.0, 0.0)
            obs.append(
                MatchObs(
                    home=m["home_team_id"],
                    away=m["away_team_id"],
                    home_goals=int(m["home_goals"]),
                    away_goals=int(m["away_goals"]),
                    days_ago=days,
                )
            )

        # --- أهداف زائفة من التسديدات: pseudo = ½·أهداف + ½·قيمة التسديدات مقيسة
        # بحيث يساوي مجموعها مجموع الأهداف ضمن البادئة المعطاة. الأهداف ضجيج
        # بواسوني والتسديدات تحمل إشارة القوة الأثبت — بديل xG العملي بلا بيانات
        # تتبّع. النموذج الموازي يفقد فاعلية τ (قيم عشرية لا تطابق أقنعة 0/1)
        # فيقارب بواسون مستقلاً — مقبول: ρ للتوقع يأتي من نموذج الأهداف الحقيقية.
        def shot_value(shots: float, sot: float) -> float:
            return 0.30 * sot + 0.04 * max(shots - sot, 0.0)

        def build_obs_shots(rows, obs_prefix):
            """المقياس يُحسب من البادئة نفسها فقط — لا ثابت مشتق من مستقبل الشريحة."""
            sh = [
                m
                for m in rows
                if m["shots_home"] is not None
                and m["sot_home"] is not None
                and m["shots_away"] is not None
                and m["sot_away"] is not None
            ]
            if len(sh) < 300:
                return None
            tot_g = sum(m["home_goals"] + m["away_goals"] for m in sh)
            tot_v = sum(
                shot_value(m["shots_home"], m["sot_home"])
                + shot_value(m["shots_away"], m["sot_away"])
                for m in sh
            )
            scale = tot_g / tot_v if tot_v > 0 else 1.0

            def pseudo(g: int, shots, sot) -> float:
                if shots is None or sot is None:
                    return float(g)
                return 0.5 * g + 0.5 * scale * shot_value(shots, sot)

            return [
                MatchObs(
                    home=o.home,
                    away=o.away,
                    home_goals=pseudo(m["home_goals"], m["shots_home"], m["sot_home"]),
                    away_goals=pseudo(m["away_goals"], m["shots_away"], m["sot_away"]),
                    days_ago=o.days_ago,
                )
                for o, m in zip(obs_prefix, rows)
            ]

        obs_shots = build_obs_shots(train, obs)

        # --- فهرس المواجهات المباشرة (H2H): لكل زوج فرق لقاءاتهما المنتهية
        # مرتبة زمنياً. يُمرَّر آخر 5 لقاءات سابقة للمباراة فقط — نظيف زمنياً.
        h2h_pairs: dict[frozenset, list[tuple[int, sqlite3.Row]]] = {}
        for h2h_gi, h2h_m in enumerate(finished):
            h2h_pairs.setdefault(
                frozenset((h2h_m["home_team_id"], h2h_m["away_team_id"])), []
            ).append((h2h_gi, h2h_m))

        def h2h_before(
            home_id: str, away_id: str, before_gi: int | None = None, last: int = 5
        ) -> list[dict]:
            rows = h2h_pairs.get(frozenset((home_id, away_id)), [])
            if before_gi is not None:
                rows = [r for r in rows if r[0] < before_gi]
            return [
                {
                    "home_team": r["home_team_id"],
                    "away_team": r["away_team_id"],
                    "home_goals": int(r["home_goals"]),
                    "away_goals": int(r["away_goals"]),
                }
                for _, r in rows[-last:]
            ]

        targets = conn.execute(
            """
            SELECT id, home_team_id, away_team_id, odds_home, odds_draw, odds_away,
                   odds_open_home, odds_open_draw, odds_open_away,
                   referee_name, status, season
            FROM matches
            WHERE league_id=?
              AND status IN ('SCHEDULED','TIMED','IN_PLAY','PAUSED')
              AND source NOT IN ('preview-holdout','synthetic','demo')
            ORDER BY utc_date ASC
            """,
            (lid,),
        ).fetchall()

        # --- Promoted-team prior: فريق يظهر لأول مرة يرث متوسط تقييم الفرق التي
        # غادرت الدوري قبل موسمه — لا 1500 (= متوسط الدوري) الذي يبالغ في تقديره.
        # التقييمات تُقرأ عند بداية موسمه فقط: زمني بحت، لا معلومات من المستقبل.
        # ponytail: تمريرة واحدة زمنية بلا نقطة ثبات، وفرق DC الباردة تنكمش لمتوسط
        # الدوري عبر الـridge كما هي؛ الترقية: أسعار CSV لدوريات الدرجة الثانية.
        season_first_idx: dict[str, int] = {}
        season_teams: dict[str, set] = {}
        first_season: dict[str, str] = {}
        for i, m in enumerate(finished):
            season_first_idx.setdefault(m["season"], i)
            for tid in (m["home_team_id"], m["away_team_id"]):
                season_teams.setdefault(m["season"], set()).add(tid)
                first_season.setdefault(tid, m["season"])
        # الموسم المجدول الذي لم تُلعب منه مباراة بعد: موسم زائف عند نهاية التاريخ،
        # كي يُبذر الصاعدون الذين لا نتيجة لهم أصلاً (هم أبرد الفرق الباردة)
        for m in targets:
            season_first_idx.setdefault(m["season"], len(finished))
            for tid in (m["home_team_id"], m["away_team_id"]):
                season_teams.setdefault(m["season"], set()).add(tid)
                first_season.setdefault(tid, m["season"])
        elo_seeds: dict[str, float] = {}
        pi_off_seeds: dict[str, float] = {}
        pi_def_seeds: dict[str, float] = {}
        seasons_seq = sorted(season_first_idx, key=lambda s: season_first_idx[s])
        for si in range(1, len(seasons_seq)):
            s = seasons_seq[si]
            # كتيبة الموسم السابق مباشرة — لا كل من غادر يوماً بتقييم متجمد قديم
            prev_teams = season_teams[seasons_seq[si - 1]]
            dropped = prev_teams - season_teams[s]
            newcomers = [t for t in season_teams[s] if first_season[t] == s]
            if not dropped or not newcomers:
                continue  # لا تاريخ هبوط (أول موسم كوري مثلاً) → الافتراضي كما هو
            idx0 = season_first_idx[s]
            pre_elo, _ = update_elo(elo_matches[:idx0], seeds=elo_seeds)
            pre_pi = update_pi(
                pi_matches[:idx0], off_seeds=pi_off_seeds, def_seeds=pi_def_seeds
            )
            evals = [pre_elo[t] for t in dropped if t in pre_elo]
            if evals:
                seed = sum(evals) / len(evals)
                for t in newcomers:
                    elo_seeds[t] = seed
            offs = [pre_pi.off[t] for t in dropped if t in pre_pi.off]
            defs = [pre_pi.deff[t] for t in dropped if t in pre_pi.deff]
            if offs:
                so = sum(offs) / len(offs)
                sd = sum(defs) / len(defs) if defs else 0.0
                for t in newcomers:
                    pi_off_seeds[t] = so
                    pi_def_seeds[t] = sd

        print(
            f"  {lid}: DC on {len(obs)} · shots-DC {'on' if obs_shots else 'off'} · Elo/Pi on {len(elo_source)}…",
            flush=True,
        )
        model = fit_dixon_coles(obs, half_life_days=HALF_LIFE, league_id=lid)
        model_shots = (
            fit_dixon_coles(obs_shots, half_life_days=HALF_LIFE, league_id=lid) if obs_shots else None
        )
        ratings, history = update_elo(elo_matches, home_adv=80.0, seeds=elo_seeds)
        pi_state = update_pi(
            pi_matches, off_seeds=pi_off_seeds, def_seeds=pi_def_seeds
        )
        forms = rolling_form(form_matches, window=5)
        # فريق صاعد لم يلعب بعدُ أي مباراة: البذرة هي تقييمه الحالي
        for t_, v_ in elo_seeds.items():
            ratings.setdefault(t_, v_)
        for t_, v_ in pi_off_seeds.items():
            pi_state.off.setdefault(t_, v_)
        for t_, v_ in pi_def_seeds.items():
            pi_state.deff.setdefault(t_, v_)

        # Persist strengths
        season_row = conn.execute(
            "SELECT season FROM matches WHERE league_id=? ORDER BY utc_date DESC LIMIT 1",
            (lid,),
        ).fetchone()
        season = season_row["season"]

        for tid, elo in ratings.items():
            conn.execute(
                "UPDATE teams SET elo=?, attack=?, defense=? WHERE id=?",
                (elo, model.attack.get(tid), model.defense.get(tid), tid),
            )
            conn.execute(
                """
                INSERT INTO team_strengths (id, league_id, team_id, season, attack, defense, home_adv, rho)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(league_id, team_id, season) DO UPDATE SET
                  attack=excluded.attack, defense=excluded.defense,
                  home_adv=excluded.home_adv, rho=excluded.rho
                """,
                (
                    str(uuid.uuid4()),
                    lid,
                    tid,
                    season,
                    model.attack.get(tid, 0.0),
                    model.defense.get(tid, 0.0),
                    model.home_advantage,
                    model.rho,
                ),
            )

        by_team: dict[str, list] = {}
        for tid, date, elo in history:
            by_team.setdefault(tid, []).append((date, elo))
        for tid, pts in by_team.items():
            step = max(len(pts) // 28, 1)
            for i, (date, elo) in enumerate(pts):
                if i % step == 0 or i == len(pts) - 1:
                    conn.execute(
                        "INSERT INTO elo_snapshots (id, team_id, date, elo) VALUES (?,?,?,?)",
                        (str(uuid.uuid4()), tid, date, elo),
                    )

        # --- Walk-forward calibration + metrics ---
        eval_n = min(200, max(len(train) // 5, 40))
        cut = len(train) - eval_n
        temp = 1.0
        temp_m = 1.0
        half = 0
        fitted_w = None
        eval_model = None
        eval_model_shots = None
        wf_ctx: dict[str, dict] = {}  # match_id → مدخلات التوقع عند نقطة الزمن الصادقة
        if cut >= 60:
            eval_model = fit_dixon_coles(
                obs[:cut], half_life_days=HALF_LIFE, league_id=lid
            )
            eval_obs_shots = build_obs_shots(train[:cut], obs[:cut])
            if eval_obs_shots:
                eval_model_shots = fit_dixon_coles(
                    eval_obs_shots, half_life_days=HALF_LIFE, league_id=lid
                )
            cut_full = len(elo_source) - eval_n

            comps = []  # احتمالات كل مكوّن لكل مباراة — لتعلّم الأوزان وإعادة المزج
            outcomes = []
            market_probs = []
            for k, m in enumerate(train[cut:]):
                if k and k % 50 == 0:
                    # إنعاش نموذجي DC داخل النافذة — بيانات حتى ما قبل هذه المباراة فقط
                    eval_model = fit_dixon_coles(
                        obs[: cut + k], half_life_days=HALF_LIFE, league_id=lid
                    )
                    prefix_shots = build_obs_shots(train[: cut + k], obs[: cut + k])
                    if prefix_shots:
                        eval_model_shots = fit_dixon_coles(
                            prefix_shots, half_life_days=HALF_LIFE, league_id=lid
                        )
                # حالات Elo/Pi/الفورم تتقدّم زمنياً حتى ما قبل هذه المباراة فقط
                elo_k, _ = update_elo(elo_matches[: cut_full + k], seeds=elo_seeds)
                pi_k = update_pi(
                    pi_matches[: cut_full + k],
                    off_seeds=pi_off_seeds,
                    def_seeds=pi_def_seeds,
                )
                forms_k = rolling_form(form_matches[: cut_full + k], window=5)
                # بذور الصاعدين تدخل قبل التوقع لا بعده — البذرة مشتقة من ما قبل
                # موسم الفريق فقط (نظيفة زمنياً)، وبهذا يتطابق ما تقيسه المقاييس
                # مع ما يُعرض رجعياً، وتتسق معاملة Pi مع معاملة Elo أدناه
                for t_, v_ in pi_off_seeds.items():
                    pi_k.off.setdefault(t_, v_)
                for t_, v_ in pi_def_seeds.items():
                    pi_k.deff.setdefault(t_, v_)
                odds = None
                if m["odds_home"] and m["odds_draw"] and m["odds_away"]:
                    odds = (
                        float(m["odds_home"]),
                        float(m["odds_draw"]),
                        float(m["odds_away"]),
                    )
                h, a = m["home_team_id"], m["away_team_id"]
                eh = elo_k.get(h, elo_seeds.get(h, 1500.0))
                ea = elo_k.get(a, elo_seeds.get(a, 1500.0))
                fh = forms_k.get(h, empty_form())
                fa = forms_k.get(a, empty_form())
                h2h_k = h2h_before(h, a, before_gi=cut_full + k)
                pred = predict_match(
                    home=h,
                    away=a,
                    dc=eval_model,
                    elo_home=eh,
                    elo_away=ea,
                    pi=pi_k,
                    form_home=fh,
                    form_away=fa,
                    market_odds=odds,
                    temperature=1.0,
                    dc_shots=eval_model_shots,
                    h2h_matches=h2h_k,
                    league_id=lid,
                )
                comps.append(
                    {
                        "dc": pred["components"]["dixon_coles"]["p"],
                        "pi": pred["components"]["pi_ratings"]["p"],
                        "elo": pred["components"]["elo"]["p"],
                        "form": pred["components"]["form"]["p"],
                        "market": pred["components"]["market"]["p"],
                        "context": pred["components"].get("context", {}).get("p"),
                    }
                )
                hg, ag = int(m["home_goals"]), int(m["away_goals"])
                outcomes.append("H" if hg > ag else "A" if hg < ag else "D")
                market_probs.append(odds_to_probs(*odds) if odds else None)
                wf_ctx[m["id"]] = {
                    "idx": cut + k,
                    "elo_home": eh,
                    "elo_away": ea,
                    "pi": pi_k,
                    "form_home": fh,
                    "form_away": fa,
                    "odds": odds,
                    "dc": eval_model,
                    "dc_shots": eval_model_shots,
                    "h2h": h2h_k,
                }

            # --- Stacking: أوزان الخلط تُتعلَّم من النصف الأول فقط (شطر معايرة T
            # نفسه)، فتبقى شريحة القياس نظيفة — ثم يُعاد مزج النافذة كلها بها
            half = eval_n // 2
            fitted_w = fit_weights(comps[:half], outcomes[:half])
            wf_probs = [blend_components(c, fitted_w) for c in comps]

            # حرارة العرض تُقدَّر على النافذة كاملة — مشروع للتوقعات الحية القادمة
            temp = fit_temperature(wf_probs, outcomes)

            # المقاييس المنشورة: T تُقدَّر على النصف الأول، والتقييم على الثاني فقط
            t_fit_ids = {m["id"] for m in train[cut : cut + half]}
            metric_ids = {m["id"] for m in train[cut + half :]}
            assert not (t_fit_ids & metric_ids), "calibration leakage: T-fit overlaps metric segment"
            temp_m = fit_temperature(wf_probs[:half], outcomes[:half])
            cal_probs = [apply_temperature(p, temp_m) for p in wf_probs[half:]]
            seg_outcomes = outcomes[half:]
            metrics = summarize(cal_probs, seg_outcomes)
            all_probs.extend(cal_probs)
            all_outcomes.extend(seg_outcomes)

            # --- Backtest سياسة القيمة على شريحة القياس النظيفة نفسها:
            # كيلي ربعي بوحدات ثابتة (بلا مضاعفة) — يجيب «هل +EV يربح فعلاً؟»
            bt = {"n_bets": 0, "hits": 0, "staked": 0.0, "pnl": 0.0}
            for p_cal, m_row, oc in zip(cal_probs, train[cut + half :], seg_outcomes):
                # تفضيل خط أسبق (open) للـbacktest عند التوفر
                oh = m_row["odds_open_home"] or m_row["odds_home"]
                od = m_row["odds_open_draw"] or m_row["odds_draw"]
                oa = m_row["odds_open_away"] or m_row["odds_away"]
                if not (oh and od and oa):
                    continue
                v = value_signal(
                    p_cal,
                    (float(oh), float(od), float(oa)),
                )
                if not v or not v["bet"]:
                    continue
                won = {"home": "H", "draw": "D", "away": "A"}[v["side"]] == oc
                bt["n_bets"] += 1
                bt["hits"] += int(won)
                bt["staked"] += v["stake"]
                bt["pnl"] += v["stake"] * (v["odds"] - 1.0) if won else -v["stake"]
            if bt["n_bets"]:
                value_backtests[lid] = bt
                print(
                    f"    value-bt: {bt['n_bets']} bets, {bt['hits']} hits, "
                    f"pnl={bt['pnl']:+.4f}u",
                    flush=True,
                )
            conn.execute(
                """
                INSERT INTO model_metrics
                  (id, league_id, window_label, n_matches, accuracy, brier, log_loss, rps, model_version, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    lid,
                    f"{MODEL_VERSION} · T={temp_m:.2f} · آخر {int(metrics['n'])}",
                    int(metrics["n"]),
                    metrics["accuracy"],
                    metrics["brier"],
                    metrics["log_loss"],
                    metrics["rps"],
                    MODEL_VERSION,
                    now_iso(),
                ),
            )
            wtxt = " ".join(f"{k}={v:.2f}" for k, v in fitted_w.items())
            print(
                f"    weights {wtxt}\n"
                f"    cal T={temp:.2f}/{temp_m:.2f} acc={metrics['accuracy']:.3f} "
                f"brier={metrics['brier']:.3f} rps={metrics['rps']:.4f}",
                flush=True,
            )

            # خط أساس السوق: احتمالات الأسعار بعد خصم الهامش، على نفس شريحة القياس
            mkt = [
                (p, o)
                for p, o in zip(market_probs[half:], seg_outcomes)
                if p is not None
            ]
            if mkt:
                mm = summarize([p for p, _ in mkt], [o for _, o in mkt])
                conn.execute(
                    """
                    INSERT INTO model_metrics
                      (id, league_id, window_label, n_matches, accuracy, brier, log_loss, rps, model_version, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        lid,
                        f"السوق · آخر {int(mm['n'])}",
                        int(mm["n"]),
                        mm["accuracy"],
                        mm["brier"],
                        mm["log_loss"],
                        mm["rps"],
                        "market",
                        now_iso(),
                    ),
                )
                print(
                    f"    market acc={mm['accuracy']:.3f} brier={mm['brier']:.3f} rps={mm['rps']:.4f}",
                    flush=True,
                )

        # --- Targets: real scheduled (full model) + last 12 finished (eval-time model) ---
        recent = conn.execute(
            """
            SELECT id, home_team_id, away_team_id, odds_home, odds_draw, odds_away, status
            FROM matches
            WHERE league_id=? AND status='FINISHED' AND home_goals IS NOT NULL
              AND source IN ('football-data.co.uk','uk-csv','football-data.org','wikipedia')
            ORDER BY utc_date DESC LIMIT 12
            """,
            (lid,),
        ).fetchall()

        ts = now_iso()

        def write_prediction(match_id: str, pred: dict, elo_h: float, elo_a: float) -> None:
            tops = top_scores(pred["matrix"], 8)
            market = pred["components"]["market"]["p"]
            analytics = {
                "version": MODEL_VERSION,
                # components has tuples — roundtrip to plain lists
                "components": json.loads(json.dumps(pred["components"], default=list)),
                "edge": pred["edge"],
                "value": pred["value"],
                "weights": pred["weights"],
                "xpts": [pred["xpts_home"], pred["xpts_away"]],
                "double_chance": pred.get("double_chance"),
            }
            conn.execute(
                """
                INSERT INTO predictions (
                  id, match_id, lambda_home, lambda_away,
                  p_home, p_draw, p_away, p_btts_yes, p_over25,
                  top_scores_json, score_matrix_json,
                  elo_home, elo_away, confidence, model_version,
                  created_at, updated_at,
                  analytics_json, xpts_home, xpts_away,
                  market_home, market_draw, market_away
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    str(uuid.uuid4()),
                    match_id,
                    pred["lambda_home"],
                    pred["lambda_away"],
                    pred["p_home"],
                    pred["p_draw"],
                    pred["p_away"],
                    pred["p_btts_yes"],
                    pred["p_over25"],
                    json.dumps(tops),
                    json.dumps(pred["matrix"].tolist()),
                    elo_h,
                    elo_a,
                    pred["confidence"],
                    MODEL_VERSION,
                    ts,
                    ts,
                    json.dumps(analytics, ensure_ascii=False),
                    pred["xpts_home"],
                    pred["xpts_away"],
                    market[0] if market else None,
                    market[1] if market else None,
                    market[2] if market else None,
                ),
            )

            # Lock in prediction snapshot (never overwritten once recorded)
            conn.execute(
                """
                INSERT INTO prediction_snapshots (
                  id, match_id, league_id, utc_date,
                  p_home, p_draw, p_away, p_btts_yes, p_over25,
                  lambda_home, lambda_away, elo_home, elo_away,
                  confidence, model_version, snapshot_at
                ) SELECT
                    ?, m.id, m.league_id, m.utc_date,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?
                FROM matches m WHERE m.id = ?
                ON CONFLICT(match_id) DO NOTHING
                """,
                (
                    str(uuid.uuid4()),
                    pred["p_home"],
                    pred["p_draw"],
                    pred["p_away"],
                    pred["p_btts_yes"],
                    pred["p_over25"],
                    pred["lambda_home"],
                    pred["lambda_away"],
                    elo_h,
                    elo_a,
                    pred["confidence"],
                    MODEL_VERSION,
                    ts,
                    match_id,
                ),
            )

        for t in targets:
            odds = None
            if t["odds_home"] and t["odds_draw"] and t["odds_away"]:
                odds = (
                    float(t["odds_home"]),
                    float(t["odds_draw"]),
                    float(t["odds_away"]),
                )
            enrich = load_live_enrichment(conn, t["id"], t["referee_name"])
            pred = predict_match(
                home=t["home_team_id"],
                away=t["away_team_id"],
                dc=model,
                elo_home=ratings.get(t["home_team_id"], 1500.0),
                elo_away=ratings.get(t["away_team_id"], 1500.0),
                pi=pi_state,
                form_home=forms.get(t["home_team_id"], empty_form()),
                form_away=forms.get(t["away_team_id"], empty_form()),
                market_odds=odds,
                temperature=temp,
                weights=fitted_w,
                dc_shots=model_shots,
                h2h_matches=h2h_before(t["home_team_id"], t["away_team_id"]),
                league_id=lid,
                weather=enrich["weather"],
                home_missing=enrich["home_missing"],
                away_missing=enrich["away_missing"],
                referee_profile=enrich["referee_profile"],
                open_odds=enrich["open_odds"],
            )

            write_prediction(
                t["id"],
                pred,
                ratings.get(t["home_team_id"], 1500.0),
                ratings.get(t["away_team_id"], 1500.0),
            )

        # المباريات المنتهية تُعرض بوصفها «توقّعنا» — فتُولَّد من نموذج نقطة التقييم
        # (DC حتى cut، وحالات متقدمة زمنياً فقط)، لا من نموذج رأى نتائجها
        retro = 0
        for r in recent:
            ctx = wf_ctx.get(r["id"])
            if ctx is None:
                # منتهية خارج نافذة walk-forward — نتخطّاها بدل التسريب
                continue
            # حرارة العرض هنا temp_m لا temp: temp مُقدَّرة على النافذة كاملة ومنها
            # نتائج هذه المباريات نفسها — وtemp_m مقدَّرة على النصف الأول المنفصل،
            # فتتسق التوقعات الرجعية مع المقاييس المنشورة بلا تسريب
            if ctx["idx"] < cut + half:
                # داخل شطر معايرة T/الأوزان — أوزانه وحرارته رأت نتيجتها، فنتخطى
                # بدل إسقاط التدريب كله (assert سابقاً كان يقتل الدوريات جميعها)
                continue
            pred = predict_match(
                home=r["home_team_id"],
                away=r["away_team_id"],
                dc=ctx["dc"],
                elo_home=ctx["elo_home"],
                elo_away=ctx["elo_away"],
                pi=ctx["pi"],
                form_home=ctx["form_home"],
                form_away=ctx["form_away"],
                market_odds=ctx["odds"],
                temperature=temp_m,
                weights=fitted_w,
                dc_shots=ctx["dc_shots"],
                h2h_matches=ctx["h2h"],
                league_id=lid,
            )
            write_prediction(r["id"], pred, ctx["elo_home"], ctx["elo_away"])
            retro += 1
        print(f"    predictions: {len(targets)} scheduled + {retro} retro", flush=True)

    if all_probs:
        overall = summarize(all_probs, all_outcomes)
        conn.execute(
            """
            INSERT INTO model_metrics
              (id, league_id, window_label, n_matches, accuracy, brier, log_loss, rps, model_version, created_at)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                f"{MODEL_VERSION} كل الدوريات",
                int(overall["n"]),
                overall["accuracy"],
                overall["brier"],
                overall["log_loss"],
                overall["rps"],
                MODEL_VERSION,
                now_iso(),
            ),
        )
        print(
            f"overall acc={overall['accuracy']:.3f} brier={overall['brier']:.3f} "
            f"rps={overall['rps']:.4f} n={int(overall['n'])}"
        )

    # حذف غير مشروط أولاً: تدريب بلا رهانات يجب ألا يترك بطاقة backtest قديمة
    # تُنسب زوراً لختم «آخر تدريب» الجديد
    conn.execute("DELETE FROM app_meta WHERE key='value_backtest'")
    if value_backtests:
        total = {
            k: sum(bt[k] for bt in value_backtests.values())
            for k in ("n_bets", "hits", "staked", "pnl")
        }
        conn.execute(
            """
            INSERT INTO app_meta(key, value) VALUES('value_backtest', ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value
            """,
            (
                json.dumps(
                    {
                        "policy": "كيلي ربعي · نطاق EV ‏3–15%",
                        "total": total,
                        "leagues": value_backtests,
                    },
                    ensure_ascii=False,
                ),
            ),
        )
        print(
            f"value backtest: {total['n_bets']} bets, pnl={total['pnl']:+.4f}u "
            f"on {total['staked']:.4f}u staked"
        )

    conn.execute(
        """
        INSERT INTO app_meta(key, value) VALUES('last_fit', ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
        """,
        (now_iso(),),
    )
    conn.execute(
        """
        INSERT INTO app_meta(key, value) VALUES('model_version', ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
        """,
        (MODEL_VERSION,),
    )
    conn.commit()
    conn.close()
    print("fit complete —", MODEL_VERSION)


if __name__ == "__main__":
    main()
