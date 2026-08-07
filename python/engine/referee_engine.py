"""ملف تعريف الحكم من إحصائيات محلية — تعديل خفيف فقط عند عيّنة كافية."""

from __future__ import annotations

from typing import Any, Dict, Optional


MIN_MATCHES = 8


def evaluate_referee_impact(
    profile: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    يعيد مضاعفات λ صغيرة جداً عند حكم صارم/متساهل.
    الصرامة = متوسط البطاقات الصفراء نسبةً لخط أساس ~4.0.
    """
    empty = {
        "applied": False,
        "lambda_mult": 1.0,
        "strictness": None,
        "matches_n": 0,
        "avg_yellows": None,
        "avg_reds": None,
        "summary": None,
    }
    if not profile:
        return empty

    n = int(profile.get("matches_n") or 0)
    avg_y = float(profile.get("avg_yellows") or 0.0)
    avg_r = float(profile.get("avg_reds") or 0.0)
    strictness = float(profile.get("strictness") or (avg_y / 4.0 if avg_y else 1.0))

    if n < MIN_MATCHES:
        return {
            **empty,
            "matches_n": n,
            "avg_yellows": avg_y,
            "avg_reds": avg_r,
            "strictness": strictness,
            "summary": f"عيّنة صغيرة ({n} مباراة) — عرض فقط بلا تعديل",
        }

    # حكم صارم قليلاً يخفض الأهداف؛ متساهل يرفعها — نطاق ضيق ±3%
    mult = 1.0
    if strictness >= 1.25:
        mult = 0.97
    elif strictness <= 0.75:
        mult = 1.03

    return {
        "applied": abs(mult - 1.0) > 1e-6,
        "lambda_mult": mult,
        "strictness": strictness,
        "matches_n": n,
        "avg_yellows": avg_y,
        "avg_reds": avg_r,
        "summary": (
            f"صرامة {strictness:.2f} · صفراء {avg_y:.1f}/مباراة · "
            f"{'تعديل λ' if abs(mult - 1.0) > 1e-6 else 'بلا تعديل'}"
        ),
    }
