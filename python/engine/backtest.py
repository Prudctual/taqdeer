"""حزام walk-forward طويل (rolling-origin) + ablation — خطة 006 §1.1/1.2.

لكل دوري: يبدأ التقييم من أول مباراة في الموسم الثاني المتاح، يُعاد ملاءمة DC كل
`refit_every` مباراة على بيانات ما قبلها فقط (اندثار زمني نسبةً إلى تاريخ المباراة
المُقيَّمة لا إلى اليوم)، وتتقدّم Elo/Pi/الفورم مباراةً مباراة. الأوزان والحرارة وα ورأس
التعادل تُقدَّر بتوسيع موسمي: مواسم سابقة → الموسم الحالي (out-of-sample دائماً).

المخرجات مقاييس النموذج (pm) مقابل السوق الحاد عند الإعلان (PSH) وعند الإغلاق (PSCH)،
منحنى معايرة بفواصل Wilson، حصة التعادل كأعلى توقع، معايرة O/U، وشريحة «محسوم» أولية.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Mapping, Optional, Sequence, Tuple

import numpy as np

from .calibrate import apply_temperature, fit_temperature, odds_to_probs
from .dixon_coles import DixonColesResult, fit_dixon_coles
from .draw_head import draw_features, fit_draw_head, predict_draw_head
from .elo import SeasonState, elo_home_adv_from_profile, shrunk_ratings, update_elo
from .ensemble import DEFAULT_FLAGS, blend_components, fit_weights, predict_match
from .evaluate import calibration_bins, summarize
from .form import rolling_form
from .league_profiles import get_league_profile
from .market_anchor import fit_alpha, logit_pool
from .markets import calibrate_binary_market, demargin_two_way
from .pi_ratings import shrunk_pi, update_pi
from .pipeline import (
    H2HIndex,
    build_elo_matches,
    build_form_matches,
    build_obs,
    build_obs_shots,
    build_obs_true_xg,
    build_pi_matches,
    count_matches_in_window,
    days_into_season,
    empty_form,
    odds3,
    outcome_of,
    parse_utc,
    promoted_seeds,
    rolling_team_ppda,
    row_get,
    season_index,
)
from .sieve import DEFAULT_THETA, SieveContext, evaluate_banker

Prob3 = Tuple[float, float, float]
OUT_IDX = {"H": 0, "D": 1, "A": 2}

# الأعلام التي لها بيانات تاريخية (الطقس/الغيابات/الحكّام حيّة فقط ولا تُقاس هنا)
HISTORICAL_FLAGS = (
    "h2h", "turf", "tactics", "manager", "gk", "tight_damping", "congestion",
    "shots_dc", "xg_dc", "rand_temperature", "draw_boost_pre", "early_adjust",
)


@dataclass
class BacktestConfig:
    league_id: str
    refit_every: int = 10
    half_life: float = 140.0
    max_train: int = 1000
    eval_from_season: str | None = None
    demargin: str = "power"
    shrink_ratings: bool = True
    dc_priors: bool = True
    min_history: int = 200


@dataclass
class Record:
    match_id: str
    season: str
    utc_date: str
    home: str
    away: str
    hg: int
    ag: int
    outcome: str
    days_into_season: float | None
    n_season_home: int
    n_season_away: int
    promoted_home: bool
    promoted_away: bool
    odds_avg: Prob3 | None
    odds_sharp: Prob3 | None
    odds_close: Prob3 | None
    ps_sharp: Prob3 | None
    ps_close: Prob3 | None
    ou_close: Tuple[float, float] | None       # (p_over, p_under) بيناكل إغلاق منزوع الهامش
    ah_close: Tuple[float, float, float] | None  # (line, p_home, p_away)
    # لكل متغيّر ablation:
    variants: Dict[str, dict] = field(default_factory=dict)


def _t3(p) -> Prob3 | None:
    return tuple(float(x) for x in p) if p is not None else None


def _variant_payload(pred: dict) -> dict:
    c = pred["components"]
    return {
        "comps": {
            "dc": _t3(c["dixon_coles"]["p"]),
            "pi": _t3(c["pi_ratings"]["p"]),
            "elo": _t3(c["elo"]["p"]),
            "form": _t3(c["form"]["p"]),
            "context": _t3((c.get("context") or {}).get("p")),
        },
        "lam": float(pred["lambda_home"]),
        "mu": float(pred["lambda_away"]),
        "p_over25": float(pred["p_over25"]),
        "p_btts": float(pred["p_btts_yes"]),
        # مضاعف الحرارة الذي يطبّقه predict_match فوق T (بداية الموسم/العشوائية)
        "temp_mult": float(c.get("temp_mult", 1.0)),
    }


def _fit_stack(
    records: Sequence[Record], variant: str, *, ridge: float = 1.0
) -> Dict[str, Any]:
    """أوزان + حرارة + α (إعلان/إغلاق) + رأس تعادل من سجلات معطاة — بلا تسريب داخلي."""
    comps = [r.variants[variant]["comps"] for r in records]
    y = [r.outcome for r in records]
    mults = [float(r.variants[variant].get("temp_mult", 1.0)) for r in records]
    w = fit_weights(comps, y, ridge=ridge)
    blended = [blend_components(c, w) for c in comps]
    temp = fit_temperature(blended, y, mults=mults)
    pm = [apply_temperature(p, temp * m) for p, m in zip(blended, mults)]
    a_sharp = _fit_alpha_on(pm, [r.ps_sharp for r in records], y)
    a_close = _fit_alpha_on(pm, [r.ps_close for r in records], y)
    feats = [draw_features(r.variants[variant]["lam"], r.variants[variant]["mu"], p[1]) for r, p in zip(records, pm)]
    dh_coefs = fit_draw_head(feats, [1 if r.outcome == "D" else 0 for r in records])
    return {
        "n_train": len(records), "weights": w, "temperature": temp,
        "alpha_sharp": a_sharp, "alpha_close": a_close, "draw_head": dh_coefs,
    }


def _ps(odds: Prob3 | None, method: str) -> Prob3 | None:
    if odds is None:
        return None
    return odds_to_probs(*odds, method=method)


def run_league(
    rows: Sequence[Any],
    closing: Mapping[str, Any],
    cfg: BacktestConfig,
    variants: Mapping[str, Mapping[str, bool]] | None = None,
    *,
    progress: Callable[[str], None] | None = None,
) -> List[Record]:
    """تمريرة واحدة زمنية؛ يُحسب كل متغيّر ablation على نفس الحالات."""
    lid = cfg.league_id
    variants = dict(variants or {"base": DEFAULT_FLAGS})
    rows = list(rows)
    n = len(rows)
    si = season_index(rows)
    seasons = si.ordered
    if cfg.eval_from_season and cfg.eval_from_season in si.first_idx:
        start = si.first_idx[cfg.eval_from_season]
    elif len(seasons) >= 2:
        start = si.first_idx[seasons[1]]
    else:
        start = min(n, cfg.min_history)
    start = max(start, cfg.min_history)
    if start >= n:
        return []

    elo_matches = build_elo_matches(rows)
    pi_matches = build_pi_matches(rows)
    form_matches = build_form_matches(rows)
    elo_seeds, pi_off_seeds, pi_def_seeds = promoted_seeds(elo_matches, pi_matches, si)
    h2h = H2HIndex(rows)
    profile = get_league_profile(lid)
    elo_ha = elo_home_adv_from_profile(profile.home_advantage)

    # عدد مباريات الموسم لكل فريق حتى ما قبل المباراة k (لقواعد الغربال)
    season_games: Dict[Tuple[str, str], int] = {}

    model: DixonColesResult | None = None
    model_shots = None
    model_xg = None
    prev_season_model: DixonColesResult | None = None
    current_season = None
    records: List[Record] = []
    t0 = time.time()

    for k in range(start, n):
        m = rows[k]
        season = str(row_get(m, "season", "") or "")
        if season != current_season:
            # أول مباراة في موسم جديد: النموذج الحالي (حتى نهاية الموسم السابق) يصبح الأسبقية
            prev_season_model = model
            current_season = season

        if (k - start) % cfg.refit_every == 0 or model is None:
            train_rows = rows[max(0, k - cfg.max_train):k]
            ref_dt = parse_utc(m["utc_date"])
            obs = build_obs(train_rows, ref_dt)
            priors = None
            if cfg.dc_priors and prev_season_model is not None:
                priors = {t: (prev_season_model.attack.get(t, 0.0), prev_season_model.defense.get(t, 0.0))
                          for t in prev_season_model.teams}
                # الصاعدون: متوسط الفرق التي غادرت
                cur_teams = si.teams.get(season, set())
                dropped = [t for t in prev_season_model.teams if t not in cur_teams]
                if dropped:
                    pa = float(np.mean([prev_season_model.attack.get(t, 0.0) for t in dropped]))
                    pdf = float(np.mean([prev_season_model.defense.get(t, 0.0) for t in dropped]))
                    for t in cur_teams:
                        if t not in priors:
                            priors[t] = (pa, pdf)
            model = fit_dixon_coles(obs, half_life_days=cfg.half_life, league_id=lid, priors=priors)
            shots_obs = build_obs_shots(train_rows, obs)
            model_shots = fit_dixon_coles(shots_obs, half_life_days=cfg.half_life, league_id=lid, priors=None) if shots_obs else None
            xg_obs = build_obs_true_xg(train_rows, obs)
            model_xg = fit_dixon_coles(xg_obs, half_life_days=cfg.half_life, league_id=lid, priors=None) if xg_obs else None
            if progress and (k - start) % (cfg.refit_every * 20) == 0:
                progress(f"{lid}: {k - start}/{n - start} eval · {time.time() - t0:.0f}s")

        st = SeasonState()
        elo_k, _ = update_elo(elo_matches[:k], home_adv=elo_ha, seeds=elo_seeds, season_state=st)
        pi_k = update_pi(pi_matches[:k], off_seeds=pi_off_seeds, def_seeds=pi_def_seeds)
        for t_, v_ in pi_off_seeds.items():
            pi_k.off.setdefault(t_, v_)
        for t_, v_ in pi_def_seeds.items():
            pi_k.deff.setdefault(t_, v_)
        if cfg.shrink_ratings:
            elo_used = shrunk_ratings(elo_k, st)
            pi_used = shrunk_pi(pi_k)
        else:
            elo_used, pi_used = elo_k, pi_k
        forms_k = rolling_form(form_matches[:k], window=5)

        h, a = m["home_team_id"], m["away_team_id"]
        eh = elo_used.get(h, elo_seeds.get(h, 1500.0))
        ea = elo_used.get(a, elo_seeds.get(a, 1500.0))
        prefix = rows[:k]
        ppda_h, ppda_hn = rolling_team_ppda(prefix, h)
        ppda_a, ppda_an = rolling_team_ppda(prefix, a)
        odds_avg = odds3(m, "odds")
        odds_sharp = odds3(m, "odds_sharp")
        odds_close = odds3(m, "odds_close")
        dis = days_into_season(m["utc_date"], season)
        common = dict(
            home=h, away=a, dc=model, elo_home=eh, elo_away=ea, pi=pi_used,
            form_home=forms_k.get(h, empty_form()), form_away=forms_k.get(a, empty_form()),
            market_odds=odds_avg, sharp_odds=odds_sharp, open_odds=odds_sharp, close_odds=odds_close,
            temperature=1.0, dc_shots=model_shots, dc_true_xg=model_xg,
            h2h_matches=h2h.before(h, a, before_gi=k), league_id=lid,
            ppda_home=ppda_h, ppda_away=ppda_a, ppda_home_n=ppda_hn, ppda_away_n=ppda_an,
            form_matches=form_matches[:k],
            home_matches_7d=count_matches_in_window(prefix, h, m["utc_date"]),
            away_matches_7d=count_matches_in_window(prefix, a, m["utc_date"]),
            days_into_season=dis, alpha=1.0, demargin_method=cfg.demargin,
        )
        hg, ag = int(m["home_goals"]), int(m["away_goals"])
        cl = closing.get(m["id"])
        ou_close = None
        ah_close = None
        if cl is not None:
            ou = demargin_two_way(row_get(cl, "ou_over"), row_get(cl, "ou_under"))
            if ou:
                ou_close = ou
            ahp = demargin_two_way(row_get(cl, "ah_home"), row_get(cl, "ah_away"))
            if ahp and row_get(cl, "ah_line") is not None:
                ah_close = (float(cl["ah_line"]), ahp[0], ahp[1])
        rec = Record(
            match_id=m["id"], season=season, utc_date=m["utc_date"], home=h, away=a,
            hg=hg, ag=ag, outcome=outcome_of(hg, ag), days_into_season=dis,
            n_season_home=season_games.get((season, h), 0), n_season_away=season_games.get((season, a), 0),
            promoted_home=si.first_season.get(h) == season, promoted_away=si.first_season.get(a) == season,
            odds_avg=odds_avg, odds_sharp=odds_sharp, odds_close=odds_close,
            ps_sharp=_ps(odds_sharp, cfg.demargin), ps_close=_ps(odds_close, cfg.demargin),
            ou_close=ou_close, ah_close=ah_close,
        )
        for name, fl in variants.items():
            pred = predict_match(**common, flags=fl)
            rec.variants[name] = _variant_payload(pred)
        records.append(rec)
        season_games[(season, h)] = season_games.get((season, h), 0) + 1
        season_games[(season, a)] = season_games.get((season, a), 0) + 1

    if progress:
        progress(f"{lid}: done {len(records)} records in {time.time() - t0:.0f}s")
    return records


THETA_GRID = (0.60, 0.62, 0.64, 0.66, 0.68, 0.70, 0.72, 0.75)
BANKER_TARGET_HIT = 0.72
THETA_MIN_N = 50


def recommend_theta(theta_grid: Sequence[Mapping[str, Any]], *, base: float = DEFAULT_THETA) -> float:
    """أصغر θ ≥ base تحقق إصابة ≥ 72% بعينة ≥ 50 «محسوم»؛ وإلا أعلى θ في الشبكة."""
    for row in theta_grid:
        if row["theta"] < base:
            continue
        if row["n"] >= THETA_MIN_N and row["hit"] is not None and row["hit"] >= BANKER_TARGET_HIT:
            return float(row["theta"])
    eligible = [row["theta"] for row in theta_grid if row["theta"] >= base]
    return float(max(eligible)) if eligible else float(base)


# ---------------------------------------------------------------- evaluation ---
def _paired_bootstrap(diff: np.ndarray, n_boot: int = 1000, seed: int = 11) -> Tuple[float, float, float]:
    if len(diff) == 0:
        return 0.0, 0.0, 0.0
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(diff), size=(n_boot, len(diff)))
    means = diff[idx].mean(axis=1)
    return float(diff.mean()), float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5))


def _ll_vec(probs: Sequence[Prob3], outcomes: Sequence[str]) -> np.ndarray:
    return np.array([-np.log(max(float(p[OUT_IDX[o]]), 1e-12)) for p, o in zip(probs, outcomes)])


def _brier_vec(probs: Sequence[Prob3], outcomes: Sequence[str]) -> np.ndarray:
    out = []
    for p, o in zip(probs, outcomes):
        y = [1.0 if o == "H" else 0.0, 1.0 if o == "D" else 0.0, 1.0 if o == "A" else 0.0]
        out.append(sum((float(p[i]) - y[i]) ** 2 for i in range(3)))
    return np.array(out)


def stack_out_of_sample(
    records: Sequence[Record],
    variant: str,
    *,
    ridge: float = 1.0,
) -> Dict[str, Any]:
    """توسيع موسمي: أوزان+حرارة+α+رأس التعادل من مواسم سابقة → الموسم الحالي.

    يعيد لكل سجل من المواسم المقيَّمة: pm (لبّ مُعاير)، pf_sharp/pf_close (بـα OOS)،
    p_draw_head؛ ومعاملات كل موسم.
    """
    seasons = sorted({r.season for r in records}, key=lambda s: min(rr.utc_date for rr in records if rr.season == s))
    out_pm: Dict[str, Prob3] = {}
    out_pf_sharp: Dict[str, Prob3] = {}
    out_pf_close: Dict[str, Prob3] = {}
    out_dh: Dict[str, float | None] = {}
    per_season: Dict[str, dict] = {}
    for j in range(1, len(seasons)):
        s = seasons[j]
        prior = [r for r in records if r.season in seasons[:j] and variant in r.variants]
        cur = [r for r in records if r.season == s and variant in r.variants]
        if len(prior) < 60 or not cur:
            continue
        fit = _fit_stack(prior, variant, ridge=ridge)
        w, temp = fit["weights"], fit["temperature"]
        a_sharp, a_close, dh_coefs = fit["alpha_sharp"], fit["alpha_close"], fit["draw_head"]
        per_season[s] = {**fit, "n_eval": len(cur)}
        for r in cur:
            v = r.variants[variant]
            pm = apply_temperature(blend_components(v["comps"], w), temp * float(v.get("temp_mult", 1.0)))
            out_pm[r.match_id] = pm
            out_pf_sharp[r.match_id] = logit_pool(pm, r.ps_sharp, a_sharp["alpha"]) if r.ps_sharp else pm
            out_pf_close[r.match_id] = logit_pool(pm, r.ps_close, a_close["alpha"]) if r.ps_close else pm
            out_dh[r.match_id] = predict_draw_head(dh_coefs, v["lam"], v["mu"], pm[1])
    # معاملات الإنتاج: مُقدَّرة على كل السجلات (آخر ما يُتاح) — تُبذر في fit_params
    usable = [r for r in records if variant in r.variants]
    production = _fit_stack(usable, variant, ridge=ridge) if len(usable) >= 60 else None
    return {
        "pm": out_pm, "pf_sharp": out_pf_sharp, "pf_close": out_pf_close, "draw_head": out_dh,
        "per_season": per_season, "production_params": production,
    }


def _fit_alpha_on(pm_list: Sequence[Prob3], ps_list: Sequence[Prob3 | None], outcomes: Sequence[str]) -> dict:
    pairs = [(pm, ps, OUT_IDX[o]) for pm, ps, o in zip(pm_list, ps_list, outcomes) if ps is not None]
    if len(pairs) < 30:
        return {"alpha": 0.0, "n": len(pairs), "ci_low": None, "ll_model": None, "ll_market": None, "ll_alpha": None}
    return fit_alpha([p for p, _, _ in pairs], [s for _, s, _ in pairs], [y for _, _, y in pairs])


def evaluate_variant(records: Sequence[Record], variant: str, *, theta: float = DEFAULT_THETA) -> Dict[str, Any]:
    stacked = stack_out_of_sample(records, variant)
    pm_map = stacked["pm"]
    evald = [r for r in records if r.match_id in pm_map]
    if not evald:
        return {"n": 0}
    y = [r.outcome for r in evald]
    pm = [pm_map[r.match_id] for r in evald]
    pf_close = [stacked["pf_close"][r.match_id] for r in evald]
    pf_sharp = [stacked["pf_sharp"][r.match_id] for r in evald]

    res: Dict[str, Any] = {"n": len(evald), "variant": variant}
    res["model"] = summarize(pm, y)
    res["final_sharp"] = summarize(pf_sharp, y)
    res["final_close"] = summarize(pf_close, y)

    # مقابل السوق الحاد عند الإعلان والإغلاق — على الأزواج المتاحة فقط
    for label, attr in (("sharp", "ps_sharp"), ("close", "ps_close")):
        pairs = [(pmi, getattr(r, attr), r.outcome) for pmi, r in zip(pm, evald) if getattr(r, attr) is not None]
        if not pairs:
            continue
        mp = [p for p, _, _ in pairs]
        sp = [s for _, s, _ in pairs]
        yy = [o for _, _, o in pairs]
        m_sum = summarize(mp, yy)
        s_sum = summarize(sp, yy)
        d_ll = _ll_vec(sp, yy) - _ll_vec(mp, yy)  # >0 = النموذج أفضل
        d_br = _brier_vec(sp, yy) - _brier_vec(mp, yy)
        mean_ll, lo_ll, hi_ll = _paired_bootstrap(d_ll)
        mean_br, lo_br, hi_br = _paired_bootstrap(d_br)
        res[f"vs_{label}"] = {
            "n": len(pairs),
            "model": m_sum,
            "market": s_sum,
            "skill_brier": 1.0 - m_sum["brier"] / s_sum["brier"] if s_sum["brier"] > 0 else None,
            "d_log_loss": {"mean": mean_ll, "ci95": [lo_ll, hi_ll]},
            "d_brier": {"mean": mean_br, "ci95": [lo_br, hi_br]},
            "model_beats_market": bool(lo_ll > 0),
            "market_beats_model": bool(hi_ll < 0),
        }
        # الناتج النهائي المدموج (α OOS) مقابل السوق
        pf_list = pf_sharp if label == "sharp" else pf_close
        pf_pairs = [(pfi, getattr(r, attr), r.outcome) for pfi, r in zip(pf_list, evald) if getattr(r, attr) is not None]
        fp = [p for p, _, _ in pf_pairs]
        fy = [o for _, _, o in pf_pairs]
        d_ll_f = _ll_vec(sp, yy) - _ll_vec(fp, fy)
        mean_f, lo_f, hi_f = _paired_bootstrap(d_ll_f)
        res[f"vs_{label}"]["final"] = summarize(fp, fy)
        res[f"vs_{label}"]["final_d_log_loss"] = {"mean": mean_f, "ci95": [lo_f, hi_f]}

    # معايرة ومنحنى
    res["calibration_model"] = calibration_bins(pm, y)
    res["calibration_final_close"] = calibration_bins(pf_close, y)
    res["draw_top_share_model"] = float(np.mean([1.0 if max(range(3), key=lambda i: p[i]) == 1 else 0.0 for p in pm]))
    res["draw_top_share_final"] = float(np.mean([1.0 if max(range(3), key=lambda i: p[i]) == 1 else 0.0 for p in pf_close]))
    res["draw_actual_share"] = float(np.mean([1.0 if o == "D" else 0.0 for o in y]))

    # O/U 2.5 من λ مقابل إغلاق بيناكل
    ou_p = [r.variants[variant]["p_over25"] for r in evald]
    ou_y = [1 if (r.hg + r.ag) >= 3 else 0 for r in evald]
    ou_mk = [r.ou_close[0] if r.ou_close else None for r in evald]
    res["over25"] = calibrate_binary_market(ou_p, ou_y, ou_mk)

    # شريحة «محسوم» أولية (الدوري مفعّل افتراضياً هنا للقياس فقط)
    def sieve_rows(th: float) -> List[Tuple[Any, Record, Prob3]]:
        out_rows = []
        for r, pmi, pfi in zip(evald, pm, pf_close):
            if r.ps_close is None:
                continue
            ctx = SieveContext(
                pm=pmi, ps=r.ps_close, pf=pfi, p_draw_head=stacked["draw_head"].get(r.match_id),
                league_status="active", theta=th, days_into_season=int(r.days_into_season or 999),
                is_derby=False, favourite_pillar_missing=False,
                fav_is_promoted=(r.promoted_home if pmi[0] >= pmi[2] else r.promoted_away),
                fav_round=(r.n_season_home if pmi[0] >= pmi[2] else r.n_season_away) + 1,
                fav_n_season=(r.n_season_home if pmi[0] >= pmi[2] else r.n_season_away),
                opp_n_season=(r.n_season_away if pmi[0] >= pmi[2] else r.n_season_home),
            )
            out_rows.append((evaluate_banker(ctx), r, pfi))
        return out_rows

    # شبكة θ (رفع فقط من 0.60): أصغر θ تحقق إصابة ≥ الهدف بعينة كافية
    theta_grid = []
    for th in THETA_GRID:
        b_th = [(sv, r, pfi) for sv, r, pfi in sieve_rows(th) if sv.tier == "banker"]
        if not b_th:
            theta_grid.append({"theta": th, "n": 0, "hit": None, "stated": None})
            continue
        theta_grid.append({
            "theta": th,
            "n": len(b_th),
            "hit": sum(1 for sv, r, _ in b_th if sv.pick == r.outcome) / len(b_th),
            "stated": float(np.mean([pfi[OUT_IDX[sv.pick]] for sv, _, pfi in b_th])),
        })
    res["theta_grid"] = theta_grid
    theta_rec = recommend_theta(theta_grid, base=theta)
    res["theta_recommended"] = theta_rec

    # الشريحة المنشورة عند θ الموصى بها (لا عند الأساس)
    slice_rows = sieve_rows(theta_rec)
    bankers = [(sv, r, pfi) for sv, r, pfi in slice_rows if sv.tier == "banker"]
    if bankers:
        hits = sum(1 for sv, r, _ in bankers if sv.pick == r.outcome)
        stated = float(np.mean([pfi[OUT_IDX[sv.pick]] for sv, _, pfi in bankers]))
        b_probs = [pfi for _, _, pfi in bankers]
        b_y = [r.outcome for _, r, _ in bankers]
        b_close = [r.ps_close for _, r, _ in bankers]
        res["banker_slice"] = {
            "n": len(bankers),
            "share_of_matches": len(bankers) / max(len(slice_rows), 1),
            "hit_rate": hits / len(bankers),
            "stated_mean": stated,
            "brier": summarize(b_probs, b_y)["brier"],
            "close_brier": summarize(b_close, b_y)["brier"],
            "theta": theta_rec,
        }
    else:
        res["banker_slice"] = {"n": 0, "theta": theta_rec}
    tiers: Dict[str, int] = {}
    for sv, _, _ in slice_rows:
        tiers[sv.tier] = tiers.get(sv.tier, 0) + 1
    res["tiers"] = tiers

    # جدول موسمي
    per_season: Dict[str, Any] = {}
    for s in sorted({r.season for r in evald}):
        idx = [i for i, r in enumerate(evald) if r.season == s]
        pm_s = [pm[i] for i in idx]
        y_s = [y[i] for i in idx]
        entry = {"n": len(idx), "model": summarize(pm_s, y_s)}
        pairs = [(pm[i], evald[i].ps_close, y[i]) for i in idx if evald[i].ps_close is not None]
        if pairs:
            entry["close"] = summarize([s_ for _, s_, _ in pairs], [o for _, _, o in pairs])
            entry["model_on_close_pairs"] = summarize([p for p, _, _ in pairs], [o for _, _, o in pairs])
        entry["params"] = stacked["per_season"].get(s)
        per_season[s] = entry
    res["per_season"] = per_season
    res["latest_params"] = stacked["per_season"].get(sorted(stacked["per_season"])[-1]) if stacked["per_season"] else None
    res["production_params"] = stacked.get("production_params")
    return res


def ablation_table(records: Sequence[Record], base: str = "base") -> List[Dict[str, Any]]:
    """Δlog-loss وΔBrier لكل متغيّر مقابل base على نفس المباريات (paired bootstrap)."""
    if not records:
        return []
    variants = sorted({v for r in records for v in r.variants})
    if base not in variants:
        return []
    base_stack = stack_out_of_sample(records, base)
    base_pm = base_stack["pm"]
    out: List[Dict[str, Any]] = []
    for v in variants:
        if v == base:
            continue
        st = stack_out_of_sample(records, v)
        ids = [mid for mid in base_pm if mid in st["pm"]]
        if not ids:
            continue
        by_id = {r.match_id: r for r in records}
        y = [by_id[i].outcome for i in ids]
        pb = [base_pm[i] for i in ids]
        pv = [st["pm"][i] for i in ids]
        d_ll = _ll_vec(pb, y) - _ll_vec(pv, y)  # >0 = المتغيّر أفضل من base
        d_br = _brier_vec(pb, y) - _brier_vec(pv, y)
        m_ll, lo_ll, hi_ll = _paired_bootstrap(d_ll)
        m_br, lo_br, hi_br = _paired_bootstrap(d_br)
        out.append({
            "variant": v,
            "n": len(ids),
            "d_log_loss": m_ll, "d_log_loss_ci95": [lo_ll, hi_ll],
            "d_brier": m_br, "d_brier_ci95": [lo_br, hi_br],
            "verdict": "variant_better" if lo_ll > 0 else ("base_better" if hi_ll < 0 else "no_evidence"),
        })
    return out


def default_ablation_variants() -> Dict[str, Dict[str, bool]]:
    variants: Dict[str, Dict[str, bool]] = {"base": dict(DEFAULT_FLAGS)}
    for f in HISTORICAL_FLAGS:
        fl = dict(DEFAULT_FLAGS)
        fl[f] = not DEFAULT_FLAGS[f]
        variants[f"toggle_{f}"] = fl
    all_off = dict(DEFAULT_FLAGS)
    for f in HISTORICAL_FLAGS:
        all_off[f] = False
    variants["all_context_off"] = all_off
    return variants
