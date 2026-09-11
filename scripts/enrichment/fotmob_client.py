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

# primaryId لدورياتنا السبعة
LEAGUE_PRIMARY: Dict[str, int] = {
    "pl": 47,
    "pd": 87,
    "bl1": 54,
    "sa": 55,
    "fl1": 53,
    "ppd": 61,
    "ded": 57,
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


def _as_decimal_odds(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    if isinstance(value, dict):
        for key in ("decimal", "odds", "odd", "price", "value"):
            parsed = _as_decimal_odds(value.get(key))
            if parsed is not None:
                return parsed
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if num <= 1.01 or num > 80:
        return None
    return num


def _odds_triple_from_mapping(block: Any) -> Optional[Dict[str, float]]:
    if not isinstance(block, dict):
        return None
    home = (
        _as_decimal_odds(block.get("home"))
        or _as_decimal_odds(block.get("Home"))
        or _as_decimal_odds(block.get("1"))
        or _as_decimal_odds(block.get("homeOdds"))
    )
    draw = (
        _as_decimal_odds(block.get("draw"))
        or _as_decimal_odds(block.get("Draw"))
        or _as_decimal_odds(block.get("x"))
        or _as_decimal_odds(block.get("X"))
        or _as_decimal_odds(block.get("drawOdds"))
    )
    away = (
        _as_decimal_odds(block.get("away"))
        or _as_decimal_odds(block.get("Away"))
        or _as_decimal_odds(block.get("2"))
        or _as_decimal_odds(block.get("awayOdds"))
    )
    if home and draw and away:
        return {"home": home, "draw": draw, "away": away}
    return None


def _odds_triple_from_list(items: Any) -> Optional[Dict[str, float]]:
    if not isinstance(items, list):
        return None
    found: Dict[str, float] = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        label = str(
            item.get("name")
            or item.get("label")
            or item.get("outcome")
            or item.get("value")
            or ""
        ).strip().lower()
        price = _as_decimal_odds(item)
        if price is None:
            continue
        if label in ("1", "home", "1x2_home", "home win"):
            found["home"] = price
        elif label in ("x", "draw", "1x2_draw", "tie"):
            found["draw"] = price
        elif label in ("2", "away", "1x2_away", "away win"):
            found["away"] = price
    if len(found) == 3:
        return found
    return None


def extract_odds_1x2(details: Dict[str, Any]) -> Optional[Dict[str, float]]:
    """1X2 عشري حقيقي فقط — يرفض استطلاعات oddspoll."""
    stack: List[Any] = [details]
    seen = 0
    while stack and seen < 80:
        node = stack.pop()
        seen += 1
        if isinstance(node, dict):
            if any("poll" in str(k).lower() for k in node.keys()):
                for key, val in node.items():
                    if "poll" in str(key).lower():
                        continue
                    if isinstance(val, (dict, list)):
                        stack.append(val)
                continue
            for key in ("odds", "bettingOdds", "oddsList", "betOffers", "markets"):
                block = node.get(key)
                if block is None:
                    continue
                triple = _odds_triple_from_mapping(block) or _odds_triple_from_list(block)
                if triple:
                    return triple
                if isinstance(block, dict):
                    for nested_key in ("1x2", "Match Winner", "matchWinner", "fullTime", "bets"):
                        nested = block.get(nested_key)
                        triple = _odds_triple_from_mapping(nested) or _odds_triple_from_list(nested)
                        if triple:
                            return triple
                    stack.append(block)
                elif isinstance(block, list):
                    stack.extend(block[:12])
            for val in node.values():
                if isinstance(val, (dict, list)):
                    stack.append(val)
        elif isinstance(node, list):
            stack.extend(node[:12])
    return None


def extract_referee_info(details: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    facts = ((details.get("content") or {}).get("matchFacts") or {})
    info = facts.get("infoBox") or facts.get("infoBoxes") or {}
    raw = None
    if isinstance(info, dict):
        raw = info.get("Referee") or info.get("referee")
    general = details.get("general") or {}
    if raw is None:
        raw = general.get("matchReferee") or general.get("referee")
    if isinstance(raw, str) and raw.strip():
        return {"name": raw.strip()}
    if not isinstance(raw, dict):
        return None
    name = str(raw.get("text") or raw.get("name") or "").strip()
    if not name:
        return None
    matches_n = None
    avg_y = None
    red_total = None
    for stat in raw.get("stats") or []:
        if not isinstance(stat, dict):
            continue
        kind = str(stat.get("type") or "").lower()
        value = stat.get("value")
        try:
            num = float(value)
        except (TypeError, ValueError):
            continue
        if kind == "matches":
            matches_n = int(num)
        elif kind in ("yellowcards", "yellow"):
            if str(stat.get("valueType") or "") == "perMatch":
                avg_y = num
            elif matches_n:
                avg_y = num / matches_n
        elif kind in ("redcards", "red"):
            if str(stat.get("valueType") or "") == "perMatch":
                red_total = num * (matches_n or 1)
            else:
                red_total = num
    out: Dict[str, Any] = {"name": name}
    if matches_n and matches_n > 0:
        out["matches_n"] = matches_n
        if avg_y is not None:
            out["avg_yellows"] = min(max(avg_y, 0.0), 8.0)
        if red_total is not None:
            out["avg_reds"] = min(max(red_total / matches_n, 0.0), 1.0)
        if out.get("avg_yellows") is not None:
            out["strictness"] = min(max(out["avg_yellows"] / 4.0, 0.5), 2.5)
    return out


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
    referee = extract_referee_info(details)
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
        "referee": referee,
        "odds": extract_odds_1x2(details),
    }
