"""Multi-signal ensemble for match outcomes (ensemble-v4)."""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

import numpy as np

from .calibrate import apply_temperature, odds_to_probs
from .dixon_coles import (
    DixonColesResult,
    expected_goals as dc_xg,
    markets_from_matrix,
    score_matrix,
)
from .elo import elo_home_adv_from_profile, elo_outcome_probs
from .evaluate import apply_binary_temperature
from .form import TeamForm, apply_congestion, form_lambda_adjust, multi_window_form, tiered_form
from .h2h_engine import evaluate_h2h_advantage
from .league_profiles import get_league_profile
from .logistics_engine import evaluate_logistics_and_external_factors
from .pi_ratings import PiState, pi_expected_goals, pi_home_boost_from_profile
from .player_impact import apply_absence_penalties
from .referee_engine import evaluate_referee_impact
from .sharp_market import closing_line_value, detect_steam, pick_market_odds, steam_confidence_bonus
from .strengths_weaknesses import analyze_team_strengths_weaknesses
from .tactical_matchup import evaluate_tactical_matchup
from .weather_engine import apply_weather_to_lambdas
from .randomness_engine import (
    TeamRandomnessStats,
    compute_team_randomness_profile,
    evaluate_match_randomness,
)


Prob3 = Tuple[float, float, float]

WEIGHT_KEYS = ("dc", "pi", "elo", "form", "market", "context")
FORM_BLEND_WEIGHT = 0.20
OTHER_WEIGHT_KEYS = ("dc", "pi", "elo", "market", "context")
DEFAULT_WEIGHTS: Dict[str, float] = {
    "dc": 0.34,
    "pi": 0.14,
    "elo": 0.14,
    "form": FORM_BLEND_WEIGHT,
    "market": 0.11,
    "context": 0.07,
}
EARLY_SEASON_DAYS = 60


def _norm(h: float, d: float, a: float) -> Prob3:
    s = h + d + a
    if s <= 0:
        return 1 / 3, 1 / 3, 1 / 3
    return h / s, d / s, a / s


def _blend_many(parts: list[tuple[Prob3, float]]) -> Prob3:
    tw = sum(w for _, w in parts) or 1.0
    h = sum(p[0] * w for p, w in parts) / tw
    d = sum(p[1] * w for p, w in parts) / tw
    a = sum(p[2] * w for p, w in parts) / tw
    return _norm(h, d, a)


def lock_form_weight(
    weights: Dict[str, float],
    form_share: float = FORM_BLEND_WEIGHT,
) -> Dict[str, float]:
    keys = [k for k in WEIGHT_KEYS if k in weights]
    if not keys:
        return dict(DEFAULT_WEIGHTS)

    form_share = float(min(max(form_share, 0.0), 1.0))
    if "form" not in keys:
        raw = {k: max(0.0, float(weights.get(k, 0.0))) for k in keys}
        s = sum(raw.values()) or 1.0
        return {k: raw[k] / s for k in keys}

    others = [k for k in keys if k != "form"]
    rest = 1.0 - form_share
    raw = {k: max(0.0, float(weights.get(k, 0.0))) for k in others}
    s = sum(raw.values())
    if not others:
        return {"form": 1.0}
    if s <= 0:
        out = {k: rest / len(others) for k in others}
    else:
        out = {k: rest * raw[k] / s for k in others}
    out["form"] = form_share
    return out


def blend_components(comp: Dict[str, Optional[Prob3]], weights: Dict[str, float]) -> Prob3:
    present = [k for k in WEIGHT_KEYS if comp.get(k) is not None]
    w = lock_form_weight({k: float(weights.get(k, DEFAULT_WEIGHTS[k])) for k in present})
    parts = [(comp[k], w[k]) for k in present]
    return _blend_many(parts)


