"""Player-Level Impact and Regularized Adjusted Plus-Minus (RAPM) Engine."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


@dataclass
class PlayerImpact:
    name: str
    team_id: str
    position: str  # FW, MF, DF, GK
    off_rapm: float  # Attacking goal contribution impact (e.g. +0.25)
    def_rapm: float  # Defensive goal prevention impact (e.g. -0.20)


# Baseline RAPM impact per position category when a key starter is absent
POSITION_BASELINE_IMPACT = {
    "FW": {"attack_penalty": 0.08, "defense_penalty": 0.01},
    "MF": {"attack_penalty": 0.05, "defense_penalty": 0.05},
    "DF": {"attack_penalty": 0.01, "defense_penalty": 0.07},
    "GK": {"attack_penalty": 0.00, "defense_penalty": 0.09},
}


def calculate_lineup_penalties(
    missing_players: Optional[List[Dict[str, str]]] = None
) -> Tuple[float, float]:
    """
    Calculate multiplicative attack and defense penalties based on missing key players.
    Returns (attack_mult, defense_mult).
    E.g. missing top striker => attack_mult = 0.92 (-8%).
    """
    if not missing_players:
        return 1.0, 1.0

    att_mult = 1.0
    def_mult = 1.0

    for p in missing_players:
        pos = p.get("position", "MF").upper()
        importance = float(p.get("importance", 1.0))  # 1.0 for star, 0.7 for key starter
        base = POSITION_BASELINE_IMPACT.get(pos, POSITION_BASELINE_IMPACT["MF"])

        att_mult *= (1.0 - base["attack_penalty"] * importance)
        def_mult *= (1.0 + base["defense_penalty"] * importance)  # higher defense_mult = more goals conceded

    # Clip penalties within reasonable athletic bounds (max 25% degradation)
    att_mult = float(min(max(att_mult, 0.75), 1.0))
    def_mult = float(min(max(def_mult, 1.0), 1.25))

    return att_mult, def_mult


def apply_rapm_to_xg(
    lam: float, mu: float, home_missing: Optional[List[Dict]] = None, away_missing: Optional[List[Dict]] = None
) -> Tuple[float, float]:
    """
    Apply RAPM missing player adjustments to home expected goals (lam) and away expected goals (mu).
    """
    h_att, h_def = calculate_lineup_penalties(home_missing)
    a_att, a_def = calculate_lineup_penalties(away_missing)

    # Home expected goals = Home Attack * Away Defense Deficit
    adj_lam = lam * h_att * a_def
    # Away expected goals = Away Attack * Home Defense Deficit
    adj_mu = mu * a_att * h_def

    return float(min(max(adj_lam, 0.2), 5.5)), float(min(max(adj_mu, 0.2), 5.5))
