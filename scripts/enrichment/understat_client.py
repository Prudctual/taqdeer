"""جلب xG تتبّعي من Understat للخمس الكبرى — بلا مفتاح API.

الصفحات العامة تضمّن datesData كـ JSON داخل سكربت؛ نفكّه ونطابقه مع فرقنا محلياً.
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from name_match import names_match, normalize_key

ROOT = Path(__file__).resolve().parents[2]
CACHE_DIR = Path(os.environ.get("TAQDEER_ENRICH_CACHE", str(ROOT / "data" / "enrich-cache")))
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# تقدير league_id → مسار Understat
UNDERSTAT_LEAGUES: Dict[str, str] = {
    "pl": "EPL",
    "pd": "La_liga",
    "bl1": "Bundesliga",
    "sa": "Serie_A",
    "fl1": "Ligue_1",
}

UA = "Mozilla/5.0 (compatible; Taqdeer/1.0; +https://taqdeer.local)"


def _season_start_year(season: str) -> int:
    """'2024' أو '2024/2025' → 2024."""
    s = (season or "").strip()
    if "/" in s:
        return int(s.split("/")[0][:4])
    return int(s[:4])


def _fetch(url: str, *, ttl_sec: int = 6 * 3600, force: bool = False) -> str:
    key = re.sub(r"[^a-zA-Z0-9]+", "_", url)[-180:]
    path = CACHE_DIR / f"understat_{key}.html"
    if not force and path.exists() and time.time() - path.stat().st_mtime < ttl_sec:
        return path.read_text(encoding="utf-8", errors="replace")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    path.write_text(html, encoding="utf-8")
    return html


def _parse_embedded_json(html: str, var_name: str) -> Any:
    """يستخرج JSON.parse('...') لمتغير المضمّن في صفحة Understat."""
    pat = rf"{var_name}\s*=\s*JSON\.parse\('(.+?)'\)"
    m = re.search(pat, html, re.DOTALL)
    if not m:
        return None
    raw = m.group(1)
    # Understat يهرب بـ \' و \\xHH
    decoded = raw.encode("utf-8").decode("unicode_escape")
    return json.loads(decoded)


def fetch_league_matches(
    league_id: str,
    season: str,
    *,
    force: bool = False,
) -> List[Dict[str, Any]]:
    """قائمة مباريات Understat لموسم واحد مع xG."""
    slug = UNDERSTAT_LEAGUES.get(league_id)
    if not slug:
        return []
    year = _season_start_year(season)
    url = f"https://understat.com/league/{slug}/{year}"
    try:
        html = _fetch(url, force=force)
    except Exception as e:
        print(f"  understat fetch fail {league_id}/{year}: {e}")
        return []
    data = _parse_embedded_json(html, "datesData")
    if not isinstance(data, list):
        print(f"  understat: لا datesData لـ {league_id}/{year}")
        return []
    out: List[Dict[str, Any]] = []
    for row in data:
        if not row.get("isResult"):
            continue
        try:
            xg_h = float(row["xG"]["h"])
            xg_a = float(row["xG"]["a"])
        except (KeyError, TypeError, ValueError):
            continue
        h = (row.get("h") or {}).get("title") or ""
        a = (row.get("a") or {}).get("title") or ""
        dt = str(row.get("datetime") or "")[:19]
        if not h or not a or not dt:
            continue
        out.append(
            {
                "home_name": h,
                "away_name": a,
                "xg_home": xg_h,
                "xg_away": xg_a,
                "datetime": dt,
                "date": dt[:10],
                "goals_h": int(float((row.get("goals") or {}).get("h") or 0)),
                "goals_a": int(float((row.get("goals") or {}).get("a") or 0)),
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
        # نافذة ±1 يوم للمباريات المتأخرة
        try:
            base = datetime.strptime(d, "%Y-%m-%d")
        except ValueError:
            return None
        from datetime import timedelta

        near = {
            (base + timedelta(days=off)).strftime("%Y-%m-%d") for off in (-1, 0, 1)
        }
        pool = [c for c in candidates if c["date"] in near]
    for c in pool:
        if names_match(local_home, c["home_name"]) and names_match(
            local_away, c["away_name"]
        ):
            return c
    # محاولة معكوسة نادرة (أسماء مختلطة)
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
