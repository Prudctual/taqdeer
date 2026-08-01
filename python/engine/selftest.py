"""فحص ذاتي كامل لمنطق v3 ومكونات المحرك الرياضي الـ 16 — يفشل بصوت عالٍ إن انكسر المنطق."""

import numpy as np
from .dixon_coles import DixonColesResult, MatchObs, fit_dixon_coles, score_matrix, tau_vec
from .elo import EloMatch, update_elo
from .ensemble import DEFAULT_WEIGHTS, align_matrix_to_probs, blend_components, fit_weights, predict_match, value_signal
from .evaluate import rps, summarize
from .form import FormMatch, TeamForm, form_lambda_adjust, rolling_form
from .logistics_engine import calculate_travel_distance_km, evaluate_logistics_and_external_factors
from .pi_ratings import PiMatch, update_pi
from .player_impact import apply_rapm_to_xg, calculate_lineup_penalties
from .referee_engine import calculate_strictness_index, predict_referee_impact
from .sharp_market import detect_sharp_movement, evaluate_sharp_value_alignment
from .strengths_weaknesses import analyze_team_strengths_weaknesses
from .tactical_matchup import evaluate_tactical_matchup
from .weather_engine import adjust_lambdas_for_weather, calculate_weather_impact
from .xg_engine import compute_advanced_metrics


