"""نموذج 2: موثوقية ترشيح الفوز المباشر — 30 عاملاً في 6 مجموعات.

لا يغيّر احتمالات النموذج 1. العامل الغائب يُستبعد من المتوسط ولا يُختلق.
رتبة العامل 5 تُملأ في تمرير اللائحة (score_slate).
"""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple


GROUP_WEIGHTS: Dict[int, float] = {1: 0.28, 2: 0.18, 3: 0.16, 4: 0.10, 5: 0.14, 6: 0.14}
MIN_COVERAGE = 20
DIRECT_WIN_MIN_P = 0.44
DIRECT_WIN_MIN_GAP = 0.04
MRI_MAX = 60.0

GROUP_META: Dict[int, Dict[str, str]] = {
    1: {"title": "مخرجات النموذج الأول", "id": "model1"},
    2: {"title": "قوة الفريق واللاعبين", "id": "team"},
    3: {"title": "الدفاع وحارس المرمى", "id": "defense"},
    4: {"title": "الأخطاء والانضباط", "id": "discipline"},
    5: {"title": "المدرب والتكتيك", "id": "tactics"},
    6: {"title": "المواجهات والظروف", "id": "context"},
}

FACTOR_META: Dict[int, Tuple[int, str]] = {
    1: (1, "احتمال فوز المرشح"),
    2: (1, "احتمال التعادل"),
    3: (1, "احتمال فوز الخصم"),
    4: (1, "الفارق بين احتمالات الفوز"),
    5: (1, "ترتيب التوقع في اللائحة"),
    6: (2, "قوة الفريق Elo"),
    7: (2, "فرق xG"),
    8: (2, "فارق الأهداف والأداء الهجومي"),
    9: (2, "أداء الأرض أو الخارج"),
    10: (2, "قوة اللاعبين والغيابات"),
    11: (3, "قوة حارس المرمى"),
    12: (3, "الحارس أمام الهجمات القوية"),
    13: (3, "قوة خط الدفاع"),
    14: (3, "احتمال استقبال هدف"),
    15: (3, "استقرار الدفاع"),
    16: (4, "متوسط البطاقات الصفراء"),
    17: (4, "معدل البطاقات الحمراء"),
    18: (4, "الأخطاء المرتكبة"),
    19: (4, "مؤشر خطر الطرد"),
    20: (4, "تأثير الحكم"),
    21: (5, "أداء المدرب"),
    22: (5, "المواجهة التكتيكية"),
    23: (5, "تأثير التبديلات (وكيل الشوط الثاني)"),
    24: (5, "تنفيذ الخطة التكتيكية"),
    25: (5, "الأداء ضد أنواع الخصوم"),
    26: (6, "المواجهات المباشرة"),
    27: (6, "الأداء أمام خصوم مشابهين"),
    28: (6, "الراحة والازدحام 7/14/30"),
    29: (6, "السفر وأهمية المباراة"),
    30: (6, "حركة الـOdds"),
}


def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return float(min(hi, max(lo, x)))


def _lerp(x: Optional[float], x0: float, x1: float, y0: float, y1: float) -> Optional[float]:
    if x is None:
        return None
    if x1 == x0:
        return y0
    t = (float(x) - x0) / (x1 - x0)
    return y0 + t * (y1 - y0)


def _get(obj: Any, *path: str, default: Any = None) -> Any:
    cur = obj
    for key in path:
        if cur is None:
            return default
        if isinstance(cur, Mapping):
            cur = cur.get(key, default if key == path[-1] else None)
        else:
            cur = getattr(cur, key, default if key == path[-1] else None)
    return default if cur is None else cur


