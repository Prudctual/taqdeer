#!/usr/bin/env python3
"""Taqdeer ensemble-v4: DC + shots-DC + true-xG + Pi + Elo + Form + sharp market + context."""

from __future__ import annotations

import json
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(line_buffering=True)

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))

MAX_TRAIN = 1000
HALF_LIFE = 140.0
MODEL_VERSION = "ensemble-v4"

from engine.calibrate import apply_temperature, fit_temperature, odds_to_probs  # noqa: E402
from engine.dixon_coles import MatchObs, fit_dixon_coles, top_scores  # noqa: E402
from engine.elo import EloMatch, elo_home_adv_from_profile, update_elo  # noqa: E402
from engine.ensemble import (  # noqa: E402
    DEFAULT_WEIGHTS,
    EARLY_SEASON_DAYS,
    FORM_BLEND_WEIGHT,
    blend_components,
    fit_weights,
    lock_form_weight,
    predict_match,
    value_signal,
)
from engine.evaluate import (  # noqa: E402
    calibration_bins,
    expected_calibration_error,
    fit_binary_temperature,
    summarize,
    summarize_with_closing,
)
from engine.form import (  # noqa: E402
    FormMatch,
    TeamForm,
    rolling_form,
    second_half_impact,
    similar_opponent_form,
    venue_form,
)
from engine.league_profiles import get_league_profile  # noqa: E402
from engine.logistics_engine import (  # noqa: E402
    classify_match_importance,
    count_midweek_in_window,
    travel_distance_km,
)
from engine.model2 import score_match, score_slate  # noqa: E402
from engine.referee_engine import evaluate_referee_impact  # noqa: E402
from engine.sharp_market import detect_steam  # noqa: E402
from engine.tactical_matchup import style_family  # noqa: E402
from engine.pi_ratings import PiMatch, update_pi  # noqa: E402
from engine.goalkeeper_engine import (  # noqa: E402
    compute_team_goalkeeper_profile,
    GoalkeeperProfile,
)
from engine.manager_engine import (  # noqa: E402
    compute_manager_profile,
    ManagerProfile,
)
from engine.randomness_engine import (  # noqa: E402
    compute_team_randomness_profile,
    evaluate_match_randomness,
)
from engine.xg_engine import compute_advanced_metrics  # noqa: E402


DB_PATH = ROOT / "data" / "taqdeer.db"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_live_enrichment(conn: sqlite3.Connection, match_id: str, referee_name: str | None) -> dict:
    """إشارات حية للمباريات القادمة فقط — لا تُستخدم في walk-forward التاريخي."""
    out: dict = {
        "weather": None,
        "home_missing": None,
        "away_missing": None,
        "referee_profile": None,
        "open_odds": None,
        "sharp_odds": None,
        "close_odds": None,
        "lineup_confirmed": False,
        "home_xi": None,
        "away_xi": None,
        "home_bench": None,
        "away_bench": None,
        "home_strength": None,
        "away_strength": None,
        "home_matches_7d": None,
        "away_matches_7d": None,
        "home_matches_14d": None,
        "away_matches_14d": None,
        "home_matches_30d": None,
        "away_matches_30d": None,
        "days_into_season": None,
    }
    mrow = conn.execute(
        """
        SELECT odds_open_home, odds_open_draw, odds_open_away,
               odds_sharp_home, odds_sharp_draw, odds_sharp_away,
               odds_close_home, odds_close_draw, odds_close_away,
               matches_7d_home, matches_7d_away,
               matches_14d_home, matches_14d_away,
               matches_30d_home, matches_30d_away,
               home_team_id, away_team_id, utc_date, season
        FROM matches WHERE id=?
        """,
        (match_id,),
    ).fetchone()
    if mrow and mrow["odds_open_home"] and mrow["odds_open_draw"] and mrow["odds_open_away"]:
        out["open_odds"] = (
            float(mrow["odds_open_home"]),
            float(mrow["odds_open_draw"]),
            float(mrow["odds_open_away"]),
        )
    if mrow and mrow["odds_sharp_home"] and mrow["odds_sharp_draw"] and mrow["odds_sharp_away"]:
        out["sharp_odds"] = (
            float(mrow["odds_sharp_home"]),
            float(mrow["odds_sharp_draw"]),
            float(mrow["odds_sharp_away"]),
        )
    if mrow and mrow["odds_close_home"] and mrow["odds_close_draw"] and mrow["odds_close_away"]:
        out["close_odds"] = (
            float(mrow["odds_close_home"]),
            float(mrow["odds_close_draw"]),
            float(mrow["odds_close_away"]),
        )
    if mrow:
        for key, col in (
            ("home_matches_7d", "matches_7d_home"),
            ("away_matches_7d", "matches_7d_away"),
            ("home_matches_14d", "matches_14d_home"),
            ("away_matches_14d", "matches_14d_away"),
            ("home_matches_30d", "matches_30d_home"),
            ("away_matches_30d", "matches_30d_away"),
        ):
            try:
                if mrow[col] is not None:
                    out[key] = float(mrow[col])
            except (IndexError, KeyError):
                pass
        out["days_into_season"] = days_into_season(mrow["utc_date"], mrow["season"])

    try:
        erow = conn.execute(
            """
            SELECT weather_temp_c, weather_precip_mm, weather_wind_kmh, weather_multiplier,
                   lineup_json, lineup_confirmed
            FROM match_enrichment WHERE match_id=?
            """,
            (match_id,),
        ).fetchone()
    except sqlite3.OperationalError:
        erow = None

    if erow and (
        erow["weather_temp_c"] is not None
        or erow["weather_precip_mm"] is not None
        or erow["weather_wind_kmh"] is not None
        or erow["weather_multiplier"] is not None
    ):
        out["weather"] = {
            "temp_c": erow["weather_temp_c"],
            "precip_mm": erow["weather_precip_mm"],
            "wind_kmh": erow["weather_wind_kmh"],
            "multiplier": erow["weather_multiplier"],
        }
    if erow:
        out["lineup_confirmed"] = bool(erow["lineup_confirmed"])
        if erow["lineup_json"]:
            try:
                lj = json.loads(erow["lineup_json"])
                home_block = lj.get("home") or {}
                away_block = lj.get("away") or {}
                if isinstance(home_block, dict):
                    out["home_xi"] = home_block.get("players") or []
                    out["home_bench"] = home_block.get("bench") or []
                else:
                    out["home_xi"] = lj.get("home_starters") or []
                if isinstance(away_block, dict):
                    out["away_xi"] = away_block.get("players") or []
                    out["away_bench"] = away_block.get("bench") or []
                else:
                    out["away_xi"] = lj.get("away_starters") or []
                # تطبيع أسماء الحقول لـ player_impact
                def _norm_xi(xs):
                    out_xs = []
                    for p in xs or []:
                        if not isinstance(p, dict):
                            continue
                        out_xs.append(
                            {
                                **p,
                                "player_name": p.get("player_name") or p.get("name"),
                                "is_starter": True,
                            }
                        )
                    return out_xs

                out["home_xi"] = _norm_xi(out["home_xi"])
                out["away_xi"] = _norm_xi(out["away_xi"])
                out["home_bench"] = _norm_xi(out.get("home_bench"))
                out["away_bench"] = _norm_xi(out.get("away_bench"))
            except Exception:
                pass

    try:
        missing = conn.execute(
            """
            SELECT team_id, player_name, position, status, reason
            FROM player_availability WHERE match_id=?
            """,
            (match_id,),
        ).fetchall()
    except sqlite3.OperationalError:
        missing = []
    if missing and mrow:
        out["home_missing"] = [
            dict(r)
            for r in missing
            if r["team_id"] == mrow["home_team_id"]
        ]
        out["away_missing"] = [
            dict(r)
            for r in missing
            if r["team_id"] == mrow["away_team_id"]
        ]

    if mrow:
        out["home_strength"] = load_team_strength_map(conn, mrow["home_team_id"])
        out["away_strength"] = load_team_strength_map(conn, mrow["away_team_id"])

    if referee_name:
        try:
            pref = conn.execute(
                """
                SELECT name, matches_n, avg_yellows, avg_reds, strictness
                FROM referee_profiles WHERE name=?
                """,
                (referee_name,),
            ).fetchone()
        except sqlite3.OperationalError:
            pref = None
        if pref:
            out["referee_profile"] = dict(pref)

    return out


def load_team_strength_map(conn: sqlite3.Connection, team_id: str) -> dict[str, float]:
    try:
        rows = conn.execute(
            "SELECT player_name, strength FROM player_strength WHERE team_id=?",
            (team_id,),
        ).fetchall()
    except sqlite3.OperationalError:
        return {}
    return {str(r["player_name"]).strip().lower(): float(r["strength"]) for r in rows}


