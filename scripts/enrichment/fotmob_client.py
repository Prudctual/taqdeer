"""عميل FotMob خفيف عبر curl_cffi — بديل Sofascore عند حظره."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE = "https://www.fotmob.com/api/data"
_DEFAULT_CACHE = Path(__file__).resolve().parents[2] / "data" / "enrich-cache"
CACHE_DIR = Path(os.environ.get("TAQDEER_ENRICH_CACHE", str(_DEFAULT_CACHE)))
MIN_INTERVAL = float(os.environ.get("FOTMOB_MIN_INTERVAL", "1.2"))

# primaryId لدورياتنا الثمانية
LEAGUE_PRIMARY: Dict[str, int] = {
    "pl": 47,
    "pd": 87,
    "bl1": 54,
    "sa": 55,
    "fl1": 53,
    "ppd": 61,
    "ded": 57,
    "tur1": 71,
}
PRIMARY_TO_LEAGUE = {v: k for k, v in LEAGUE_PRIMARY.items()}

# FotMob positionId تقريبي
_POS = {
    0: "GK",
    1: "D",
    2: "D",
    3: "M",
    4: "F",
    5: "F",
}

_last_req = 0.0
_session = None


def _session_get():
    global _session
    if _session is None:
        from curl_cffi import requests as crequests

        _session = crequests.Session(impersonate="chrome124")
    return _session


def _throttle() -> None:
    global _last_req
    wait = MIN_INTERVAL - (time.time() - _last_req)
    if wait > 0:
        time.sleep(wait)
    _last_req = time.time()


def _cache_path(key: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    safe = key.replace("/", "_").replace("?", "_")
    return CACHE_DIR / f"{safe}.json"


def get_json(path: str, *, ttl_sec: int = 900, force: bool = False) -> Optional[Dict[str, Any]]:
    cp = _cache_path(path)
    if not force and cp.exists():
        if time.time() - cp.stat().st_mtime < ttl_sec:
            try:
                return json.loads(cp.read_text(encoding="utf-8"))
            except Exception:
                pass
    url = f"{BASE}{path}"
    sess = _session_get()
    headers = {
        "Accept": "application/json",
        "Referer": "https://www.fotmob.com/",
    }
    for attempt in range(3):
        _throttle()
        try:
            r = sess.get(url, headers=headers, timeout=25)
            if r.status_code in (403, 429):
                time.sleep(6 * (attempt + 1))
                continue
            if r.status_code != 200:
                return None
            data = r.json()
            cp.write_text(json.dumps(data), encoding="utf-8")
            return data
        except Exception:
            time.sleep(2 * (attempt + 1))
    return None


def matches_by_date(yyyymmdd: str, *, ttl_sec: int = 1800) -> List[Dict[str, Any]]:
    data = get_json(f"/matches?date={yyyymmdd}", ttl_sec=ttl_sec)
    if not data:
        return []
    out: List[Dict[str, Any]] = []
    for lg in data.get("leagues") or []:
        primary = lg.get("primaryId")
        league_id = PRIMARY_TO_LEAGUE.get(primary)
        if not league_id:
            continue
        for m in lg.get("matches") or []:
            out.append(
                {
                    "fotmob_id": m.get("id"),
                    "league_id": league_id,
                    "primary_id": primary,
                    "league_name": lg.get("name"),
                    "home_name": (m.get("home") or {}).get("name") or "",
                    "away_name": (m.get("away") or {}).get("name") or "",
                    "home_id": (m.get("home") or {}).get("id"),
                    "away_id": (m.get("away") or {}).get("id"),
                    "status": (m.get("status") or {}).get("utcTime") or m.get("time"),
                    "utc_time": (m.get("status") or {}).get("utcTime"),
                }
            )
    return out


def match_details(match_id: int | str, *, ttl_sec: int = 600, force: bool = False) -> Optional[Dict[str, Any]]:
    return get_json(f"/matchDetails?matchId={match_id}", ttl_sec=ttl_sec, force=force)


def pos_from_id(position_id: Any) -> str:
    try:
        return _POS.get(int(position_id), "M")
    except Exception:
        return "M"


def parse_unavailable(team_block: Dict[str, Any]) -> List[Dict[str, Any]]:
    out = []
    for p in team_block.get("unavailable") or []:
        u = p.get("unavailability") or {}
        typ = str(u.get("type") or "injury").lower()
        if "suspen" in typ:
            status = "suspended"
        elif "doubt" in typ:
            status = "doubtful"
        else:
            status = "injured"
        out.append(
            {
                "player_name": p.get("name") or f"{p.get('firstName','')} {p.get('lastName','')}".strip(),
                "position": pos_from_id(p.get("positionId")),
                "status": status,
                "reason": typ,
            }
        )
    return out


def parse_lineup_side(team_block: Dict[str, Any]) -> Dict[str, Any]:
    starters = []
    for p in team_block.get("starters") or []:
        starters.append(
            {
                "name": p.get("name"),
                "position": pos_from_id(p.get("positionId")),
                "shirt": p.get("shirtNumber") or p.get("shirt"),
            }
        )
    return {
        "formation": team_block.get("formation"),
        "players": starters,
        "missing": parse_unavailable(team_block),
        "team_name": team_block.get("name"),
        "fotmob_team_id": team_block.get("id"),
    }


def extract_enrichment(details: Dict[str, Any]) -> Dict[str, Any]:
    content = details.get("content") or {}
    lineup = content.get("lineup") or {}
    weather = content.get("weather") or {}
    confirmed = (lineup.get("lineupType") or "").lower() in ("confirmed", "available")
    # بعض الردود: lineupType=unavailable يعني لا تشكيلة بعد — الغيابات قد تبقى
    if lineup.get("homeTeam", {}).get("starters"):
        if (lineup.get("lineupType") or "").lower() != "unavailable":
            confirmed = True
        else:
            confirmed = False
    home = parse_lineup_side(lineup.get("homeTeam") or {})
    away = parse_lineup_side(lineup.get("awayTeam") or {})
    # طقس FotMob: temperature °C، windSpeed قد تكون m/s
    wind = weather.get("windSpeed")
    wind_kmh = float(wind) * 3.6 if wind is not None else None
    precip = weather.get("precipitation")
    if precip is None:
        precip = weather.get("precipChance")
        # chance ليست مم — تجاهل إن بدت نسبة
        if precip is not None and precip > 20:
            precip = None
    return {
        "confirmed": bool(confirmed and home["players"] and away["players"]),
        "home": home,
        "away": away,
        "weather": {
            "temp_c": weather.get("temperature"),
            "precip_mm": precip if isinstance(precip, (int, float)) and precip <= 50 else 0.0 if precip == 0 else None,
            "wind_kmh": wind_kmh,
            "summary": weather.get("description") or weather.get("defaultTitle"),
        },
        "referee": ((details.get("general") or {}).get("matchReferee") or None),
    }
