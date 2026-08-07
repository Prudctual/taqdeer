"""ملخص أيام الراحة وضغط الجدول — للعرض فقط، بلا مضاعفات λ.

خصم الإرهاق يعيش في مكان واحد: form_lambda_adjust (راحة أقل من 3.5 يوم).
لا مسافات سفر مخترعة ولا نوع عشب مزعوم — فقط ما نعرفه فعلاً من تواريخ المباريات.
"""

from __future__ import annotations

from typing import Dict, Optional


def evaluate_logistics_and_external_factors(
    *,
    home_team: str,
    away_team: str,
    rest_days_home: Optional[float] = None,
    rest_days_away: Optional[float] = None,
) -> Dict[str, float | str | None]:
    """يلخّص وضع الراحة الحقيقي للفريقين نصياً — الخصم الكمي مطبق في الفورم."""
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

    label = (
        " • ".join(factors)
        if factors
        else "جدول مباريات اعتيادي للفريقين"
    )

    return {
        "rest_days_home": round(rest_days_home, 1) if rest_days_home is not None else None,
        "rest_days_away": round(rest_days_away, 1) if rest_days_away is not None else None,
        "logistics_summary": label,
    }
