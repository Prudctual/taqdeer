"""Opponent Strengths and Weaknesses Analytics Engine."""

from __future__ import annotations

from typing import Dict, List, Optional


def analyze_team_strengths_weaknesses(
    *,
    team_name: str,
    gf_avg: float,
    ga_avg: float,
    xg_avg: float,
    xga_avg: float,
    home_win_rate: float,
    away_win_rate: float,
    clean_sheets_pct: float,
    sot_conversion_pct: float = 0.32,
    ppda: Optional[float] = None,
    rest_days: Optional[float] = None,
) -> Dict[str, List[str]]:
    """
    Generate analytical Arabic bullet points of strengths and weaknesses for a team.
    """
    strengths: List[str] = []
    weaknesses: List[str] = []

    # 1. Attacking Efficiency (λ / shot-proxy threat)
    if gf_avg >= 1.95:
        strengths.append(f"نجاعة هجومية عالية جداً (متوسط {gf_avg:.1f} هدف/مباراة)")
    elif xg_avg >= 1.70:
        strengths.append(
            f"خلق فرص عالية وصناعة خطورة متواصلة (λ المتوقع {xg_avg:.2f})"
        )

    if gf_avg < 1.0:
        weaknesses.append(f"شح تهديفي واضح (متوسط {gf_avg:.1f} هدف/مباراة)")
    elif xg_avg < 1.10:
        weaknesses.append("صعوبة في بناء الهجمات وصنع الفرص المحققة")

    # 2. Defensive Solidity & Clean Sheets
    if ga_avg <= 0.90:
        strengths.append(f"منظومة دفاعية صلبة للغاية (يستقبل {ga_avg:.1f} هدف/مباراة)")
    if clean_sheets_pct >= 0.40:
        strengths.append(f"استقرار في الحفاظ على نظافة الشباك ({int(clean_sheets_pct*100)}% من المباريات)")

    if ga_avg >= 1.75:
        weaknesses.append(f"هشاشة دفاعية واضحة (معدل استقبال {ga_avg:.1f} هدف/مباراة)")
    elif xga_avg >= 1.60:
        weaknesses.append(
            f"استقبال خطورة عالية على المرمى (μ المتوقع {xga_avg:.2f})"
        )

    # 3. Home / Away Discrepancies
    if home_win_rate >= 0.65:
        strengths.append(f"قوة ضاربة وسجل ممتاز على ملعبه ({int(home_win_rate*100)}% نسبة فوز)")
    elif away_win_rate < 0.25 and home_win_rate > 0.50:
        weaknesses.append("تراجع كبير في مستوى الأداء والنتائج خارج الملعب")

    # 4. Pressing Intensity (PPDA)
    if ppda is not None:
        if ppda <= 9.5:
            strengths.append("ضغط عالي شراسة وافتراس كرات في مناطق المنافس")
        elif ppda >= 14.5:
            weaknesses.append("تراجع دفاعي منخفض (Low Block) يمنح الخصم مساحات للاستحواذ")

    # 5. Rest / Fatigue
    if rest_days is not None and rest_days < 3.5:
        weaknesses.append("مؤشرات إرهاق وتتابع مباريات سريع (راحة أقل من 84 ساعة)")

    # Fallbacks if list is minimal
    if not strengths:
        strengths.append("توازن تكتيكي واستقرار نسبي في الأداء العام")
    if not weaknesses:
        weaknesses.append("تذبذب طفيف عند مواجهة الفرق الكبرى")

    return {
        "team": team_name,
        "strengths": strengths[:4],
        "weaknesses": weaknesses[:4],
    }
