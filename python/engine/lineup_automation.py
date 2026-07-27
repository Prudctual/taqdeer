from .player_impact import apply_rapm_to_xg


def evaluate_lineup_impact(
    confirmed_home_lineup: Optional[List[str]],
    confirmed_away_lineup: Optional[List[str]],
    home_missing_list: Optional[List[Dict[str, str]]] = None,
    away_missing_list: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, object]:
    """
    Evaluate confirmed starting 11 and compute dynamic RAPM missing player adjustments.
    """
    has_confirmed = bool(confirmed_home_lineup or confirmed_away_lineup)
    return {
        "lineup_status": "CONFIRMED" if has_confirmed else "UNCONFIRMED",
        "missing_home": home_missing_list or [],
        "missing_away": away_missing_list or [],
    }


def recalculate_xg_with_lineup(
    lambda_home: float,
    lambda_away: float,
    missing_home: Optional[List[Dict]] = None,
    missing_away: Optional[List[Dict]] = None,
) -> Tuple[float, float]:
    """
    Recalculate expected goal Poisson lambdas after applying confirmed lineup RAPM scaling.
    """
    new_lh, new_la = apply_rapm_to_xg(lambda_home, lambda_away, missing_home, missing_away)
    return new_lh, new_la
