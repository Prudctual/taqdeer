"""فحص ذاتي كامل لمنطق v4 ومكونات المحرك الرياضي — يفشل بصوت عالٍ إن انكسر المنطق."""

import numpy as np
from .dixon_coles import DixonColesResult, MatchObs, fit_dixon_coles, score_matrix, tau_vec
from .elo import EloMatch, update_elo
from .ensemble import (
    DEFAULT_WEIGHTS,
    FORM_BLEND_WEIGHT,
    align_matrix_to_probs,
    blend_components,
    fit_weights,
    lock_form_weight,
    predict_match,
    value_signal,
    decimal_to_american,
    american_to_decimal,
    odds_to_implied_prob,
    calculate_edge,
    detect_value_trap,
    calculate_selection_score,
    parlay_analysis,
)
from .evaluate import (
    rps,
    summarize,
    calibration_bins,
    expected_calibration_error,
    underdog_edge_calibration,
)
from .form import (
    FormMatch,
    TeamForm,
    form_lambda_adjust,
    multi_window_form,
    rolling_form,
)
from .h2h_engine import evaluate_h2h_advantage
from .logistics_engine import evaluate_logistics_and_external_factors
from .pi_ratings import PiMatch, update_pi
from .player_impact import apply_absence_penalties, apply_rapm_to_xg
from .referee_engine import evaluate_referee_impact
from .sharp_market import (
    closing_line_value,
    detect_steam,
    pick_market_odds,
    steam_confidence_bonus,
)
from .strengths_weaknesses import analyze_team_strengths_weaknesses
from .tactical_matchup import LAMBDA_MULT_HI, LAMBDA_MULT_LO, evaluate_tactical_matchup
from .weather_engine import apply_weather_to_lambdas, weather_goal_multiplier
from .xg_engine import compute_advanced_metrics, prefer_true_xg
from .elo import elo_home_adv_from_profile, log_home_adv_to_elo
from .form import apply_congestion, congestion_lambda_mult
from .evaluate import apply_binary_temperature, fit_binary_temperature
from .player_impact import xi_delta_impact
from .randomness_engine import (
    TeamRandomnessStats,
    compute_team_randomness_profile,
    evaluate_match_randomness,
)


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
        {
            "dc": (0.5, 0.3, 0.2),
            "pi": u,
            "elo": u,
            "form": u,
            "market": None,
            "context": (0.45, 0.3, 0.25),
        },
        DEFAULT_WEIGHTS,
    )
    assert abs(sum(p) - 1.0) < 1e-9

    comps, outs = [], []
    for i in range(120):
        o = "H" if i % 2 == 0 else "A"
        truth = (0.8, 0.1, 0.1) if o == "H" else (0.1, 0.1, 0.8)
        comps.append(
            {
                "dc": truth,
                "pi": u,
                "elo": u,
                "form": u,
                "market": None,
                "context": truth,
            }
        )
        outs.append(o)
    w = fit_weights(comps, outs)
    assert abs(sum(w.values()) - 1.0) < 1e-9
    assert abs(w["form"] - FORM_BLEND_WEIGHT) < 1e-9, w
    assert abs(DEFAULT_WEIGHTS["form"] - FORM_BLEND_WEIGHT) < 1e-9
    locked = lock_form_weight({"dc": 0.5, "pi": 0.1, "elo": 0.1, "form": 0.05, "market": 0.1, "context": 0.05})
    assert abs(locked["form"] - FORM_BLEND_WEIGHT) < 1e-9
    assert abs(sum(locked.values()) - 1.0) < 1e-9
    # مع فورم مقفول؛ الكتلة المتعلَّمة على DC يجب أن ترتفع فوق الافتراضي داخل الـ80٪
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

    # 9. Tactical matchup — commentary always; λ only with enough PPDA samples
    tactics = evaluate_tactical_matchup("pd-real-madrid", "pl-man-city")
    assert "home_formation" in tactics and "away_style" in tactics
    assert tactics["home_formation"] == "4-3-3" and tactics["away_formation"] == "3-2-4-1", tactics
    assert tactics["home_lambda_mult"] == 1.0 and tactics["away_lambda_mult"] == 1.0
    assert tactics["lambda_applied"] is False
    tactics_on = evaluate_tactical_matchup(
        "pd-real-madrid",
        "pl-man-city",
        ppda_home=8.5,
        ppda_away=8.0,
        ppda_home_n=10,
        ppda_away_n=10,
    )
    assert tactics_on["lambda_applied"] is True
    assert LAMBDA_MULT_LO <= float(tactics_on["home_lambda_mult"]) <= LAMBDA_MULT_HI
    assert LAMBDA_MULT_LO <= float(tactics_on["away_lambda_mult"]) <= LAMBDA_MULT_HI

    # Multi-window form blends without crashing
    hist = [
        FormMatch("H", "A", 2, 1, sot_home=5, sot_away=2, date="2024-01-01T12:00:00Z"),
        FormMatch("H", "B", 1, 0, sot_home=4, sot_away=1, date="2024-01-08T12:00:00Z"),
        FormMatch("C", "H", 0, 3, sot_home=1, sot_away=7, date="2024-01-15T12:00:00Z"),
        FormMatch("H", "D", 2, 2, sot_home=6, sot_away=3, date="2024-01-22T12:00:00Z"),
        FormMatch("E", "H", 1, 1, sot_home=2, sot_away=2, date="2024-01-29T12:00:00Z"),
    ]
    mw = multi_window_form(hist, windows=(3, 5, 10))
    assert 3 in mw["H"] and mw["H"][3].n >= 1
    lam_mw, _ = form_lambda_adjust(
        mw["H"][5],
        mw["A"][5] if "A" in mw else avg,
        multi_home=mw["H"],
        multi_away=mw.get("A"),
    )
    assert 0.70 <= lam_mw <= 1.35

    # 10. H2H المواجهات المباشرة: تفوق تاريخي يرفع مضاعف صاحب التفوق
    h2h = evaluate_h2h_advantage(
        "teamA",
        "teamB",
        [
            {"home_team": "teamA", "away_team": "teamB", "home_goals": 2, "away_goals": 0},
            {"home_team": "teamB", "away_team": "teamA", "home_goals": 0, "away_goals": 1},
            {"home_team": "teamA", "away_team": "teamB", "home_goals": 3, "away_goals": 1},
        ],
    )
    assert h2h["h2h_matches_count"] == 3 and h2h["home_lambda_mult"] > 1.0

    # 11. ملخص الراحة: نصي فقط بلا مضاعفات λ (الخصم الكمي في الفورم وحده)
    logis = evaluate_logistics_and_external_factors(
        home_team="teamA", away_team="teamB", rest_days_home=2.5, rest_days_away=8.0
    )
    assert "home_lambda_mult" not in logis
    assert "ضغط جدول للمضيف" in str(logis["logistics_summary"])

    # 12. Strengths and weaknesses generator
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

    # 13. Full integrated prediction pipeline (predict_match)
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
        h2h_matches=[
            {"home_team": "teamA", "away_team": "teamB", "home_goals": 2, "away_goals": 0},
        ],
        weather={"temp_c": 10.0, "precip_mm": 6.0, "wind_kmh": 20.0},
        home_missing=[{"player_name": "Star FW", "position": "F", "status": "injured"}],
        referee_profile={"matches_n": 20, "avg_yellows": 5.5, "avg_reds": 0.2, "strictness": 1.4},
        open_odds=(2.10, 3.40, 3.50),
    )
    assert 0.0 < full_pred["p_home"] < 1.0 and abs(full_pred["p_home"] + full_pred["p_draw"] + full_pred["p_away"] - 1.0) < 1e-5
    assert full_pred["xpts_home"] > 0 and full_pred["xpts_away"] > 0
    assert full_pred["components"]["h2h"]["h2h_matches_count"] == 1
    assert full_pred["components"]["weather"]["multiplier"] is not None
    assert full_pred["components"]["player_impact"]["applied"]
    assert full_pred["components"]["referee"]["matches_n"] == 20

    # 14. محركات الإثراء منفردة
    assert weather_goal_multiplier(temp_c=18.0, precip_mm=0.0, wind_kmh=10.0) == 1.0
    w = apply_weather_to_lambdas(1.5, 1.2, precip_mm=9.0)
    assert w["applied"] and w["lambda_home"] < 1.5
    abs_pen = apply_absence_penalties(
        1.5, 1.2, [{"position": "F", "status": "injured"}], []
    )
    assert abs_pen["lambda_home"] < 1.5
    assert apply_rapm_to_xg is apply_absence_penalties
    ref = evaluate_referee_impact({"matches_n": 3, "avg_yellows": 6.0, "strictness": 1.5})
    assert not ref["applied"]
    steam = detect_steam((2.5, 3.3, 2.8), (2.1, 3.3, 3.4))
    assert steam["applied"] and steam["side"] == "home"
    assert steam_confidence_bonus(steam, "home") > 0
    # open == current → no steam
    steam_flat = detect_steam((2.1, 3.3, 3.4), (2.1, 3.3, 3.4))
    assert not steam_flat["applied"]

    # Alias JSON must not invert CSV-short keys back to long names
    import json
    from pathlib import Path

    alias_path = Path(__file__).resolve().parents[2] / "scripts" / "data" / "team-aliases.json"
    aliases = json.loads(alias_path.read_text(encoding="utf-8"))
    assert aliases.get("For Sittard") is None
    assert aliases.get("Sp Lisbon") is None
    assert aliases.get("Academico") is None
    assert aliases.get("Fortuna Sittard") == "For Sittard"
    assert aliases.get("Sporting CP") == "Sp Lisbon"

    # Enrich / fit share the same repredict meta key name
    assert "enrich_repredict_matches" == "enrich_repredict_matches"

    # 15. true xG preference + sharp/CLV + congestion + HA profile
    assert prefer_true_xg(1.7, 1.1) == 1.7
    assert prefer_true_xg(None, 1.1) == 1.1
    odds, src = pick_market_odds(sharp=(1.9, 3.5, 4.2), current=(2.0, 3.4, 3.8))
    assert src == "sharp" and odds[0] == 1.9
    clv = closing_line_value((0.55, 0.25, 0.20), close_odds=(2.0, 3.5, 4.0), side="home")
    assert clv["applied"]
    assert congestion_lambda_mult(3) < 1.0
    lh, mu = apply_congestion(1.0, 1.0, home_matches_7d=3, away_matches_7d=1)
    assert lh < 1.0 and mu == 1.0
    assert elo_home_adv_from_profile(0.22) >= 45
    assert log_home_adv_to_elo(0.29) > log_home_adv_to_elo(0.18)
    assert 0.4 < apply_binary_temperature(0.55, 1.2) < 0.7
    assert fit_binary_temperature([0.6] * 50, [1] * 25 + [0] * 25) > 0.5

    # 16. XI delta: missing star vs weak bench raises attack delta
    xi = xi_delta_impact(
        confirmed_starters=[{"name": "A", "position": "F"}],
        missing=[{"player_name": "Star", "position": "F", "status": "out", "strength": 1.35}],
        bench=[{"name": "Bench", "position": "F", "strength": 0.8}],
    )
    assert xi["applied"] and xi["attack_delta"] > 0

    # 17. predict_match with true-xg DC parallel + early season + sharp
    full2 = predict_match(
        home="teamA",
        away="teamB",
        dc=dc_model,
        elo_home=1550.0,
        elo_away=1480.0,
        pi=pi_state,
        form_home=avg,
        form_away=leaky,
        market_odds=(1.95, 3.40, 4.10),
        sharp_odds=(1.90, 3.50, 4.20),
        close_odds=(1.85, 3.60, 4.40),
        temperature=1.0,
        dc_shots=dc_model,
        dc_true_xg=dc_model,
        days_into_season=20.0,
        home_matches_7d=3.0,
        home_missing=[{"player_name": "Star FW", "position": "F", "status": "injured", "strength": 1.3}],
        lineup_confirmed=True,
        home_xi=[{"name": "Other", "position": "M"}],
        home_bench=[{"name": "Bench", "position": "F", "strength": 0.85}],
        home_strength={"star fw": 1.3},
    )
    assert full2["components"]["true_xg_dc"] is not None
    assert full2["components"]["market"]["source"] == "sharp"
    assert full2["components"]["early_season"] is True
    # 19. اختبار نموذج الاختيار، الأودز الأمريكية، كشف مصائد القيمة، البارلي، ومعايرة الفئات
    # (أ) تحويل الأودز الأمريكية والعشرية
    assert decimal_to_american(1.60) == -167
    assert decimal_to_american(1.25) == -400
    assert decimal_to_american(3.40) == 240
    assert decimal_to_american(2.00) == 100
    assert decimal_to_american(1.85) == -118
    assert decimal_to_american(2.81) == 181

    assert american_to_decimal(240) == 3.40
    assert american_to_decimal(-400) == 1.25
    assert american_to_decimal(100) == 2.00

    # (ب) حساب الفارق الاحتمالي (Edge) وكشف مصائد القيمة (Value Trap)
    # Telstar: احتمال 65.5% وسعر -167 (1.60) -> Edge موجب (+3%)
    edge_telstar = calculate_edge(0.655, 1.60)
    assert abs(edge_telstar - 0.030) < 0.005
    assert not detect_value_trap(0.655, 1.60)

    # Barcelona: احتمال 54.4% وسعر -400 (1.25 -> 80%) -> Edge سالب فادح (-25.6%) -> مصيدة قيمة!
    edge_barca = calculate_edge(0.544, 1.25)
    assert abs(edge_barca - (-0.256)) < 0.005
    assert detect_value_trap(0.544, 1.25)

    # Fortuna: احتمال 50.5% وسعر +240 (3.40 -> 29.4%) -> Edge ضخم (+21.1%)
    edge_fortuna = calculate_edge(0.505, 3.40)
    assert abs(edge_fortuna - 0.211) < 0.005

    # (ج) مؤشر قوة الترشيح (Selection Score 0-100)
    score_telstar = calculate_selection_score(0.655, 0.188, 0.85)
    score_barca = calculate_selection_score(0.544, 0.231, 0.82)
    score_close = calculate_selection_score(0.38, 0.35, 0.50)
    assert score_telstar >= 90, f"Telstar score {score_telstar}"
    assert score_barca >= 85, f"Barca score {score_barca}"
    assert score_close < 65, f"Close score {score_close}"
    assert score_telstar > score_barca > score_close

    # (د) تحليل رهان البارلي (Parlay Analysis)
    # تلستار + برشلونة بسعر إجمالي +100 (2.0)
    parlay_res = parlay_analysis([(0.655, 1.5988), (0.544, 1.25)])
    assert abs(parlay_res["model_prob"] - 0.3563) < 0.005
    assert parlay_res["fair_american_odds"] == 181
    assert parlay_res["has_value_trap"] is True
    assert parlay_res["is_positive_ev"] is False  # سالب العائد بسبب تسعير برشلونة

    # (هـ) معايرة فئات الاحتمالات (Calibration Bins & ECE)
    sample_probs = [(0.75, 0.15, 0.10)] * 10 + [(0.52, 0.28, 0.20)] * 10
    sample_outs = ["H"] * 7 + ["D"] * 3 + ["H"] * 5 + ["A"] * 5
    cbins = calibration_bins(sample_probs, sample_outs)
    assert len(cbins) == 7
    bin_70 = next(b for b in cbins if b["label"] == "70–79.9%")
    assert bin_70["n_matches"] == 10
    assert bin_70["n_correct"] == 7
    assert abs(bin_70["win_rate"] - 0.70) < 1e-4
    ece = expected_calibration_error(sample_probs, sample_outs)
    assert 0.0 <= ece <= 1.0

    # (و) فحص معايرة الرهانات المفاجئة (Underdog Edge Calibration)
    underdog_eval = underdog_edge_calibration(
        sample_probs, sample_outs, [(2.50, 3.20, 3.00)] * 20
    )
    assert "is_calibrated" in underdog_eval

    # (ز) فحص محرك تقليل واستبعاد العشوائية (Anti-Randomness & Stability Engine)
    # 1. اختبار الفريق الأكثر تعادلاً (Chronic Drawer)
    draw_matches = [
        {"home_team_id": "TeamD", "away_team_id": "X", "home_goals": 1, "away_goals": 1, "ht_home_goals": 0, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 10, "fouls_away": 10},
        {"home_team_id": "TeamD", "away_team_id": "Y", "home_goals": 0, "away_goals": 0, "ht_home_goals": 0, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 2, "yellow_away": 1, "fouls_home": 11, "fouls_away": 10},
        {"home_team_id": "Z", "away_team_id": "TeamD", "home_goals": 2, "away_goals": 2, "ht_home_goals": 1, "ht_away_goals": 1, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 2, "fouls_home": 12, "fouls_away": 11},
        {"home_team_id": "TeamD", "away_team_id": "W", "home_goals": 1, "away_goals": 1, "ht_home_goals": 1, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 9, "fouls_away": 10},
        {"home_team_id": "TeamD", "away_team_id": "V", "home_goals": 2, "away_goals": 0, "ht_home_goals": 1, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 0, "yellow_away": 1, "fouls_home": 8, "fouls_away": 10},
        {"home_team_id": "U", "away_team_id": "TeamD", "home_goals": 1, "away_goals": 0, "ht_home_goals": 0, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 2, "yellow_away": 1, "fouls_home": 11, "fouls_away": 9},
        {"home_team_id": "TeamD", "away_team_id": "T", "home_goals": 3, "away_goals": 1, "ht_home_goals": 2, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 10, "fouls_away": 10},
        {"home_team_id": "S", "away_team_id": "TeamD", "home_goals": 0, "away_goals": 2, "ht_home_goals": 0, "ht_away_goals": 1, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 10, "fouls_away": 8},
        {"home_team_id": "TeamD", "away_team_id": "R", "home_goals": 0, "away_goals": 1, "ht_home_goals": 0, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 2, "yellow_away": 2, "fouls_home": 12, "fouls_away": 11},
        {"home_team_id": "Q", "away_team_id": "TeamD", "home_goals": 1, "away_goals": 1, "ht_home_goals": 1, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 10, "fouls_away": 10},
    ]
    stat_d = compute_team_randomness_profile("TeamD", draw_matches)
    assert stat_d.draw_rate >= 0.35, f"draw_rate {stat_d.draw_rate}"
    assert stat_d.is_chronic_drawer is True

    # 2. اختبار الفريق الأضعف بالنصف الثاني (Second-Half Fragile)
    sh_matches = [
        {"home_team_id": "TeamSH", "away_team_id": "X", "home_goals": 1, "away_goals": 2, "ht_home_goals": 1, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 10, "fouls_away": 10},
        {"home_team_id": "TeamSH", "away_team_id": "Y", "home_goals": 2, "away_goals": 2, "ht_home_goals": 2, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 10, "fouls_away": 10},
        {"home_team_id": "Z", "away_team_id": "TeamSH", "home_goals": 3, "away_goals": 1, "ht_home_goals": 0, "ht_away_goals": 1, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 10, "fouls_away": 10},
        {"home_team_id": "TeamSH", "away_team_id": "W", "home_goals": 1, "away_goals": 1, "ht_home_goals": 1, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 10, "fouls_away": 10},
        {"home_team_id": "TeamSH", "away_team_id": "V", "home_goals": 0, "away_goals": 2, "ht_home_goals": 0, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 10, "fouls_away": 10},
        {"home_team_id": "U", "away_team_id": "TeamSH", "home_goals": 2, "away_goals": 0, "ht_home_goals": 0, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 10, "fouls_away": 10},
    ]
    stat_sh = compute_team_randomness_profile("TeamSH", sh_matches)
    assert stat_sh.sh_fragility_ratio >= 0.70, f"sh_ratio {stat_sh.sh_fragility_ratio}"
    assert stat_sh.is_second_half_fragile is True
    assert stat_sh.blown_leads_count >= 2

    # 3. اختبار الفريق المعرض للطرد (Red Card Prone)
    rc_matches = [
        {"home_team_id": "TeamRC", "away_team_id": "X", "home_goals": 0, "away_goals": 1, "ht_home_goals": 0, "ht_away_goals": 0, "red_home": 1, "red_away": 0, "yellow_home": 4, "yellow_away": 1, "fouls_home": 17, "fouls_away": 10},
        {"home_team_id": "Y", "away_team_id": "TeamRC", "home_goals": 2, "away_goals": 0, "ht_home_goals": 1, "ht_away_goals": 0, "red_home": 0, "red_away": 1, "yellow_home": 1, "yellow_away": 3, "fouls_home": 10, "fouls_away": 16},
        {"home_team_id": "TeamRC", "away_team_id": "Z", "home_goals": 1, "away_goals": 1, "ht_home_goals": 0, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 3, "yellow_away": 2, "fouls_home": 15, "fouls_away": 12},
        {"home_team_id": "W", "away_team_id": "TeamRC", "home_goals": 1, "away_goals": 1, "ht_home_goals": 0, "ht_away_goals": 0, "red_home": 0, "red_away": 1, "yellow_home": 2, "yellow_away": 4, "fouls_home": 11, "fouls_away": 18},
        {"home_team_id": "TeamRC", "away_team_id": "V", "home_goals": 0, "away_goals": 0, "ht_home_goals": 0, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 3, "yellow_away": 1, "fouls_home": 14, "fouls_away": 9},
        {"home_team_id": "U", "away_team_id": "TeamRC", "home_goals": 2, "away_goals": 1, "ht_home_goals": 1, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 4, "yellow_away": 2, "fouls_home": 16, "fouls_away": 11},
    ]
    stat_rc = compute_team_randomness_profile("TeamRC", rc_matches)
    assert stat_rc.red_cards_avg >= 0.15, f"rc_avg {stat_rc.red_cards_avg}"
    assert stat_rc.is_card_prone is True
    assert stat_rc.disciplinary_risk_index >= 3.0

    # 4. فحص تقييم عشوائية المباراة
    m_rand_high = evaluate_match_randomness(
        home_team="TeamD",
        away_team="TeamRC",
        home_stats=stat_d,
        away_stats=stat_rc,
        referee_profile={"strictness": 1.30, "avg_yellows": 5.2, "avg_reds": 0.35, "matches_n": 15},
        total_expected_goals=2.1,
        elo_diff=35.0,
        top_prob=0.42,
    )
    assert m_rand_high["match_randomness_index"] >= 72, f"MRI: {m_rand_high['match_randomness_index']}"
    assert m_rand_high["verdict"] == "STRICT_EXCLUDE"
    assert m_rand_high["is_strictly_excluded"] is True
    assert m_rand_high["pillars"]["draw_trap"]["active"] is True
    assert m_rand_high["pillars"]["disciplinary_risk"]["active"] is True
    assert m_rand_high["multipliers"]["temperature_mult"] > 1.0
    assert m_rand_high["multipliers"]["confidence_mult"] < 1.0
    assert "goal_recommendation_ar" in m_rand_high

    # 5. اختبار صدام البطاقات الثنائي (Mutual Card-Prone Clash)
    m_rand_derby = evaluate_match_randomness(
        home_team="TeamRC1",
        away_team="TeamRC2",
        home_stats=stat_rc,
        away_stats=stat_rc,
        referee_profile={"strictness": 1.20, "avg_reds": 0.25},
        total_expected_goals=2.5,
    )
    assert m_rand_derby["pillars"]["disciplinary_risk"]["severity"] == "CRITICAL"
    assert m_rand_derby["is_strictly_excluded"] is True
    assert "صدام انضباطي ناري" in m_rand_derby["pillars"]["disciplinary_risk"]["reason_ar"]

    # 6. اختبار الانهيار الثنائي للشوط الثاني (Mutual 2H Collapse)
    m_rand_sh_mutual = evaluate_match_randomness(
        home_team="TeamSH1",
        away_team="TeamSH2",
        home_stats=stat_sh,
        away_stats=stat_sh,
        total_expected_goals=2.7,
    )
    assert m_rand_sh_mutual["pillars"]["second_half_fragility"]["severity"] == "CRITICAL"
    assert "انهيار دفاعي متأخر لكلا الفريقين" in m_rand_sh_mutual["pillars"]["second_half_fragility"]["reason_ar"]

    # 7. اختبار الحالات الحدية (Empty margins & zero-goal defense handling)
    stat_empty = compute_team_randomness_profile("EmptyTeam", [])
    assert stat_empty.matches_played == 0
    assert stat_empty.draw_rate == 0.25
    assert stat_empty.sh_fragility_ratio == 0.50

    stat_elite_def = compute_team_randomness_profile("EliteDef", [
        {"home_team_id": "EliteDef", "away_team_id": "X", "home_goals": 1, "away_goals": 0, "ht_home_goals": 0, "ht_away_goals": 0} for _ in range(10)
    ] + [
        {"home_team_id": "EliteDef", "away_team_id": "Y", "home_goals": 2, "away_goals": 1, "ht_home_goals": 1, "ht_away_goals": 0}
    ])
    # 0 goals conceded in 1H, 1 in 2H over 11 games -> should NOT be flagged as 2H fragile due to elite overall defense
    assert stat_elite_def.is_second_half_fragile is False

    # 8. فحص التكامل الكامل داخل predict_match مع التعديلات المباشرة (/boost و /goal)
    pred_draw_trap = predict_match(
        home="TeamD",
        away="TeamD",
        dc=dc_model,
        elo_home=1500.0,
        elo_away=1500.0,
        pi=pi_state,
        form_home=avg,
        form_away=avg,
        market_odds=(2.50, 3.20, 2.80),
        home_randomness_stats=stat_d,
        away_randomness_stats=stat_d,
    )
    assert pred_draw_trap["randomness"]["pillars"]["draw_trap"]["severity"] == "CRITICAL"
    assert pred_draw_trap["is_strictly_excluded"] is True
    assert pred_draw_trap["p_draw"] > 0.35, f"p_draw {pred_draw_trap['p_draw']}"
    if pred_draw_trap.get("value"):
        assert pred_draw_trap["value"]["bet"] is False

    # مواجهة مستقرة
    clean_matches = [
        {"home_team_id": "SolidH", "away_team_id": "X", "home_goals": 2, "away_goals": 0, "ht_home_goals": 1, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 9, "fouls_away": 9},
        {"home_team_id": "SolidH", "away_team_id": "Y", "home_goals": 3, "away_goals": 1, "ht_home_goals": 1, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 8, "fouls_away": 10},
        {"home_team_id": "Z", "away_team_id": "SolidH", "home_goals": 1, "away_goals": 2, "ht_home_goals": 0, "ht_away_goals": 1, "red_home": 0, "red_away": 0, "yellow_home": 0, "yellow_away": 1, "fouls_home": 10, "fouls_away": 8},
        {"home_team_id": "SolidH", "away_team_id": "W", "home_goals": 2, "away_goals": 1, "ht_home_goals": 1, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 9, "fouls_away": 9},
        {"home_team_id": "SolidH", "away_team_id": "V", "home_goals": 4, "away_goals": 0, "ht_home_goals": 2, "ht_away_goals": 0, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 0, "fouls_home": 8, "fouls_away": 11},
        {"home_team_id": "U", "away_team_id": "SolidH", "home_goals": 0, "away_goals": 2, "ht_home_goals": 0, "ht_away_goals": 1, "red_home": 0, "red_away": 0, "yellow_home": 1, "yellow_away": 1, "fouls_home": 10, "fouls_away": 9},
    ]
    stat_solid_h = compute_team_randomness_profile("SolidH", clean_matches)
    stat_solid_a = compute_team_randomness_profile("SolidA", clean_matches)
    m_rand_stable = evaluate_match_randomness(
        home_team="SolidH",
        away_team="SolidA",
        home_stats=stat_solid_h,
        away_stats=stat_solid_a,
        referee_profile={"strictness": 0.90, "avg_yellows": 3.2, "avg_reds": 0.05, "matches_n": 20},
        total_expected_goals=2.9,
        elo_diff=180.0,
        top_prob=0.68,
    )
    assert m_rand_stable["match_randomness_index"] < 40, f"Stable MRI: {m_rand_stable['match_randomness_index']}"
    assert m_rand_stable["verdict"] == "SAFE_STABLE"
    assert m_rand_stable["is_strictly_excluded"] is False

    print("selftest ok — ensemble-v4 mathematical engine verified cleanly!")


if __name__ == "__main__":
    main()
