"""تعديل λ من طقس حقيقي (Open-Meteo) — بلا قيم افتراضية مخترعة."""

from __future__ import annotations

from typing import Any, Dict, Optional


def weather_goal_multiplier(
    *,
    temp_c: Optional[float] = None,
    precip_mm: Optional[float] = None,
    wind_kmh: Optional[float] = None,
) -> Optional[float]:
    """مضاعف أهداف ضمن ±8% عند توفر قراءات حقيقية فقط."""
    if temp_c is None and precip_mm is None and wind_kmh is None:
        return None

    mult = 1.0
    if precip_mm is not None:
        if precip_mm >= 8.0:
            mult *= 0.94
        elif precip_mm >= 3.0:
            mult *= 0.97
    if wind_kmh is not None and wind_kmh >= 45.0:
        mult *= 0.96
    if temp_c is not None:
        if temp_c <= 2.0:
            mult *= 0.97
        elif temp_c >= 34.0:
            mult *= 0.98

    return float(max(0.92, min(1.08, mult)))


def apply_weather_to_lambdas(
    lam: float,
    mu: float,
    *,
    temp_c: Optional[float] = None,
    precip_mm: Optional[float] = None,
    wind_kmh: Optional[float] = None,
    multiplier: Optional[float] = None,
) -> Dict[str, Any]:
    m = multiplier
    if m is None:
        m = weather_goal_multiplier(temp_c=temp_c, precip_mm=precip_mm, wind_kmh=wind_kmh)
    if m is None:
        return {
            "lambda_home": lam,
            "lambda_away": mu,
            "multiplier": None,
            "applied": False,
            "summary": None,
        }

    parts = []
    if precip_mm is not None and precip_mm >= 3.0:
        parts.append(f"مطر {precip_mm:.1f} مم")
    if wind_kmh is not None and wind_kmh >= 45.0:
        parts.append(f"رياح {wind_kmh:.0f} كم/س")
    if temp_c is not None and (temp_c <= 2.0 or temp_c >= 34.0):
        parts.append(f"حرارة {temp_c:.0f}°C")
    summary = " · ".join(parts) if parts else f"طقس طبيعي (×{m:.3f})"

    return {
        "lambda_home": lam * m,
        "lambda_away": mu * m,
        "multiplier": m,
        "applied": abs(m - 1.0) > 1e-6,
        "summary": summary,
        "temp_c": temp_c,
        "precip_mm": precip_mm,
        "wind_kmh": wind_kmh,
    }