def fit_weights(
    comps: list[Dict[str, Optional[Prob3]]],
    outcomes: list[str],
    ridge: float = 1.0,
) -> Dict[str, float]:
    import math

    if len(comps) < 40:
        return dict(DEFAULT_WEIGHTS)
    from scipy.optimize import minimize

    theta0 = np.log(
        np.array([max(DEFAULT_WEIGHTS[k], 1e-6) for k in OTHER_WEIGHT_KEYS], dtype=float)
    )
    y_idx = [{"H": 0, "D": 1, "A": 2}[o] for o in outcomes]
    rest = 1.0 - FORM_BLEND_WEIGHT

    def pack(theta: np.ndarray) -> Dict[str, float]:
        w_other = np.exp(theta - theta.max())
        w_other = (w_other / w_other.sum()) * rest
        wd = {k: float(v) for k, v in zip(OTHER_WEIGHT_KEYS, w_other)}
        wd["form"] = FORM_BLEND_WEIGHT
        return wd

    def nll(theta: np.ndarray) -> float:
        wd = pack(theta)
        total = ridge * float(np.sum((theta - theta0) ** 2))
        for c, yi in zip(comps, y_idx):
            p = blend_components(c, wd)
            total -= math.log(max(float(p[yi]), 1e-12))
        return total

    res = minimize(
        nll, theta0, method="Nelder-Mead", options={"maxiter": 800, "xatol": 1e-3, "fatol": 1e-3}
    )
    return pack(res.x)


def decimal_to_american(dec_odds: float) -> int:
    """تحويل الأودز العشرية إلى أودز أمريكية (+100, -167, +240, -400)."""
    if dec_odds >= 2.0:
        return int(round((dec_odds - 1.0) * 100.0))
    if dec_odds <= 1.001:
        return -9999
    return -int(round(100.0 / (dec_odds - 1.0)))


def american_to_decimal(am_odds: int) -> float:
    """تحويل الأودز الأمريكية إلى أودز عشرية (Decimal)."""
    if am_odds > 0:
        return float(round(1.0 + am_odds / 100.0, 4))
    if am_odds < 0:
        return float(round(1.0 + 100.0 / abs(am_odds), 4))
    return 1.0


def odds_to_implied_prob(dec_odds: float) -> float:
    """حساب احتمال السوق الضمني من السعر العشري."""
    if dec_odds <= 1.0:
        return 1.0
    return float(round(1.0 / dec_odds, 4))


def calculate_edge(model_prob: float, market_dec_odds: float) -> float:
    """حساب الفارق الاحتمالي الصافي (Model Edge = Model Prob - Implied Market Prob)."""
    implied = odds_to_implied_prob(market_dec_odds)
    return float(round(model_prob - implied, 4))


def detect_value_trap(
    model_prob: float, market_dec_odds: float, threshold: float = -0.05
) -> bool:
    """
    كشف مصيدة القيمة (Value Trap):
    حين يكون الفريق مرشحاً بنسبة جيدة في النموذج، لكن سعر السوق يفرض احتمالاً أعلى بكثير
    (مثل برشلونة 54.4% بسعر -400 الذي يطلب 80% فيكون الـEdge سالب 25.6%).
    """
    edge = calculate_edge(model_prob, market_dec_odds)
    return bool(edge <= threshold)


def calculate_selection_score(
    top_prob: float, second_prob: float, confidence: float
) -> int:
    """
    حساب مؤشر قوة الترشيح (Selection Score 0–100):
    يدمج احتمال الفوز الأعلى (top_prob) وهامش الفصل الاحتمالي عن النتيجة الثانية (separation gap)
    وثقة النموذج، لترتيب أفضلية المباريات بصرامة ودقة.
    """
    p1 = max(0.0, min(1.0, float(top_prob)))
    p2 = max(0.0, min(1.0, float(second_prob)))
    conf = max(0.0, min(1.0, float(confidence)))
    separation = max(0.0, p1 - p2)

    score = (
        30.0
        + 55.0 * p1
        + 25.0 * min(separation / 0.35, 1.0)
        + 15.0 * (conf - 0.5)
    )
    return max(10, min(99, int(round(score))))


