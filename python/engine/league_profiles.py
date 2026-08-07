"""League-Specific Quantitative Profiles, Hyperparameters, and Tactical Dynamics."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass
class LeagueProfile:
    league_id: str
    name_ar: str
    home_advantage: float      # Baseline log-advantage for home team
    draw_baseline: float        # Baseline draw probability allocation
    avg_match_goals: float     # Expected goals per match average
    turf_teams: list[str]      # Teams with artificial pitch advantage
    noise_factor: float        # Calibration temperature scale default
    elo_weight_mult: float     # Relative importance of Elo / historical strength
    form_weight_mult: float    # Relative importance of recent 5-match form


LEAGUE_PROFILES: Dict[str, LeagueProfile] = {
    # 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League
    "pl": LeagueProfile(
        league_id="pl",
        name_ar="الدوري الإنجليزي الممتاز",
        home_advantage=0.22,
        draw_baseline=0.24,
        avg_match_goals=2.85,
        turf_teams=[],
        noise_factor=1.45,
        elo_weight_mult=0.90,
        form_weight_mult=1.15,
    ),
    # 🇪🇸 La Liga
    "pd": LeagueProfile(
        league_id="pd",
        name_ar="الدوري الإسباني",
        home_advantage=0.26,
        draw_baseline=0.25,
        avg_match_goals=2.55,
        turf_teams=[],
        noise_factor=0.99,
        elo_weight_mult=1.20,
        form_weight_mult=0.95,
    ),
    # 🇩🇪 Bundesliga
    "bl1": LeagueProfile(
        league_id="bl1",
        name_ar="الدوري الألماني",
        home_advantage=0.18,
        draw_baseline=0.22,
        avg_match_goals=3.20,
        turf_teams=[],
        noise_factor=1.02,
        elo_weight_mult=1.00,
        form_weight_mult=1.10,
    ),
    # 🇮🇹 Serie A
    "sa": LeagueProfile(
        league_id="sa",
        name_ar="الدوري الإيطالي",
        home_advantage=0.25,
        draw_baseline=0.27,
        avg_match_goals=2.50,
        turf_teams=[],
        noise_factor=0.96,
        elo_weight_mult=1.10,
        form_weight_mult=1.00,
    ),
    # 🇫🇷 Ligue 1
    "fl1": LeagueProfile(
        league_id="fl1",
        name_ar="الدوري الفرنسي",
        home_advantage=0.23,
        draw_baseline=0.26,
        avg_match_goals=2.60,
        turf_teams=[],
        noise_factor=1.03,
        elo_weight_mult=1.00,
        form_weight_mult=1.00,
    ),
    # 🇵🇹 Primeira Liga (Portugal)
    "ppd": LeagueProfile(
        league_id="ppd",
        name_ar="الدوري البرتغالي",
        home_advantage=0.24,
        draw_baseline=0.24,
        avg_match_goals=2.70,
        turf_teams=[],
        noise_factor=0.95,
        elo_weight_mult=1.15,
        form_weight_mult=1.05,
    ),
    # 🇳🇱 Eredivisie (Netherlands)
    "ded": LeagueProfile(
        league_id="ded",
        name_ar="الدوري الهولندي",
        home_advantage=0.22,
        draw_baseline=0.21,
        avg_match_goals=3.15,
        turf_teams=["heracles", "excelsior"],
        noise_factor=1.05,
        elo_weight_mult=1.10,
        form_weight_mult=1.10,
    ),
    # 🇹🇷 Süper Lig (Turkey)
    "tur1": LeagueProfile(
        league_id="tur1",
        name_ar="الدوري التركي",
        home_advantage=0.29,
        draw_baseline=0.24,
        avg_match_goals=2.80,
        turf_teams=[],
        noise_factor=1.10,
        elo_weight_mult=1.05,
        form_weight_mult=1.15,
    ),
}

DEFAULT_PROFILE = LeagueProfile(
    league_id="default",
    name_ar="دوري عام",
    home_advantage=0.24,
    draw_baseline=0.25,
    avg_match_goals=2.65,
    turf_teams=[],
    noise_factor=1.00,
    elo_weight_mult=1.00,
    form_weight_mult=1.00,
)


def get_league_profile(league_id: str | None) -> LeagueProfile:
    """Retrieve the dedicated quantitative profile and parameters for a league."""
    if not league_id:
        return DEFAULT_PROFILE
    clean_id = league_id.lower().strip()
    return LEAGUE_PROFILES.get(clean_id, DEFAULT_PROFILE)
