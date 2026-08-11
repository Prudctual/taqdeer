"""جلب xG تتبّعي من Understat للخمس الكبرى — عبر getLeagueData (AJAX) لا HTML المضمّن.

Understat لم يعد يضمّن datesData في الصفحة؛ البيانات تُجلب من:
  GET /getLeagueData/{league}/{season}
بعد زيارة صفحة الدوري للحصول على كوكيز الجلسة.
"""

from __future__ import annotations

import gzip
import http.cookiejar
import json
import os
import time
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from name_match import names_match, normalize_key

ROOT = Path(__file__).resolve().parents[2]
CACHE_DIR = Path(os.environ.get("TAQDEER_ENRICH_CACHE", str(ROOT / "data" / "enrich-cache")))
CACHE_DIR.mkdir(parents=True, exist_ok=True)

UNDERSTAT_LEAGUES: Dict[str, str] = {
    "pl": "EPL",
    "pd": "La_liga",
    "bl1": "Bundesliga",
    "sa": "Serie_A",
    "fl1": "Ligue_1",
}

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)


def _season_start_year(season: str) -> int:
    s = (season or "").strip()
    if "/" in s:
        return int(s.split("/")[0][:4])
    return int(s[:4])


def _opener() -> urllib.request.OpenerDirector:
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def _decode_body(raw: bytes, content_encoding: str | None) -> str:
    """Understat غالباً يرسل gzip حتى بدون Accept-Encoding."""
    enc = (content_encoding or "").lower()
    if "gzip" in enc or raw[:2] == b"\x1f\x8b":
        try:
            raw = gzip.decompress(raw)
        except OSError:
            pass
    return raw.decode("utf-8", errors="replace")


def _get(
    opener: urllib.request.OpenerDirector,
    url: str,
    *,
    ajax: bool = False,
    referer: str = "https://understat.com/",
) -> str:
    headers = {
        "User-Agent": UA,
        "Accept": "application/json, text/javascript, */*; q=0.01" if ajax else "text/html",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": referer,
    }
    if ajax:
        headers["X-Requested-With"] = "XMLHttpRequest"
    req = urllib.request.Request(url, headers=headers)
    with opener.open(req, timeout=45) as resp:
        return _decode_body(resp.read(), resp.headers.get("Content-Encoding"))


def _cache_path(league_slug: str, year: int) -> Path:
    return CACHE_DIR / f"understat_league_{league_slug}_{year}.json"


def fetch_league_payload(
    league_id: str,
    season: str,
    *,
    force: bool = False,
    ttl_sec: int = 6 * 3600,
) -> Optional[Dict[str, Any]]:
    slug = UNDERSTAT_LEAGUES.get(league_id)
    if not slug:
        return None
    year = _season_start_year(season)
    cache = _cache_path(slug, year)
    if not force and cache.exists() and time.time() - cache.stat().st_mtime < ttl_sec:
        try:
            return json.loads(cache.read_text(encoding="utf-8"))
        except Exception:
            pass

    opener = _opener()
    page_url = f"https://understat.com/league/{slug}/{year}"
    try:
        # جلسة/كوكيز من صفحة الدوري ثم AJAX (رد gzip)
        _get(opener, page_url, ajax=False)
        raw = _get(
            opener,
            f"https://understat.com/getLeagueData/{slug}/{year}",
            ajax=True,
            referer=page_url,
        )
        data = json.loads(raw)
    except Exception as e:
        print(f"  understat fetch fail {league_id}/{year}: {e}")
        return None

    if not isinstance(data, dict):
        print(f"  understat: رد غير متوقع لـ {league_id}/{year}")
        return None
    cache.write_text(json.dumps(data), encoding="utf-8")
    return data


def fetch_league_matches(
    league_id: str,
    season: str,
    *,
    force: bool = False,
) -> List[Dict[str, Any]]:
    """قائمة مباريات Understat لموسم واحد مع xG."""
    payload = fetch_league_payload(league_id, season, force=force)
    if not payload:
        return []
    # الشكل الجديد: dates | القديم: datesData مضمّن أحياناً
    rows = payload.get("dates") or payload.get("datesData") or []
    if isinstance(rows, dict):
        rows = list(rows.values())
    if not isinstance(rows, list):
        print(f"  understat: لا dates لـ {league_id}/{season}")
        return []

    out: List[Dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        if row.get("isResult") in (False, "false", 0, "0"):
            continue
        xg = row.get("xG") or {}
        goals = row.get("goals") or {}
        try:
            xg_h = float(xg.get("h"))
            xg_a = float(xg.get("a"))
        except (TypeError, ValueError, AttributeError):
            continue
        h = ((row.get("h") or {}) if isinstance(row.get("h"), dict) else {}).get("title") or ""
        a = ((row.get("a") or {}) if isinstance(row.get("a"), dict) else {}).get("title") or ""
        dt = str(row.get("datetime") or "")[:19]
        if not h or not a or not dt:
            continue
        try:
            gh = int(float(goals.get("h") or 0))
            ga = int(float(goals.get("a") or 0))
        except (TypeError, ValueError):
            gh = ga = 0
        out.append(
            {
                "home_name": h,
                "away_name": a,
                "xg_home": xg_h,
                "xg_away": xg_a,
                "datetime": dt,
                "date": dt[:10],
                "goals_h": gh,
                "goals_a": ga,
            }
        )
    return out


def match_understat_row(
    local_home: str,
    local_away: str,
    local_date: str,
    candidates: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """يطابق مباراة محلية بصف Understat (تاريخ + أسماء)."""
    d = (local_date or "")[:10]
    pool = [c for c in candidates if c["date"] == d]
    if not pool:
        try:
            base = datetime.strptime(d, "%Y-%m-%d")
        except ValueError:
            return None
        near = {(base + timedelta(days=off)).strftime("%Y-%m-%d") for off in (-1, 0, 1)}
        pool = [c for c in candidates if c["date"] in near]
    for c in pool:
        if names_match(local_home, c["home_name"]) and names_match(
            local_away, c["away_name"]
        ):
            return c
    for c in pool:
        if names_match(local_home, c["away_name"]) and names_match(
            local_away, c["home_name"]
        ):
            return {
                **c,
                "xg_home": c["xg_away"],
                "xg_away": c["xg_home"],
                "swapped": True,
            }
    return None


def team_label_key(name: str) -> str:
    return normalize_key(name)