def days_into_season(utc_date: str | None, season: str | None) -> float | None:
    if not utc_date:
        return None
    try:
        dt = datetime.fromisoformat(str(utc_date).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None
    # موسم أوروبي تقريبي: أغسطس 1
    year = dt.year if dt.month >= 8 else dt.year - 1
    if season:
        try:
            year = int(str(season).split("/")[0][:4])
        except Exception:
            pass
    start = datetime(year, 8, 1, tzinfo=timezone.utc)
    return max(0.0, (dt - start).total_seconds() / 86400.0)


def count_matches_in_window(
    rows: list, team_id: str, as_of_utc: str, *, days: float = 7.0
) -> float:
    """عدد مباريات الفريق في النافذة السابقة لتاريخ as_of (ازدحام)."""
    try:
        ref = datetime.fromisoformat(str(as_of_utc).replace("Z", "+00:00"))
        if ref.tzinfo is None:
            ref = ref.replace(tzinfo=timezone.utc)
    except Exception:
        return 0.0
    n = 0
    for m in rows:
        if m["home_team_id"] != team_id and m["away_team_id"] != team_id:
            continue
        try:
            dt = datetime.fromisoformat(str(m["utc_date"]).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        delta = (ref - dt).total_seconds() / 86400.0
        if 0 < delta <= days:
            n += 1
    return float(n)


def persist_congestion(
    conn: sqlite3.Connection,
    match_id: str,
    home_id: str,
    away_id: str,
    utc_date: str,
    rows: list,
) -> dict[str, float]:
    vals = {
        "home_matches_7d": count_matches_in_window(rows, home_id, utc_date, days=7),
        "away_matches_7d": count_matches_in_window(rows, away_id, utc_date, days=7),
        "home_matches_14d": count_matches_in_window(rows, home_id, utc_date, days=14),
        "away_matches_14d": count_matches_in_window(rows, away_id, utc_date, days=14),
        "home_matches_30d": count_matches_in_window(rows, home_id, utc_date, days=30),
        "away_matches_30d": count_matches_in_window(rows, away_id, utc_date, days=30),
        "home_midweek_7d": count_midweek_in_window(rows, home_id, utc_date, days=7),
        "away_midweek_7d": count_midweek_in_window(rows, away_id, utc_date, days=7),
    }
    conn.execute(
        """
        UPDATE matches SET
          matches_7d_home=?, matches_7d_away=?,
          matches_14d_home=?, matches_14d_away=?,
          matches_30d_home=?, matches_30d_away=?
        WHERE id=?
        """,
        (
            vals["home_matches_7d"],
            vals["away_matches_7d"],
            vals["home_matches_14d"],
            vals["away_matches_14d"],
            vals["home_matches_30d"],
            vals["away_matches_30d"],
            match_id,
        ),
    )
    return vals


def load_standings_map(conn: sqlite3.Connection, league_id: str, season: str) -> tuple[dict, int]:
    try:
        rows = conn.execute(
            """
            SELECT team_id, position, points, played
            FROM standings WHERE league_id=? AND season=?
            """,
            (league_id, season),
        ).fetchall()
    except sqlite3.OperationalError:
        return {}, 0
    by = {str(r["team_id"]): dict(r) for r in rows}
    return by, len(by)


def build_match_context(
    *,
    home_id: str,
    away_id: str,
    utc_date: str,
    finished: list,
    ratings: dict[str, float],
    standings: dict,
    n_teams: int,
    congestion: dict[str, float],
) -> dict:
    elo_map = dict(ratings)
    return {
        "home_matches_7d": congestion.get("home_matches_7d"),
        "away_matches_7d": congestion.get("away_matches_7d"),
        "home_matches_14d": congestion.get("home_matches_14d"),
        "away_matches_14d": congestion.get("away_matches_14d"),
        "home_matches_30d": congestion.get("home_matches_30d"),
        "away_matches_30d": congestion.get("away_matches_30d"),
        "home_midweek_7d": congestion.get("home_midweek_7d"),
        "away_midweek_7d": congestion.get("away_midweek_7d"),
        "travel_distance_km": travel_distance_km(home_id, away_id),
        "match_importance": classify_match_importance(
            standings.get(home_id), standings.get(away_id), n_teams
        ),
        "venue_split": {
            "home": venue_form(finished, home_id, "home"),
            "away": venue_form(finished, away_id, "away"),
        },
        "similar_opponents": {
            "home": similar_opponent_form(
                finished, home_id, away_id, elo_map, style_family_fn=style_family
            ),
            "away": similar_opponent_form(
                finished, away_id, home_id, elo_map, style_family_fn=style_family
            ),
        },
        "second_half": {
            "home": second_half_impact(finished, home_id),
            "away": second_half_impact(finished, away_id),
        },
    }


def apply_model2_to_predictions(conn: sqlite3.Connection) -> None:
    """تمرير اللائحة: رتبة العامل 5 ثم موثوقية النموذج 2 على نافذة 14 يوماً."""
    window = conn.execute(
        """
        SELECT p.match_id, p.p_home, p.p_draw, p.p_away, p.lambda_home, p.lambda_away,
               p.p_over25, p.elo_home, p.elo_away, p.confidence, p.analytics_json,
               m.utc_date
        FROM predictions p
        JOIN matches m ON m.id = p.match_id
        WHERE m.status IN ('SCHEDULED','TIMED','IN_PLAY','PAUSED')
          AND substr(m.utc_date, 1, 19) >= strftime('%Y-%m-%dT%H:%M:%S', 'now', '-12 hours')
          AND substr(m.utc_date, 1, 19) <= strftime('%Y-%m-%dT%H:%M:%S', 'now', '+14 days')
        ORDER BY m.utc_date ASC
        """
    ).fetchall()

    def pred_from_row(r) -> dict:
        analytics = {}
        if r["analytics_json"]:
            try:
                analytics = json.loads(r["analytics_json"])
            except Exception:
                analytics = {}
        pred = {
            "p_home": r["p_home"],
            "p_draw": r["p_draw"],
            "p_away": r["p_away"],
            "lambda_home": r["lambda_home"],
            "lambda_away": r["lambda_away"],
            "p_over25": r["p_over25"],
            "elo_home": r["elo_home"],
            "elo_away": r["elo_away"],
            "confidence": r["confidence"],
            "components": analytics.get("components") or {},
            "randomness": analytics.get("randomness"),
            "match_randomness_index": analytics.get("match_randomness_index"),
            "is_strictly_excluded": analytics.get("is_strictly_excluded"),
        }
        return pred, analytics

    entries = []
    window_ids = set()
    for r in window:
        pred, analytics = pred_from_row(r)
        entries.append({"match_id": r["match_id"], "pred": pred, "analytics": analytics})
        window_ids.add(r["match_id"])

    if entries:
        score_slate(entries)
        for item in entries:
            analytics = item["analytics"]
            analytics["model2"] = item["model2"]
            conn.execute(
                "UPDATE predictions SET analytics_json=? WHERE match_id=?",
                (json.dumps(analytics, ensure_ascii=False), item["match_id"]),
            )

    rest = conn.execute(
        """
        SELECT p.match_id, p.p_home, p.p_draw, p.p_away, p.lambda_home, p.lambda_away,
               p.p_over25, p.elo_home, p.elo_away, p.confidence, p.analytics_json
        FROM predictions p
        """
    ).fetchall()
    for r in rest:
        if r["match_id"] in window_ids:
            continue
        pred, analytics = pred_from_row(r)
        analytics["model2"] = score_match(pred)
        conn.execute(
            "UPDATE predictions SET analytics_json=? WHERE match_id=?",
            (json.dumps(analytics, ensure_ascii=False), r["match_id"]),
        )
    print(
        f"model2: slate {len(entries)} · candidates "
        f"{sum(1 for e in entries if e.get('model2', {}).get('candidate'))}",
        flush=True,
    )
    conn.commit()


def _odds3(row: sqlite3.Row, prefix: str) -> tuple[float, float, float] | None:
    h, d, a = row[f"{prefix}_home"], row[f"{prefix}_draw"], row[f"{prefix}_away"]
    if h and d and a and float(h) > 1.01 and float(d) > 1.01 and float(a) > 1.01:
        return (float(h), float(d), float(a))
    return None


def refresh_live_components(conn: sqlite3.Connection) -> None:
    """يحدّث sharp/حكم في analytics دون تغيير 1X2 ثم يعيد تسجيل النموذج 2."""
    rows = conn.execute(
        """
        SELECT p.match_id, p.p_home, p.p_draw, p.p_away, p.analytics_json,
               m.odds_home, m.odds_draw, m.odds_away,
               m.odds_open_home, m.odds_open_draw, m.odds_open_away,
               m.referee_name
        FROM predictions p
        JOIN matches m ON m.id = p.match_id
        WHERE m.status IN ('SCHEDULED','TIMED','IN_PLAY','PAUSED')
          AND substr(m.utc_date, 1, 19) >= strftime('%Y-%m-%dT%H:%M:%S', 'now', '-12 hours')
          AND substr(m.utc_date, 1, 19) <= strftime('%Y-%m-%dT%H:%M:%S', 'now', '+14 days')
        """
    ).fetchall()
    n = 0
    for r in rows:
        analytics: dict = {}
        if r["analytics_json"]:
            try:
                analytics = json.loads(r["analytics_json"])
            except Exception:
                analytics = {}
        comps = analytics.get("components")
        if not isinstance(comps, dict):
            comps = {}
        steam = detect_steam(_odds3(r, "odds_open"), _odds3(r, "odds"))
        prev_sharp = comps.get("sharp") if isinstance(comps.get("sharp"), dict) else {}
        comps["sharp"] = {**prev_sharp, **steam}

        profile = None
        name = (r["referee_name"] or "").strip()
        if name:
            try:
                pref = conn.execute(
                    """
                    SELECT name, matches_n, avg_yellows, avg_reds, strictness
                    FROM referee_profiles WHERE name=?
                    """,
                    (name,),
                ).fetchone()
            except sqlite3.OperationalError:
                pref = None
            if pref:
                profile = dict(pref)
        comps["referee"] = evaluate_referee_impact(profile)

        analytics["components"] = comps
        conn.execute(
            "UPDATE predictions SET analytics_json=? WHERE match_id=?",
            (json.dumps(analytics, ensure_ascii=False), r["match_id"]),
        )
        n += 1
    conn.commit()
    apply_model2_to_predictions(conn)
    print(f"live refresh: {n} matches · 1X2 unchanged", flush=True)


def ensure_columns(conn: sqlite3.Connection) -> None:
    cols = {r[1] for r in conn.execute("PRAGMA table_info(matches)")}
    for name, typ in [
        ("odds_home", "REAL"),
        ("odds_draw", "REAL"),
        ("odds_away", "REAL"),
        ("shots_home", "REAL"),
        ("shots_away", "REAL"),
        ("sot_home", "REAL"),
        ("sot_away", "REAL"),
        ("fouls_home", "REAL"),
        ("fouls_away", "REAL"),
        ("corners_home", "REAL"),
        ("corners_away", "REAL"),
        ("xg_home", "REAL"),
        ("xg_away", "REAL"),
        ("xa_home", "REAL"),
        ("xa_away", "REAL"),
        ("ppda_home", "REAL"),
        ("ppda_away", "REAL"),
        ("odds_open_home", "REAL"),
        ("odds_open_draw", "REAL"),
        ("odds_open_away", "REAL"),
        ("odds_close_home", "REAL"),
        ("odds_close_draw", "REAL"),
        ("odds_close_away", "REAL"),
        ("odds_sharp_home", "REAL"),
        ("odds_sharp_draw", "REAL"),
        ("odds_sharp_away", "REAL"),
        ("xg_true_home", "REAL"),
        ("xg_true_away", "REAL"),
        ("referee_name", "TEXT"),
        ("matches_7d_home", "REAL"),
        ("matches_7d_away", "REAL"),
        ("matches_14d_home", "REAL"),
        ("matches_14d_away", "REAL"),
        ("matches_30d_home", "REAL"),
        ("matches_30d_away", "REAL"),
    ]:
        if name not in cols:
            conn.execute(f"ALTER TABLE matches ADD COLUMN {name} {typ}")
    pcols = {r[1] for r in conn.execute("PRAGMA table_info(predictions)")}
    for name, typ in [
        ("analytics_json", "TEXT"),
        ("xpts_home", "REAL"),
        ("xpts_away", "REAL"),
        ("market_home", "REAL"),
        ("market_draw", "REAL"),
        ("market_away", "REAL"),
    ]:
        if name not in pcols:
            conn.execute(f"ALTER TABLE predictions ADD COLUMN {name} {typ}")
    mcols = {r[1] for r in conn.execute("PRAGMA table_info(model_metrics)")}
    if "model_version" not in mcols:
        conn.execute("ALTER TABLE model_metrics ADD COLUMN model_version TEXT")
    if "rps" not in mcols:
        conn.execute("ALTER TABLE model_metrics ADD COLUMN rps REAL")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS prediction_snapshots (
          id TEXT PRIMARY KEY,
          match_id TEXT UNIQUE NOT NULL REFERENCES matches(id),
          league_id TEXT NOT NULL,
          utc_date TEXT NOT NULL,
          p_home REAL NOT NULL,
          p_draw REAL NOT NULL,
          p_away REAL NOT NULL,
          p_btts_yes REAL NOT NULL,
          p_over25 REAL NOT NULL,
          lambda_home REAL NOT NULL,
          lambda_away REAL NOT NULL,
          elo_home REAL NOT NULL,
          elo_away REAL NOT NULL,
          confidence REAL NOT NULL,
          model_version TEXT NOT NULL,
          snapshot_at TEXT NOT NULL
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_snapshots_match ON prediction_snapshots(match_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_snapshots_league ON prediction_snapshots(league_id)")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS player_strength (
          id TEXT PRIMARY KEY,
          team_id TEXT NOT NULL,
          player_name TEXT NOT NULL,
          position TEXT,
          strength REAL NOT NULL DEFAULT 1.0,
          minutes REAL NOT NULL DEFAULT 0,
          appearances INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL,
          UNIQUE(team_id, player_name)
        )
        """
    )


def empty_form() -> TeamForm:
    return TeamForm(0, 0, 0, 0, 0, 0, 0)


def _row_ppda(m, side: str) -> float | None:
    """Read stored ppda_* or compute shot-proxy PPDA from match stats."""
    key = f"ppda_{side}"
    try:
        v = m[key]
        if v is not None:
            return float(v)
    except (IndexError, KeyError):
        pass
    if side == "home":
        if m["shots_home"] is None and m["fouls_home"] is None:
            return None
        return float(
            compute_advanced_metrics(
                int(m["home_goals"]),
                int(m["away_goals"]),
                m["shots_home"],
                m["shots_away"],
                m["sot_home"],
                m["sot_away"],
                m["fouls_home"],
                m["fouls_away"],
                m["corners_home"],
                m["corners_away"],
            )["ppda_home"]
        )
    if m["shots_away"] is None and m["fouls_away"] is None:
        return None
    return float(
        compute_advanced_metrics(
            int(m["home_goals"]),
            int(m["away_goals"]),
            m["shots_home"],
            m["shots_away"],
            m["sot_home"],
            m["sot_away"],
            m["fouls_home"],
            m["fouls_away"],
            m["corners_home"],
            m["corners_away"],
        )["ppda_away"]
    )


def rolling_team_ppda(
    finished: list, team_id: str, *, last_n: int = 12
) -> tuple[float | None, int]:
    """Mean proxy PPDA for a team over its last N finished matches with data."""
    vals: list[float] = []
    for m in reversed(finished):
        if m["home_team_id"] == team_id:
            v = _row_ppda(m, "home")
        elif m["away_team_id"] == team_id:
            v = _row_ppda(m, "away")
        else:
            continue
        if v is not None:
            vals.append(v)
        if len(vals) >= last_n:
            break
    if not vals:
        return None, 0
    return sum(vals) / len(vals), len(vals)


def load_fit_params(conn: sqlite3.Connection, league_id: str) -> tuple[dict, float, float, float]:
    """Load blend weights + 1X2/O2.5/BTTS temperatures (else defaults)."""
    row = conn.execute(
        "SELECT value FROM app_meta WHERE key=?",
        (f"fit_params_{league_id}",),
    ).fetchone()
    if not row or not row["value"]:
        return dict(DEFAULT_WEIGHTS), 1.0, 1.0, 1.0
    try:
        data = json.loads(row["value"])
        weights = data.get("weights") or DEFAULT_WEIGHTS
        temp = float(data.get("temperature") or 1.0)
        t_o = float(data.get("temp_over25") or 1.0)
        t_b = float(data.get("temp_btts") or 1.0)
        raw = {k: float(weights.get(k, DEFAULT_WEIGHTS[k])) for k in DEFAULT_WEIGHTS}
        return lock_form_weight(raw, FORM_BLEND_WEIGHT), temp, t_o, t_b
    except Exception:
        return dict(DEFAULT_WEIGHTS), 1.0, 1.0, 1.0


def save_fit_params(
    conn: sqlite3.Connection,
    league_id: str,
    weights: dict | None,
    temperature: float,
    temp_over25: float = 1.0,
    temp_btts: float = 1.0,
) -> None:
    locked = lock_form_weight(weights or DEFAULT_WEIGHTS, FORM_BLEND_WEIGHT)
    payload = {
        "weights": locked,
        "form_blend_weight": FORM_BLEND_WEIGHT,
        "temperature": float(temperature),
        "temp_over25": float(temp_over25),
        "temp_btts": float(temp_btts),
        "model_version": MODEL_VERSION,
        "updated_at": now_iso(),
    }
    conn.execute(
        """
        INSERT INTO app_meta(key, value) VALUES(?, ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
        """,
        (f"fit_params_{league_id}", json.dumps(payload)),
    )


def build_obs_shots(rows, obs_prefix):
    """Scaled shot-proxy pseudo-goals for parallel DC (needs ≥300 shot matches)."""

    def shot_value(shots: float, sot: float) -> float:
        return 0.30 * sot + 0.04 * max(shots - sot, 0.0)

    sh = [
        m
        for m in rows
        if m["shots_home"] is not None
        and m["sot_home"] is not None
        and m["shots_away"] is not None
        and m["sot_away"] is not None
    ]
    if len(sh) < 300:
        return None
    tot_g = sum(m["home_goals"] + m["away_goals"] for m in sh)
    tot_v = sum(
        shot_value(m["shots_home"], m["sot_home"])
        + shot_value(m["shots_away"], m["sot_away"])
        for m in sh
    )
    scale = tot_g / tot_v if tot_v > 0 else 1.0

    def pseudo(g: int, shots, sot) -> float:
        if shots is None or sot is None:
            return float(g)
        return 0.5 * g + 0.5 * scale * shot_value(shots, sot)

    return [
        MatchObs(
            home=o.home,
            away=o.away,
            home_goals=pseudo(m["home_goals"], m["shots_home"], m["sot_home"]),
            away_goals=pseudo(m["away_goals"], m["shots_away"], m["sot_away"]),
            days_ago=o.days_ago,
        )
        for o, m in zip(obs_prefix, rows)
    ]


def build_obs_true_xg(rows, obs_prefix):
    """DC موازٍ على xG تتبّعي (Understat) — يحتاج ≥200 مباراة بـ xg_true."""
    keyed = []
    for o, m in zip(obs_prefix, rows):
        try:
            xh = m["xg_true_home"]
            xa = m["xg_true_away"]
        except (KeyError, IndexError):
            xh = xa = None
        if xh is None or xa is None:
            continue
        try:
            xh_f, xa_f = float(xh), float(xa)
        except (TypeError, ValueError):
            continue
        if xh_f < 0.01 or xa_f < 0.01:
            continue
        keyed.append(
            MatchObs(
                home=o.home,
                away=o.away,
                home_goals=xh_f,
                away_goals=xa_f,
                days_ago=o.days_ago,
            )
        )
    if len(keyed) < 200:
        return None
    return keyed


def h2h_list_from_finished(
    finished: list, home_id: str, away_id: str, *, limit: int = 5
) -> list:
    key = frozenset((home_id, away_id))
    rows = [
        m
        for m in finished
        if frozenset((m["home_team_id"], m["away_team_id"])) == key
    ]
    return [
        {
            "home_team": r["home_team_id"],
            "away_team": r["away_team_id"],
            "home_goals": int(r["home_goals"]),
            "away_goals": int(r["away_goals"]),
        }
        for r in rows[-limit:]
    ]


def repredict_flagged(conn: sqlite3.Connection) -> int:
    """إعادة توقع ضيقة للمباريات المؤكَّد تشكيلتها — بأوزان/حرارة آخر fit كاملة الثراء."""
    row = conn.execute(
        "SELECT value FROM app_meta WHERE key='enrich_repredict_matches'"
    ).fetchone()
    if not row or not (row["value"] or "").strip():
        return 0
    ids = [x.strip() for x in str(row["value"]).split(",") if x.strip()]
    if not ids:
        return 0
    print(f"narrow repredict: {len(ids)} matches…", flush=True)
    placeholders = ",".join("?" * len(ids))
    matches = conn.execute(
        f"""
        SELECT id, league_id, home_team_id, away_team_id, utc_date, season,
               odds_home, odds_draw, odds_away, referee_name
        FROM matches WHERE id IN ({placeholders})
        """,
        ids,
    ).fetchall()
    by_league: dict[str, list] = {}
    for m in matches:
        by_league.setdefault(m["league_id"], []).append(m)

    n_written = 0
    for lid, targets in by_league.items():
        finished = conn.execute(
            """
            SELECT id, home_team_id, away_team_id, home_goals, away_goals, utc_date,
                   odds_home, odds_draw, odds_away,
                   shots_home, shots_away, sot_home, sot_away,
                   fouls_home, fouls_away, corners_home, corners_away,
                   ppda_home, ppda_away, season, xg_true_home, xg_true_away,
                   ht_home_goals, ht_away_goals, yellow_home, yellow_away, red_home, red_away
            FROM matches
            WHERE league_id = ? AND status = 'FINISHED'
              AND home_goals IS NOT NULL AND away_goals IS NOT NULL
            ORDER BY utc_date ASC
            """,
            (lid,),
        ).fetchall()
        if len(finished) < 20:
            continue
        train = finished[-MAX_TRAIN:]
        ref = datetime.now(timezone.utc)
        weights, temperature, temp_over25, temp_btts = load_fit_params(conn, lid)

        def days_ago(utc: str) -> float:
            try:
                dt = datetime.fromisoformat(utc.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return max(0.0, (ref - dt).total_seconds() / 86400.0)
            except Exception:
                return 0.0

        obs = [
            MatchObs(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
                days_ago=days_ago(m["utc_date"]),
            )
            for m in train
        ]
        model = fit_dixon_coles(obs, half_life_days=HALF_LIFE, league_id=lid)
        shots_obs = build_obs_shots(train, obs)
        model_shots = (
            fit_dixon_coles(shots_obs, half_life_days=HALF_LIFE, league_id=lid)
            if shots_obs
            else None
        )
        xg_obs = build_obs_true_xg(train, obs)
        model_true_xg = (
            fit_dixon_coles(xg_obs, half_life_days=HALF_LIFE, league_id=lid)
            if xg_obs
            else None
        )

        elo_matches = [
            EloMatch(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
                date=m["utc_date"],
                season=m["season"] if "season" in m.keys() and m["season"] is not None else "",
            )
            for m in train
        ]
        profile = get_league_profile(lid)
        elo_ha = elo_home_adv_from_profile(profile.home_advantage)
        ratings, _ = update_elo(elo_matches, home_adv=elo_ha)
        pi_matches = [
            PiMatch(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
            )
            for m in train
        ]
        pi_state = update_pi(pi_matches)
        form_matches = [
            FormMatch(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
                shots_home=m["shots_home"],
                shots_away=m["shots_away"],
                sot_home=m["sot_home"],
                sot_away=m["sot_away"],
                date=m["utc_date"],
            )
            for m in train
        ]
        forms = rolling_form(form_matches, window=5)
        rand_profiles = {}
        gk_profiles = {}
        mgr_profiles = {}
        for m in finished:
            hid = m["home_team_id"]
            aid = m["away_team_id"]
            if hid not in rand_profiles:
                rand_profiles[hid] = compute_team_randomness_profile(hid, finished, window=25)
            if aid not in rand_profiles:
                rand_profiles[aid] = compute_team_randomness_profile(aid, finished, window=25)
            if hid not in gk_profiles:
                gk_profiles[hid] = compute_team_goalkeeper_profile(hid, finished, ratings_map=ratings, window=25)
            if aid not in gk_profiles:
                gk_profiles[aid] = compute_team_goalkeeper_profile(aid, finished, ratings_map=ratings, window=25)
            if hid not in mgr_profiles:
                mgr_profiles[hid] = compute_manager_profile(hid, finished, elo_rating=ratings.get(hid, 1500.0))
            if aid not in mgr_profiles:
                mgr_profiles[aid] = compute_manager_profile(aid, finished, elo_rating=ratings.get(aid, 1500.0))
        ts = now_iso()
        season = targets[0]["season"] if targets else (finished[-1]["season"] if finished else "")
        standings_map, n_teams = load_standings_map(conn, lid, season)
        for t in targets:
            odds = None
            if t["odds_home"] and t["odds_draw"] and t["odds_away"]:
                odds = (float(t["odds_home"]), float(t["odds_draw"]), float(t["odds_away"]))
            enrich = load_live_enrichment(conn, t["id"], t["referee_name"])
            ppda_h, ppda_hn = rolling_team_ppda(finished, t["home_team_id"])
            ppda_a, ppda_an = rolling_team_ppda(finished, t["away_team_id"])
            cong = persist_congestion(
                conn, t["id"], t["home_team_id"], t["away_team_id"], t["utc_date"], finished
            )
            m2_ctx = build_match_context(
                home_id=t["home_team_id"],
                away_id=t["away_team_id"],
                utc_date=t["utc_date"],
                finished=finished,
                ratings=ratings,
                standings=standings_map,
                n_teams=n_teams,
                congestion=cong,
            )
            pred = predict_match(
                home=t["home_team_id"],
                away=t["away_team_id"],
                dc=model,
                elo_home=ratings.get(t["home_team_id"], 1500.0),
                elo_away=ratings.get(t["away_team_id"], 1500.0),
                pi=pi_state,
                form_home=forms.get(t["home_team_id"], empty_form()),
                form_away=forms.get(t["away_team_id"], empty_form()),
                market_odds=odds,
                temperature=temperature,
                weights=weights,
                dc_shots=model_shots,
                dc_true_xg=model_true_xg,
                h2h_matches=h2h_list_from_finished(
                    finished, t["home_team_id"], t["away_team_id"]
                ),
                league_id=lid,
                weather=enrich["weather"],
                home_missing=enrich["home_missing"],
                away_missing=enrich["away_missing"],
                referee_profile=enrich["referee_profile"],
                open_odds=enrich["open_odds"],
                sharp_odds=enrich.get("sharp_odds"),
                close_odds=enrich.get("close_odds"),
                days_into_season=enrich.get("days_into_season"),
                home_strength=enrich.get("home_strength"),
                away_strength=enrich.get("away_strength"),
                home_xi=enrich.get("home_xi"),
                away_xi=enrich.get("away_xi"),
                home_bench=enrich.get("home_bench"),
                away_bench=enrich.get("away_bench"),
                lineup_confirmed=bool(enrich.get("lineup_confirmed")),
                temp_over25=temp_over25,
                temp_btts=temp_btts,
                ppda_home=ppda_h,
                ppda_away=ppda_a,
                ppda_home_n=ppda_hn,
                ppda_away_n=ppda_an,
                form_matches=form_matches,
                home_randomness_stats=rand_profiles.get(t["home_team_id"]),
                away_randomness_stats=rand_profiles.get(t["away_team_id"]),
                home_gk_stats=gk_profiles.get(t["home_team_id"]),
                away_gk_stats=gk_profiles.get(t["away_team_id"]),
                home_manager_profile=mgr_profiles.get(t["home_team_id"]),
                away_manager_profile=mgr_profiles.get(t["away_team_id"]),
                **m2_ctx,
            )
            conn.execute("DELETE FROM predictions WHERE match_id=?", (t["id"],))
            market = pred["components"]["market"]["p"]
            analytics = {
                "version": MODEL_VERSION,
                "components": json.loads(json.dumps(pred["components"], default=list)),
                "edge": pred["edge"],
                "value": pred["value"],
                "weights": pred["weights"],
                "xpts": [pred["xpts_home"], pred["xpts_away"]],
                "double_chance": pred.get("double_chance"),
                "narrow_repredict": True,
                "randomness": pred.get("randomness"),
                "match_randomness_index": pred.get("match_randomness_index"),
                "stability_score": pred.get("stability_score"),
                "is_strictly_excluded": pred.get("is_strictly_excluded"),
            }
            tops = top_scores(pred["matrix"], 8)
            elo_h = ratings.get(t["home_team_id"], 1500.0)
            elo_a = ratings.get(t["away_team_id"], 1500.0)
            conn.execute(
                """
                INSERT INTO predictions (
                  id, match_id, lambda_home, lambda_away,
                  p_home, p_draw, p_away, p_btts_yes, p_over25,
                  top_scores_json, score_matrix_json,
                  elo_home, elo_away, confidence, model_version,
                  created_at, updated_at,
                  analytics_json, xpts_home, xpts_away,
                  market_home, market_draw, market_away
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    str(uuid.uuid4()),
                    t["id"],
                    pred["lambda_home"],
                    pred["lambda_away"],
                    pred["p_home"],
                    pred["p_draw"],
                    pred["p_away"],
                    pred["p_btts_yes"],
                    pred["p_over25"],
                    json.dumps(tops),
                    json.dumps(pred["matrix"].tolist()),
                    elo_h,
                    elo_a,
                    pred["confidence"],
                    MODEL_VERSION,
                    ts,
                    ts,
                    json.dumps(analytics, ensure_ascii=False),
                    pred["xpts_home"],
                    pred["xpts_away"],
                    market[0] if market else None,
                    market[1] if market else None,
                    market[2] if market else None,
                ),
            )
            conn.execute(
                """
                INSERT INTO prediction_snapshots (
                  id, match_id, league_id, utc_date,
                  p_home, p_draw, p_away, p_btts_yes, p_over25,
                  lambda_home, lambda_away, elo_home, elo_away,
                  confidence, model_version, snapshot_at
                ) SELECT
                    ?, m.id, m.league_id, m.utc_date,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?
                FROM matches m WHERE m.id = ?
                ON CONFLICT(match_id) DO UPDATE SET
                  p_home = excluded.p_home,
                  p_draw = excluded.p_draw,
                  p_away = excluded.p_away,
                  p_btts_yes = excluded.p_btts_yes,
                  p_over25 = excluded.p_over25,
                  lambda_home = excluded.lambda_home,
                  lambda_away = excluded.lambda_away,
                  elo_home = excluded.elo_home,
                  elo_away = excluded.elo_away,
                  confidence = excluded.confidence,
                  model_version = excluded.model_version,
                  snapshot_at = excluded.snapshot_at
                WHERE (SELECT status FROM matches WHERE id = prediction_snapshots.match_id)
                      NOT IN ('FINISHED', 'AWARDED')
                """,
                (
                    str(uuid.uuid4()),
                    pred["p_home"],
                    pred["p_draw"],
                    pred["p_away"],
                    pred["p_btts_yes"],
                    pred["p_over25"],
                    pred["lambda_home"],
                    pred["lambda_away"],
                    elo_h,
                    elo_a,
                    pred["confidence"],
                    MODEL_VERSION,
                    ts,
                    t["id"],
                ),
            )
            n_written += 1
    conn.execute("DELETE FROM app_meta WHERE key='enrich_repredict_matches'")
    conn.commit()
    apply_model2_to_predictions(conn)
    print(f"narrow repredict wrote {n_written}", flush=True)
    return n_written


def refresh_calibration_bins(conn: sqlite3.Connection) -> None:
    rows = conn.execute(
        """
        SELECT m.home_goals, m.away_goals, p.p_home, p.p_draw, p.p_away
        FROM matches m
        JOIN predictions p ON p.match_id = m.id
        WHERE (m.status = 'FINISHED' OR (m.home_goals IS NOT NULL AND m.away_goals IS NOT NULL))
          AND p.p_home IS NOT NULL
        """
    ).fetchall()
    probs = []
    outcomes = []
    for r in rows:
        probs.append((float(r["p_home"]), float(r["p_draw"]), float(r["p_away"])))
        hg, ag = int(r["home_goals"]), int(r["away_goals"])
        outcomes.append("H" if hg > ag else ("A" if ag > hg else "D"))
    if probs:
        cal_bins = calibration_bins(probs, outcomes)
        ece = expected_calibration_error(probs, outcomes)
        conn.execute(
            """
            INSERT INTO app_meta(key, value) VALUES('calibration_bins', ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value
            """,
            (
                json.dumps(
                    {
                        "bins": cal_bins,
                        "ece": ece,
                        "n_matches": len(probs),
                        "model_version": MODEL_VERSION,
                        "updated_at": now_iso(),
                    },
                    ensure_ascii=False,
                ),
            ),
        )
        conn.commit()
        print(f"Refreshed calibration bins in app_meta: {len(probs)} matches, ECE={ece:.4f}", flush=True)


def main() -> None:
    if not DB_PATH.exists():
        print("DB missing. Run: bun run sync")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 10000")
    ensure_columns(conn)

    if "--help" in sys.argv or "-h" in sys.argv:
        print("Usage: fit-and-predict.py [--repredict-flagged] [--refresh-live] [--calibration-only]")
        conn.close()
        return

    if "--calibration-only" in sys.argv:
        refresh_calibration_bins(conn)
        conn.close()
        return

    if "--refresh-live" in sys.argv:
        refresh_live_components(conn)
        conn.close()
        return

    if "--repredict-flagged" in sys.argv:
        repredict_flagged(conn)
        conn.close()
        return

    leagues = conn.execute("SELECT id, code, name_ar FROM leagues").fetchall()
    print(f"{MODEL_VERSION} fitting {len(leagues)} leagues…")

    conn.execute("DELETE FROM predictions")
    conn.execute("DELETE FROM elo_snapshots")
    conn.execute("DELETE FROM team_strengths")
    conn.execute("DELETE FROM model_metrics")

    all_probs = []
    all_outcomes = []
    value_backtests: dict[str, dict] = {}

    for league in leagues:
        lid = league["id"]
        finished = conn.execute(
            """
            SELECT id, home_team_id, away_team_id, home_goals, away_goals, utc_date,
                   odds_home, odds_draw, odds_away,
                   odds_open_home, odds_open_draw, odds_open_away,
                   odds_close_home, odds_close_draw, odds_close_away,
                   odds_sharp_home, odds_sharp_draw, odds_sharp_away,
                   shots_home, shots_away, sot_home, sot_away,
                   fouls_home, fouls_away, corners_home, corners_away, season,
                   xg_true_home, xg_true_away,
                   ht_home_goals, ht_away_goals, yellow_home, yellow_away, red_home, red_away
            FROM matches
            WHERE league_id = ? AND status = 'FINISHED'
              AND home_goals IS NOT NULL AND away_goals IS NOT NULL
            ORDER BY utc_date ASC
            """,
            (lid,),
        ).fetchall()
        if len(finished) < 20:
            print(f"  skip {lid}: {len(finished)} matches")
            continue

        # Compute and persist advanced event metrics (xG, xA, PPDA) into DB
        for m in finished:
            adv = compute_advanced_metrics(
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
                shots_home=m["shots_home"],
                shots_away=m["shots_away"],
                sot_home=m["sot_home"],
                sot_away=m["sot_away"],
                fouls_home=m["fouls_home"],
                fouls_away=m["fouls_away"],
                corners_home=m["corners_home"],
                corners_away=m["corners_away"],
                xg_true_home=m["xg_true_home"] if "xg_true_home" in m.keys() else None,
                xg_true_away=m["xg_true_away"] if "xg_true_away" in m.keys() else None,
            )
            conn.execute(
                """
                UPDATE matches
                SET xg_home = ?, xg_away = ?, xa_home = ?, xa_away = ?, ppda_home = ?, ppda_away = ?
                WHERE id = ?
                """,
                (
                    adv["xg_home"],
                    adv["xg_away"],
                    adv["xa_home"],
                    adv["xa_away"],
                    adv["ppda_home"],
                    adv["ppda_away"],
                    m["id"],
                ),
            )

        elo_source = list(finished)
        train = finished[-MAX_TRAIN:]
        ref = datetime.now(timezone.utc)

        elo_matches = [
            EloMatch(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
                date=m["utc_date"],
                season=m["season"] if "season" in m.keys() and m["season"] is not None else "",
            )
            for m in elo_source
        ]
        pi_matches = [
            PiMatch(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
            )
            for m in elo_source
        ]
        form_matches = [
            FormMatch(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
                shots_home=m["shots_home"],
                shots_away=m["shots_away"],
                sot_home=m["sot_home"],
                sot_away=m["sot_away"],
                date=m["utc_date"],
            )
            for m in elo_source
        ]

        obs = []
        for m in train:
            dt = datetime.fromisoformat(m["utc_date"].replace("Z", "+00:00"))
            days = max((ref - dt).total_seconds() / 86400.0, 0.0)
            obs.append(
                MatchObs(
                    home=m["home_team_id"],
                    away=m["away_team_id"],
                    home_goals=int(m["home_goals"]),
                    away_goals=int(m["away_goals"]),
                    days_ago=days,
                )
            )

        # أهداف زائفة من التسديدات (بديل xG عملي) — انظر build_obs_shots
        obs_shots = build_obs_shots(train, obs)

        # --- فهرس المواجهات المباشرة (H2H): لكل زوج فرق لقاءاتهما المنتهية
        # مرتبة زمنياً. يُمرَّر آخر 5 لقاءات سابقة للمباراة فقط — نظيف زمنياً.
        h2h_pairs: dict[frozenset, list[tuple[int, sqlite3.Row]]] = {}
        for h2h_gi, h2h_m in enumerate(finished):
            h2h_pairs.setdefault(
                frozenset((h2h_m["home_team_id"], h2h_m["away_team_id"])), []
            ).append((h2h_gi, h2h_m))

        def h2h_before(
            home_id: str, away_id: str, before_gi: int | None = None, last: int = 5
        ) -> list[dict]:
            rows = h2h_pairs.get(frozenset((home_id, away_id)), [])
            if before_gi is not None:
                rows = [r for r in rows if r[0] < before_gi]
            return [
                {
                    "home_team": r["home_team_id"],
                    "away_team": r["away_team_id"],
                    "home_goals": int(r["home_goals"]),
                    "away_goals": int(r["away_goals"]),
                }
                for _, r in rows[-last:]
            ]

        targets = conn.execute(
            """
            SELECT id, home_team_id, away_team_id, utc_date, odds_home, odds_draw, odds_away,
                   odds_open_home, odds_open_draw, odds_open_away,
                   referee_name, status, season
            FROM matches
            WHERE league_id=?
              AND status IN ('SCHEDULED','TIMED','IN_PLAY','PAUSED')
              AND source NOT IN ('preview-holdout','synthetic','demo')
            ORDER BY utc_date ASC
            """,
            (lid,),
        ).fetchall()

        # --- Promoted-team prior: فريق يظهر لأول مرة يرث متوسط تقييم الفرق التي
        # غادرت الدوري قبل موسمه — لا 1500 (= متوسط الدوري) الذي يبالغ في تقديره.
        # التقييمات تُقرأ عند بداية موسمه فقط: زمني بحت، لا معلومات من المستقبل.
        # ponytail: تمريرة واحدة زمنية بلا نقطة ثبات، وفرق DC الباردة تنكمش لمتوسط
        # الدوري عبر الـridge كما هي؛ الترقية: أسعار CSV لدوريات الدرجة الثانية.
        season_first_idx: dict[str, int] = {}
        season_teams: dict[str, set] = {}
        first_season: dict[str, str] = {}
        for i, m in enumerate(finished):
            season_first_idx.setdefault(m["season"], i)
            for tid in (m["home_team_id"], m["away_team_id"]):
                season_teams.setdefault(m["season"], set()).add(tid)
                first_season.setdefault(tid, m["season"])
        # الموسم المجدول الذي لم تُلعب منه مباراة بعد: موسم زائف عند نهاية التاريخ،
        # كي يُبذر الصاعدون الذين لا نتيجة لهم أصلاً (هم أبرد الفرق الباردة)
        for m in targets:
            season_first_idx.setdefault(m["season"], len(finished))
            for tid in (m["home_team_id"], m["away_team_id"]):
                season_teams.setdefault(m["season"], set()).add(tid)
                first_season.setdefault(tid, m["season"])
        elo_seeds: dict[str, float] = {}
        pi_off_seeds: dict[str, float] = {}
        pi_def_seeds: dict[str, float] = {}
        seasons_seq = sorted(season_first_idx, key=lambda s: season_first_idx[s])
        for si in range(1, len(seasons_seq)):
            s = seasons_seq[si]
            # كتيبة الموسم السابق مباشرة — لا كل من غادر يوماً بتقييم متجمد قديم
            prev_teams = season_teams[seasons_seq[si - 1]]
            dropped = prev_teams - season_teams[s]
            newcomers = [t for t in season_teams[s] if first_season[t] == s]
            if not dropped or not newcomers:
                continue  # لا تاريخ هبوط (أول موسم كوري مثلاً) → الافتراضي كما هو
            idx0 = season_first_idx[s]
            pre_elo, _ = update_elo(elo_matches[:idx0], seeds=elo_seeds)
            pre_pi = update_pi(
                pi_matches[:idx0], off_seeds=pi_off_seeds, def_seeds=pi_def_seeds
            )
            evals = [pre_elo[t] for t in dropped if t in pre_elo]
            if evals:
                seed = sum(evals) / len(evals)
                for t in newcomers:
                    elo_seeds[t] = seed
            offs = [pre_pi.off[t] for t in dropped if t in pre_pi.off]
            defs = [pre_pi.deff[t] for t in dropped if t in pre_pi.deff]
            if offs:
                so = sum(offs) / len(offs)
                sd = sum(defs) / len(defs) if defs else 0.0
                for t in newcomers:
                    pi_off_seeds[t] = so
                    pi_def_seeds[t] = sd

        obs_true_xg = build_obs_true_xg(train, obs)
        print(
            f"  {lid}: DC on {len(obs)} · shots-DC {'on' if obs_shots else 'off'} · xG-DC {'on' if obs_true_xg else 'off'} · Elo/Pi on {len(elo_source)}…",
            flush=True,
        )
        model = fit_dixon_coles(obs, half_life_days=HALF_LIFE, league_id=lid)
        model_shots = (
            fit_dixon_coles(obs_shots, half_life_days=HALF_LIFE, league_id=lid) if obs_shots else None
        )
        model_true_xg = (
            fit_dixon_coles(obs_true_xg, half_life_days=HALF_LIFE, league_id=lid)
            if obs_true_xg
            else None
        )
        profile = get_league_profile(lid)
        elo_ha = elo_home_adv_from_profile(profile.home_advantage)
        early_boost = any(
            (days_into_season(m["utc_date"], m["season"]) or 999) < EARLY_SEASON_DAYS
            for m in train[-20:]
        )
        ratings, history = update_elo(
            elo_matches, home_adv=elo_ha, seeds=elo_seeds, early_season_boost=early_boost
        )
        pi_state = update_pi(
            pi_matches, off_seeds=pi_off_seeds, def_seeds=pi_def_seeds
        )
        forms = rolling_form(form_matches, window=5)
        # فريق صاعد لم يلعب بعدُ أي مباراة: البذرة هي تقييمه الحالي
        for t_, v_ in elo_seeds.items():
            ratings.setdefault(t_, v_)
        for t_, v_ in pi_off_seeds.items():
            pi_state.off.setdefault(t_, v_)
        for t_, v_ in pi_def_seeds.items():
            pi_state.deff.setdefault(t_, v_)

        # Persist strengths
        season_row = conn.execute(
            "SELECT season FROM matches WHERE league_id=? ORDER BY utc_date DESC LIMIT 1",
            (lid,),
        ).fetchone()
        season = season_row["season"]
        standings_map, n_teams = load_standings_map(conn, lid, season)

        for tid, elo in ratings.items():
            conn.execute(
                "UPDATE teams SET elo=?, attack=?, defense=? WHERE id=?",
                (elo, model.attack.get(tid), model.defense.get(tid), tid),
            )
            conn.execute(
                """
                INSERT INTO team_strengths (id, league_id, team_id, season, attack, defense, home_adv, rho)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(league_id, team_id, season) DO UPDATE SET
                  attack=excluded.attack, defense=excluded.defense,
                  home_adv=excluded.home_adv, rho=excluded.rho
                """,
                (
                    str(uuid.uuid4()),
                    lid,
                    tid,
                    season,
                    model.attack.get(tid, 0.0),
                    model.defense.get(tid, 0.0),
                    model.home_advantage,
                    model.rho,
                ),
            )

        by_team: dict[str, list] = {}
        for tid, date, elo in history:
            by_team.setdefault(tid, []).append((date, elo))
        for tid, pts in by_team.items():
            step = max(len(pts) // 28, 1)
            for i, (date, elo) in enumerate(pts):
                if i % step == 0 or i == len(pts) - 1:
                    conn.execute(
                        "INSERT INTO elo_snapshots (id, team_id, date, elo) VALUES (?,?,?,?)",
                        (str(uuid.uuid4()), tid, date, elo),
                    )

        # --- Walk-forward calibration + metrics ---
        eval_n = min(200, max(len(train) // 5, 40))
        cut = len(train) - eval_n
        temp = 1.0
        temp_m = 1.0
        half = 0
        fitted_w = None
        eval_model = None
        eval_model_shots = None
        eval_model_true_xg = None
        temp_over25 = 1.0
        temp_btts = 1.0
        wf_ctx: dict[str, dict] = {}  # match_id → مدخلات التوقع عند نقطة الزمن الصادقة
        if cut >= 60:
            eval_model = fit_dixon_coles(
                obs[:cut], half_life_days=HALF_LIFE, league_id=lid
            )
            eval_obs_shots = build_obs_shots(train[:cut], obs[:cut])
            if eval_obs_shots:
                eval_model_shots = fit_dixon_coles(
                    eval_obs_shots, half_life_days=HALF_LIFE, league_id=lid
                )
            eval_obs_xg = build_obs_true_xg(train[:cut], obs[:cut])
            if eval_obs_xg:
                eval_model_true_xg = fit_dixon_coles(
                    eval_obs_xg, half_life_days=HALF_LIFE, league_id=lid
                )
            cut_full = len(elo_source) - eval_n

            comps = []  # احتمالات كل مكوّن لكل مباراة — لتعلّم الأوزان وإعادة المزج
            outcomes = []
            market_probs = []
            close_odds_list = []
            over_probs = []
            over_labels = []
            btts_probs = []
            btts_labels = []
            for k, m in enumerate(train[cut:]):
                if k and k % 50 == 0:
                    # إنعاش نموذجي DC داخل النافذة — بيانات حتى ما قبل هذه المباراة فقط
                    eval_model = fit_dixon_coles(
                        obs[: cut + k], half_life_days=HALF_LIFE, league_id=lid
                    )
                    prefix_shots = build_obs_shots(train[: cut + k], obs[: cut + k])
                    if prefix_shots:
                        eval_model_shots = fit_dixon_coles(
                            prefix_shots, half_life_days=HALF_LIFE, league_id=lid
                        )
                    prefix_xg = build_obs_true_xg(train[: cut + k], obs[: cut + k])
                    if prefix_xg:
                        eval_model_true_xg = fit_dixon_coles(
                            prefix_xg, half_life_days=HALF_LIFE, league_id=lid
                        )
                # حالات Elo/Pi/الفورم تتقدّم زمنياً حتى ما قبل هذه المباراة فقط
                elo_k, _ = update_elo(elo_matches[: cut_full + k], seeds=elo_seeds)
                pi_k = update_pi(
                    pi_matches[: cut_full + k],
                    off_seeds=pi_off_seeds,
                    def_seeds=pi_def_seeds,
                )
                forms_k = rolling_form(form_matches[: cut_full + k], window=5)
                # بذور الصاعدين تدخل قبل التوقع لا بعده — البذرة مشتقة من ما قبل
                # موسم الفريق فقط (نظيفة زمنياً)، وبهذا يتطابق ما تقيسه المقاييس
                # مع ما يُعرض رجعياً، وتتسق معاملة Pi مع معاملة Elo أدناه
                for t_, v_ in pi_off_seeds.items():
                    pi_k.off.setdefault(t_, v_)
                for t_, v_ in pi_def_seeds.items():
                    pi_k.deff.setdefault(t_, v_)
                odds = None
                if m["odds_home"] and m["odds_draw"] and m["odds_away"]:
                    odds = (
                        float(m["odds_home"]),
                        float(m["odds_draw"]),
                        float(m["odds_away"]),
                    )
                h, a = m["home_team_id"], m["away_team_id"]
                eh = elo_k.get(h, elo_seeds.get(h, 1500.0))
                ea = elo_k.get(a, elo_seeds.get(a, 1500.0))
                fh = forms_k.get(h, empty_form())
                fa = forms_k.get(a, empty_form())
                h2h_k = h2h_before(h, a, before_gi=cut_full + k)
                # Walk-forward: core stack only (no live weather/injuries) — published metrics stay honest
                ppda_h, ppda_hn = rolling_team_ppda(
                    train[: cut + k], h
                )
                ppda_a, ppda_an = rolling_team_ppda(
                    train[: cut + k], a
                )
                sharp = None
                if m["odds_sharp_home"] and m["odds_sharp_draw"] and m["odds_sharp_away"]:
                    sharp = (
                        float(m["odds_sharp_home"]),
                        float(m["odds_sharp_draw"]),
                        float(m["odds_sharp_away"]),
                    )
                close = None
                if m["odds_close_home"] and m["odds_close_draw"] and m["odds_close_away"]:
                    close = (
                        float(m["odds_close_home"]),
                        float(m["odds_close_draw"]),
                        float(m["odds_close_away"]),
                    )
                open_o = None
                if m["odds_open_home"] and m["odds_open_draw"] and m["odds_open_away"]:
                    open_o = (
                        float(m["odds_open_home"]),
                        float(m["odds_open_draw"]),
                        float(m["odds_open_away"]),
                    )
                pred = predict_match(
                    home=h,
                    away=a,
                    dc=eval_model,
                    elo_home=eh,
                    elo_away=ea,
                    pi=pi_k,
                    form_home=fh,
                    form_away=fa,
                    market_odds=odds,
                    temperature=1.0,
                    dc_shots=eval_model_shots,
                    dc_true_xg=eval_model_true_xg,
                    h2h_matches=h2h_k,
                    league_id=lid,
                    ppda_home=ppda_h,
                    ppda_away=ppda_a,
                    ppda_home_n=ppda_hn,
                    ppda_away_n=ppda_an,
                    form_matches=form_matches[: cut_full + k],
                    sharp_odds=sharp,
                    close_odds=close,
                    open_odds=open_o,
                    home_matches_7d=count_matches_in_window(
                        train[: cut + k], h, m["utc_date"]
                    ),
                    away_matches_7d=count_matches_in_window(
                        train[: cut + k], a, m["utc_date"]
                    ),
                    days_into_season=days_into_season(m["utc_date"], m["season"]),
                )
                comps.append(
                    {
                        "dc": pred["components"]["dixon_coles"]["p"],
                        "pi": pred["components"]["pi_ratings"]["p"],
                        "elo": pred["components"]["elo"]["p"],
                        "form": pred["components"]["form"]["p"],
                        "market": pred["components"]["market"]["p"],
                        "context": pred["components"].get("context", {}).get("p"),
                    }
                )
                hg, ag = int(m["home_goals"]), int(m["away_goals"])
                outcomes.append("H" if hg > ag else "A" if hg < ag else "D")
                market_probs.append(odds_to_probs(*odds) if odds else None)
                close_odds_list.append(close)
                over_probs.append(float(pred["p_over25"]))
                over_labels.append(1 if (hg + ag) >= 3 else 0)
                btts_probs.append(float(pred["p_btts_yes"]))
                btts_labels.append(1 if hg > 0 and ag > 0 else 0)
                wf_ctx[m["id"]] = {
                    "idx": cut + k,
                    "elo_home": eh,
                    "elo_away": ea,
                    "pi": pi_k,
                    "form_home": fh,
                    "form_away": fa,
                    "odds": odds,
                    "dc": eval_model,
                    "dc_shots": eval_model_shots,
                    "dc_true_xg": eval_model_true_xg,
                    "h2h": h2h_k,
                    "sharp": sharp,
                    "close": close,
                    "open": open_o,
                    "days_into_season": days_into_season(m["utc_date"], m["season"]),
                }

            # --- Stacking: أوزان الخلط تُتعلَّم من النصف الأول فقط (شطر معايرة T
            # نفسه)، فتبقى شريحة القياس نظيفة — ثم يُعاد مزج النافذة كلها بها
            half = eval_n // 2
            fitted_w = fit_weights(comps[:half], outcomes[:half])
            wf_probs = [blend_components(c, fitted_w) for c in comps]

            # حرارة العرض تُقدَّر على النافذة كاملة — مشروع للتوقعات الحية القادمة
            temp = fit_temperature(wf_probs, outcomes)

            # المقاييس المنشورة: T تُقدَّر على النصف الأول، والتقييم على الثاني فقط
            t_fit_ids = {m["id"] for m in train[cut : cut + half]}
            metric_ids = {m["id"] for m in train[cut + half :]}
            assert not (t_fit_ids & metric_ids), "calibration leakage: T-fit overlaps metric segment"
            temp_m = fit_temperature(wf_probs[:half], outcomes[:half])
            cal_probs = [apply_temperature(p, temp_m) for p in wf_probs[half:]]
            seg_outcomes = outcomes[half:]
            temp_over25 = fit_binary_temperature(over_probs[:half], over_labels[:half])
            temp_btts = fit_binary_temperature(btts_probs[:half], btts_labels[:half])
            metrics = summarize_with_closing(
                cal_probs, seg_outcomes, close_odds_list[half:]
            )
            all_probs.extend(cal_probs)
            all_outcomes.extend(seg_outcomes)
            if metrics.get("close_n", 0) > 0:
                print(
                    f"    CLV/close: n={int(metrics['close_n'])} "
                    f"nll_edge={metrics.get('nll_edge_vs_close', 0):+.4f}",
                    flush=True,
                )

            # --- Backtest سياسة القيمة على شريحة القياس النظيفة نفسها:
            # كيلي ربعي بوحدات ثابتة (بلا مضاعفة) — يجيب «هل +EV يربح فعلاً؟»
            bt = {"n_bets": 0, "hits": 0, "staked": 0.0, "pnl": 0.0}
            for p_cal, m_row, oc in zip(cal_probs, train[cut + half :], seg_outcomes):
                # تفضيل خط أسبق (open) للـbacktest عند التوفر
                oh = m_row["odds_open_home"] or m_row["odds_home"]
                od = m_row["odds_open_draw"] or m_row["odds_draw"]
                oa = m_row["odds_open_away"] or m_row["odds_away"]
                if not (oh and od and oa):
                    continue
                v = value_signal(
                    p_cal,
                    (float(oh), float(od), float(oa)),
                )
                if not v or not v["bet"]:
                    continue
                won = {"home": "H", "draw": "D", "away": "A"}[v["side"]] == oc
                bt["n_bets"] += 1
                bt["hits"] += int(won)
                bt["staked"] += v["stake"]
                bt["pnl"] += v["stake"] * (v["odds"] - 1.0) if won else -v["stake"]
            if bt["n_bets"]:
                value_backtests[lid] = bt
                print(
                    f"    value-bt: {bt['n_bets']} bets, {bt['hits']} hits, "
                    f"pnl={bt['pnl']:+.4f}u",
                    flush=True,
                )
            conn.execute(
                """
                INSERT INTO model_metrics
                  (id, league_id, window_label, n_matches, accuracy, brier, log_loss, rps, model_version, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    lid,
                    f"{MODEL_VERSION} · T={temp_m:.2f} · آخر {int(metrics['n'])}",
                    int(metrics["n"]),
                    metrics["accuracy"],
                    metrics["brier"],
                    metrics["log_loss"],
                    metrics["rps"],
                    MODEL_VERSION,
                    now_iso(),
                ),
            )
            wtxt = " ".join(f"{k}={v:.2f}" for k, v in fitted_w.items())
            print(
                f"    weights {wtxt}\n"
                f"    cal T={temp:.2f}/{temp_m:.2f} acc={metrics['accuracy']:.3f} "
                f"brier={metrics['brier']:.3f} rps={metrics['rps']:.4f}",
                flush=True,
            )

            # خط أساس السوق: احتمالات الأسعار بعد خصم الهامش، على نفس شريحة القياس
            mkt = [
                (p, o)
                for p, o in zip(market_probs[half:], seg_outcomes)
                if p is not None
            ]
            if mkt:
                mm = summarize([p for p, _ in mkt], [o for _, o in mkt])
                conn.execute(
                    """
                    INSERT INTO model_metrics
                      (id, league_id, window_label, n_matches, accuracy, brier, log_loss, rps, model_version, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        lid,
                        f"السوق · آخر {int(mm['n'])}",
                        int(mm["n"]),
                        mm["accuracy"],
                        mm["brier"],
                        mm["log_loss"],
                        mm["rps"],
                        "market",
                        now_iso(),
                    ),
                )
                print(
                    f"    market acc={mm['accuracy']:.3f} brier={mm['brier']:.3f} rps={mm['rps']:.4f}",
                    flush=True,
                )

        rand_profiles = {}
        gk_profiles = {}
        mgr_profiles = {}
        for m in finished:
            hid = m["home_team_id"]
            aid = m["away_team_id"]
            if hid not in rand_profiles:
                rand_profiles[hid] = compute_team_randomness_profile(hid, finished, window=25)
            if aid not in rand_profiles:
                rand_profiles[aid] = compute_team_randomness_profile(aid, finished, window=25)
            if hid not in gk_profiles:
                gk_profiles[hid] = compute_team_goalkeeper_profile(hid, finished, ratings_map=ratings, window=25)
            if aid not in gk_profiles:
                gk_profiles[aid] = compute_team_goalkeeper_profile(aid, finished, ratings_map=ratings, window=25)
            if hid not in mgr_profiles:
                mgr_profiles[hid] = compute_manager_profile(hid, finished, elo_rating=ratings.get(hid, 1500.0))
            if aid not in mgr_profiles:
                mgr_profiles[aid] = compute_manager_profile(aid, finished, elo_rating=ratings.get(aid, 1500.0))

        # --- Targets: real scheduled (full model) + last 12 finished (eval-time model) ---
        recent = conn.execute(
            """
            SELECT id, home_team_id, away_team_id, odds_home, odds_draw, odds_away, status
            FROM matches
            WHERE league_id=? AND status='FINISHED' AND home_goals IS NOT NULL
              AND source IN ('football-data.co.uk','uk-csv','football-data.org','wikipedia')
            ORDER BY utc_date DESC LIMIT 12
            """,
            (lid,),
        ).fetchall()

        ts = now_iso()

        def write_prediction(match_id: str, pred: dict, elo_h: float, elo_a: float) -> None:
            tops = top_scores(pred["matrix"], 8)
            market = pred["components"]["market"]["p"]
            analytics = {
                "version": MODEL_VERSION,
                # components has tuples — roundtrip to plain lists
                "components": json.loads(json.dumps(pred["components"], default=list)),
                "edge": pred["edge"],
                "value": pred["value"],
                "weights": pred["weights"],
                "xpts": [pred["xpts_home"], pred["xpts_away"]],
                "double_chance": pred.get("double_chance"),
                "randomness": pred.get("randomness"),
                "match_randomness_index": pred.get("match_randomness_index"),
                "stability_score": pred.get("stability_score"),
                "is_strictly_excluded": pred.get("is_strictly_excluded"),
            }
            conn.execute(
                """
                INSERT INTO predictions (
                  id, match_id, lambda_home, lambda_away,
                  p_home, p_draw, p_away, p_btts_yes, p_over25,
                  top_scores_json, score_matrix_json,
                  elo_home, elo_away, confidence, model_version,
                  created_at, updated_at,
                  analytics_json, xpts_home, xpts_away,
                  market_home, market_draw, market_away
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    str(uuid.uuid4()),
                    match_id,
                    pred["lambda_home"],
                    pred["lambda_away"],
                    pred["p_home"],
                    pred["p_draw"],
                    pred["p_away"],
                    pred["p_btts_yes"],
                    pred["p_over25"],
                    json.dumps(tops),
                    json.dumps(pred["matrix"].tolist()),
                    elo_h,
                    elo_a,
                    pred["confidence"],
                    MODEL_VERSION,
                    ts,
                    ts,
                    json.dumps(analytics, ensure_ascii=False),
                    pred["xpts_home"],
                    pred["xpts_away"],
                    market[0] if market else None,
                    market[1] if market else None,
                    market[2] if market else None,
                ),
            )

            # Snapshot: refresh while match not finished; lock after final whistle
            conn.execute(
                """
                INSERT INTO prediction_snapshots (
                  id, match_id, league_id, utc_date,
                  p_home, p_draw, p_away, p_btts_yes, p_over25,
                  lambda_home, lambda_away, elo_home, elo_away,
                  confidence, model_version, snapshot_at
                ) SELECT
                    ?, m.id, m.league_id, m.utc_date,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?
                FROM matches m WHERE m.id = ?
                ON CONFLICT(match_id) DO UPDATE SET
                  p_home = excluded.p_home,
                  p_draw = excluded.p_draw,
                  p_away = excluded.p_away,
                  p_btts_yes = excluded.p_btts_yes,
                  p_over25 = excluded.p_over25,
                  lambda_home = excluded.lambda_home,
                  lambda_away = excluded.lambda_away,
                  elo_home = excluded.elo_home,
                  elo_away = excluded.elo_away,
                  confidence = excluded.confidence,
                  model_version = excluded.model_version,
                  snapshot_at = excluded.snapshot_at
                WHERE (SELECT status FROM matches WHERE id = prediction_snapshots.match_id)
                      NOT IN ('FINISHED', 'AWARDED')
                """,
                (
                    str(uuid.uuid4()),
                    pred["p_home"],
                    pred["p_draw"],
                    pred["p_away"],
                    pred["p_btts_yes"],
                    pred["p_over25"],
                    pred["lambda_home"],
                    pred["lambda_away"],
                    elo_h,
                    elo_a,
                    pred["confidence"],
                    MODEL_VERSION,
                    ts,
                    match_id,
                ),
            )

        for t in targets:
            odds = None
            if t["odds_home"] and t["odds_draw"] and t["odds_away"]:
                odds = (
                    float(t["odds_home"]),
                    float(t["odds_draw"]),
                    float(t["odds_away"]),
                )
            enrich = load_live_enrichment(conn, t["id"], t["referee_name"])
            ppda_h, ppda_hn = rolling_team_ppda(finished, t["home_team_id"])
            ppda_a, ppda_an = rolling_team_ppda(finished, t["away_team_id"])
            cong = persist_congestion(
                conn, t["id"], t["home_team_id"], t["away_team_id"], t["utc_date"], finished
            )
            m2_ctx = build_match_context(
                home_id=t["home_team_id"],
                away_id=t["away_team_id"],
                utc_date=t["utc_date"],
                finished=finished,
                ratings=ratings,
                standings=standings_map,
                n_teams=n_teams,
                congestion=cong,
            )
            pred = predict_match(
                home=t["home_team_id"],
                away=t["away_team_id"],
                dc=model,
                elo_home=ratings.get(t["home_team_id"], 1500.0),
                elo_away=ratings.get(t["away_team_id"], 1500.0),
                pi=pi_state,
                form_home=forms.get(t["home_team_id"], empty_form()),
                form_away=forms.get(t["away_team_id"], empty_form()),
                market_odds=odds,
                temperature=temp,
                weights=fitted_w,
                dc_shots=model_shots,
                dc_true_xg=model_true_xg,
                h2h_matches=h2h_before(t["home_team_id"], t["away_team_id"]),
                league_id=lid,
                weather=enrich["weather"],
                home_missing=enrich["home_missing"],
                away_missing=enrich["away_missing"],
                referee_profile=enrich["referee_profile"],
                open_odds=enrich["open_odds"],
                sharp_odds=enrich.get("sharp_odds"),
                close_odds=enrich.get("close_odds"),
                days_into_season=enrich.get("days_into_season"),
                home_strength=enrich.get("home_strength"),
                away_strength=enrich.get("away_strength"),
                home_xi=enrich.get("home_xi"),
                away_xi=enrich.get("away_xi"),
                home_bench=enrich.get("home_bench"),
                away_bench=enrich.get("away_bench"),
                lineup_confirmed=bool(enrich.get("lineup_confirmed")),
                temp_over25=temp_over25,
                temp_btts=temp_btts,
                ppda_home=ppda_h,
                ppda_away=ppda_a,
                ppda_home_n=ppda_hn,
                ppda_away_n=ppda_an,
                form_matches=form_matches,
                home_randomness_stats=rand_profiles.get(t["home_team_id"]),
                away_randomness_stats=rand_profiles.get(t["away_team_id"]),
                home_gk_stats=gk_profiles.get(t["home_team_id"]),
                away_gk_stats=gk_profiles.get(t["away_team_id"]),
                home_manager_profile=mgr_profiles.get(t["home_team_id"]),
                away_manager_profile=mgr_profiles.get(t["away_team_id"]),
                **m2_ctx,
            )

            write_prediction(
                t["id"],
                pred,
                ratings.get(t["home_team_id"], 1500.0),
                ratings.get(t["away_team_id"], 1500.0),
            )

        # المباريات المنتهية تُعرض بوصفها «توقّعنا» — فتُولَّد من نموذج نقطة التقييم
        # (DC حتى cut، وحالات متقدمة زمنياً فقط)، لا من نموذج رأى نتائجها
        retro = 0
        for r in recent:
            ctx = wf_ctx.get(r["id"])
            if ctx is None:
                # منتهية خارج نافذة walk-forward — نتخطّاها بدل التسريب
                continue
            # حرارة العرض هنا temp_m لا temp: temp مُقدَّرة على النافذة كاملة ومنها
            # نتائج هذه المباريات نفسها — وtemp_m مقدَّرة على النصف الأول المنفصل،
            # فتتسق التوقعات الرجعية مع المقاييس المنشورة بلا تسريب
            if ctx["idx"] < cut + half:
                # داخل شطر معايرة T/الأوزان — أوزانه وحرارته رأت نتيجتها، فنتخطى
                # بدل إسقاط التدريب كله (assert سابقاً كان يقتل الدوريات جميعها)
                continue
            pred = predict_match(
                home=r["home_team_id"],
                away=r["away_team_id"],
                dc=ctx["dc"],
                elo_home=ctx["elo_home"],
                elo_away=ctx["elo_away"],
                pi=ctx["pi"],
                form_home=ctx["form_home"],
                form_away=ctx["form_away"],
                market_odds=ctx["odds"],
                temperature=temp_m,
                weights=fitted_w,
                dc_shots=ctx["dc_shots"],
                dc_true_xg=ctx.get("dc_true_xg"),
                h2h_matches=ctx["h2h"],
                league_id=lid,
                sharp_odds=ctx.get("sharp"),
                close_odds=ctx.get("close"),
                open_odds=ctx.get("open"),
                days_into_season=ctx.get("days_into_season"),
                temp_over25=temp_over25,
                temp_btts=temp_btts,
                home_randomness_stats=rand_profiles.get(r["home_team_id"]),
                away_randomness_stats=rand_profiles.get(r["away_team_id"]),
            )
            write_prediction(r["id"], pred, ctx["elo_home"], ctx["elo_away"])
            retro += 1
        print(f"    predictions: {len(targets)} scheduled + {retro} retro", flush=True)
        save_fit_params(conn, lid, fitted_w, temp, temp_over25, temp_btts)

    if all_probs:
        overall = summarize(all_probs, all_outcomes)
        conn.execute(
            """
            INSERT INTO model_metrics
              (id, league_id, window_label, n_matches, accuracy, brier, log_loss, rps, model_version, created_at)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                f"{MODEL_VERSION} كل الدوريات",
                int(overall["n"]),
                overall["accuracy"],
                overall["brier"],
                overall["log_loss"],
                overall["rps"],
                MODEL_VERSION,
                now_iso(),
            ),
        )
        cal_bins = calibration_bins(all_probs, all_outcomes)
        ece = expected_calibration_error(all_probs, all_outcomes)
        conn.execute(
            """
            INSERT INTO app_meta(key, value) VALUES('calibration_bins', ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value
            """,
            (
                json.dumps(
                    {
                        "bins": cal_bins,
                        "ece": ece,
                        "n_matches": len(all_probs),
                        "model_version": MODEL_VERSION,
                        "updated_at": now_iso(),
                    },
                    ensure_ascii=False,
                ),
            ),
        )
        print(
            f"overall acc={overall['accuracy']:.3f} brier={overall['brier']:.3f} "
            f"rps={overall['rps']:.4f} ece={ece:.4f} n={int(overall['n'])}"
        )

    # حذف غير مشروط أولاً: تدريب بلا رهانات يجب ألا يترك بطاقة backtest قديمة
    # تُنسب زوراً لختم «آخر تدريب» الجديد
    conn.execute("DELETE FROM app_meta WHERE key='value_backtest'")
    if value_backtests:
        total = {
            k: sum(bt[k] for bt in value_backtests.values())
            for k in ("n_bets", "hits", "staked", "pnl")
        }
        conn.execute(
            """
            INSERT INTO app_meta(key, value) VALUES('value_backtest', ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value
            """,
            (
                json.dumps(
                    {
                        "policy": "كيلي ربعي · نطاق EV ‏3–15%",
                        "total": total,
                        "leagues": value_backtests,
                    },
                    ensure_ascii=False,
                ),
            ),
        )
        print(
            f"value backtest: {total['n_bets']} bets, pnl={total['pnl']:+.4f}u "
            f"on {total['staked']:.4f}u staked"
        )

    conn.execute(
        """
        INSERT INTO app_meta(key, value) VALUES('last_fit', ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
        """,
        (now_iso(),),
    )
    conn.execute(
        """
        INSERT INTO app_meta(key, value) VALUES('model_version', ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
        """,
        (MODEL_VERSION,),
    )
    apply_model2_to_predictions(conn)
    conn.commit()
    conn.close()
    print("fit complete —", MODEL_VERSION)


if __name__ == "__main__":
    main()
