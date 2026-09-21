"""League-Specific Quantitative Profiles, Hyperparameters, and Tactical Dynamics."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Literal, Mapping, Optional, Sequence, Tuple

# فارق «واضح» عن بيئة الدوري، وفارق يعدّ السوق أغلى من النموذج.
X2_CLEAR_GAP = 0.05
X2_VALUE_GAP = 0.005

X2Band = Literal["green", "yellow", "red"]
X2Reason = Literal[
    "above_and_value",
    "above_no_market",
    "above_no_edge",
    "near_baseline",
    "below_baseline",
    "market_richer",
    "below_and_market_richer",
]


@dataclass(frozen=True)
class SeasonOutcomeBaseline:
    """توزيع نتائج موسم كامل: فوز المضيف / تعادل / فوز الضيف.

    X2 = التعادل + فوز الضيف، أي أن صاحب الأرض لا يفوز.
    الرقم بيئة للدوري، لا احتمال مباراة بعينها.
    """

    season: str
    matches: int
    home_wins: int
    draws: int
    away_wins: int

    def __post_init__(self) -> None:
        total = self.home_wins + self.draws + self.away_wins
        if self.matches <= 0 or total != self.matches:
            raise ValueError(f"outcome counts {total} != matches {self.matches}")

    @property
    def p_home(self) -> float:
        return self.home_wins / self.matches

    @property
    def p_draw(self) -> float:
        return self.draws / self.matches

    @property
    def p_away(self) -> float:
        return self.away_wins / self.matches

    @property
    def p_x2(self) -> float:
        return (self.draws + self.away_wins) / self.matches


def _pooled(season: str, parts: Sequence[SeasonOutcomeBaseline]) -> SeasonOutcomeBaseline:
    return SeasonOutcomeBaseline(
        season,
        sum(p.matches for p in parts),
        sum(p.home_wins for p in parts),
        sum(p.draws for p in parts),
        sum(p.away_wins for p in parts),
    )


# موسم 2025/26 — الدوريات السبعة. الأعداد هي المصدر؛ النسب تُشتق منها.
_SEASON = "2025/26"
_OUTCOMES: Dict[str, SeasonOutcomeBaseline] = {
    "pd": SeasonOutcomeBaseline(_SEASON, 380, 186, 93, 101),
    "sa": SeasonOutcomeBaseline(_SEASON, 380, 148, 99, 133),
    "pl": SeasonOutcomeBaseline(_SEASON, 380, 162, 104, 114),
    "bl1": SeasonOutcomeBaseline(_SEASON, 306, 134, 75, 97),
    "fl1": SeasonOutcomeBaseline(_SEASON, 306, 141, 75, 90),
    "ppd": SeasonOutcomeBaseline(_SEASON, 306, 126, 83, 97),
    "ded": SeasonOutcomeBaseline(_SEASON, 306, 136, 80, 90),
}


@dataclass
class LeagueProfile:
    league_id: str
    name_ar: str
    home_advantage: float      # أفضلية أرض لوغاريتمية مُعايرة — ليست نسبة فوز المضيف
    draw_baseline: float        # كتلة التعادل الأساسية = معدل تعادل الموسم
    avg_match_goals: float     # Expected goals per match average
    turf_teams: list[str]      # Teams with artificial pitch advantage
    noise_factor: float        # Calibration temperature scale default
    elo_weight_mult: float     # Relative importance of Elo / historical strength
    form_weight_mult: float    # حِدّة إشارة الفورم (logistic steepness) — لا حصة المزيج (ثابتة 20٪)
    outcomes: SeasonOutcomeBaseline


LEAGUE_PROFILES: Dict[str, LeagueProfile] = {
    # 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League
    "pl": LeagueProfile(
        league_id="pl",
        name_ar="الدوري الإنجليزي الممتاز",
        home_advantage=0.22,
        draw_baseline=_OUTCOMES["pl"].p_draw,
        avg_match_goals=2.85,
        turf_teams=[],
        noise_factor=1.45,
        elo_weight_mult=0.90,
        form_weight_mult=1.15,
        outcomes=_OUTCOMES["pl"],
    ),
    # 🇪🇸 La Liga
    "pd": LeagueProfile(
        league_id="pd",
        name_ar="الدوري الإسباني",
        home_advantage=0.26,
        draw_baseline=_OUTCOMES["pd"].p_draw,
        avg_match_goals=2.55,
        turf_teams=[],
        noise_factor=0.99,
        elo_weight_mult=1.20,
        form_weight_mult=0.95,
        outcomes=_OUTCOMES["pd"],
    ),
    # 🇩🇪 Bundesliga
    "bl1": LeagueProfile(
        league_id="bl1",
        name_ar="الدوري الألماني",
        home_advantage=0.18,
        draw_baseline=_OUTCOMES["bl1"].p_draw,
        avg_match_goals=3.20,
        turf_teams=[],
        noise_factor=1.02,
        elo_weight_mult=1.00,
        form_weight_mult=1.10,
        outcomes=_OUTCOMES["bl1"],
    ),
    # 🇮🇹 Serie A
    "sa": LeagueProfile(
        league_id="sa",
        name_ar="الدوري الإيطالي",
        home_advantage=0.25,
        draw_baseline=_OUTCOMES["sa"].p_draw,
        avg_match_goals=2.50,
        turf_teams=[],
        noise_factor=0.96,
        elo_weight_mult=1.10,
        form_weight_mult=1.00,
        outcomes=_OUTCOMES["sa"],
    ),
    # 🇫🇷 Ligue 1
    "fl1": LeagueProfile(
        league_id="fl1",
        name_ar="الدوري الفرنسي",
        home_advantage=0.23,
        draw_baseline=_OUTCOMES["fl1"].p_draw,
        avg_match_goals=2.60,
        turf_teams=[],
        noise_factor=1.03,
        elo_weight_mult=1.00,
        form_weight_mult=1.00,
        outcomes=_OUTCOMES["fl1"],
    ),
    # 🇵🇹 Primeira Liga (Portugal)
    "ppd": LeagueProfile(
        league_id="ppd",
        name_ar="الدوري البرتغالي",
        home_advantage=0.24,
        draw_baseline=_OUTCOMES["ppd"].p_draw,
        avg_match_goals=2.70,
        turf_teams=[],
        noise_factor=0.95,
        elo_weight_mult=1.15,
        form_weight_mult=1.05,
        outcomes=_OUTCOMES["ppd"],
    ),
    # 🇳🇱 Eredivisie (Netherlands)
    "ded": LeagueProfile(
        league_id="ded",
        name_ar="الدوري الهولندي",
        home_advantage=0.22,
        draw_baseline=_OUTCOMES["ded"].p_draw,
        avg_match_goals=3.15,
        turf_teams=["heracles", "excelsior"],
        noise_factor=1.05,
        elo_weight_mult=1.10,
        form_weight_mult=1.10,
        outcomes=_OUTCOMES["ded"],
    ),
}

_POOLED = _pooled(_SEASON, list(_OUTCOMES.values()))

DEFAULT_PROFILE = LeagueProfile(
    league_id="default",
    name_ar="دوري عام",
    home_advantage=0.24,
    draw_baseline=_POOLED.p_draw,
    avg_match_goals=2.65,
    turf_teams=[],
    noise_factor=1.00,
    elo_weight_mult=1.00,
    form_weight_mult=1.00,
    outcomes=_POOLED,
)


def get_league_profile(league_id: str | None) -> LeagueProfile:
    """Retrieve the dedicated quantitative profile and parameters for a league."""
    if not league_id:
        return DEFAULT_PROFILE
    clean_id = league_id.lower().strip()
    return LEAGUE_PROFILES.get(clean_id, DEFAULT_PROFILE)


def _trio(p: Sequence[float]) -> Tuple[float, float, float]:
    h, d, a = (float(x) for x in p)
    s = h + d + a
    if s <= 0:
        return 0.0, 0.0, 0.0
    return h / s, d / s, a / s


def _side(h: float, d: float, a: float) -> Dict[str, float]:
    return {"home": h, "draw": d, "away": a, "x2": d + a}


def assess_x2_baseline(
    league_id: str | None,
    model: Sequence[float],
    market: Optional[Sequence[float]] = None,
) -> Dict[str, object]:
    """يقارن X2 لبّ النموذج ببيئة الدوري ثم بسعر السوق منزوع الهامش.

    لا يغيّر احتمالات 1X2. الأخضر يشترط ارتفاعاً واضحاً عن البيئة وسعراً
    أضعف من تقدير النموذج. القرب من البيئة أصفر. الهبوط الواضح أو سعر
    أغلى من النموذج أحمر.
    """
    profile = get_league_profile(league_id)
    base = profile.outcomes
    mh, md, ma = _trio(model)
    model_x2 = md + ma
    delta = model_x2 - base.p_x2

    market_block: Optional[Dict[str, float]] = None
    value: Optional[float] = None
    if market is not None:
        kh, kd, ka = _trio(market)
        market_block = _side(kh, kd, ka)
        value = model_x2 - market_block["x2"]

    below = delta <= -X2_CLEAR_GAP
    market_richer = value is not None and value <= -X2_VALUE_GAP
    above = delta >= X2_CLEAR_GAP
    has_value = value is not None and value > X2_VALUE_GAP

    band: X2Band
    reason: X2Reason
    if below and market_richer:
        band, reason = "red", "below_and_market_richer"
    elif market_richer:
        band, reason = "red", "market_richer"
    elif below:
        band, reason = "red", "below_baseline"
    elif above and has_value:
        band, reason = "green", "above_and_value"
    elif above and market is None:
        band, reason = "yellow", "above_no_market"
    elif above:
        band, reason = "yellow", "above_no_edge"
    else:
        band, reason = "yellow", "near_baseline"

    return {
        "season": base.season,
        "league_id": profile.league_id,
        "matches": base.matches,
        "source": "core",
        "baseline": _side(base.p_home, base.p_draw, base.p_away),
        "model": _side(mh, md, ma),
        "market": market_block,
        "delta": delta,
        "value": value,
        "band": band,
        "reason": reason,
    }


def outcome_table() -> Mapping[str, SeasonOutcomeBaseline]:
    """جدول نتائج الموسم للدوريات السبعة."""
    return _OUTCOMES
