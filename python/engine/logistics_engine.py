"""راحة، ازدحام، سفر، وأهمية المباراة — للعرض ونموذج 2، بلا مضاعفات λ.

خصم الإرهاق الكمي يعيش في مكان واحد: form_lambda_adjust (راحة أقل من 3.5 يوم).
المسافة من إحداثيات الملاعب فقط. الأهمية من جدول الترتيب فقط.
لا اختلاق بطولات أوروبية خارج قاعدة الدوريات.
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Mapping, Optional, Sequence


STADIUMS_PATH = Path(__file__).resolve().parents[2] / "scripts" / "data" / "stadiums.json"


def _parse_dt(utc: Optional[str]) -> Optional[datetime]:
    if not utc:
        return None
    try:
        dt = datetime.fromisoformat(str(utc).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


@lru_cache(maxsize=1)
def load_stadiums() -> Dict[str, Dict[str, Any]]:
    if not STADIUMS_PATH.is_file():
        return {}
    try:
        raw = json.loads(STADIUMS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return raw if isinstance(raw, dict) else {}


def stadium_coords(team_id: Optional[str]) -> Optional[tuple[float, float]]:
    if not team_id:
        return None
    data = load_stadiums()
    hit = data.get(team_id)
    if not hit:
        compact = team_id.lower().replace(" ", "").replace("_", "-")
        hit = data.get(compact)
    if not hit:
        for key, val in data.items():
            if key.endswith(team_id) or team_id.endswith(key):
                hit = val
                break
    if not isinstance(hit, dict):
        return None
    try:
        return float(hit["lat"]), float(hit["lon"])
    except (KeyError, TypeError, ValueError):
        return None


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0 * 2.0 * math.asin(min(1.0, math.sqrt(h)))


def travel_distance_km(home_team_id: str, away_team_id: str) -> Optional[float]:
    home = stadium_coords(home_team_id)
    away = stadium_coords(away_team_id)
    if home is None or away is None:
        return None
    return round(haversine_km(away, home), 1)


def count_matches_in_window(
    rows: Sequence[Any],
    team_id: str,
    as_of_utc: str,
    *,
    days: float = 7.0,
) -> float:
    ref = _parse_dt(as_of_utc)
    if ref is None:
        return 0.0
    n = 0
    for m in rows:
        hid = _field(m, "home_team_id")
        aid = _field(m, "away_team_id")
        if hid != team_id and aid != team_id:
            continue
        dt = _parse_dt(_field(m, "utc_date"))
        if dt is None:
            continue
        delta = (ref - dt).total_seconds() / 86400.0
        if 0 < delta <= days:
            n += 1
    return float(n)


def count_midweek_in_window(
    rows: Sequence[Any],
    team_id: str,
    as_of_utc: str,
    *,
    days: float = 7.0,
) -> float:
    """مباريات الثلاثاء–الخميس خلال النافذة — ازدحام منتصف الأسبوع من التواريخ فقط."""
    ref = _parse_dt(as_of_utc)
    if ref is None:
        return 0.0
    n = 0
    for m in rows:
        hid = _field(m, "home_team_id")
        aid = _field(m, "away_team_id")
        if hid != team_id and aid != team_id:
            continue
        dt = _parse_dt(_field(m, "utc_date"))
        if dt is None:
            continue
        delta = (ref - dt).total_seconds() / 86400.0
        if 0 < delta <= days and dt.weekday() in (1, 2, 3):
            n += 1
    return float(n)


def _field(obj: Any, key: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, Mapping):
        val = obj.get(key, default)
        return default if val is None else val
    try:
        val = obj[key]
        return default if val is None else val
    except Exception:
        pass
    return getattr(obj, key, default)


def classify_match_importance(
    home_standing: Optional[Mapping[str, Any]],
    away_standing: Optional[Mapping[str, Any]],
    n_teams: int,
) -> Dict[str, Any]:
    """أهمية من جدول الدوري: لقب / أوروبا / هبوط. بلا اختلاق مسابقات خارجية."""
    empty = {
        "available": False,
        "label": None,
        "stakes": None,
        "intensity": None,
        "home_position": None,
        "away_position": None,
    }
    if not home_standing or not away_standing or n_teams < 8:
        return empty

    def _pos(row: Mapping[str, Any]) -> Optional[int]:
        try:
            p = int(row.get("position") or 0)
            return p if p > 0 else None
        except (TypeError, ValueError):
            return None

    def _pts(row: Mapping[str, Any]) -> Optional[float]:
        try:
            return float(row.get("points"))
        except (TypeError, ValueError):
            return None

    hp, ap = _pos(home_standing), _pos(away_standing)
    hpts, apts = _pts(home_standing), _pts(away_standing)
    if hp is None or ap is None:
        return empty

    europe_cut = 4 if n_teams >= 18 else 3
    releg_from = n_teams - 2

    def band(pos: int, pts: Optional[float], other_pts: Optional[float]) -> tuple[str, float]:
        gap = abs((pts or 0) - (other_pts or 0))
        if pos <= 2:
            return "title", min(1.0, 0.72 + (0.08 if gap <= 6 else 0.0))
        if pos <= europe_cut:
            return "europe", 0.62
        if pos >= releg_from:
            return "relegation", min(1.0, 0.70 + (0.08 if gap <= 5 else 0.0))
        if pos <= europe_cut + 2:
            return "europe_chase", 0.48
        if pos >= releg_from - 2:
            return "relegation_chase", 0.50
        return "midtable", 0.28

    hb, hi = band(hp, hpts, apts)
    ab, ai = band(ap, apts, hpts)
    intensity = max(hi, ai)
    if hb == "title" or ab == "title":
        stakes, label = "title", "صراع على اللقب"
    elif hb == "relegation" or ab == "relegation":
        stakes, label = "relegation", "صراع هبوط"
    elif hb in ("europe", "europe_chase") or ab in ("europe", "europe_chase"):
        stakes, label = "europe", "سباق المراكز الأوروبية"
    else:
        stakes, label = "midtable", "مباراة وسط الجدول"

    return {
        "available": True,
        "label": label,
        "stakes": stakes,
        "intensity": round(intensity, 3),
        "home_position": hp,
        "away_position": ap,
        "home_band": hb,
        "away_band": ab,
    }


def evaluate_logistics_and_external_factors(
    *,
    home_team: str,
    away_team: str,
    rest_days_home: Optional[float] = None,
    rest_days_away: Optional[float] = None,
    home_matches_7d: Optional[float] = None,
    away_matches_7d: Optional[float] = None,
    home_matches_14d: Optional[float] = None,
    away_matches_14d: Optional[float] = None,
    home_matches_30d: Optional[float] = None,
    away_matches_30d: Optional[float] = None,
    travel_distance_km: Optional[float] = None,
    home_midweek_7d: Optional[float] = None,
    away_midweek_7d: Optional[float] = None,
    match_importance: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """يلخّص الراحة والسفر والأهمية نصياً — الخصم الكمي للفورم يبقى في الفورم."""
    factors = []

    if rest_days_home is not None and rest_days_home > 0:
        if rest_days_home < 3.5:
            factors.append(f"ضغط جدول للمضيف (راحة {rest_days_home:.1f} يوم)")
        elif rest_days_home >= 7:
            factors.append(f"راحة مريحة للمضيف ({rest_days_home:.0f} أيام)")

    if rest_days_away is not None and rest_days_away > 0:
        if rest_days_away < 3.5:
            factors.append(f"ضغط جدول للضيف (راحة {rest_days_away:.1f} يوم)")
        elif rest_days_away >= 7:
            factors.append(f"راحة مريحة للضيف ({rest_days_away:.0f} أيام)")

    if home_matches_7d is not None and home_matches_7d >= 3:
        factors.append(f"ازدحام مضيف {home_matches_7d:.0f} مباريات/7ي")
    if away_matches_7d is not None and away_matches_7d >= 3:
        factors.append(f"ازدحام ضيف {away_matches_7d:.0f} مباريات/7ي")

    midweek = max(home_midweek_7d or 0, away_midweek_7d or 0)
    is_midweek = midweek >= 1
    if is_midweek:
        factors.append("ازدحام منتصف الأسبوع من تواريخ الدوري")

    if travel_distance_km is not None and travel_distance_km >= 400:
        factors.append(f"سفر الضيف {travel_distance_km:.0f} كم")

    imp = dict(match_importance or {})
    if imp.get("available") and imp.get("label"):
        factors.append(str(imp["label"]))

    label = " • ".join(factors) if factors else "جدول مباريات اعتيادي للفريقين"

    return {
        "rest_days_home": round(rest_days_home, 1) if rest_days_home is not None else None,
        "rest_days_away": round(rest_days_away, 1) if rest_days_away is not None else None,
        "home_matches_7d": home_matches_7d,
        "away_matches_7d": away_matches_7d,
        "home_matches_14d": home_matches_14d,
        "away_matches_14d": away_matches_14d,
        "home_matches_30d": home_matches_30d,
        "away_matches_30d": away_matches_30d,
        "travel_distance_km": travel_distance_km,
        "is_european_midweek": bool(is_midweek),
        "home_midweek_7d": home_midweek_7d,
        "away_midweek_7d": away_midweek_7d,
        "match_importance": imp or None,
        "logistics_summary": label,
    }
