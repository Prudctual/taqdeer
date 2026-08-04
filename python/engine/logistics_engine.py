"""External Logistics, Travel Distance, Pitch Surface, and European Fixture Congestion Engine."""

from __future__ import annotations

from typing import Dict, Optional, Tuple


# Known venue pitch types & city distances proxy map
PITCH_SURFACE_MAP: Dict[str, str] = {
    "bernabeu": "عشب طبيعي هجين (Hybrid Grass)",
    "etihad": "عشب طبيعي جاف وسريع (Hybrid Pitch)",
    "anfield": "عشب طبيعي تقليدي كثيف",
    "camp_nou": "عشب هجين واسع المساحة",
    "emirates": "عشب طبيعي هجين مائي (Wet Fast Pitch)",
    "allianz": "عشب طبيعي مغلق سقف جزئي",
}

CITY_COORDINATES: Dict[str, Tuple[float, float]] = {
    "london": (51.5074, -0.1278),
    "manchester": (53.4808, -2.2426),
    "liverpool": (53.4084, -2.9916),
    "madrid": (40.4168, -3.7038),
    "barcelona": (41.3851, 2.1734),
    "munich": (48.1351, 11.5820),
    "milan": (45.4642, 9.1900),
    "paris": (48.8566, 2.3522),
}


def calculate_travel_distance_km(home_city: str, away_city: str) -> float:
    """Calculate approximate travel distance (km) between home and away cities."""
    c1 = CITY_COORDINATES.get(home_city.lower(), (51.5, -0.1))
    c2 = CITY_COORDINATES.get(away_city.lower(), (53.4, -2.2))
    
    # Rough Euclidian to km approximation for European continent
    dx = (c1[0] - c2[0]) * 111.0
    dy = (c1[1] - c2[1]) * 78.0
    dist = (dx * dx + dy * dy) ** 0.5
    return float(round(dist, 1))


def evaluate_logistics_and_external_factors(
    *,
    home_team: str,
    away_team: str,
    match_date: Optional[str] = None,
    is_european_midweek: bool = False,
    stadium_name: Optional[str] = None,
    rest_days_home: Optional[int] = None,
    rest_days_away: Optional[int] = None,
) -> Dict[str, float | str | bool]:
    """
    Evaluate travel fatigue, pitch surface type, rest days, and midweek European fixture pressure.
    Returns lambda multipliers and logistics description.
    """
    home_mult = 1.0
    away_mult = 1.0
    factors = []

    # 1. Travel Distance Penalty for Away Team
    travel_km = calculate_travel_distance_km(home_team, away_team)
    if travel_km >= 600.0:
        away_mult *= 0.96  # Long travel penalty (-4% xG)
        factors.append(f"رحلة سفر طويلة للضيف (~{int(travel_km)} كم)")
    elif travel_km >= 300.0:
        away_mult *= 0.98
        factors.append(f"تنقل سفر متوسط (~{int(travel_km)} كم)")

    # 2. Rest Days & Fixture Congestion
    if rest_days_home is not None:
        if rest_days_home <= 2:
            home_mult *= 0.92
            factors.append("إرهاق شديد للمضيف (راحة ≤ 2 يوم)")
        elif rest_days_home <= 3:
            home_mult *= 0.96
            factors.append("ضغط مباريات للمضيف (راحة ≤ 3 أيام)")

    if rest_days_away is not None:
        if rest_days_away <= 2:
            away_mult *= 0.89
            factors.append("إرهاق شديد للضيف (راحة ≤ 2 يوم)")
        elif rest_days_away <= 3:
            away_mult *= 0.94
            factors.append("ضغط مباريات للضيف (راحة ≤ 3 أيام)")

    # 3. European Midweek Match Congestion
    if is_european_midweek:
        home_mult *= 0.96
        away_mult *= 0.95
        factors.append("ضغط مباريات قارية منتصف الأسبوع")

    # 4. Pitch Surface
    pitch = PITCH_SURFACE_MAP.get(stadium_name.lower() if stadium_name else "", "عشب طبيعي ممتاز")

    label = " • ".join(factors) if factors else "لوجستيات سفر مريحة وأجواء ملعب مثالية"

    return {
        "travel_distance_km": travel_km,
        "pitch_surface": pitch,
        "is_european_midweek": is_european_midweek,
        "home_lambda_mult": round(home_mult, 3),
        "away_lambda_mult": round(away_mult, 3),
        "logistics_summary": label,
    }
