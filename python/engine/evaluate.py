"""Walk-forward calibration metrics."""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Tuple


def brier_score(probs: List[Tuple[float, float, float]], outcomes: List[str]) -> float:
    total = 0.0
    for (ph, pd, pa), o in zip(probs, outcomes):
        y = [1.0 if o == "H" else 0.0, 1.0 if o == "D" else 0.0, 1.0 if o == "A" else 0.0]
        total += (ph - y[0]) ** 2 + (pd - y[1]) ** 2 + (pa - y[2]) ** 2
    return total / max(len(probs), 1)


def log_loss(probs: List[Tuple[float, float, float]], outcomes: List[str]) -> float:
    total = 0.0
    for (ph, pd, pa), o in zip(probs, outcomes):
        p = {"H": ph, "D": pd, "A": pa}[o]
        total -= math.log(max(p, 1e-12))
    return total / max(len(probs), 1)


def rps(probs: List[Tuple[float, float, float]], outcomes: List[str]) -> float:
    """Ranked probability score على الترتيب H<D<A — يعاقب الخطأ البعيد أشد من القريب."""
    total = 0.0
    for (ph, pd, _pa), o in zip(probs, outcomes):
        y1 = 1.0 if o == "H" else 0.0
        y2 = y1 + (1.0 if o == "D" else 0.0)
        c1 = ph - y1
        c2 = ph + pd - y2
        total += (c1 * c1 + c2 * c2) / 2.0
    return total / max(len(probs), 1)


def accuracy(probs: List[Tuple[float, float, float]], outcomes: List[str]) -> float:
    correct = 0
    for (ph, pd, pa), o in zip(probs, outcomes):
        pred = max(("H", ph), ("D", pd), ("A", pa), key=lambda x: x[1])[0]
        if pred == o:
            correct += 1
    return correct / max(len(probs), 1)


def summarize(
    probs: List[Tuple[float, float, float]], outcomes: List[str]
) -> Dict[str, float]:
    return {
        "n": float(len(probs)),
        "accuracy": accuracy(probs, outcomes),
        "brier": brier_score(probs, outcomes),
        "log_loss": log_loss(probs, outcomes),
        "rps": rps(probs, outcomes),
    }


def summarize_with_closing(
    probs: List[Tuple[float, float, float]],
    outcomes: List[str],
    close_odds: List[Optional[Tuple[float, float, float]]],
) -> Dict[str, float]:
    """مقاييس walk-forward + مقارنة NLL بخط الإغلاق."""
    from .sharp_market import log_loss_vs_closing

    base = summarize(probs, outcomes)
    cl = log_loss_vs_closing(probs, close_odds, outcomes)
    base["close_n"] = cl["n"]
    base["close_nll"] = cl["close_nll"]
    base["model_nll_close"] = cl["model_nll"]
    base["nll_edge_vs_close"] = cl["nll_edge"]
    return base


def binary_log_loss(probs: List[float], labels: List[int]) -> float:
    total = 0.0
    for p, y in zip(probs, labels):
        pp = min(max(float(p), 1e-12), 1.0 - 1e-12)
        total -= y * math.log(pp) + (1 - y) * math.log(1.0 - pp)
    return total / max(len(probs), 1)


def fit_binary_temperature(
    probs: List[float], labels: List[int], bounds=(0.5, 4.0)
) -> float:
    """حرارة لوغاريتمية بسيطة لأسواق ثنائية (O2.5 / BTTS)."""
    if len(probs) < 40:
        return 1.0
    from scipy.optimize import minimize_scalar

    def nll(t: float) -> float:
        scaled = []
        for p in probs:
            # map p through temperature on logit
            pp = min(max(float(p), 1e-9), 1.0 - 1e-9)
            logit = math.log(pp / (1.0 - pp)) / max(t, 1e-3)
            scaled.append(1.0 / (1.0 + math.exp(-logit)))
        return binary_log_loss(scaled, labels)

    res = minimize_scalar(nll, bounds=bounds, method="bounded")
    return float(res.x) if res.success else 1.0


def apply_binary_temperature(p: float, temperature: float) -> float:
    pp = min(max(float(p), 1e-9), 1.0 - 1e-9)
    logit = math.log(pp / (1.0 - pp)) / max(float(temperature), 1e-3)
    return float(1.0 / (1.0 + math.exp(-logit)))


DEFAULT_CALIBRATION_BINS: List[Tuple[float, float, str]] = [
    (0.30, 0.40, "30–39.9%"),
    (0.40, 0.50, "40–49.9%"),
    (0.50, 0.55, "50–54.9%"),
    (0.55, 0.60, "55–59.9%"),
    (0.60, 0.70, "60–69.9%"),
    (0.70, 0.80, "70–79.9%"),
    (0.80, 1.001, "80%+"),
]


