"""Sharp Money and Market Line Movement (Odds Drift/Drop) Analytics Engine."""

from __future__ import annotations

from typing import Dict, Optional, Tuple

from .calibrate import odds_to_probs


def detect_sharp_movement(
    odds_open: Optional[Tuple[float, float, float]],
    odds_curr: Optional[Tuple[float, float, float]],
) -> Dict[str, Optional[object]]:
    """
    Detect sharp market line movements (Steam Moves).
    Significant drop in odds (or +3%+ shift in implied probability) indicates
    smart money/institutional syndicate volume pushing the market.
    """
    if not odds_open or not odds_curr:
        return {"steam_side": None, "shift_pct": 0.0, "is_sharp": False}

    p_open = odds_to_probs(*odds_open)
    p_curr = odds_to_probs(*odds_curr)

    if not p_open or not p_curr:
        return {"steam_side": None, "shift_pct": 0.0, "is_sharp": False}

    sides = ("home", "draw", "away")
    shifts = [p_curr[i] - p_open[i] for i in range(3)]
    max_idx = int(max(range(3), key=lambda i: shifts[i]))

    max_shift = shifts[max_idx]
    is_sharp = max_shift >= 0.025  # +2.5% or higher implied probability drop

    return {
        "steam_side": sides[max_idx] if is_sharp else None,
        "shift_pct": float(round(max_shift * 100, 2)),
        "is_sharp": is_sharp,
    }


def evaluate_sharp_value_alignment(
    model_probs: Tuple[float, float, float],
    odds_open: Optional[Tuple[float, float, float]],
    odds_curr: Optional[Tuple[float, float, float]],
) -> Dict[str, float | bool | str | None]:
    """
    Check if the model's highest confidence pick aligns with the direction of sharp market movement.
    Concurrence between Model Conviction & Sharp Money increases confidence rating.
    """
    sharp_info = detect_sharp_movement(odds_open, odds_curr)
    steam_side = sharp_info["steam_side"]

    if not steam_side:
        return {
            "steam_side": None,
            "sharp_aligned": False,
            "sharp_bonus": 0.0,
            "steam_shift": 0.0,
        }

    sides = ("home", "draw", "away")
    model_top_idx = int(max(range(3), key=lambda i: model_probs[i]))
    model_top_side = sides[model_top_idx]

    aligned = (model_top_side == steam_side)
    bonus = 0.04 if aligned else 0.0

    return {
        "steam_side": str(steam_side),
        "sharp_aligned": aligned,
        "sharp_bonus": bonus,
        "steam_shift": float(sharp_info["shift_pct"] or 0.0),
    }