def parlay_analysis(
    legs: List[Tuple[float, float]],
) -> Dict[str, Any]:
    """
    تحليل رهان البارلي / التجميعي (Parlay / Accumulator):
    يحسب احتمال النجاح المشترك بفرض الاستقلالية، والأودز العادلة،
    ويقارنها بأودز السوق لكشف ما إذا كان التجميع إيجابي القيمة أم مصيدة سالبة (-EV).
    """
    if not legs:
        return {}

    model_prob = 1.0
    market_dec_odds = 1.0
    leg_details = []
    has_trap = False

    for p, dec_odds in legs:
        model_prob *= p
        market_dec_odds *= dec_odds
        implied = odds_to_implied_prob(dec_odds)
        edge = calculate_edge(p, dec_odds)
        is_trap = detect_value_trap(p, dec_odds)
        if is_trap:
            has_trap = True
        leg_ev = float(round((p * dec_odds) - 1.0, 4))
        leg_details.append(
            {
                "model_prob": float(round(p, 4)),
                "market_odds": float(round(dec_odds, 3)),
                "american_odds": decimal_to_american(dec_odds),
                "implied_prob": float(round(implied, 4)),
                "edge": float(round(edge, 4)),
                "is_trap": is_trap,
                "ev": leg_ev,
            }
        )

    market_implied = odds_to_implied_prob(market_dec_odds)
    fair_dec_odds = float(round(1.0 / model_prob, 3)) if model_prob > 0 else 999.0
    parlay_edge = float(round(model_prob - market_implied, 4))
    parlay_ev = float(round((model_prob * market_dec_odds) - 1.0, 4))

    best_single = max(leg_details, key=lambda x: x["ev"])
    prefer_single_bet = bool(best_single["ev"] > parlay_ev or (best_single["ev"] > 0 and parlay_ev <= 0))
    single_vs_parlay_delta = float(round(parlay_ev - best_single["ev"], 4))

    if prefer_single_bet:
        recommendation = f"الرهان المنفرد على الساق الأفضل ({best_single['american_odds']}, EV: {best_single['ev']:+.1%}) يتفوق بوضوح على البارلي (EV: {parlay_ev:+.1%})."
    elif parlay_ev > 0.0:
        recommendation = f"تجميعة البارلي تحقق عائداً موجباً أعلى (+EV: {parlay_ev:+.1%}) من الرهانات المنفردة."
    else:
        recommendation = "سعر السوق غير مجزٍ سواء للبارلي أو الرهانات المنفردة."

    return {
        "model_prob": float(round(model_prob, 4)),
        "market_dec_odds": float(round(market_dec_odds, 3)),
        "market_american_odds": decimal_to_american(market_dec_odds),
        "market_implied_prob": float(round(market_implied, 4)),
        "fair_dec_odds": fair_dec_odds,
        "fair_american_odds": decimal_to_american(fair_dec_odds),
        "parlay_edge": parlay_edge,
        "parlay_ev": parlay_ev,
        "has_value_trap": has_trap,
        "is_positive_ev": parlay_ev > 0.0,
        "prefer_single_bet": prefer_single_bet,
        "single_vs_parlay_delta": single_vs_parlay_delta,
        "best_single_ev": best_single["ev"],
        "recommendation": recommendation,
        "legs": leg_details,
    }


def value_signal(
    calibrated: Prob3, market_odds: tuple[float, float, float]
) -> Optional[Dict]:
    best = None
    for name, p, odds in zip(("home", "draw", "away"), calibrated, market_odds):
        b = odds - 1.0
        if b <= 0:
            continue
        ev = p * odds - 1.0
        kelly = max(0.0, (p * b - (1.0 - p)) / b)
        implied = odds_to_implied_prob(odds)
        edge = calculate_edge(p, odds)
        cand = {
            "side": name,
            "odds": float(odds),
            "american_odds": decimal_to_american(odds),
            "p": float(p),
            "implied_p": implied,
            "edge": edge,
            "ev": float(ev),
            "kelly": float(kelly),
            "stake": float(round(0.25 * kelly, 4)),
            "is_trap": detect_value_trap(p, odds),
        }
        if best is None or cand["kelly"] > best["kelly"]:
            best = cand
    if best is None:
        return None
    best["bet"] = bool(0.03 <= best["ev"] <= 0.15 and best["kelly"] > 0)
    return best


def align_matrix_to_probs(mat: np.ndarray, target: Prob3) -> np.ndarray:
    n = mat.shape[0]
    i = np.arange(n)[:, None]
    j = np.arange(n)[None, :]
    out = np.zeros_like(mat)
    for mask, t in zip((i > j, i == j, i < j), target):
        block = mat[mask].sum()
        if block > 0 and t > 0:
            out[mask] = mat[mask] * (t / block)
    total = out.sum()
    return out / total if total > 0 else mat


