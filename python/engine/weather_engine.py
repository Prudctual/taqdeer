"""Weather and Pitch Conditions Analytics Engine."""

from __future__ import annotations

from typing import Dict, Tuple


def calculate_weather_impact(
    temperature_c: float = 18.0,
    precipitation_mm: float = 0.0,
    wind_speed_kmh: float = 10.0,
) -> Dict[str, float | str | bool]:
    """
    Calculate the impact of weather and pitch moisture on expected goals (xG).
    Heavy rain or strong winds degrade shot accuracy and reduce total goals.
    """
    mult = 1.0
    factors = []

    if precipitation_mm >= 10.0:
        mult *= 0.93  # Heavy rain (-7% goals)
        factors.append("أمطار غزيرة جداً")
    elif precipitation_mm >= 3.0:
        mult *= 0.96  # Light rain (-4% goals)
        factors.append("أمطار خفيفة إلى متوسطة")

    if wind_speed_kmh >= 40.0:
        mult *= 0.94  # Severe wind (-6% goals)
        factors.append("رياح عاصفة")
    elif wind_speed_kmh >= 25.0:
        mult *= 0.97  # Moderate wind (-3% goals)
        factors.append("رياح نشطة")

    if temperature_c <= -2.0:
        mult *= 0.95  # Freezing conditions (-5% goals)
        factors.append("درجات حرارة متجمدة")
    elif temperature_c >= 35.0:
        mult *= 0.96  # Extreme heat (-4% goals)
        factors.append("حرارة قاسية وإرهاق حراري")

    mult = float(min(max(mult, 0.85), 1.0))
    label = " و".join(factors) if factors else "طقس مثالي للعب"

    return {
        "goal_multiplier": round(mult, 4),
        "weather_label": label,
        "is_adverse": mult < 0.98,
    }


def adjust_lambdas_for_weather(
    lambda_home: float,
    lambda_away: float,
    temperature_c: float = 18.0,
    precipitation_mm: float = 0.0,
    wind_speed_kmh: float = 10.0,
) -> Tuple[float, float]:
    """
    Adjust Poisson lambdas for adverse weather conditions.
    """
    impact = calculate_weather_impact(temperature_c, precipitation_mm, wind_speed_kmh)
    mult = float(impact["goal_multiplier"])
    return round(lambda_home * mult, 3), round(lambda_away * mult, 3)
