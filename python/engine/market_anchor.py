"""مرساة السوق الحاد — دمج لوغاريتمي بين لبّ النموذج وسعر بيناكل منزوع الهامش.

    log p_final ∝ α · log p_model + (1−α) · log p_sharp

α هو **وزن النموذج**: α=0 → السوق وحده، α=1 → النموذج وحده. تُقدَّر α لكل دوري
بأقل log-loss على الحزام الطويل؛ وإن لم يكن تحسّن النموذج على السوق (α* مقابل α=0)
ذا دلالة بـpaired bootstrap → α=0 ويُنشر «السوق وحده». بلا سعر سوق يُستعمل النموذج كما هو.
"""

from __future__ import annotations

from typing import Sequence, Tuple

import numpy as np

Probs = Tuple[float, float, float]

_EPS = 1e-6


def _clip3(p: Sequence[float]) -> np.ndarray:
    arr = np.clip(np.asarray(p, dtype=float), _EPS, 1.0)
    return arr / arr.sum()


def logit_pool(pm: Sequence[float], ps: Sequence[float] | None, alpha: float) -> Probs:
    """دمج لوغاريتمي؛ بلا سعر سوق يعود النموذج كما هو (α فعلياً = 1)."""
    m = _clip3(pm)
    if ps is None:
        return (float(m[0]), float(m[1]), float(m[2]))
    a = float(min(max(alpha, 0.0), 1.0))
    s = _clip3(ps)
    if a >= 1.0:
        return (float(m[0]), float(m[1]), float(m[2]))
    if a <= 0.0:
        return (float(s[0]), float(s[1]), float(s[2]))
    log_p = a * np.log(m) + (1.0 - a) * np.log(s)
    log_p -= log_p.max()
    out = np.exp(log_p)
    out /= out.sum()
    return (float(out[0]), float(out[1]), float(out[2]))


def _nll(p_list: np.ndarray, outcomes: np.ndarray) -> float:
    picked = np.clip(p_list[np.arange(len(outcomes)), outcomes], _EPS, 1.0)
    return float(-np.mean(np.log(picked)))


OUTCOME_INDEX = {"H": 0, "D": 1, "A": 2}


def fit_alpha(
    pm_list: Sequence[Sequence[float]],
    ps_list: Sequence[Sequence[float]],
    outcomes: Sequence[int | str],
    *,
    grid_step: float = 0.05,
    n_boot: int = 400,
    seed: int = 7,
) -> dict:
    """α* على شبكة [0,1] بأقل log-loss، مع اختبار bootstrap مزدوج ضد α=0 (السوق وحده).

    يعيد {"alpha": α المعتمدة, "alpha_raw": α*, "ll_market" (α=0), "ll_model" (α=1),
    "ll_alpha", "ci_low": الحد الأدنى لفاصل 95% لتحسّن log-loss (α* مقابل 0), "n"}.
    إن كان ci_low ≤ 0 → α المعتمدة = 0 (لا دليل كافٍ على أن النموذج يُحسّن السوق).
    """
    pm = np.asarray([_clip3(p) for p in pm_list], dtype=float)
    ps = np.asarray([_clip3(p) for p in ps_list], dtype=float)
    # النتائج: مؤشرات 0/1/2 أو حروف H/D/A
    y = np.asarray([OUTCOME_INDEX[o] if isinstance(o, str) else int(o) for o in outcomes], dtype=int)
    n = len(y)
    if n < 30:
        return {"alpha": 0.0, "alpha_raw": 0.0, "n": n, "ci_low": None,
                "ll_model": None, "ll_market": None, "ll_alpha": None}

    grid = np.round(np.arange(0.0, 1.0 + 1e-9, grid_step), 4)
    log_m = np.log(pm)
    log_s = np.log(ps)

    def pooled(a: float) -> np.ndarray:
        lp = a * log_m + (1.0 - a) * log_s
        lp -= lp.max(axis=1, keepdims=True)
        p = np.exp(lp)
        return p / p.sum(axis=1, keepdims=True)

    losses = np.array([_nll(pooled(a), y) for a in grid])
    best_i = int(np.argmin(losses))
    alpha_raw = float(grid[best_i])
    ll_market = float(losses[0])
    ll_model = float(losses[-1])
    ll_alpha = float(losses[best_i])

    # paired bootstrap على الفرق per-match بين α=0 (السوق) و α*
    p0 = pooled(0.0)[np.arange(n), y]
    pa = pooled(alpha_raw)[np.arange(n), y]
    diff = np.log(np.clip(pa, _EPS, 1)) - np.log(np.clip(p0, _EPS, 1))  # >0 = تحسّن على السوق
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, n, size=(n_boot, n))
    boot_means = diff[idx].mean(axis=1)
    ci_low = float(np.percentile(boot_means, 2.5))

    alpha = alpha_raw if (alpha_raw > 0.0 and ci_low > 0.0) else 0.0

    return {
        "alpha": alpha,
        "alpha_raw": alpha_raw,
        "n": n,
        "ci_low": ci_low,
        "ll_model": ll_model,
        "ll_market": ll_market,
        "ll_alpha": ll_alpha,
        "gain_vs_market": ll_market - ll_alpha,
    }