def _blend_lambdas(
    *,
    lam_f: float,
    mu_f: float,
    lam_pi: float,
    mu_pi: float,
    lam_dc: float,
    mu_dc: float,
    lam_sh: Optional[float],
    mu_sh: Optional[float],
    lam_xg: Optional[float],
    mu_xg: Optional[float],
) -> Tuple[float, float]:
    import math

    if lam_xg is not None and mu_xg is not None and lam_sh is not None and mu_sh is not None:
        lam = math.exp(
            0.40 * math.log(lam_f)
            + 0.16 * math.log(lam_pi)
            + 0.07 * math.log(lam_dc)
            + 0.17 * math.log(lam_sh)
            + 0.20 * math.log(lam_xg)
        )
        mu = math.exp(
            0.40 * math.log(mu_f)
            + 0.16 * math.log(mu_pi)
            + 0.07 * math.log(mu_dc)
            + 0.17 * math.log(mu_sh)
            + 0.20 * math.log(mu_xg)
        )
    elif lam_xg is not None and mu_xg is not None:
        lam = math.exp(
            0.48 * math.log(lam_f)
            + 0.20 * math.log(lam_pi)
            + 0.10 * math.log(lam_dc)
            + 0.22 * math.log(lam_xg)
        )
        mu = math.exp(
            0.48 * math.log(mu_f)
            + 0.20 * math.log(mu_pi)
            + 0.10 * math.log(mu_dc)
            + 0.22 * math.log(mu_xg)
        )
    elif lam_sh is not None and mu_sh is not None:
        lam = math.exp(
            0.47 * math.log(lam_f)
            + 0.20 * math.log(lam_pi)
            + 0.08 * math.log(lam_dc)
            + 0.25 * math.log(lam_sh)
        )
        mu = math.exp(
            0.47 * math.log(mu_f)
            + 0.20 * math.log(mu_pi)
            + 0.08 * math.log(mu_dc)
            + 0.25 * math.log(mu_sh)
        )
    else:
        lam = math.exp(
            0.62 * math.log(lam_f) + 0.25 * math.log(lam_pi) + 0.13 * math.log(lam_dc)
        )
        mu = math.exp(
            0.62 * math.log(mu_f) + 0.25 * math.log(mu_pi) + 0.13 * math.log(mu_dc)
        )
    return float(lam), float(mu)