def _f(obj: Any, *path: str) -> Optional[float]:
    val = _get(obj, *path)
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _factor(
    n: int,
    score: Optional[float],
    value: Any,
    label: Optional[str] = None,
    *,
    available: Optional[bool] = None,
) -> Dict[str, Any]:
    group, title = FACTOR_META[n]
    ok = bool(available) if available is not None else score is not None
    return {
        "id": n,
        "group": group,
        "title": title,
        "score": None if not ok or score is None else round(_clamp(score), 1),
        "value": value,
        "label": label,
        "available": ok,
    }


def resolve_pick(
    p_home: float, p_draw: float, p_away: float
) -> Dict[str, Any]:
    sides = [("H", float(p_home)), ("D", float(p_draw)), ("A", float(p_away))]
    ranked = sorted(sides, key=lambda x: x[1], reverse=True)
    top_key, top_p = ranked[0]
    second_p = ranked[1][1]
    if top_key == "D":
        pick = "H" if p_home >= p_away else "A"
        p_pick = p_home if pick == "H" else p_away
        is_direct = False
    else:
        pick = top_key
        p_pick = top_p
        is_direct = True
    p_opp = float(p_away if pick == "H" else p_home)
    return {
        "pick": pick,
        "p_pick": float(p_pick),
        "p_draw": float(p_draw),
        "p_opp": p_opp,
        "gap": float(top_p - second_p),
        "is_direct_top": is_direct,
    }


def candidate_reason(pred: Mapping[str, Any]) -> Optional[str]:
    p_home = float(pred.get("p_home") or 0)
    p_draw = float(pred.get("p_draw") or 0)
    p_away = float(pred.get("p_away") or 0)
    info = resolve_pick(p_home, p_draw, p_away)
    rand = pred.get("randomness") or _get(pred, "components", "randomness") or {}
    mri = _f(rand, "match_randomness_index")
    if mri is None:
        mri = _f(pred, "match_randomness_index")
    excluded = bool(
        pred.get("is_strictly_excluded")
        or rand.get("is_strictly_excluded")
        or rand.get("verdict") == "STRICT_EXCLUDE"
    )
    if excluded:
        return "استبعاد صارم بسبب العشوائية"
    if mri is not None and mri >= MRI_MAX:
        return "مؤشر العشوائية مرتفع"
    if not info["is_direct_top"]:
        return "التوقع الأعلى تعادل"
    if info["p_pick"] < DIRECT_WIN_MIN_P:
        return "احتمال الفوز دون 44٪"
    if info["gap"] < DIRECT_WIN_MIN_GAP:
        return "فجوة الحسم دون 4٪"
    return None


def is_direct_win_candidate(pred: Mapping[str, Any]) -> bool:
    return candidate_reason(pred) is None


def _pick_block(pred: Mapping[str, Any], key: str, home_key: str, away_key: str) -> Any:
    pick = resolve_pick(
        float(pred.get("p_home") or 0),
        float(pred.get("p_draw") or 0),
        float(pred.get("p_away") or 0),
    )["pick"]
    block = _get(pred, "components", key) or {}
    if pick == "H":
        return block.get(home_key) if isinstance(block, Mapping) else None
    return block.get(away_key) if isinstance(block, Mapping) else None


