"""
Goalkeeper Performance & Shot-Stopping Analytics Engine (goalkeeper_engine.py)

Covers Factors 11 & 12 of Model 2:
1. Performance vs Top-Tier Attacks (أداء حارس المرمى ضد الفرق الكبيرة)
2. Save Percentage & Goals Prevented (PSxG Delta Proxy) (نسبة تصديات الحارس وxG المنقذ)
3. Bayesian-smoothed Shot Stopping Ratings & Grades (ELITE -> ALARMING)
4. Opponent λ defensive adjustment & backup goalkeeper risk detection
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, Mapping, Optional, Sequence


@dataclass
class GoalkeeperProfile:
    team_id: str
    matches_evaluated: int
    sot_faced_avg: float
    saves_avg: float
    save_pct: float
    xg_faced_avg: float
    goals_conceded_avg: float
    goals_prevented_total: float
    goals_prevented_per90: float
    clean_sheets_count: int
    clean_sheet_rate: float
    vs_top_tier_matches: int
    vs_top_tier_save_pct: float
    vs_top_tier_goals_prevented: float
    shot_stopping_grade: str  # ELITE, ABOVE_AVERAGE, SOLID, VULNERABLE, ALARMING
    is_backup: bool
    opponent_lambda_mult: float
    summary_ar: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _extract(obj: Any, key: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if hasattr(obj, "__getitem__"):
        try:
            val = obj[key]
            return val if val is not None else default
        except (KeyError, IndexError, TypeError):
            pass
    val = getattr(obj, key, default)
    return val if val is not None else default


def compute_team_goalkeeper_profile(
    team_id: str,
    matches: Sequence[Any],
    ratings_map: Optional[Mapping[str, float]] = None,
    window: int = 25,
    is_backup: bool = False,
    backup_penalty_mult: float = 1.05,
) -> GoalkeeperProfile:
    """
    Computes rolling goalkeeper performance for a team:
    - Shots on target faced (SOT), saves made, saves percentage.
    - Expected goals faced (xGA) vs actual goals conceded -> Goals Prevented (PSxG delta).
    - Specific breakdown against top-tier attacks (high xG or high Elo).
    - Defensive lambda multiplier for model integration.
    """
    team_matches = []
    for m in matches:
        hid = _extract(m, "home_team_id")
        aid = _extract(m, "away_team_id")
        if hid == team_id or aid == team_id:
            team_matches.append(m)

    recent = team_matches[-window:] if len(team_matches) > window else team_matches
    n = len(recent)

    if n == 0:
        base_mult = backup_penalty_mult if is_backup else 1.0
        return GoalkeeperProfile(
            team_id=team_id,
            matches_evaluated=0,
            sot_faced_avg=4.0,
            saves_avg=2.8,
            save_pct=0.70,
            xg_faced_avg=1.30,
            goals_conceded_avg=1.20,
            goals_prevented_total=0.0,
            goals_prevented_per90=0.0,
            clean_sheets_count=0,
            clean_sheet_rate=0.25,
            vs_top_tier_matches=0,
            vs_top_tier_save_pct=0.68,
            vs_top_tier_goals_prevented=0.0,
            shot_stopping_grade="BACKUP" if is_backup else "SOLID",
            is_backup=is_backup,
            opponent_lambda_mult=base_mult,
            summary_ar="حارس احتياطي أو بيانات مباريات غير كافية (تقدير قياسي)" if is_backup else "مستوى تصديات قياسي متوازن",
        )

    tot_sot_faced = 0.0
    tot_conceded = 0.0
    tot_xg_faced = 0.0
    clean_sheets = 0

    # Top-tier metrics
    top_matches = 0
    top_sot_faced = 0.0
    top_conceded = 0.0
    top_xg_faced = 0.0

    ratings = ratings_map or {}

    for m in recent:
        is_home = (_extract(m, "home_team_id") == team_id)
        opp_id = _extract(m, "away_team_id") if is_home else _extract(m, "home_team_id")
        opp_elo = float(ratings.get(opp_id, 1500.0))

        if is_home:
            conceded = float(_extract(m, "away_goals") or 0.0)
            raw_sot = _extract(m, "sot_away")
            raw_shots = _extract(m, "shots_away")
            raw_xg = _extract(m, "xg_true_away") or _extract(m, "xg_away")
        else:
            conceded = float(_extract(m, "home_goals") or 0.0)
            raw_sot = _extract(m, "sot_home")
            raw_shots = _extract(m, "shots_home")
            raw_xg = _extract(m, "xg_true_home") or _extract(m, "xg_home")

        # SOT estimation fallback
        if raw_sot is not None:
            sot_faced = float(raw_sot)
        elif raw_shots is not None:
            sot_faced = max(conceded, float(raw_shots) * 0.33)
        else:
            sot_faced = conceded + 2.5

        sot_faced = max(sot_faced, conceded)

        # xG faced fallback
        if raw_xg is not None and float(raw_xg) > 0.0:
            xg_faced = float(raw_xg)
        else:
            xg_faced = max(0.2, sot_faced * 0.30)

        tot_sot_faced += sot_faced
        tot_conceded += conceded
        tot_xg_faced += xg_faced
        if conceded == 0.0:
            clean_sheets += 1

        # Check top-tier encounter (Opponent Elo >= 1600 or xG faced >= 1.6)
        if opp_elo >= 1600.0 or xg_faced >= 1.6:
            top_matches += 1
            top_sot_faced += sot_faced
            top_conceded += conceded
            top_xg_faced += xg_faced

    # Calculations
    sot_avg = tot_sot_faced / n
    conceded_avg = tot_conceded / n
    xg_faced_avg = tot_xg_faced / n
    saves_tot = max(0.0, tot_sot_faced - tot_conceded)
    saves_avg = saves_tot / n
    cs_rate = clean_sheets / n

    # Bayesian shrinkage for Save %: prior = 0.70 with weight M = 12 SOT
    prior_weight = 12.0
    save_pct = (saves_tot + 0.70 * prior_weight) / (tot_sot_faced + prior_weight)

    goals_prevented_tot = tot_xg_faced - tot_conceded
    goals_prevented_per90 = goals_prevented_tot / n

    # Top-tier performance
    if top_matches > 0 and top_sot_faced > 0:
        top_saves = max(0.0, top_sot_faced - top_conceded)
        top_save_pct = (top_saves + 0.68 * 6.0) / (top_sot_faced + 6.0)
        top_goals_prevented = top_xg_faced - top_conceded
    else:
        top_save_pct = save_pct * 0.95
        top_goals_prevented = goals_prevented_tot * 0.3

    # Grade determination with empirical Bayes shrinkage for small match sample sizes
    gp90_shrunk = goals_prevented_per90 * min(1.0, n / 8.0)
    if n >= 6 and save_pct >= 0.75 and gp90_shrunk >= 0.18:
        grade = "ELITE"
        lam_mult = 0.95
    elif n >= 4 and save_pct >= 0.72 and gp90_shrunk >= 0.04:
        grade = "ABOVE_AVERAGE"
        lam_mult = 0.975
    elif save_pct >= 0.67 and gp90_shrunk >= -0.08:
        grade = "SOLID"
        lam_mult = 1.00
    elif save_pct >= 0.62 or gp90_shrunk >= -0.20:
        grade = "VULNERABLE"
        lam_mult = 1.035
    else:
        grade = "ALARMING" if n >= 4 else "VULNERABLE"
        lam_mult = 1.07 if n >= 4 else 1.035

    if is_backup:
        lam_mult *= backup_penalty_mult
        grade = f"BACKUP_{grade}"

    # Human-readable Arabic summary
    summary_parts = []
    if is_backup:
        summary_parts.append("⚠️ حارس بديل يشارك أساسياً (خطر عدم الاستقرار في منطقة الجزاء)")
    elif grade == "ELITE":
        summary_parts.append(
            f"🧤 حارس نخبوي صلب: نسبة تصديات {int(save_pct*100)}% وأنقذ +{goals_prevented_tot:.1f} هدفاً فوق المتوقع"
        )
    elif grade == "ABOVE_AVERAGE":
        summary_parts.append(
            f"🧤 حارس مميز وموثوق: نسبة تصديات {int(save_pct*100)}% مع إنقاذ +{goals_prevented_tot:.1f} هدفاً"
        )
    elif grade == "SOLID":
        summary_parts.append(
            f"🧤 حارس بمستوى تصديات طبيعي ومتوازن (نسبة تصدٍ {int(save_pct*100)}%)"
        )
    elif grade == "VULNERABLE":
        summary_parts.append(
            f"⚠️ حارس هش تحت الضغط: استقبل أهدافاً تفوق الـ xG ({goals_prevented_tot:.1f}) ونسبة تصدٍ {int(save_pct*100)}%"
        )
    else:
        summary_parts.append(
            f"🚨 نقطة ضعف حرجة في الحراسة: تصديات منخفضة ({int(save_pct*100)}%) وتفريط بأهداف سهلة"
        )

    if top_matches >= 2:
        if top_save_pct >= 0.73:
            summary_parts.append(f"صامد أمام هجوم الكبار بنسبة تصدٍ {int(top_save_pct*100)}%")
        elif top_save_pct < 0.62:
            summary_parts.append(f"يعاني من اهتزاز واضح أمام هجوم الفرق الكبرى ({int(top_save_pct*100)}%)")

    summary_ar = " · ".join(summary_parts)

    return GoalkeeperProfile(
        team_id=team_id,
        matches_evaluated=n,
        sot_faced_avg=round(sot_avg, 2),
        saves_avg=round(saves_avg, 2),
        save_pct=round(save_pct, 3),
        xg_faced_avg=round(xg_faced_avg, 2),
        goals_conceded_avg=round(conceded_avg, 2),
        goals_prevented_total=round(goals_prevented_tot, 2),
        goals_prevented_per90=round(goals_prevented_per90, 3),
        clean_sheets_count=clean_sheets,
        clean_sheet_rate=round(cs_rate, 3),
        vs_top_tier_matches=top_matches,
        vs_top_tier_save_pct=round(top_save_pct, 3),
        vs_top_tier_goals_prevented=round(top_goals_prevented, 2),
        shot_stopping_grade=grade,
        is_backup=is_backup,
        opponent_lambda_mult=round(lam_mult, 4),
        summary_ar=summary_ar,
    )


def evaluate_goalkeeper_matchup(
    home_gk: GoalkeeperProfile,
    away_gk: GoalkeeperProfile,
    home_team: str = "المضيف",
    away_team: str = "الضيف",
) -> Dict[str, Any]:
    """
    Compares the two goalkeepers in a match and generates comparative notes
    and impact on match stability.
    """
    diff_save_pct = home_gk.save_pct - away_gk.save_pct
    diff_prevented = home_gk.goals_prevented_per90 - away_gk.goals_prevented_per90

    advantage = "EQUAL"
    if diff_save_pct >= 0.05 and diff_prevented >= 0.12:
        advantage = "HOME"
        adv_text = f"تفوق حراسة واضح لصالح {home_team} (+{int(diff_save_pct*100)}% تصديات)"
    elif diff_save_pct <= -0.05 and diff_prevented <= -0.12:
        advantage = "AWAY"
        adv_text = f"أفضلية حراسة مؤكدة لصالح {away_team} (+{int(abs(diff_save_pct)*100)}% تصديات)"
    else:
        adv_text = "مستوى حراسة متكافئ إحصائياً بين الطرفين"

    has_vulnerable_gk = (
        "VULNERABLE" in home_gk.shot_stopping_grade
        or "ALARMING" in home_gk.shot_stopping_grade
        or "VULNERABLE" in away_gk.shot_stopping_grade
        or "ALARMING" in away_gk.shot_stopping_grade
        or home_gk.is_backup
        or away_gk.is_backup
    )

    return {
        "home": home_gk.to_dict(),
        "away": away_gk.to_dict(),
        "advantage": advantage,
        "advantage_text": adv_text,
        "has_vulnerable_gk": has_vulnerable_gk,
        "home_lambda_def_mult": home_gk.opponent_lambda_mult,
        "away_lambda_def_mult": away_gk.opponent_lambda_mult,
    }