def main() -> None:
    # 1. قطبية الفورم والإرهاق (84h rest interval penalty)
    f = rolling_form([FormMatch("H", "A", 3, 0, sot_home=8, sot_away=1)])
    assert (f["H"].gf, f["H"].ga, f["H"].sot_against) == (3.0, 0.0, 1.0), f["H"]
    assert (f["A"].gf, f["A"].ga, f["A"].sot_against) == (0.0, 3.0, 8.0), f["A"]

    def tf(gf, ga, sf, sa, rest=7.0):
        return TeamForm(pts=1.0, gd=gf - ga, gf=gf, ga=ga, sot_for=sf, sot_against=sa, n=5, rest_days=rest)

    avg = tf(1.3, 1.3, 3.5, 3.5)
    leaky = tf(1.3, 3.0, 3.5, 7.0)
    tight = tf(1.3, 0.2, 3.5, 1.5)
    fatigued = tf(1.3, 1.3, 3.5, 3.5, rest=2.5)  # راحة أقل من 84 ساعة
    
    assert form_lambda_adjust(avg, leaky)[0] > form_lambda_adjust(avg, tight)[0]
    assert form_lambda_adjust(leaky, avg)[1] > form_lambda_adjust(tight, avg)[1]
    # خصم الإرهاق للراحة القصيرة
    assert form_lambda_adjust(fatigued, avg)[0] < form_lambda_adjust(avg, avg)[0]

    # 2. RPS والمقاييس الإحصائية
    assert rps([(1.0, 0.0, 0.0)], ["H"]) == 0.0
    expected = ((2 / 3) ** 2 + (1 / 3) ** 2) / 2
    assert abs(rps([(1 / 3, 1 / 3, 1 / 3)], ["H"]) - expected) < 1e-12
    summary = summarize([(0.7, 0.2, 0.1)], ["H"])
    assert summary["accuracy"] == 1.0 and summary["n"] == 1

    # 3. مزوج المكونات وتعلّم الأوزان
    u = (1 / 3, 1 / 3, 1 / 3)
    p = blend_components(
        {"dc": (0.5, 0.3, 0.2), "pi": u, "elo": u, "form": u, "market": None},
        DEFAULT_WEIGHTS,
    )
    assert abs(sum(p) - 1.0) < 1e-9

    comps, outs = [], []
    for i in range(120):
        o = "H" if i % 2 == 0 else "A"
        truth = (0.8, 0.1, 0.1) if o == "H" else (0.1, 0.1, 0.8)
        comps.append({"dc": truth, "pi": u, "elo": u, "form": u, "market": None})
        outs.append(o)
    w = fit_weights(comps, outs)
    assert abs(sum(w.values()) - 1.0) < 1e-9
    assert w["dc"] > DEFAULT_WEIGHTS["dc"], w

    # 4. كيلي والإشارات المجدية
    v = value_signal((0.6, 0.2, 0.2), (1.75, 4.0, 6.0))
    assert v is not None and v["side"] == "home" and v["bet"], v
    assert 0 < v["stake"] <= v["kelly"]
    v2 = value_signal((0.5, 0.25, 0.25), (2.0, 4.0, 4.0))
    assert v2 is not None and not v2["bet"]
    v3 = value_signal((0.6, 0.2, 0.2), (3.0, 4.0, 6.0))
    assert v3 is not None and v3["ev"] > 0.15 and not v3["bet"]

    # 5. Dixon-Coles مصفوفة النتائج وتدريب النموذج
    obs = [
        MatchObs("teamA", "teamB", 2, 1, 10.0),
        MatchObs("teamB", "teamA", 0, 0, 20.0),
        MatchObs("teamA", "teamB", 3, 1, 5.0),
    ]
    dc_model = fit_dixon_coles(obs, half_life_days=140.0)
    assert "teamA" in dc_model.attack and "teamB" in dc_model.defense
    mat = score_matrix(1.5, 1.0, dc_model.rho)
    assert abs(mat.sum() - 1.0) < 1e-5
    mat_aligned = align_matrix_to_probs(mat, (0.50, 0.30, 0.20))
    assert abs(mat_aligned.sum() - 1.0) < 1e-5

    # 6. Elo rating updates
    elo_matches = [EloMatch("teamA", "teamB", 3, 0, "2026-01-01")]
    elo_dict, elo_hist = update_elo(elo_matches)
    assert elo_dict["teamA"] > 1500.0 and elo_dict["teamB"] < 1500.0

    # 7. Pi ratings updates
    pi_matches = [PiMatch("teamA", "teamB", 2, 0)]
    pi_state = update_pi(pi_matches)
    assert pi_state.off["teamA"] > 0.0

    # 8. xG / xA / PPDA calculations
    adv = compute_advanced_metrics(2, 1, 12.0, 8.0, 5.0, 3.0, 10.0, 14.0, 6.0, 4.0)
    assert adv["xg_home"] > 0.5 and adv["xa_home"] > 0.0 and 5.0 <= adv["ppda_home"] <= 25.0

    # 9. Referee engine
    ref = predict_referee_impact("Michael Oliver", yellow_pg=4.8, fouls_pg=24.0)
    assert ref["strictness_index"] > 1.0 and ("حزم" in str(ref["strictness_label"]) or "صارم" in str(ref["strictness_label"]))

    # 10. Weather engine
    w_impact = calculate_weather_impact(temperature_c=-5.0, precipitation_mm=12.0, wind_speed_kmh=45.0)
    assert w_impact["is_adverse"] and w_impact["goal_multiplier"] < 1.0
    l_h, l_a = adjust_lambdas_for_weather(1.5, 1.0, temperature_c=-5.0, precipitation_mm=12.0)
    assert l_h < 1.5 and l_a < 1.0

    # 11. Sharp market alignment
    sm = detect_sharp_movement((2.10, 3.40, 3.60), (1.90, 3.50, 4.20))
    assert sm["is_sharp"] and sm["steam_side"] == "home"
    sm_align = evaluate_sharp_value_alignment((0.55, 0.25, 0.20), (2.10, 3.40, 3.60), (1.90, 3.50, 4.20))
    assert sm_align["sharp_aligned"] and sm_align["sharp_bonus"] == 0.04

    # 12. Tactical matchup
    tactics = evaluate_tactical_matchup("real_madrid", "man_city")
    assert "home_formation" in tactics and "away_style" in tactics

    # 13. RAPM player impact penalties
    missing = [{"name": "Mbappe", "position": "FW", "importance": 1.0}]
    att_m, def_m = calculate_lineup_penalties(missing)
    assert att_m < 1.0 and def_m >= 1.0
    adj_l, adj_m = apply_rapm_to_xg(1.8, 1.2, home_missing=missing)
    assert adj_l < 1.8

    # 14. Logistics & travel distance
    dist = calculate_travel_distance_km("london", "madrid")
    assert dist > 1000.0
    logis = evaluate_logistics_and_external_factors(home_team="madrid", away_team="london", is_european_midweek=True)
    assert logis["away_lambda_mult"] < 1.0

    # 15. Strengths and weaknesses generator
    sw = analyze_team_strengths_weaknesses(
        team_name="real_madrid",
        gf_avg=2.3,
        ga_avg=0.7,
        xg_avg=2.1,
        xga_avg=0.8,
        home_win_rate=0.80,
        away_win_rate=0.60,
        clean_sheets_pct=0.50,
        rest_days=3.0,
    )
    assert len(sw["strengths"]) > 0 and len(sw["weaknesses"]) > 0

    # 16. Full integrated prediction pipeline (predict_match)
    full_pred = predict_match(
        home="teamA",
        away="teamB",
        dc=dc_model,
        elo_home=1550.0,
        elo_away=1480.0,
        pi=pi_state,
        form_home=avg,
        form_away=leaky,
        market_odds=(1.90, 3.40, 4.00),
        temperature=1.1,
        home_missing=missing,
    )
    assert 0.0 < full_pred["p_home"] < 1.0 and abs(full_pred["p_home"] + full_pred["p_draw"] + full_pred["p_away"] - 1.0) < 1e-5
    assert full_pred["xpts_home"] > 0 and full_pred["xpts_away"] > 0

    print("selftest ok — All 16 mathematical engine components verified cleanly!")


if __name__ == "__main__":
    main()