def _score_factors(
    pred: Mapping[str, Any],
    *,
    slate_rank: Optional[int] = None,
    slate_n: Optional[int] = None,
) -> List[Dict[str, Any]]:
    comps = pred.get("components") or {}
    p_home = float(pred.get("p_home") or 0)
    p_draw = float(pred.get("p_draw") or 0)
    p_away = float(pred.get("p_away") or 0)
    info = resolve_pick(p_home, p_draw, p_away)
    pick = info["pick"]
    p_pick = info["p_pick"]
    p_opp = info["p_opp"]
    gap = info["gap"]
    is_home_pick = pick == "H"

    # --- 1–5 ---
    f1 = _factor(1, _lerp(p_pick, 0.40, 0.72, 38, 94), round(p_pick, 4), f"{p_pick * 100:.1f}٪")
    f2 = _factor(2, _lerp(p_draw, 0.18, 0.36, 88, 22), round(p_draw, 4), f"{p_draw * 100:.1f}٪")
    f3 = _factor(3, _lerp(p_opp, 0.12, 0.40, 90, 24), round(p_opp, 4), f"{p_opp * 100:.1f}٪")
    f4 = _factor(4, _lerp(gap, 0.04, 0.28, 42, 94), round(gap, 4), f"{gap * 100:.1f} نقطة")
    if slate_rank and slate_n and slate_n > 1:
        pctile = 1.0 - (slate_rank - 1) / (slate_n - 1)
        f5 = _factor(5, 28 + 72 * pctile, slate_rank, f"{slate_rank} / {slate_n}")
    else:
        f5 = _factor(5, None, None, "بانتظار ترتيب اللائحة", available=False)

    # --- 6 Elo ---
    ratings = _get(comps, "elo", "ratings")
    if isinstance(ratings, (list, tuple)) and len(ratings) >= 2:
        elo_h = float(ratings[0])
        elo_a = float(ratings[1])
    else:
        elo_h = _f(pred, "elo_home")
        elo_a = _f(pred, "elo_away")
    if elo_h is not None and elo_a is not None:
        diff = (elo_h - elo_a) if is_home_pick else (elo_a - elo_h)
        f6 = _factor(6, _lerp(diff, -120, 220, 22, 94), round(diff, 1), f"{diff:+.0f} Elo")
    else:
        f6 = _factor(6, None, None, available=False)

    # --- 7 xG ---
    tx = _get(comps, "true_xg_dc", "lambda")
    sh = _get(comps, "shots_dc", "lambda")
    dc_lam = _get(comps, "dixon_coles", "lambda") or _get(comps, "context", "lambda")
    xg_pair = None
    xg_src = None
    for pair, src in ((tx, "xG تتبّعي"), (sh, "تسديدات"), (dc_lam, "DC")):
        if isinstance(pair, (list, tuple)) and len(pair) >= 2:
            xg_pair = (float(pair[0]), float(pair[1]))
            xg_src = src
            break
    if xg_pair:
        xg_diff = (xg_pair[0] - xg_pair[1]) if is_home_pick else (xg_pair[1] - xg_pair[0])
        f7 = _factor(7, _lerp(xg_diff, -0.9, 1.1, 24, 92), round(xg_diff, 3), f"{xg_diff:+.2f} · {xg_src}")
    else:
        f7 = _factor(7, None, None, available=False)

    # --- 8 goals / attack ---
    gf_h = _f(comps, "form", "home_pts")
    # prefer actual gf/ga if stored; else use gd + pts as proxy
    home_gd = _f(comps, "form", "home_gd")
    away_gd = _f(comps, "form", "away_gd")
    if home_gd is not None and away_gd is not None:
        gd = home_gd if is_home_pick else away_gd
        f8 = _factor(8, _lerp(gd, -1.2, 1.6, 22, 92), round(gd, 3), f"فورم GD {gd:+.2f}")
    else:
        f8 = _factor(8, None, None, available=False)

    # --- 9 venue ---
    venue = _get(comps, "venue_split") or {}
    v_pick = venue.get("home" if is_home_pick else "away") if isinstance(venue, Mapping) else None
    if isinstance(v_pick, Mapping) and float(v_pick.get("available") or 0) > 0 and float(v_pick.get("played") or 0) >= 3:
        wr = float(v_pick.get("win_rate") or 0)
        f9 = _factor(9, _lerp(wr, 0.20, 0.72, 28, 92), wr, f"فوز {wr * 100:.0f}٪ من {int(v_pick['played'])}")
    else:
        f9 = _factor(9, None, None, available=False)

    # --- 10 players ---
    pi = _get(comps, "player_impact") or {}
    if isinstance(pi, Mapping) and (pi.get("applied") or pi.get("home") or pi.get("away")):
        side = pi.get("home") if is_home_pick else pi.get("away")
        atk = _f(side, "attack_penalty") if isinstance(side, Mapping) else None
        n_miss = 0
        miss = pi.get("home_missing") if is_home_pick else pi.get("away_missing")
        if isinstance(miss, list):
            n_miss = len(miss)
        if atk is None:
            atk = 0.0 if not pi.get("applied") else 0.06
        f10 = _factor(10, _lerp(float(atk), 0.16, 0.0, 22, 90), n_miss, f"{n_miss} غياب · خصم {float(atk):.2f}")
    else:
        f10 = _factor(10, None, None, "لا بيانات غيابات", available=False)

    # --- 11–12 GK ---
    gk = _get(comps, "goalkeeper") or {}
    gk_side = None
    if isinstance(gk, Mapping):
        gk_side = gk.get("home") if is_home_pick else gk.get("away")
    if isinstance(gk_side, Mapping) and gk_side.get("matches_evaluated"):
        save = float(gk_side.get("save_pct") or 0)
        gp = float(gk_side.get("goals_prevented_per90") or 0)
        f11 = _factor(11, _lerp(save, 0.58, 0.78, 28, 94) * 0.65 + _lerp(gp, -0.25, 0.35, 28, 94) * 0.35, save, f"تصدي {save * 100:.0f}٪ · {gp:+.2f} P90")
        vs = float(gk_side.get("vs_top_tier_save_pct") or 0)
        vs_n = int(gk_side.get("vs_top_tier_matches") or 0)
        if vs_n >= 3 and vs > 0:
            f12 = _factor(12, _lerp(vs, 0.55, 0.78, 26, 93), vs, f"{vs * 100:.0f}٪ ضد هجوم قوي ({vs_n})")
        else:
            f12 = _factor(12, None, None, available=False)
    else:
        f11 = _factor(11, None, None, available=False)
        f12 = _factor(12, None, None, available=False)

    # --- 13 defense ---
    if xg_pair:
        xga = xg_pair[1] if is_home_pick else xg_pair[0]
        f13 = _factor(13, _lerp(xga, 1.85, 0.75, 24, 93), round(xga, 3), f"xGA {xga:.2f}")
    elif home_gd is not None and away_gd is not None:
        # weaker proxy
        ga_proxy = -((home_gd if is_home_pick else away_gd) * 0.5)
        f13 = _factor(13, _lerp(ga_proxy, 1.2, -0.4, 28, 86), None, "من فورم الأهداف")
    else:
        f13 = _factor(13, None, None, available=False)

    # --- 14 concede probability from opponent λ ---
    lam_h = _f(pred, "lambda_home") or _f(comps, "context", "lambda")
    lam_a = _f(pred, "lambda_away")
    if isinstance(_get(comps, "context", "lambda"), (list, tuple)):
        pair = _get(comps, "context", "lambda")
        lam_h, lam_a = float(pair[0]), float(pair[1])
    if lam_h is not None and lam_a is not None:
        concede = lam_a if is_home_pick else lam_h
        p_over = _f(pred, "p_over25")
        score14 = _lerp(concede, 1.85, 0.70, 22, 92)
        f14 = _factor(14, score14, round(concede, 3), f"λ مستقبَل {concede:.2f}" + (f" · +2.5 {p_over * 100:.0f}٪" if p_over else ""))
    else:
        f14 = _factor(14, None, None, available=False)

    # --- 15 defensive stability ---
    rand = pred.get("randomness") or comps.get("randomness") or {}
    pillars = _get(rand, "pillars") or {}
    sh_frag = _get(pillars, "second_half_fragility") or {}
    vol = _get(pillars, "volatility_risk") or _get(pillars, "volatility") or {}
    if sh_frag or vol or rand.get("stability_score") is not None:
        stab = _f(rand, "stability_score")
        fragile = bool(sh_frag.get("active"))
        volatile = bool(vol.get("active"))
        base = stab if stab is not None else 70.0
        if fragile:
            base -= 14
        if volatile:
            base -= 10
        f15 = _factor(15, base, stab, "ثبات دفاعي من MRI")
    else:
        f15 = _factor(15, None, None, available=False)

    # --- 16–19 discipline from randomness team stats ---
    # stored on pillars.disciplinary or we read home/away stats if present
    disc = _get(pillars, "disciplinary_risk") or _get(pillars, "disciplinary") or {}
    h_rand = _get(comps, "randomness_home") or {}
    a_rand = _get(comps, "randomness_away") or {}
    pick_rand = h_rand if is_home_pick else a_rand
    yc = _f(pick_rand, "yellow_cards_avg")
    rc = _f(pick_rand, "red_cards_avg") or (
        _f(disc, "home_red_rate") if is_home_pick else _f(disc, "away_red_rate")
    )
    fouls = _f(pick_rand, "fouls_avg")
    dri = _f(pick_rand, "disciplinary_risk_index") or _f(disc, "combined_dri")

    f16 = _factor(16, _lerp(yc, 2.8, 1.2, 28, 90), yc, f"{yc:.2f} صفراء" if yc is not None else None, available=yc is not None)
    f17 = _factor(17, _lerp(rc, 0.18, 0.02, 22, 92), rc, f"{rc:.3f} حمراء" if rc is not None else None, available=rc is not None)
    f18 = _factor(18, _lerp(fouls, 16.0, 8.5, 26, 90), fouls, f"{fouls:.1f} خطأ" if fouls is not None else None, available=fouls is not None)
    f19 = _factor(19, _lerp(dri, 70, 20, 22, 92) if dri is not None else (35.0 if disc.get("active") else 72.0 if disc else None), dri, "خطر طرد", available=dri is not None or bool(disc))

    # --- 20 referee ---
    ref = _get(comps, "referee") or {}
    if isinstance(ref, Mapping) and (ref.get("matches_n") or 0) >= 8 and ref.get("strictness") is not None:
        strict = float(ref["strictness"])
        card_prone = bool(disc.get("active") or (dri is not None and dri >= 55))
        score20 = _lerp(strict, 0.7, 1.4, 88, 38)
        if card_prone and strict >= 1.2:
            score20 -= 14
        f20 = _factor(20, score20, strict, ref.get("summary") or f"صرامة {strict:.2f}")
    else:
        f20 = _factor(20, None, None, "لا ملف حكم كافٍ", available=False)

    # --- 21 manager ---
    mgr = _get(comps, "manager") or {}
    mgr_side = mgr.get("home") if isinstance(mgr, Mapping) and is_home_pick else (mgr.get("away") if isinstance(mgr, Mapping) else None)
    if isinstance(mgr_side, Mapping) and mgr_side.get("manager_name"):
        over = float(mgr_side.get("overperformance_delta") or 0)
        disc_s = float(mgr_side.get("tactical_discipline_score") or 0.8)
        bounce = bool(mgr_side.get("is_new_manager_bounce"))
        score21 = _lerp(over, -0.35, 0.35, 30, 88) * 0.6 + disc_s * 100 * 0.4
        if bounce:
            score21 = min(84, score21 + 4)
        f21 = _factor(21, score21, over, mgr_side.get("summary_ar"))
    else:
        f21 = _factor(21, None, None, available=False)

    # --- 22 tactics ---
    tac = _get(comps, "tactics") or {}
    if isinstance(tac, Mapping) and (tac.get("home_style") or tac.get("tactical_clash_type")):
        adv = str(tac.get("style_advantage") or "NEUTRAL")
        want = "HOME" if is_home_pick else "AWAY"
        if tac.get("low_block_trap_warning") and adv != want:
            score22 = 32.0
            lab = "فخ تكتل دفاعي"
        elif adv == want:
            score22 = 82.0
            lab = tac.get("matchup_commentary") or "أفضلية أسلوب"
        elif adv == "NEUTRAL":
            score22 = 58.0
            lab = "مواجهة متوازنة"
        else:
            score22 = 40.0
            lab = tac.get("matchup_commentary") or "الأسلوب ضد المرشح"
        f22 = _factor(22, score22, adv, lab)
    else:
        f22 = _factor(22, None, None, available=False)

    # --- 23 second half / subs proxy ---
    sh = _get(comps, "second_half") or {}
    sh_side = sh.get("home") if isinstance(sh, Mapping) and is_home_pick else (sh.get("away") if isinstance(sh, Mapping) else None)
    if isinstance(sh_side, Mapping) and float(sh_side.get("available") or 0) > 0:
        gd = float(sh_side.get("sh_gd") or 0)
        f23 = _factor(23, _lerp(gd, -0.45, 0.45, 26, 90), gd, f"شوط ثانٍ GD {gd:+.2f} (وكيل تبديل)")
    else:
        f23 = _factor(23, None, None, available=False)

    # --- 24 plan execution ---
    if isinstance(tac, Mapping) and tac.get("tactical_clash_type"):
        applied = bool(tac.get("lambda_applied"))
        h_m = float(tac.get("home_lambda_mult") or 1.0)
        a_m = float(tac.get("away_lambda_mult") or 1.0)
        mult = h_m if is_home_pick else a_m
        score24 = _lerp(mult, 0.96, 1.04, 36, 86)
        if not applied:
            score24 = 54.0
        f24 = _factor(24, score24, tac.get("tactical_clash_type"), "ضغط/استحواذ/تحولات")
    else:
        f24 = _factor(24, None, None, available=False)

    # --- 25 vs opponent types ---
    vs = _get(comps, "tiered_form") or {}
    vs_side = vs.get("home") if isinstance(vs, Mapping) and is_home_pick else (vs.get("away") if isinstance(vs, Mapping) else None)
    opp_elo = elo_a if is_home_pick else elo_h
    if isinstance(vs_side, Mapping) and opp_elo is not None:
        tier = "vs_strong" if opp_elo >= 1650 else "vs_mid" if opp_elo >= 1500 else "vs_weak"
        data = vs_side.get(tier) or {}
        played = float(data.get("played") or 0)
        wr = float(data.get("win_rate") or 0)
        if played >= 4:
            f25 = _factor(25, _lerp(wr, 0.18, 0.65, 26, 90), wr, f"{tier} {wr * 100:.0f}٪ من {int(played)}")
        else:
            f25 = _factor(25, None, None, available=False)
    else:
        f25 = _factor(25, None, None, available=False)

    # --- 26 H2H ---
    h2h = _get(comps, "h2h") or {}
    n_h2h = int(h2h.get("h2h_matches_count") or 0) if isinstance(h2h, Mapping) else 0
    if isinstance(h2h, Mapping) and n_h2h >= 3:
        rh = float(h2h.get("recency_home") or 0)
        ra = float(h2h.get("recency_away") or 0)
        rw = float(h2h.get("recency_weight") or 0) or 1.0
        share = (rh if is_home_pick else ra) / rw
        f26 = _factor(26, _lerp(share, 0.20, 0.72, 30, 90), n_h2h, h2h.get("h2h_summary"))
    elif isinstance(h2h, Mapping) and n_h2h > 0:
        f26 = _factor(26, None, n_h2h, "عيّنة H2H صغيرة", available=False)
    else:
        f26 = _factor(26, None, None, available=False)

    # --- 27 similar opponents ---
    sim = _get(comps, "similar_opponents") or {}
    sim_side = sim.get("home") if isinstance(sim, Mapping) and is_home_pick else (sim.get("away") if isinstance(sim, Mapping) else None)
    if isinstance(sim_side, Mapping) and float(sim_side.get("available") or 0) > 0:
        wr = float(sim_side.get("win_rate") or 0)
        f27 = _factor(27, _lerp(wr, 0.20, 0.68, 28, 90), wr, f"{wr * 100:.0f}٪ من {int(sim_side.get('played') or 0)}")
    else:
        f27 = _factor(27, None, None, available=False)

    # --- 28 rest / congestion ---
    logi = _get(comps, "logistics") or {}
    rest = _f(logi, "rest_days_home") if is_home_pick else _f(logi, "rest_days_away")
    m7 = _f(logi, "home_matches_7d") if is_home_pick else _f(logi, "away_matches_7d")
    m14 = _f(logi, "home_matches_14d") if is_home_pick else _f(logi, "away_matches_14d")
    m30 = _f(logi, "home_matches_30d") if is_home_pick else _f(logi, "away_matches_30d")
    if rest is not None or m7 is not None or m14 is not None:
        parts = []
        if rest is not None:
            parts.append(_lerp(rest, 2.0, 7.0, 28, 86))
        if m7 is not None:
            parts.append(_lerp(m7, 4, 1, 24, 88))
        if m14 is not None:
            parts.append(_lerp(m14, 7, 2, 30, 86))
        if m30 is not None:
            parts.append(_lerp(m30, 14, 5, 34, 82))
        lab = f"راحة {rest if rest is not None else '—'} · 7ي {m7 if m7 is not None else '—'} · 14ي {m14 if m14 is not None else '—'} · 30ي {m30 if m30 is not None else '—'}"
        f28 = _factor(28, sum(parts) / len(parts), {"rest": rest, "d7": m7, "d14": m14, "d30": m30}, lab)
    else:
        f28 = _factor(28, None, None, available=False)

    # --- 29 travel + importance ---
    travel = _f(logi, "travel_distance_km")
    imp = _get(logi, "match_importance") or {}
    midweek = bool(logi.get("is_european_midweek"))
    score29_parts: List[float] = []
    if travel is not None:
        if is_home_pick:
            score29_parts.append(_lerp(travel, 80, 900, 52, 78))
        else:
            score29_parts.append(_lerp(travel, 80, 900, 78, 28))
    if isinstance(imp, Mapping) and imp.get("available"):
        stakes = str(imp.get("stakes") or "midtable")
        intensity = float(imp.get("intensity") or 0.3)
        if stakes in ("title", "relegation", "europe"):
            score29_parts.append(int(58 + 22 * intensity))
        else:
            score29_parts.append(48.0)
    if midweek:
        score29_parts.append(42.0)
    if score29_parts:
        lab_bits = []
        if travel is not None:
            lab_bits.append(f"{travel:.0f} كم")
        if isinstance(imp, Mapping) and imp.get("label"):
            lab_bits.append(str(imp["label"]))
        if midweek:
            lab_bits.append("منتصف أسبوع")
        f29 = _factor(29, sum(score29_parts) / len(score29_parts), {"travel": travel, "importance": imp}, " · ".join(lab_bits) or None)
    else:
        f29 = _factor(29, None, None, available=False)

    # --- 30 odds movement ---
    sharp = _get(comps, "sharp") or {}
    if isinstance(sharp, Mapping) and sharp.get("applied") and sharp.get("side"):
        side = str(sharp.get("side"))
        mag = float(sharp.get("magnitude") or 0)
        model_side = "home" if pick == "H" else "away"
        if side == model_side:
            score30 = _lerp(mag, 0.04, 0.12, 70, 94)
            lab = sharp.get("summary") or "السوق مع المرشح"
        elif side == "draw":
            score30 = 38.0
            lab = "السوق يتحرّك نحو التعادل"
        else:
            score30 = _lerp(mag, 0.04, 0.12, 48, 22)
            lab = sharp.get("summary") or "السوق ضد المرشح"
        f30 = _factor(30, score30, mag, lab)
    else:
        f30 = _factor(30, None, None, "لا حركة أودز متاحة", available=False)

    return [f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11, f12, f13, f14, f15, f16, f17, f18, f19, f20, f21, f22, f23, f24, f25, f26, f27, f28, f29, f30]


