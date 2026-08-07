"""فحص ذاتي كامل لمنطق v3 ومكونات المحرك الرياضي — يفشل بصوت عالٍ إن انكسر المنطق."""

import numpy as np
from .dixon_coles import DixonColesResult, MatchObs, fit_dixon_coles, score_matrix, tau_vec
from .elo import EloMatch, update_elo
from .ensemble import DEFAULT_WEIGHTS, align_matrix_to_probs, blend_components, fit_weights, predict_match, value_signal
from .evaluate import rps, summarize
from .form import FormMatch, TeamForm, form_lambda_adjust, rolling_form
from .h2h_engine import evaluate_h2h_advantage
from .logistics_engine import evaluate_logistics_and_external_factors
from .pi_ratings import PiMatch, update_pi
from .player_impact import apply_rapm_to_xg
from .referee_engine import evaluate_referee_impact
from .sharp_market import detect_steam, steam_confidence_bonus
from .strengths_weaknesses import analyze_team_strengths_weaknesses
from .tactical_matchup import evaluate_tactical_matchup
from .weather_engine import apply_weather_to_lambdas, weather_goal_multiplier
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

    # 9. Tactical matchup — بمعرفات الفرق الفعلية (slug) لضمان مطابقة المفاتيح
    tactics = evaluate_tactical_matchup("pd-real-madrid", "pl-man-city")
    assert "home_formation" in tactics and "away_style" in tactics
    assert tactics["home_formation"] == "4-3-3" and tactics["away_formation"] == "3-2-4-1", tactics

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
    rapm = apply_rapm_to_xg(1.5, 1.2, [{"position": "F", "status": "injured"}], [])
    assert rapm["lambda_home"] < 1.5
    ref = evaluate_referee_impact({"matches_n": 3, "avg_yellows": 6.0, "strictness": 1.5})
    assert not ref["applied"]
    steam = detect_steam((2.5, 3.3, 2.8), (2.1, 3.3, 3.4))
    assert steam["applied"] and steam["side"] == "home"
    assert steam_confidence_bonus(steam, "home") > 0

    print("selftest ok — all mathematical engine components verified cleanly!")


if __name__ == "__main__":
    main()