def predict_match(
    *,
    home: str,
    away: str,
    dc: DixonColesResult,
    elo_home: float,
    elo_away: float,
    pi: PiState,
    form_home: TeamForm,
    form_away: TeamForm,
    market_odds: Optional[tuple[float, float, float]] = None,
    temperature: float = 1.0,
    weights: Optional[Dict[str, float]] = None,
    dc_shots: Optional[DixonColesResult] = None,
    dc_true_xg: Optional[DixonColesResult] = None,
    h2h_matches: Optional[list] = None,
    league_id: Optional[str] = None,
    weather: Optional[Dict] = None,
    home_missing: Optional[list] = None,
    away_missing: Optional[list] = None,
    referee_profile: Optional[Dict] = None,
    open_odds: Optional[tuple[float, float, float]] = None,
    sharp_odds: Optional[tuple[float, float, float]] = None,
    close_odds: Optional[tuple[float, float, float]] = None,
    ppda_home: Optional[float] = None,
    ppda_away: Optional[float] = None,
    ppda_home_n: int = 0,
    ppda_away_n: int = 0,
    form_matches: Optional[list] = None,
    home_matches_7d: Optional[float] = None,
    away_matches_7d: Optional[float] = None,
    days_into_season: Optional[float] = None,
    home_strength: Optional[Mapping[str, float]] = None,
    away_strength: Optional[Mapping[str, float]] = None,
    home_xi: Optional[Sequence[Dict]] = None,
    away_xi: Optional[Sequence[Dict]] = None,
    home_bench: Optional[Sequence[Dict]] = None,
    away_bench: Optional[Sequence[Dict]] = None,
    lineup_confirmed: bool = False,
    temp_over25: float = 1.0,
    temp_btts: float = 1.0,
    home_randomness_stats: Optional[TeamRandomnessStats] = None,
    away_randomness_stats: Optional[TeamRandomnessStats] = None,
) -> Dict:
    profile = get_league_profile(league_id)
    w = dict(weights or DEFAULT_WEIGHTS)
    early = days_into_season is not None and float(days_into_season) < EARLY_SEASON_DAYS
    if early:
        w["dc"] = float(w.get("dc", DEFAULT_WEIGHTS["dc"])) * 0.88
        w["elo"] = float(w.get("elo", DEFAULT_WEIGHTS["elo"])) * 1.08
    w["elo"] = float(w.get("elo", DEFAULT_WEIGHTS["elo"])) * float(profile.elo_weight_mult)
    w.setdefault("context", DEFAULT_WEIGHTS["context"])
    w = lock_form_weight(w, FORM_BLEND_WEIGHT)
    temperature = float(temperature) * float(profile.noise_factor)
    if early:
        temperature *= 1.12

    elo_ha = elo_home_adv_from_profile(profile.home_advantage)
    pi_boost = pi_home_boost_from_profile(profile.home_advantage)

    lam_dc, mu_dc = dc_xg(dc, home, away)
    multi_h = multi_a = None
    tier_h = tier_a = None
    if form_matches:
        mw = multi_window_form(form_matches, windows=(3, 5, 10))
        multi_h = mw.get(home)
        multi_a = mw.get(away)
        elo_map = {home: elo_home, away: elo_away}
        for fm in form_matches:
            elo_map.setdefault(fm.home, 1500.0)
            elo_map.setdefault(fm.away, 1500.0)
        tiers = tiered_form(form_matches, elo_map)
        tier_h = tiers.get(home)
        tier_a = tiers.get(away)
    f_h, f_a = form_lambda_adjust(
        form_home,
        form_away,
        multi_home=multi_h,
        multi_away=multi_a,
        tiered_home=tier_h,
        tiered_away=tier_a,
        elo_home=elo_home,
        elo_away=elo_away,
    )
    f_h, f_a = apply_congestion(
        f_h,
        f_a,
        home_matches_7d=home_matches_7d,
        away_matches_7d=away_matches_7d,
    )
    lam_f = lam_dc * f_h
    mu_f = mu_dc * f_a

    lam_pi, mu_pi = pi_expected_goals(pi, home, away, home_boost=pi_boost)

    import math

    lam_sh = mu_sh = None
    if dc_shots is not None:
        lam_sh, mu_sh = dc_xg(dc_shots, home, away)
    lam_tx = mu_tx = None
    if dc_true_xg is not None:
        lam_tx, mu_tx = dc_xg(dc_true_xg, home, away)

    lam, mu = _blend_lambdas(
        lam_f=lam_f,
        mu_f=mu_f,
        lam_pi=lam_pi,
        mu_pi=mu_pi,
        lam_dc=lam_dc,
        mu_dc=mu_dc,
        lam_sh=lam_sh,
        mu_sh=mu_sh,
        lam_xg=lam_tx,
        mu_xg=mu_tx,
    )

    h2h_res = evaluate_h2h_advantage(home, away, h2h_matches)
    lam *= float(h2h_res["home_lambda_mult"])
    mu *= float(h2h_res["away_lambda_mult"])

    clean_home = home.lower().replace(" ", "").replace("-", "")
    if any(t in clean_home for t in profile.turf_teams):
        lam *= 1.05

    tactics = evaluate_tactical_matchup(
        home,
        away,
        ppda_home=float(ppda_home if ppda_home is not None else 11.0),
        ppda_away=float(ppda_away if ppda_away is not None else 11.0),
        ppda_home_n=int(ppda_home_n),
        ppda_away_n=int(ppda_away_n),
    )
    lam *= float(tactics["home_lambda_mult"])
    mu *= float(tactics["away_lambda_mult"])

    weather_res = apply_weather_to_lambdas(
        lam,
        mu,
        temp_c=(weather or {}).get("temp_c"),
        precip_mm=(weather or {}).get("precip_mm"),
        wind_kmh=(weather or {}).get("wind_kmh"),
        multiplier=(weather or {}).get("multiplier"),
    )
    lam = float(weather_res["lambda_home"])
    mu = float(weather_res["lambda_away"])

    player_res = apply_absence_penalties(
        lam,
        mu,
        home_missing,
        away_missing,
        home_strength=home_strength,
        away_strength=away_strength,
        home_xi=home_xi,
        away_xi=away_xi,
        home_bench=home_bench,
        away_bench=away_bench,
        lineup_confirmed=lineup_confirmed,
    )
    lam = float(player_res["lambda_home"])
    mu = float(player_res["lambda_away"])

    referee_res = evaluate_referee_impact(referee_profile)
    lam *= float(referee_res["lambda_mult"])
    mu *= float(referee_res["lambda_mult"])

    market_for_steam, market_src = pick_market_odds(
        sharp=sharp_odds, current=market_odds, soft_avg=market_odds
    )
    steam_res = detect_steam(open_odds, market_for_steam or market_odds)

    logistics = evaluate_logistics_and_external_factors(
        home_team=home,
        away_team=away,
        rest_days_home=form_home.rest_days,
        rest_days_away=form_away.rest_days,
    )
    if home_matches_7d is not None and home_matches_7d >= 3:
        logistics = dict(logistics)
        logistics["logistics_summary"] = (
            (logistics.get("logistics_summary") or "")
            + f" · ازدحام مضيف {home_matches_7d:.0f} مباريات/7ي"
        ).strip(" ·")
    if away_matches_7d is not None and away_matches_7d >= 3:
        logistics = dict(logistics)
        logistics["logistics_summary"] = (
            (logistics.get("logistics_summary") or "")
            + f" · ازدحام ضيف {away_matches_7d:.0f} مباريات/7ي"
        ).strip(" ·")

    sw_home = analyze_team_strengths_weaknesses(
        team_name=home,
        gf_avg=form_home.gf,
        ga_avg=form_home.ga,
        xg_avg=lam,
        xga_avg=mu,
        home_win_rate=0.55 if elo_home > elo_away else 0.40,
        away_win_rate=0.35,
        clean_sheets_pct=0.35 if form_home.ga <= 1.0 else 0.20,
        rest_days=form_home.rest_days,
    )
    sw_away = analyze_team_strengths_weaknesses(
        team_name=away,
        gf_avg=form_away.gf,
        ga_avg=form_away.ga,
        xg_avg=mu,
        xga_avg=lam,
        home_win_rate=0.50,
        away_win_rate=0.45 if elo_away > elo_home else 0.25,
        clean_sheets_pct=0.35 if form_away.ga <= 1.0 else 0.20,
        rest_days=form_away.rest_days,
    )

    elo_diff = abs(elo_home - elo_away)
    total_xg = lam + mu
    is_low_scoring = total_xg <= (profile.avg_match_goals * 0.70)
    is_tight = elo_diff < 60 or abs(lam - mu) < 0.28 or is_low_scoring
    if is_tight:
        if is_low_scoring:
            lam *= 0.94
            mu *= 0.94
        elif total_xg >= 1.8:
            lam *= 0.95
            mu *= 0.95

    mat = score_matrix(lam, mu, dc.rho)
    mk_ctx = markets_from_matrix(mat)
    context_p: Prob3 = (mk_ctx["p_home"], mk_ctx["p_draw"], mk_ctx["p_away"])

    mat_dc_raw = score_matrix(lam_dc * f_h, mu_dc * f_a, dc.rho)
    mk_dc = markets_from_matrix(mat_dc_raw)
    dc_p = (mk_dc["p_home"], mk_dc["p_draw"], mk_dc["p_away"])

    mat_pi = score_matrix(lam_pi, mu_pi, dc.rho * 0.5)
    mk_pi = markets_from_matrix(mat_pi)
    pi_p = (mk_pi["p_home"], mk_pi["p_draw"], mk_pi["p_away"])

    elo_p = elo_outcome_probs(
        elo_home, elo_away, home_adv=elo_ha, draw_base=float(profile.draw_baseline)
    )

    h_rand = home_randomness_stats or compute_team_randomness_profile(home, [])
    a_rand = away_randomness_stats or compute_team_randomness_profile(away, [])
    rand_report = evaluate_match_randomness(
        home_team=home,
        away_team=away,
        home_stats=h_rand,
        away_stats=a_rand,
        referee_profile=referee_profile,
        total_expected_goals=float(lam + mu),
        elo_diff=float(abs(elo_home - elo_away)),
        top_prob=float(max(elo_p)),
        draw_baseline=float(profile.draw_baseline),
    )

    pts_gap = form_home.pts - form_away.pts
    form_steep = 1.1 * float(profile.form_weight_mult)
    home_lean = 1 / (1 + math.exp(-form_steep * pts_gap))
    form_draw = profile.draw_baseline + 0.05 * (1 - abs(pts_gap) / 3)
    if is_tight:
        form_draw += 0.03
    if is_low_scoring:
        form_draw += 0.04
    if rand_report["multipliers"]["draw_boost"] > 0:
        form_draw = min(0.48, form_draw + rand_report["multipliers"]["draw_boost"])
    form_p = _norm(home_lean * (1 - form_draw), form_draw, (1 - home_lean) * (1 - form_draw))

    blend_odds, blend_src = pick_market_odds(
        sharp=sharp_odds, current=market_odds, soft_avg=None
    )
    market_p = None
    if blend_odds:
        market_p = odds_to_probs(*blend_odds)
    elif market_odds:
        market_p = odds_to_probs(*market_odds)
        blend_src = "avg"

    present_keys = ["dc", "pi", "elo", "form", "context"]
    if market_p is not None:
        present_keys.append("market")
    w_eff = lock_form_weight({k: w[k] for k in present_keys}, FORM_BLEND_WEIGHT)

    parts: list[tuple[Prob3, float]] = [
        (dc_p, w_eff["dc"]),
        (pi_p, w_eff["pi"]),
        (elo_p, w_eff["elo"]),
        (form_p, w_eff["form"]),
        (context_p, w_eff["context"]),
    ]
    if market_p is not None:
        parts.append((market_p, w_eff["market"]))

    blended = _blend_many(parts)
    effective_temp = temperature * rand_report["multipliers"]["temperature_mult"]
    calibrated = apply_temperature(blended, effective_temp)

    d_boost = rand_report["multipliers"]["draw_boost"]
    if d_boost > 0:
        # Direct ensemble calibration boost on draw probability to protect against draw traps (/boost)
        ch, cd, ca = calibrated
        target_d = min(0.48, cd + d_boost)
        if cd < 1.0 and cd < target_d:
            rem_scale = (1.0 - target_d) / max(0.001, (1.0 - cd))
            calibrated = _norm(ch * rem_scale, target_d, ca * rem_scale)

    mat = align_matrix_to_probs(mat, calibrated)
    mk = markets_from_matrix(mat)

    # Apply randomness temperature multiplier to goal markets to damp overconfidence on chaotic matches (/goal)
    goal_temp_mult = rand_report["multipliers"]["temperature_mult"]
    p_over25 = apply_binary_temperature(float(mk["p_over25"]), temp_over25 * goal_temp_mult)
    p_btts = apply_binary_temperature(float(mk["p_btts_yes"]), temp_btts * goal_temp_mult)

    edge = None
    value = None
    w_fair = lock_form_weight(
        {k: w[k] for k in ("dc", "pi", "elo", "form", "context")},
        FORM_BLEND_WEIGHT,
    )
    fair_parts = [
        (dc_p, w_fair["dc"]),
        (pi_p, w_fair["pi"]),
        (elo_p, w_fair["elo"]),
        (form_p, w_fair["form"]),
        (context_p, w_fair["context"]),
    ]
    fair = apply_temperature(_blend_many(fair_parts), temperature)
    if d_boost > 0:
        fh, fd, fa = fair
        target_fd = min(0.48, fd + d_boost)
        if fd < 1.0 and fd < target_fd:
            rem_scale = (1.0 - target_fd) / max(0.001, (1.0 - fd))
            fair = _norm(fh * rem_scale, target_fd, fa * rem_scale)
    value_odds = open_odds if open_odds else (sharp_odds or market_odds)
    if value_odds:
        value_market = odds_to_probs(*value_odds)
        if value_market:
            edge = {
                "home": fair[0] - value_market[0],
                "draw": fair[1] - value_market[1],
                "away": fair[2] - value_market[2],
            }
            value = value_signal(fair, value_odds)
            if value is not None:
                value["is_randomness_excluded"] = rand_report["is_strictly_excluded"]
                value["match_randomness_index"] = rand_report["match_randomness_index"]
                if rand_report["is_strictly_excluded"]:
                    value["bet"] = False

    model_side = (
        "home"
        if fair[0] >= fair[1] and fair[0] >= fair[2]
        else ("draw" if fair[1] >= fair[2] else "away")
    )
    clv_res = closing_line_value(fair, close_odds=close_odds, side=model_side)

    xpts_home = 3 * calibrated[0] + calibrated[1]
    xpts_away = 3 * calibrated[2] + calibrated[1]

    conf = max(calibrated)
    agree = 1.0 - (
        abs(dc_p[0] - elo_p[0]) + abs(dc_p[0] - pi_p[0]) + abs(dc_p[0] - form_p[0])
    ) / 3
    confidence = float(min(0.95, max(0.18, 0.55 * conf + 0.35 * max(agree, 0))))
    confidence = float(
        min(0.95, confidence + steam_confidence_bonus(steam_res, model_side))
    )
    confidence = float(min(0.95, max(0.15, confidence * rand_report["multipliers"]["confidence_mult"])))

    p_1x = float(calibrated[0] + calibrated[1])
    p_x2 = float(calibrated[1] + calibrated[2])
    p_12 = float(calibrated[0] + calibrated[2])
    double_chance = {
        "p_1x": p_1x,
        "p_x2": p_x2,
        "p_12": p_12,
        "best": "1X" if p_1x >= max(p_x2, p_12) else ("X2" if p_x2 >= p_12 else "12"),
    }

    return {
        "lambda_home": lam,
        "lambda_away": mu,
        "p_home": calibrated[0],
        "p_draw": calibrated[1],
        "p_away": calibrated[2],
        "p_btts_yes": p_btts,
        "p_over25": p_over25,
        "matrix": mat,
        "confidence": confidence,
        "xpts_home": xpts_home,
        "xpts_away": xpts_away,
        "double_chance": double_chance,
        "randomness": rand_report,
        "match_randomness_index": rand_report["match_randomness_index"],
        "stability_score": rand_report["stability_score"],
        "is_strictly_excluded": rand_report["is_strictly_excluded"],
        "components": {
            "randomness": rand_report,
            "dixon_coles": {"p": dc_p, "lambda": [lam, mu]},
            "pi_ratings": {"p": pi_p, "lambda": [lam_pi, mu_pi]},
            "elo": {"p": elo_p, "ratings": [elo_home, elo_away], "home_adv": elo_ha},
            "form": {
                "p": form_p,
                "home_pts": form_home.pts,
                "away_pts": form_away.pts,
                "home_gd": form_home.gd,
                "away_gd": form_away.gd,
                "blend_weight": FORM_BLEND_WEIGHT,
            },
            "market": {
                "p": market_p,
                "odds": blend_odds or market_odds,
                "source": blend_src,
            },
            "shots_dc": {"lambda": [lam_sh, mu_sh]} if lam_sh is not None else None,
            "true_xg_dc": {"lambda": [lam_tx, mu_tx]} if lam_tx is not None else None,
            "h2h": h2h_res,
            "tactics": tactics,
            "logistics": logistics,
            "weather": weather_res,
            "player_impact": player_res,
            "referee": referee_res,
            "sharp": {**steam_res, "market_source": market_src},
            "clv": clv_res,
            "context": {"p": context_p, "lambda": [lam, mu]},
            "home_sw": sw_home,
            "away_sw": sw_away,
            "blended_pre_cal": blended,
            "temperature": temperature,
            "temp_over25": temp_over25,
            "temp_btts": temp_btts,
            "double_chance": double_chance,
            "is_low_scoring": bool(total_xg < 1.8),
            "early_season": bool(early),
        },
        "edge": edge,
        "value": value,
        "weights": w_eff,
        "clv": clv_res,
    }