def calibration_bins(
    probs: List[Tuple[float, float, float]],
    outcomes: List[str],
    bins: Optional[List[Tuple[float, float, str]]] = None,
) -> List[Dict[str, float | int | str]]:
    """
    تحليل دقة ومعايرة فئات الاحتمالات (Reliability / Calibration Bins):
    توزيع التوقعات على شرائح الاحتمال لمقارنة نسبة النجاح الفعلية بمتوسط الاحتمال المتوقع،
    وكشف العتبات الحرجة (مثل عتبة 50–55%).
    """
    if bins is None:
        bins = DEFAULT_CALIBRATION_BINS

    binned: Dict[str, List[Dict[str, float | bool]]] = {b[2]: [] for b in bins}

    for (ph, pd, pa), o in zip(probs, outcomes):
        cands = [("H", ph), ("D", pd), ("A", pa)]
        pred_side, pred_prob = max(cands, key=lambda x: x[1])
        is_hit = (pred_side == o)

        for low, high, label in bins:
            if low <= pred_prob < high:
                binned[label].append({"prob": pred_prob, "hit": is_hit})
                break

    results: List[Dict[str, float | int | str]] = []
    for low, high, label in bins:
        items = binned[label]
        n = len(items)
        hits = sum(1 for x in items if x["hit"])
        win_rate = hits / n if n > 0 else 0.0
        mean_p = (sum(x["prob"] for x in items) / n) if n > 0 else ((low + min(high, 1.0)) / 2.0)
        cal_err = abs(win_rate - mean_p) if n > 0 else 0.0

        results.append(
            {
                "label": label,
                "low": low,
                "high": min(high, 1.0),
                "n_matches": n,
                "n_correct": hits,
                "win_rate": float(round(win_rate, 4)),
                "mean_prob": float(round(mean_p, 4)),
                "calibration_error": float(round(cal_err, 4)),
            }
        )
    return results


def expected_calibration_error(
    probs: List[Tuple[float, float, float]],
    outcomes: List[str],
    bins: Optional[List[Tuple[float, float, str]]] = None,
) -> float:
    """
    حساب خطأ المعايرة المتوقع (ECE - Expected Calibration Error):
    المتوسط الموزون لفارق المعايرة عبر كافة الفئات.
    """
    if not probs or not outcomes:
        return 0.0
    c_bins = calibration_bins(probs, outcomes, bins)
    total_n = max(len(probs), 1)
    ece = sum(
        (b["n_matches"] / total_n) * b["calibration_error"]
        for b in c_bins
    )
    return float(round(ece, 4))


def underdog_edge_calibration(
    probs: List[Tuple[float, float, float]],
    outcomes: List[str],
    odds_list: List[Optional[Tuple[float, float, float]]],
    min_odds: float = 2.40,
) -> Dict[str, float | int | bool]:
    """
    فحص مصداقية الـ Edge للرهانات المفاجئة / غير المرشحة (مثل Fortuna +240):
    يتحقق مما إذا كان النموذج يملك فعلاً تفوقاً حقيقياً في مباريات السعر العالي،
    أم أن احتمالاته المرتفعة مجرد تضخيم ناتج عن عدم المعايرة.
    """
    n_picks = 0
    hits = 0
    sum_prob = 0.0
    pnl = 0.0

    for (ph, pd, pa), o, odds in zip(probs, outcomes, odds_list):
        if not odds:
            continue
        oh, od, oa = odds
        side_data = [("H", ph, oh), ("D", pd, od), ("A", pa, oa)]
        for side, p, dec_odds in side_data:
            if dec_odds >= min_odds:
                implied = 1.0 / dec_odds
                edge = p - implied
                # إذا كان النموذج يرى احتمالية فوز تفوق السعر بهامش واضح (> 5%)
                if edge >= 0.05 and p >= 0.35:
                    n_picks += 1
                    sum_prob += p
                    won = (side == o)
                    if won:
                        hits += 1
                        pnl += (dec_odds - 1.0)
                    else:
                        pnl -= 1.0

    if n_picks == 0:
        return {
            "n_picks": 0,
            "hits": 0,
            "hit_rate": 0.0,
            "expected_rate": 0.0,
            "pnl": 0.0,
            "roi": 0.0,
            "is_calibrated": True,
        }

    hit_rate = hits / n_picks
    exp_rate = sum_prob / n_picks
    roi = pnl / n_picks
    # النموذج يعتبر مُعاير إذا كان الفارق بين المعدل الفعلي والمتوقع لا يتجاوز 15 نقطة مئوية
    is_calibrated = abs(hit_rate - exp_rate) <= 0.15

    return {
        "n_picks": n_picks,
        "hits": hits,
        "hit_rate": float(round(hit_rate, 4)),
        "expected_rate": float(round(exp_rate, 4)),
        "pnl": float(round(pnl, 4)),
        "roi": float(round(roi, 4)),
        "is_calibrated": is_calibrated,
    }

