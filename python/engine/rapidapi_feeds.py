"""RapidAPI Sportspage Feeds Integration Engine."""

from __future__ import annotations

import http.client
import json
import os
from typing import Dict, Any, Optional


RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY", "")
RAPIDAPI_HOST = os.environ.get("RAPIDAPI_HOST", "sportspage-feeds.p.rapidapi.com")


def fetch_sportspage_feed(endpoint: str) -> Optional[Dict[str, Any]]:
    """
    Generic fetcher for RapidAPI Sportspage Feeds API.
    Endpoints: /rankings, /games, /odds, /teams, /conferences
    """
    try:
        conn = http.client.HTTPSConnection(RAPIDAPI_HOST, timeout=10)
        headers = {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": RAPIDAPI_HOST,
            "Content-Type": "application/json",
        }
        conn.request("GET", endpoint, headers=headers)
        res = conn.getresponse()
        if res.status != 200:
            return None
        data = res.read()
        return json.loads(data.decode("utf-8"))
    except Exception:
        return None


def fetch_live_odds(league: str = "EPL") -> Optional[Dict[str, Any]]:
    """Fetch latest odds from Sportspage Feeds."""
    return fetch_sportspage_feed(f"/odds?league={league}")


def fetch_rankings(league: str = "EPL") -> Optional[Dict[str, Any]]:
    """Fetch latest rankings from Sportspage Feeds."""
    return fetch_sportspage_feed(f"/rankings?league={league}")