def _aggregate(factors: Sequence[Mapping[str, Any]]) -> Dict[str, Any]:
    groups: List[Dict[str, Any]] = []
    weighted = 0.0
    wsum = 0.0
    coverage = sum(1 for f in factors if f.get("available"))
    for gid, meta in GROUP_META.items():
        gf = [f for f in factors if f.get("group") == gid]
        avail = [f for f in gf if f.get("available") and f.get("score") is not None]
        gscore = round(sum(float(f["score"]) for f in avail) / len(avail), 1) if avail else None
        groups.append(
            {
                "id": gid,
                "key": meta["id"],
                "title": meta["title"],
                "score": gscore,
                "available": len(avail),
                "factors": list(gf),
            }
        )
        if gscore is not None:
            w = GROUP_WEIGHTS[gid]
            weighted += gscore * w
            wsum += w
    reliability = weighted / wsum if wsum > 0 else None
    coverage_warning = coverage < MIN_COVERAGE
    if reliability is not None and coverage_warning:
        reliability = reliability * (0.85 + 0.15 * (coverage / MIN_COVERAGE))
    return {
        "reliability": None if reliability is None else round(_clamp(reliability), 1),
        "coverage": coverage,
        "coverage_warning": coverage_warning,
        "groups": groups,
    }


def score_match(
    pred: Mapping[str, Any],
    *,
    slate_rank: Optional[int] = None,
    slate_n: Optional[int] = None,
    candidate_rank: Optional[int] = None,
) -> Dict[str, Any]:
    """يبني كتلة model2 دون المساس بـ 1X2."""
    p_home = float(pred.get("p_home") or 0)
    p_draw = float(pred.get("p_draw") or 0)
    p_away = float(pred.get("p_away") or 0)
    info = resolve_pick(p_home, p_draw, p_away)
    reason = candidate_reason(pred)
    factors = _score_factors(pred, slate_rank=slate_rank, slate_n=slate_n)
    agg = _aggregate(factors)
    return {
        **agg,
        "rank": candidate_rank,
        "slate_rank": slate_rank,
        "slate_n": slate_n,
        "candidate": reason is None,
        "exclude_reason": reason,
        "pick": info["pick"],
        "p_pick": round(info["p_pick"], 4),
        "p_draw": round(info["p_draw"], 4),
        "p_opp": round(info["p_opp"], 4),
        "gap": round(info["gap"], 4),
    }


def score_slate(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """entries: [{pred, ...}]. يضيف model2 مع العامل 5 وترتيب المرشحين."""
    n = len(entries)
    scored_p = []
    for i, item in enumerate(entries):
        pred = item["pred"]
        info = resolve_pick(
            float(pred.get("p_home") or 0),
            float(pred.get("p_draw") or 0),
            float(pred.get("p_away") or 0),
        )
        scored_p.append((i, info["p_pick"]))
    scored_p.sort(key=lambda x: x[1], reverse=True)
    rank_by_p = {i: r + 1 for r, (i, _) in enumerate(scored_p)}

    drafts: List[Dict[str, Any]] = []
    for i, item in enumerate(entries):
        m2 = score_match(item["pred"], slate_rank=rank_by_p[i], slate_n=n)
        drafts.append(m2)
        item["model2"] = m2

    cands = [(i, d) for i, d in enumerate(drafts) if d.get("candidate") and d.get("reliability") is not None]
    cands.sort(key=lambda x: float(x[1]["reliability"]), reverse=True)
    for rank, (i, _) in enumerate(cands, start=1):
        drafts[i]["rank"] = rank
        entries[i]["model2"] = drafts[i]
    return entries
