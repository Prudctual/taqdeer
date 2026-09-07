"""
Anti-Randomness & Stability Analytics Engine (randomness_engine.py)

Comprehensive system to quantify, penalize, and strictly filter match and team randomness:
1. Chronic Draw / Draw Trap Risk (الفريق الأكثر تعادلاً ومصيدة التعادلات)
2. Second-Half Fragility & Collapse (الفريق الأضعف بالنصف الثاني / الانهيار المتأخر)
3. Disciplinary & Red Card Volatility (الفريق الذي يُطرد منه ومخاطر البطاقات)
4. Form Inconsistency & Goal Variance (تذبذب الفورم والنتائج)
5. Low-Goal Stalemate Entropy (عشوائية الشح التهديفي)
6. Composite Match Randomness Index (MRI 0-100) & Stability Rating (درجة الأمان)
7. Anti-Randomness Probability & Confidence Corrections
8. Strict Anti-Randomness Filtering (استبعاد المباريات عالية العشوائية)
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple


@dataclass
class TeamRandomnessStats:
    team_id: str
    matches_played: int
    draw_count: int
    draw_rate: float
    is_chronic_drawer: bool
    ht_goals_for_avg: float
    ht_goals_against_avg: float
    sh_goals_for_avg: float
    sh_goals_against_avg: float
    sh_goal_diff: float
    sh_fragility_ratio: float  # goals conceded in 2nd half / total goals conceded
    blown_leads_count: int
    is_second_half_fragile: bool
    red_cards_avg: float
    yellow_cards_avg: float
    fouls_avg: float
    disciplinary_risk_index: float
    is_card_prone: bool
    goal_margin_variance: float
    is_volatile_form: bool

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _extract_field(obj: Any, field: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if hasattr(obj, "__getitem__"):
        try:
            val = obj[field]
            return val if val is not None else default
        except (KeyError, IndexError, TypeError):
            pass
    val = getattr(obj, field, default)
    return val if val is not None else default


def compute_team_randomness_profile(
    team_id: str,
    matches: Sequence[Any],
    window: int = 20,
) -> TeamRandomnessStats:
    """
    Computes statistical randomness, draw frequency, 2nd half collapse tendencies,
    and disciplinary metrics from a sequence of historical matches for a team.
    Matches are expected in chronological order.
    """
    team_matches = []
    for m in matches:
        h_id = _extract_field(m, "home_team_id")
        a_id = _extract_field(m, "away_team_id")
        if h_id == team_id or a_id == team_id:
            team_matches.append(m)

    recent = team_matches[-window:] if len(team_matches) > window else team_matches
    n = len(recent)

    if n == 0:
        return TeamRandomnessStats(
            team_id=team_id,
            matches_played=0,
            draw_count=0,
            draw_rate=0.25,
            is_chronic_drawer=False,
            ht_goals_for_avg=0.6,
            ht_goals_against_avg=0.6,
            sh_goals_for_avg=0.7,
            sh_goals_against_avg=0.7,
            sh_goal_diff=0.0,
            sh_fragility_ratio=0.5,
            blown_leads_count=0,
            is_second_half_fragile=False,
            red_cards_avg=0.08,
            yellow_cards_avg=2.0,
            fouls_avg=11.0,
            disciplinary_risk_index=2.0,
            is_card_prone=False,
            goal_margin_variance=1.0,
            is_volatile_form=False,
        )

    draw_count = 0
    ht_gf_list: List[float] = []
    ht_ga_list: List[float] = []
    sh_gf_list: List[float] = []
    sh_ga_list: List[float] = []
    blown_leads = 0
    red_cards_list: List[float] = []
    yellow_cards_list: List[float] = []
    fouls_list: List[float] = []
    margins: List[float] = []

    for m in recent:
        is_home = (_extract_field(m, "home_team_id") == team_id)
        hg = _extract_field(m, "home_goals")
        ag = _extract_field(m, "away_goals")
        if hg is None or ag is None:
            continue

        hg = float(hg)
        ag = float(ag)
        gf = hg if is_home else ag
        ga = ag if is_home else hg
        margins.append(gf - ga)

        if hg == ag:
            draw_count += 1

        # Halftime and 2nd half analysis
        hthg = _extract_field(m, "ht_home_goals")
        htag = _extract_field(m, "ht_away_goals")
        if hthg is not None and htag is not None:
            hthg = float(hthg)
            htag = float(htag)
            ht_gf = hthg if is_home else htag
            ht_ga = htag if is_home else hthg
            sh_gf = max(0.0, gf - ht_gf)
            sh_ga = max(0.0, ga - ht_ga)

            ht_gf_list.append(ht_gf)
            ht_ga_list.append(ht_ga)
            sh_gf_list.append(sh_gf)
            sh_ga_list.append(sh_ga)

            # Check blown lead: leading at HT (ht_gf > ht_ga), but did not win at FT (gf <= ga)
            if ht_gf > ht_ga and gf <= ga:
                blown_leads += 1
        else:
            # Fallback estimation if HT data is unavailable for older matches (typically ~45% goals in 1H, 55% in 2H)
            ht_gf_list.append(gf * 0.45)
            ht_ga_list.append(ga * 0.45)
            sh_gf_list.append(gf * 0.55)
            sh_ga_list.append(ga * 0.55)

        # Cards & Fouls
        rc = _extract_field(m, "red_home" if is_home else "red_away")
        yc = _extract_field(m, "yellow_home" if is_home else "yellow_away")
        fl = _extract_field(m, "fouls_home" if is_home else "fouls_away")

        red_cards_list.append(float(rc) if rc is not None else 0.0)
        yellow_cards_list.append(float(yc) if yc is not None else 1.8)
        fouls_list.append(float(fl) if fl is not None else 11.5)

    valid_n = len(margins)
    if valid_n == 0:
        return TeamRandomnessStats(
            team_id=team_id,
            matches_played=0,
            draw_count=0,
            draw_rate=0.25,
            is_chronic_drawer=False,
            ht_goals_for_avg=0.6,
            ht_goals_against_avg=0.6,
            sh_goals_for_avg=0.7,
            sh_goals_against_avg=0.7,
            sh_goal_diff=0.0,
            sh_fragility_ratio=0.5,
            blown_leads_count=0,
            is_second_half_fragile=False,
            red_cards_avg=0.08,
            yellow_cards_avg=2.0,
            fouls_avg=11.0,
            disciplinary_risk_index=2.0,
            is_card_prone=False,
            goal_margin_variance=1.0,
            is_volatile_form=False,
        )

    draw_rate = draw_count / valid_n
    is_chronic = bool((draw_rate >= 0.28 and valid_n >= 5) or (draw_rate >= 0.35 and valid_n >= 3))

    ht_gf_avg = sum(ht_gf_list) / valid_n
    ht_ga_avg = sum(ht_ga_list) / valid_n
    sh_gf_avg = sum(sh_gf_list) / valid_n
    sh_ga_avg = sum(sh_ga_list) / valid_n
    sh_gd = sh_gf_avg - sh_ga_avg

    tot_ga = ht_ga_avg + sh_ga_avg
    # Protected fragility ratio: avoid division by zero or inflating trivial goal counts (e.g. 0 HT, 1 SH across 20 matches)
    sh_fragility_ratio = (sh_ga_avg / tot_ga) if tot_ga >= 0.20 else 0.50

    # Second half fragile: concedes >= 60% of goals in 2H and averages >= 0.65 goals conceded in 2H,
    # or blew multiple leads with negative 2H differential, or severe negative 2H differential
    is_sh_fragile = bool(
        (sh_fragility_ratio >= 0.60 and sh_ga_avg >= 0.65 and tot_ga >= 0.80)
        or (blown_leads >= 2 and sh_gd < -0.20)
        or (sh_gd <= -0.45 and sh_ga_avg >= 0.70)
    )

    rc_avg = sum(red_cards_list) / valid_n
    yc_avg = sum(yellow_cards_list) / valid_n
    fl_avg = sum(fouls_list) / valid_n

    # Disciplinary Risk Index (DRI): baseline is ~2.0
    dri = (rc_avg * 6.0) + (yc_avg * 1.0) + (fl_avg * 0.08)
    is_card_prone = bool(rc_avg >= 0.12 or dri >= 3.0 or (yc_avg >= 2.7 and fl_avg >= 13.0))

    # Margin Variance
    mean_margin = sum(margins) / valid_n
    margin_var = sum((m - mean_margin) ** 2 for m in margins) / valid_n
    is_volatile = bool(margin_var >= 3.0 and valid_n >= 5)

    return TeamRandomnessStats(
        team_id=team_id,
        matches_played=valid_n,
        draw_count=draw_count,
        draw_rate=float(round(draw_rate, 3)),
        is_chronic_drawer=is_chronic,
        ht_goals_for_avg=float(round(ht_gf_avg, 2)),
        ht_goals_against_avg=float(round(ht_ga_avg, 2)),
        sh_goals_for_avg=float(round(sh_gf_avg, 2)),
        sh_goals_against_avg=float(round(sh_ga_avg, 2)),
        sh_goal_diff=float(round(sh_gd, 2)),
        sh_fragility_ratio=float(round(sh_fragility_ratio, 3)),
        blown_leads_count=blown_leads,
        is_second_half_fragile=is_sh_fragile,
        red_cards_avg=float(round(rc_avg, 3)),
        yellow_cards_avg=float(round(yc_avg, 2)),
        fouls_avg=float(round(fl_avg, 1)),
        disciplinary_risk_index=float(round(dri, 2)),
        is_card_prone=is_card_prone,
        goal_margin_variance=float(round(margin_var, 2)),
        is_volatile_form=is_volatile,
    )


def evaluate_match_randomness(
    *,
    home_team: str,
    away_team: str,
    home_stats: TeamRandomnessStats,
    away_stats: TeamRandomnessStats,
    referee_profile: Optional[Dict[str, Any]] = None,
    total_expected_goals: float = 2.6,
    elo_diff: float = 100.0,
    top_prob: float = 0.50,
    draw_baseline: float = 0.25,
    home_gk: Optional[Any] = None,
    away_gk: Optional[Any] = None,
    tactics: Optional[Dict[str, Any]] = None,
    home_mgr: Optional[Any] = None,
    away_mgr: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Evaluates total match randomness across all dimensions and generates:
    1. Match Randomness Index (MRI: 0 to 100)
    2. Stability Score (100 - MRI)
    3. Dimension breakdowns: Draw Trap, 2nd Half Fragility, Disciplinary, Volatility
    4. Anti-randomness verdict and actionable Arabic recommendations
    5. Mathematical correction multipliers for temperature and confidence damping
    """
    ref_strictness = 1.0
    ref_avg_reds = 0.08
    if referee_profile:
        try:
            if referee_profile.get("strictness") is not None:
                ref_strictness = float(referee_profile["strictness"])
            if referee_profile.get("avg_reds") is not None:
                ref_avg_reds = float(referee_profile["avg_reds"])
        except Exception:
            ref_strictness = 1.0

    # 1. Chronic Draw & Draw Trap Component (Weight 0.28)
    # -------------------------------------------------------------
    avg_draw_rate = (home_stats.draw_rate + away_stats.draw_rate) / 2.0
    draw_propensity = avg_draw_rate / max(0.15, draw_baseline)

    is_tight_match = (elo_diff <= 65 or top_prob <= 0.46)
    is_low_goals = (total_expected_goals <= 2.20)

    draw_trap_active = False
    draw_trap_severity = "LOW"
    draw_trap_reason = "معدل التعادل طبيعي ضمن متوسط الدوري"

    both_chronic = (home_stats.is_chronic_drawer and away_stats.is_chronic_drawer)
    either_extreme = (home_stats.draw_rate >= 0.38 or away_stats.draw_rate >= 0.38)

    if both_chronic or (either_extreme and (is_tight_match or is_low_goals)):
        draw_trap_active = True
        draw_trap_severity = "CRITICAL"
        draw_trap_reason = (
            f"مواجهة مصيدة تعادلات حرجة: نزعة تعادل مزمنة وتكافؤ فني "
            f"(مضيف {int(home_stats.draw_rate*100)}% · ضيف {int(away_stats.draw_rate*100)}%)"
        )
    elif (home_stats.is_chronic_drawer or away_stats.is_chronic_drawer) and (is_tight_match or is_low_goals or draw_propensity >= 1.25):
        draw_trap_active = True
        draw_trap_severity = "HIGH"
        draw_trap_reason = (
            f"فخ تعادل مرتفع: أحد الفريقين يتعادل في {int(max(home_stats.draw_rate, away_stats.draw_rate)*100)}% "
            f"من مبارياته مع تقارب القوى وشح الأهداف"
        )
    elif draw_propensity >= 1.20 or (is_tight_match and is_low_goals):
        draw_trap_active = True
        draw_trap_severity = "MODERATE"
        draw_trap_reason = "تقارب الفوارق الفنية وانخفاض معدل الأهداف المتوقع يرفع احتمالية التعادل العشوائي"

    draw_score = min(1.0, max(0.0, (avg_draw_rate - 0.20) / 0.20))
    if draw_trap_severity == "CRITICAL":
        draw_score = max(draw_score, 0.95)
    elif draw_trap_severity == "HIGH":
        draw_score = max(draw_score, 0.75)
    elif draw_trap_severity == "MODERATE":
        draw_score = max(draw_score, 0.45)

    if tactics and tactics.get("low_block_trap_warning"):
        draw_trap_active = True
        if draw_trap_severity in ("LOW", "MODERATE"):
            draw_trap_severity = "HIGH"
            draw_trap_reason = str(tactics.get("matchup_commentary") or "فخ تكتل دفاعي مغلق يرفع احتمالية التعادل العشوائي")
            draw_score = max(draw_score, 0.75)

    # 2. Second-Half Fragility & Collapse (Weight 0.28)
    # -------------------------------------------------------------
    sh_fragile_active = False
    sh_asymmetry = False
    sh_severity = "LOW"
    sh_reason = "توازن نسبي في توزيع الأداء والأهداف بين الشوطين"

    home_sh_fragile = home_stats.is_second_half_fragile
    away_sh_fragile = away_stats.is_second_half_fragile

    if home_sh_fragile and away_sh_fragile:
        sh_fragile_active = True
        sh_severity = "CRITICAL" if (home_stats.blown_leads_count + away_stats.blown_leads_count >= 3 or (home_stats.sh_goal_diff < -0.35 and away_stats.sh_goal_diff < -0.35)) else "HIGH"
        sh_reason = (
            f"انهيار دفاعي متأخر لكلا الفريقين بعد الاستراحة "
            f"({home_team}: {int(home_stats.sh_fragility_ratio*100)}% · {away_team}: {int(away_stats.sh_fragility_ratio*100)}%) "
            f"— تقلبات شوط ثانٍ حادة وتراجع لياقي يرفع عشوائية أهداف الدقائق الأخيرة"
        )
    elif home_sh_fragile and away_stats.sh_goals_for_avg >= 0.75:
        sh_fragile_active = True
        sh_asymmetry = True
        sh_severity = "HIGH"
        sh_reason = (
            f"هشاشة متأخرة للمضيف ({home_team}): يستقبل {int(home_stats.sh_fragility_ratio*100)}% من أهدافه بالشوط الثاني "
            f"مقابل قدرة الضيف على التسجيل المتأخر ({away_stats.sh_goals_for_avg:.1f} هدف/شوط 2)"
        )
    elif away_sh_fragile and home_stats.sh_goals_for_avg >= 0.75:
        sh_fragile_active = True
        sh_asymmetry = True
        sh_severity = "HIGH"
        sh_reason = (
            f"انهيار دفاعي متأخر للضيف ({away_team}): يستقبل {int(away_stats.sh_fragility_ratio*100)}% من أهدافه بالشوط الثاني "
            f"مما يهدد صموده في الدقائق 60-90 أمام هجوم المضيف"
        )
    elif home_sh_fragile or away_sh_fragile:
        sh_fragile_active = True
        sh_severity = "MODERATE"
        fragile_team = home_team if home_sh_fragile else away_team
        ratio = home_stats.sh_fragility_ratio if home_sh_fragile else away_stats.sh_fragility_ratio
        sh_reason = f"تراجع بدني وتكتيكي في الشوط الثاني لنادي {fragile_team} (يستقبل {int(ratio*100)}% من أهدافه بعد الاستراحة)"

    sh_score = 0.10
    if sh_severity == "CRITICAL":
        sh_score = 0.95
    elif sh_severity == "HIGH":
        sh_score = 0.75
    elif sh_severity == "MODERATE":
        sh_score = 0.45

    # 3. Disciplinary & Red Card Volatility (Weight 0.22)
    # -------------------------------------------------------------
    combined_dri = (home_stats.disciplinary_risk_index + away_stats.disciplinary_risk_index) / 2.0
    scaled_card_shock = combined_dri * max(0.8, min(1.4, ref_strictness))

    card_shock_warning = False
    card_severity = "LOW"
    card_reason = "مستوى انضباط طبيعي وتحكيم متوازن"

    both_card_prone = home_stats.is_card_prone and away_stats.is_card_prone
    any_card_prone = home_stats.is_card_prone or away_stats.is_card_prone
    is_ref_strict = bool(ref_strictness >= 1.18 or ref_avg_reds >= 0.20)

    if both_card_prone and is_ref_strict:
        card_shock_warning = True
        card_severity = "CRITICAL"
        card_reason = (
            f"صدام انضباطي ناري: كلا الفريقين ({home_team} و{away_team}) معرض للطرد "
            f"بإدارة حكم صارم (صرامة {ref_strictness:.2f} · طرد {ref_avg_reds:.2f}) — خطر نقص عددي حرج"
        )
    elif both_card_prone or (any_card_prone and is_ref_strict):
        card_shock_warning = True
        card_severity = "HIGH"
        prone_desc = f"{home_team} و{away_team}" if both_card_prone else (home_team if home_stats.is_card_prone else away_team)
        card_reason = (
            f"مواجهة عدوانية البطاقات ({prone_desc}) "
            f"— معدل طرد وإنذارات مرتفع يرفع مخاطر التحولات المفاجئة"
        )
    elif any_card_prone or scaled_card_shock >= 3.8:
        card_shock_warning = True
        card_severity = "MODERATE"
        prone_team = home_team if home_stats.is_card_prone else away_team
        card_reason = f"سجل بطاقات فوق المتوسط لنادي {prone_team} (يتطلب حيطة اعتيادية)"

    card_score = min(1.0, max(0.0, (scaled_card_shock - 3.0) / 2.2))
    if card_severity == "CRITICAL":
        card_score = max(card_score, 0.95)
    elif card_severity == "HIGH":
        card_score = max(card_score, 0.70)
    elif card_severity == "MODERATE":
        card_score = max(card_score, 0.40)

    # 4. Form Inconsistency & Volatility (Weight 0.12)
    # -------------------------------------------------------------
    avg_var = (home_stats.goal_margin_variance + away_stats.goal_margin_variance) / 2.0
    volatility_score = min(1.0, max(0.0, (avg_var - 1.2) / 3.0))
    vol_reason = "استقرار جيد في نتائج الفريقين السابقة"
    if home_stats.is_volatile_form or away_stats.is_volatile_form:
        vol_reason = "تذبذب حاد في هوامش الفوز والخسارة وتفاوت غير مستقر في مستوى الفريقين"

    gk_risk_active = False
    gk_risk_reason = "مستوى حراسة مستقر ولا توجد مؤشرات قلق"
    if home_gk or away_gk:
        h_grade = str(getattr(home_gk, "shot_stopping_grade", "") or "")
        a_grade = str(getattr(away_gk, "shot_stopping_grade", "") or "")
        h_backup = bool(getattr(home_gk, "is_backup", False))
        a_backup = bool(getattr(away_gk, "is_backup", False))
        if "ALARMING" in h_grade or "ALARMING" in a_grade or (h_backup and is_tight_match) or (a_backup and is_tight_match):
            gk_risk_active = True
            gk_risk_reason = "مخاطر حراسة حادة: حارس بديل أو تصديات منخفضة تزيد احتمالية استقبال أهداف سهلة ومفاجئة"
            volatility_score = min(1.0, volatility_score + 0.25)
        elif "VULNERABLE" in h_grade or "VULNERABLE" in a_grade or h_backup or a_backup:
            gk_risk_active = True
            gk_risk_reason = "تحذير حراسة: أحد الحارسين يعاني من اهتزاز في التصديات تحت الضغط"
            volatility_score = min(1.0, volatility_score + 0.12)

    mgr_bounce_active = False
    mgr_reason = "استقرار فني وإداري في كلا الفريقين"
    if (home_mgr and getattr(home_mgr, "is_new_manager_bounce", False)) or (away_mgr and getattr(away_mgr, "is_new_manager_bounce", False)):
        mgr_bounce_active = True
        mgr_reason = "تأثير تغيير المدرب الجديد: دافعية وحماس تكتيكي مع تذبذب محتمل في المنظومة"
        volatility_score = min(1.0, volatility_score + 0.10)

    # 5. Low-Goal / Stalemate Entropy (Weight 0.10)
    # -------------------------------------------------------------
    low_goal_score = min(1.0, max(0.0, (2.40 - total_expected_goals) / 1.0))

    # Composite Match Randomness Index (MRI 0-100)
    # -------------------------------------------------------------
    raw_mri = 100.0 * (
        0.28 * draw_score
        + 0.28 * sh_score
        + 0.22 * card_score
        + 0.12 * volatility_score
        + 0.10 * low_goal_score
    )

    # Strict Pillar Floors: A critical failure on any pillar must not be washed away by other pillars
    if draw_trap_severity == "CRITICAL" or card_severity == "CRITICAL" or sh_severity == "CRITICAL":
        raw_mri = max(raw_mri, 74.0)
    elif [draw_trap_severity, card_severity, sh_severity].count("HIGH") >= 2:
        raw_mri = max(raw_mri, 65.0)
    elif draw_trap_severity == "HIGH" or card_severity == "HIGH" or sh_severity == "HIGH":
        raw_mri = max(raw_mri, 50.0)

    mri = max(5, min(98, int(round(raw_mri))))
    stability_score = 100 - mri

    # Verdict & Strict Anti-Randomness Filter Action
    # -------------------------------------------------------------
    if mri >= 72 or draw_trap_severity == "CRITICAL" or card_severity == "CRITICAL" or sh_severity == "CRITICAL":
        verdict = "STRICT_EXCLUDE"
        verdict_ar = "استبعاد صارم (عالية العشوائية)"
        is_strictly_excluded = True
        rec_ar = (
            "⚠️ استبعاد صارم من الرهانات والتراكميات (Parlay) — المباراة محاطة بعشوائية عاتية "
            "(فخ تعادل أو خطر طرد أو انهيار متأخر) تجعل النماذج غير موثوقة هنا."
        )
    elif mri >= 55 or draw_trap_severity == "HIGH" or sh_severity == "HIGH":
        verdict = "RANDOMNESS_CAUTION"
        verdict_ar = "تنبيه عشوائية (احذر فخ التعادل أو تقلب الشوط 2 أو البطاقات)"
        is_strictly_excluded = False
        if draw_trap_active:
            rec_ar = "💡 تجنب الفوز الصريح المباشر؛ يُوصى بتغطية التعادل عبر الفرصة المزدوجة (1X أو X2)."
        elif sh_asymmetry:
            rec_ar = "💡 احذر من تقلبات الشوط الثاني والأهداف المتأخرة؛ التوقع المسبق يواجه خطورة تبخر التقدم."
        elif card_shock_warning:
            rec_ar = "💡 مخاطر بطاقات وطرد مرتفعة؛ تجنب الرهانات الفردية الكبيرة على الفائز."
        else:
            rec_ar = "💡 عشوائية فوق المتوسط؛ خفّض حجم الرهان وتجنب إضافتها في قوائم البارلي الحساسة."
    elif mri >= 40:
        verdict = "MODERATE_UNCERTAINTY"
        verdict_ar = "توازن معتدل"
        is_strictly_excluded = False
        rec_ar = "مباراة ضمن النطاق الإحصائي الطبيعي؛ تابع الإشارات مع إدارة مخاطر اعتيادية."
    else:
        verdict = "SAFE_STABLE"
        verdict_ar = "مستقرة إحصائياً (أمان مرتفع)"
        is_strictly_excluded = False
        rec_ar = "✅ استقرار إحصائي ممتاز؛ تماسك فني وانخفاض في فخاخ التعادل والطرد؛ مناسبة للترشيحات الموثوقة."

    # Goal Market Analytics & Recommendation (/goal)
    if is_low_goals and draw_trap_active:
        goal_rec_ar = "ترجيح شح الأهداف (أقل من 2.5) مع استبعاد مراهنات الفوز الصريح"
    elif sh_severity in ("HIGH", "CRITICAL"):
        goal_rec_ar = "احذر تقلبات الأهداف المتأخرة والانهيار الدفاعي بعد الاستراحة"
    elif total_expected_goals >= 3.0:
        goal_rec_ar = "معدل تهديفي مفتوح — الأهداف المتوقعة أعلى من المعدل العام"
    else:
        goal_rec_ar = "معدل أهداف متوازن ومتسق مع ديناميكية الدوري"

    # Mathematical adjustments for the ensemble (/boost and /goal)
    # Temperature inflation pulls overconfident probabilities towards maximum entropy
    temp_mult = 1.0
    if mri >= 52:
        temp_mult = 1.0 + 0.40 * ((mri - 52.0) / 48.0)

    # Confidence damping reduces raw confidence score
    conf_mult = max(0.60, 1.0 - 0.40 * (mri / 100.0))

    # Direct Draw boost calibration if draw trap is active
    draw_boost = 0.0
    if draw_trap_severity == "CRITICAL":
        draw_boost = 0.08
    elif draw_trap_severity == "HIGH":
        draw_boost = 0.05
    elif draw_trap_severity == "MODERATE":
        draw_boost = 0.03

    return {
        "match_randomness_index": mri,
        "stability_score": stability_score,
        "verdict": verdict,
        "verdict_ar": verdict_ar,
        "is_strictly_excluded": is_strictly_excluded,
        "recommended_action_ar": rec_ar,
        "goal_recommendation_ar": goal_rec_ar,
        "multipliers": {
            "temperature_mult": float(round(temp_mult, 3)),
            "confidence_mult": float(round(conf_mult, 3)),
            "draw_boost": float(round(draw_boost, 3)),
        },
        "pillars": {
            "draw_trap": {
                "active": draw_trap_active,
                "severity": draw_trap_severity,
                "score": float(round(draw_score, 2)),
                "home_draw_rate": home_stats.draw_rate,
                "away_draw_rate": away_stats.draw_rate,
                "avg_draw_rate": float(round(avg_draw_rate, 3)),
                "is_chronic_drawer_home": home_stats.is_chronic_drawer,
                "is_chronic_drawer_away": away_stats.is_chronic_drawer,
                "reason_ar": draw_trap_reason,
            },
            "second_half_fragility": {
                "active": sh_fragile_active,
                "severity": sh_severity,
                "score": float(round(sh_score, 2)),
                "home_fragile": home_sh_fragile,
                "away_fragile": away_sh_fragile,
                "home_sh_ga_avg": home_stats.sh_goals_against_avg,
                "away_sh_ga_avg": away_stats.sh_goals_against_avg,
                "home_sh_ratio": home_stats.sh_fragility_ratio,
                "away_sh_ratio": away_stats.sh_fragility_ratio,
                "asymmetry_warning": sh_asymmetry,
                "reason_ar": sh_reason,
            },
            "disciplinary_risk": {
                "active": card_shock_warning,
                "severity": card_severity,
                "score": float(round(card_score, 2)),
                "combined_dri": float(round(combined_dri, 2)),
                "referee_strictness": float(round(ref_strictness, 2)),
                "referee_avg_reds": float(round(ref_avg_reds, 3)),
                "home_red_rate": home_stats.red_cards_avg,
                "away_red_rate": away_stats.red_cards_avg,
                "home_card_prone": home_stats.is_card_prone,
                "away_card_prone": away_stats.is_card_prone,
                "reason_ar": card_reason,
            },
            "volatility_risk": {
                "score": float(round(volatility_score, 2)),
                "home_variance": home_stats.goal_margin_variance,
                "away_variance": away_stats.goal_margin_variance,
                "reason_ar": vol_reason,
            },
            "low_goal_entropy": {
                "score": float(round(low_goal_score, 2)),
                "total_expected_goals": float(round(total_expected_goals, 2)),
                "is_tight_match": is_tight_match,
            },
            "goalkeeper_risk": {
                "active": gk_risk_active,
                "reason_ar": gk_risk_reason,
                "home_grade": str(getattr(home_gk, "shot_stopping_grade", "SOLID") if home_gk else "SOLID"),
                "away_grade": str(getattr(away_gk, "shot_stopping_grade", "SOLID") if away_gk else "SOLID"),
                "home_is_backup": bool(getattr(home_gk, "is_backup", False) if home_gk else False),
                "away_is_backup": bool(getattr(away_gk, "is_backup", False) if away_gk else False),
            },
            "tactical_clash": {
                "active": bool(tactics.get("low_block_trap_warning", False) if tactics else False),
                "clash_type": str(tactics.get("tactical_clash_type", "BALANCED") if tactics else "BALANCED"),
                "is_low_block": bool(tactics.get("is_low_block_matchup", False) if tactics else False),
                "advantage": str(tactics.get("style_advantage", "NEUTRAL") if tactics else "NEUTRAL"),
                "commentary_ar": str(tactics.get("matchup_commentary", "") if tactics else ""),
            },
            "manager_transition": {
                "active": mgr_bounce_active,
                "reason_ar": mgr_reason,
                "home_bounce": bool(getattr(home_mgr, "is_new_manager_bounce", False) if home_mgr else False),
                "away_bounce": bool(getattr(away_mgr, "is_new_manager_bounce", False) if away_mgr else False),
            },
        },
    }
