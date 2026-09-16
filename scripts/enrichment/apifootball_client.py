"""عميل خفيف لـ API-Football (v3) — جلب مباريات اليوم وأودز مباراة مع تفكيك 1X2/OU/AH."""

from __future__ import annotations

import json
import os
import urllib.request
from typing import Any

BASE = "https://v3.football.api-sports.io"
LEAGUE_IDS = {39: "pl", 140: "pd", 78: "bl1", 135: "sa", 61: "fl1", 94: "ppd", 88: "ded"}

# معرّفات الأسواق في API-Football
BET_MATCH_WINNER = 1
BET_ASIAN_HANDICAP = 4
BET_GOALS_OVER_UNDER = 5


class RateLimited(Exception):
    pass


def api_key() -> str | None:
    return (os.environ.get("API_FOOTBALL_KEY") or os.environ.get("API_SPORTS_KEY") or "").strip() or None


def _get(path: str, timeout: int = 25) -> dict[str, Any] | None:
    key = api_key()
    if not key:
        return None
    req = urllib.request.Request(f"{BASE}{path}", headers={"x-apisports-key": key})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        if resp.status == 429:
            raise RateLimited(path)
        return json.loads(resp.read().decode("utf-8"))


def fixtures_by_date(day: str) -> list[dict[str, Any]]:
    """المباريات في يوم (YYYY-MM-DD) لدورياتنا فقط."""
    data = _get(f"/fixtures?date={day}")
    out: list[dict[str, Any]] = []
    for item in (data or {}).get("response", []) or []:
        lid = LEAGUE_IDS.get(int(item.get("league", {}).get("id", 0)))
        if not lid:
            continue
        fx = item.get("fixture", {})
        teams = item.get("teams", {})
        out.append(
            {
                "fixture_id": fx.get("id"),
                "league_id": lid,
                "date": fx.get("date"),
                "home": (teams.get("home") or {}).get("name"),
                "away": (teams.get("away") or {}).get("name"),
            }
        )
    return out


def odds_by_fixture(fixture_id: int | str) -> list[dict[str, Any]]:
    data = _get(f"/odds?fixture={fixture_id}")
    resp = (data or {}).get("response", []) or []
    if not resp:
        return []
    return resp[0].get("bookmakers", []) or []


def _num(v: Any) -> float | None:
    try:
        f = float(v)
    except Exception:
        return None
    return f if f > 1.0 else None


def _parse_1x2(bets: list[dict]) -> tuple[float, float, float] | None:
    for bet in bets:
        if bet.get("id") != BET_MATCH_WINNER and bet.get("name") not in ("Match Winner", "1X2"):
            continue
        vals = {v.get("value"): _num(v.get("odd")) for v in bet.get("values", []) or []}
        h, d, a = vals.get("Home"), vals.get("Draw"), vals.get("Away")
        if h and d and a:
            return (h, d, a)
    return None


def _parse_ou25(bets: list[dict]) -> tuple[float, float] | None:
    for bet in bets:
        if bet.get("id") != BET_GOALS_OVER_UNDER and bet.get("name") != "Goals Over/Under":
            continue
        over = under = None
        for v in bet.get("values", []) or []:
            label = str(v.get("value", ""))
            if label == "Over 2.5":
                over = _num(v.get("odd"))
            elif label == "Under 2.5":
                under = _num(v.get("odd"))
        if over and under:
            return (over, under)
    return None


def _parse_ah(bets: list[dict]) -> tuple[float, float, float] | None:
    """الخط الآسيوي الأقرب إلى التوازن (أقرب لأودز 1.90/1.90)."""
    best: tuple[float, float, float] | None = None
    best_score = 9.0
    for bet in bets:
        if bet.get("id") != BET_ASIAN_HANDICAP and bet.get("name") != "Asian Handicap":
            continue
        by_line: dict[float, dict[str, float]] = {}
        for v in bet.get("values", []) or []:
            label = str(v.get("value", ""))  # مثل "Home -0.5" / "Away +0.5"
            parts = label.split()
            if len(parts) != 2:
                continue
            side, raw = parts
            try:
                line = float(raw)
            except ValueError:
                continue
            odd = _num(v.get("odd"))
            if not odd:
                continue
            home_line = line if side == "Home" else -line
            by_line.setdefault(home_line, {})[side] = odd
        for line, sides in by_line.items():
            h, a = sides.get("Home"), sides.get("Away")
            if not h or not a:
                continue
            score = abs(h - a)
            if score < best_score:
                best_score = score
                best = (line, h, a)
    return best


def parse_closing_books(bookmakers: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """يعيد {"pinnacle": {...}, "avg": {...}} حيث كل قاموس يحوي 1x2/ou25/ah إن وُجدت."""
    out: dict[str, dict[str, Any]] = {}
    x12: list[tuple[float, float, float]] = []
    for bm in bookmakers:
        name = str(bm.get("name") or "").lower()
        bets = bm.get("bets", []) or []
        one = _parse_1x2(bets)
        if one:
            x12.append(one)
        if "pinnacle" in name:
            out["pinnacle"] = {"1x2": one, "ou25": _parse_ou25(bets), "ah": _parse_ah(bets)}
    if x12:
        n = len(x12)
        out["avg"] = {
            "1x2": (
                round(sum(x[0] for x in x12) / n, 3),
                round(sum(x[1] for x in x12) / n, 3),
                round(sum(x[2] for x in x12) / n, 3),
            ),
            "n_books": n,
        }
    return out
