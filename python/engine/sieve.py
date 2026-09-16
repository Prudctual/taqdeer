"""غربال «محسوم فوز» — دالة نقية تُستدعى عند كل لقطة زمنية.

القواعد (خطة 006 §5): بوابة الدوري، اتفاق الجهة مع السوق الحاد، عتبة θ على الاحتمال
النهائي، لصق بالسوق، ليست 50–50 ولا مصيدة تعادل، ليست ديربي، عمود المفضّل حاضر،
لا صدمة عيّنة أول الموسم. كل ما لا يمرّ = «إشارة ضعيفة» أو «سوق بديل» أو «مستثنى».
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Sequence

from .market_anchor import logit_pool

LABELS = ("H", "D", "A")

# ثوابت البداية — تُراجَع بعد الحزام التاريخي فقط
DEFAULT_THETA = 0.60
EARLY_SEASON_DAYS = 45
EARLY_SEASON_THETA_BUMP = 0.05
GAP_MAX = 0.08
MARKET_FAV_MIN = 0.55
COIN_FLIP_GAP = 0.20
DRAW_HEAD_MAX = 0.30
PROMOTED_ROUNDS = 8
MIN_SEASON_N = 6

TIERS = ("banker", "alt-market", "weak", "excluded")
ALT_MARKET_ONLY_FAILS = {"draw_head_low", "not_coin_flip"}
EXCLUDING_FAILS = {"league_active", "same_side"}


@dataclass
class SieveContext:
    pm: Sequence[float]                      # لبّ النموذج (مُعاير، بلا سوق)
    ps: Sequence[float] | None               # السوق الحاد منزوع الهامش
    pf: Sequence[float]                      # الناتج النهائي المدموج
    p_draw_head: float | None = None
    league_status: str = "watch"             # active | watch | off
    theta: float = DEFAULT_THETA
    days_into_season: int | None = None
    is_derby: bool = False
    favourite_pillar_missing: bool = False
    fav_is_promoted: bool = False
    fav_round: int | None = None
    fav_n_season: int | None = None
    opp_n_season: int | None = None
    market_available: bool = True


@dataclass
class SieveResult:
    tier: str
    pick: str
    theta: float
    rules: list[tuple[str, bool]] = field(default_factory=list)

    def failed(self) -> list[str]:
        return [name for name, ok in self.rules if not ok]

    def passed(self) -> list[str]:
        return [name for name, ok in self.rules if ok]

    def to_dict(self) -> dict:
        return {
            "tier": self.tier,
            "pick": self.pick,
            "theta": round(self.theta, 4),
            "rules": [{"name": n, "ok": bool(ok)} for n, ok in self.rules],
            "failed": self.failed(),
        }


def _argmax(p: Sequence[float]) -> int:
    return max(range(3), key=lambda i: float(p[i]))


def effective_theta(base_theta: float, days_into_season: int | None) -> float:
    if days_into_season is not None and days_into_season < EARLY_SEASON_DAYS:
        return float(base_theta) + EARLY_SEASON_THETA_BUMP
    return float(base_theta)


def evaluate_banker(ctx: SieveContext) -> SieveResult:
    rules: list[tuple[str, bool]] = []
    pick_m = _argmax(ctx.pm)
    pick_label = LABELS[pick_m]

    rules.append(("league_active", ctx.league_status == "active"))

    if ctx.ps is None or not ctx.market_available:
        same_side = False
        gap_bounded = False
        market_fav = False
    else:
        pick_s = _argmax(ctx.ps)
        same_side = pick_s == pick_m and pick_label != "D"
        gap_bounded = abs(float(ctx.pm[pick_m]) - float(ctx.ps[pick_m])) <= GAP_MAX
        market_fav = float(ctx.ps[pick_m]) >= MARKET_FAV_MIN
    rules.append(("same_side", same_side))

    theta = effective_theta(ctx.theta, ctx.days_into_season)
    rules.append(("p_final_ge_theta", float(ctx.pf[pick_m]) >= theta))
    rules.append(("gap_bounded", gap_bounded))
    rules.append(("market_favourite", market_fav))

    p_sorted = sorted((float(x) for x in ctx.pf), reverse=True)
    rules.append(("not_coin_flip", p_sorted[0] - p_sorted[1] >= COIN_FLIP_GAP))
    draw_head = ctx.p_draw_head if ctx.p_draw_head is not None else float(ctx.pf[1])
    rules.append(("draw_head_low", float(draw_head) < DRAW_HEAD_MAX))

    rules.append(("not_derby", not ctx.is_derby))
    rules.append(("pillars_available", not ctx.favourite_pillar_missing))

    promoted_early = bool(ctx.fav_is_promoted) and (ctx.fav_round is not None and ctx.fav_round <= PROMOTED_ROUNDS)
    rules.append(("not_promoted_early", not promoted_early))
    fav_n = ctx.fav_n_season if ctx.fav_n_season is not None else MIN_SEASON_N
    opp_n = ctx.opp_n_season if ctx.opp_n_season is not None else MIN_SEASON_N
    rules.append(("season_sample_ok", fav_n >= MIN_SEASON_N and opp_n >= MIN_SEASON_N))

    failed = {name for name, ok in rules if not ok}
    if not failed:
        tier = "banker"
    elif failed & EXCLUDING_FAILS:
        tier = "excluded"
    elif failed <= ALT_MARKET_ONLY_FAILS:
        tier = "alt-market"
    else:
        tier = "weak"
    return SieveResult(tier=tier, pick=pick_label, theta=theta, rules=rules)


def reconcile_at_close(
    stored: Mapping,
    pm: Sequence[float],
    ps: Sequence[float],
    alpha: float,
) -> dict:
    """يعيد تقييم قواعد السوق فقط عند الإغلاق (اتفاق الجهة، اللصق، المفضّل، العتبة)
    مع إبقاء قواعد السياق (ديربي/أعمدة/موسم) كما حُكمت عند الإعلان."""
    pf = logit_pool(pm, ps, alpha)
    prev_rules = {r["name"]: bool(r["ok"]) for r in stored.get("rules", [])}
    theta = float(stored.get("theta", DEFAULT_THETA))
    ctx = SieveContext(
        pm=pm, ps=ps, pf=pf,
        p_draw_head=None,
        league_status="active" if prev_rules.get("league_active", False) else "watch",
        theta=theta,
        days_into_season=None,
        is_derby=not prev_rules.get("not_derby", True),
        favourite_pillar_missing=not prev_rules.get("pillars_available", True),
        fav_is_promoted=not prev_rules.get("not_promoted_early", True),
        fav_round=0 if not prev_rules.get("not_promoted_early", True) else None,
        fav_n_season=None if prev_rules.get("season_sample_ok", True) else 0,
        opp_n_season=None,
    )
    res = evaluate_banker(ctx)
    # draw_head من الإعلان يبقى مرجعاً إن وُجد
    if "draw_head_low" in prev_rules:
        res.rules = [(n, prev_rules["draw_head_low"] if n == "draw_head_low" else ok) for n, ok in res.rules]
        failed = {n for n, ok in res.rules if not ok}
        if not failed:
            res.tier = "banker"
        elif failed & EXCLUDING_FAILS:
            res.tier = "excluded"
        elif failed <= ALT_MARKET_ONLY_FAILS:
            res.tier = "alt-market"
        else:
            res.tier = "weak"
    out = res.to_dict()
    out["announce_tier"] = stored.get("tier")
    return out
