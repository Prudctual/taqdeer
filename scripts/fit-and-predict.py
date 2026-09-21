#!/usr/bin/env python3
"""Taqdeer ensemble-v5: لبّ (DC + shots-DC + true-xG + Pi + Elo + Form + سياق) مُعاير،
ثم دمج لوجستي مع إغلاق السوق الحاد بوزن α لكل دوري، ثم غربال «المحسوم».

الخطة 006: السوق لا يدخل اللبّ؛ α=0 يعني «السوق وحده» حتى يثبت النموذج تفوّقه."""

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
MODEL_VERSION = "ensemble-v5"
DERBIES_PATH = ROOT / "scripts" / "data" / "derbies.json"

from engine.calibrate import (  # noqa: E402
    DEFAULT_DEMARGIN,
    apply_temperature,
    choose_demargin_method,
    fit_temperature,
    odds_to_probs,
)
from engine.dixon_coles import fit_dixon_coles, top_scores  # noqa: E402
from engine.draw_head import draw_features, fit_draw_head  # noqa: E402
from engine.elo import SeasonState, elo_home_adv_from_profile, shrunk_ratings, update_elo  # noqa: E402
from engine.ensemble import (  # noqa: E402
    DEFAULT_FLAGS,
    DEFAULT_WEIGHTS,
    blend_components,
    fit_weights,
    normalize_weights,
    predict_match,
    resolve_flags,
)
from engine.evaluate import (  # noqa: E402
    calibration_bins,
    expected_calibration_error,
    fit_binary_temperature,
    summarize,
    summarize_with_closing,
)
from engine.form import (  # noqa: E402
    rolling_form,
    second_half_impact,
    similar_opponent_form,
    venue_form,
)
from engine.league_profiles import get_league_profile  # noqa: E402
from engine.market_anchor import fit_alpha, logit_pool  # noqa: E402
from engine.pipeline import (  # noqa: E402
    H2HIndex,
    build_elo_matches,
    build_form_matches,
    build_obs,
    build_obs_shots,
    build_obs_true_xg,
    build_pi_matches,
    count_matches_in_window,
    days_into_season,
    dc_priors_from,
    empty_form,
    odds3,
    promoted_seeds,
    rolling_team_ppda,
    season_index,
)
from engine.schema import ensure_model_schema  # noqa: E402
from engine.sieve import DEFAULT_THETA, SieveContext, evaluate_banker  # noqa: E402
from engine.timeline import record_snapshot  # noqa: E402
from engine.logistics_engine import (  # noqa: E402
    classify_match_importance,
    count_midweek_in_window,
    travel_distance_km,
)
from engine.model2 import score_match, score_slate  # noqa: E402
from engine.referee_engine import evaluate_referee_impact  # noqa: E402
from engine.sharp_market import detect_steam  # noqa: E402
from engine.tactical_matchup import style_family  # noqa: E402
from engine.pi_ratings import shrunk_pi, update_pi  # noqa: E402
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


def default_fit_params() -> dict:
    return {
        "weights": dict(DEFAULT_WEIGHTS),
        "temperature": 1.0,
        "temp_over25": 1.0,
        "temp_btts": 1.0,
        # α = وزن النموذج في الدمج اللوجستي؛ 0 = السوق وحده حتى يثبت النموذج تفوّقه
        "alpha_announce": 0.0,
        "alpha_lineup": 0.0,
        "alpha_close": 0.0,
        "demargin_method": DEFAULT_DEMARGIN,
        "dc_half_life": HALF_LIFE,
        "draw_head": None,
        "flags": dict(DEFAULT_FLAGS),
    }


def load_fit_params(conn: sqlite3.Connection, league_id: str) -> dict:
    """أوزان اللبّ + الحرارات + α لكل لقطة + طريقة نزع الهامش + رأس التعادل + الأعلام."""
    params = default_fit_params()
    row = conn.execute(
        "SELECT value FROM app_meta WHERE key=?",
        (f"fit_params_{league_id}",),
    ).fetchone()
    if row and row["value"]:
        try:
            data = json.loads(row["value"])
            w = data.get("weights") or {}
            params["weights"] = normalize_weights({k: float(w.get(k, DEFAULT_WEIGHTS[k])) for k in DEFAULT_WEIGHTS})
            for key in ("temperature", "temp_over25", "temp_btts", "dc_half_life"):
                if data.get(key) is not None:
                    params[key] = float(data[key])
            for key in ("alpha_announce", "alpha_lineup", "alpha_close"):
                if data.get(key) is not None:
                    params[key] = min(1.0, max(0.0, float(data[key])))
            if data.get("demargin_method"):
                params["demargin_method"] = str(data["demargin_method"])
            if isinstance(data.get("draw_head"), list):
                params["draw_head"] = [float(x) for x in data["draw_head"]]
            if isinstance(data.get("flags"), dict):
                params["flags"] = resolve_flags(data["flags"])
            # وسم الحزام الطويل: يجعل الأوزان/الحرارة/رأس التعادل مُقدَّرة على مواسم
            # كاملة بدل النافذة القصيرة (تُصان عبر save_fit_params)
            if data.get("backtest_applied_at"):
                params["backtest_applied_at"] = str(data["backtest_applied_at"])
        except Exception:
            params = default_fit_params()
    # league_calibration (من الحزام الطويل) له الأسبقية على ملاءمة النافذة القصيرة
    cal = load_league_calibration(conn, league_id)
    for src_key, dst_key in (
        ("alpha_announce", "alpha_announce"),
        ("alpha_lineup", "alpha_lineup"),
        ("alpha_close", "alpha_close"),
        ("dc_half_life", "dc_half_life"),
        ("demargin_method", "demargin_method"),
    ):
        if cal.get(src_key) is not None:
            params[dst_key] = cal[src_key]
    return params


def save_fit_params(conn: sqlite3.Connection, league_id: str, params: dict) -> None:
    payload = {
        **params,
        "weights": normalize_weights(params.get("weights") or DEFAULT_WEIGHTS),
        "model_version": MODEL_VERSION,
        "updated_at": now_iso(),
    }
    conn.execute(
        """
        INSERT INTO app_meta(key, value) VALUES(?, ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
        """,
        (f"fit_params_{league_id}", json.dumps(payload, ensure_ascii=False)),
    )


def load_league_calibration(conn: sqlite3.Connection, league_id: str) -> dict:
    """صف league_calibration إن وُجد؛ وإلا watch/θ الافتراضية (لا محسوم قبل الدليل)."""
    try:
        row = conn.execute(
            """
            SELECT theta, alpha_announce, alpha_lineup, alpha_close, dc_half_life,
                   demargin_method, status
            FROM league_calibration WHERE league_id=?
            """,
            (league_id,),
        ).fetchone()
    except sqlite3.OperationalError:
        row = None
    if not row:
        return {"theta": DEFAULT_THETA, "status": "watch"}
    out = dict(row)
    out["theta"] = float(out.get("theta") or DEFAULT_THETA)
    out["status"] = out.get("status") or "watch"
    return out


_DERBIES_CACHE: dict[str, set[frozenset]] | None = None


def load_derbies() -> dict[str, set[frozenset]]:
    global _DERBIES_CACHE
    if _DERBIES_CACHE is not None:
        return _DERBIES_CACHE
    out: dict[str, set[frozenset]] = {}
    try:
        data = json.loads(DERBIES_PATH.read_text(encoding="utf-8"))
        for lid, pairs in (data.get("leagues") or data).items():
            if not isinstance(pairs, list):
                continue
            out[lid] = {frozenset(p) for p in pairs if isinstance(p, list) and len(p) == 2}
    except Exception:
        out = {}
    _DERBIES_CACHE = out
    return out


def is_derby(league_id: str, home_id: str, away_id: str) -> bool:
    return frozenset((home_id, away_id)) in load_derbies().get(league_id, set())


PILLAR_STRENGTH_MIN = 0.80


def favourite_pillar_missing(missing: list | None, strength: dict | None) -> bool:
    """عمود غائب = لاعب مؤكَّد الغياب قوته ≥ 0.80 في خريطة قوة الفريق (إن وُجدت)."""
    if not missing:
        return False
    if not strength:
        return False
    for r in missing:
        status = str(r.get("status") or "").lower()
        if status and status not in ("out", "injured", "suspended", "doubtful", "missing"):
            continue
        name = str(r.get("player_name") or "").strip().lower()
        if name and strength.get(name, 0.0) >= PILLAR_STRENGTH_MIN:
            return True
    return False


def season_game_counts(finished: list, season: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for m in finished:
        if str(m["season"] or "") != str(season or ""):
            continue
        counts[m["home_team_id"]] = counts.get(m["home_team_id"], 0) + 1
        counts[m["away_team_id"]] = counts.get(m["away_team_id"], 0) + 1
    return counts


def build_sieve(
    *,
    league_id: str,
    pred: dict,
    home_id: str,
    away_id: str,
    season: str,
    season_counts: dict[str, int],
    first_season: dict[str, str],
    days_in: float | None,
    calibration: dict,
    home_missing: list | None = None,
    away_missing: list | None = None,
    home_strength: dict | None = None,
    away_strength: dict | None = None,
) -> dict:
    pm = pred["pm"]
    fav_home = float(pm[0]) >= float(pm[2])
    fav_id, opp_id = (home_id, away_id) if fav_home else (away_id, home_id)
    fav_missing = favourite_pillar_missing(
        home_missing if fav_home else away_missing,
        home_strength if fav_home else away_strength,
    )
    ctx = SieveContext(
        pm=pm,
        ps=pred.get("ps"),
        pf=pred["pf"],
        p_draw_head=pred.get("p_draw_head"),
        league_status=str(calibration.get("status") or "watch"),
        theta=float(calibration.get("theta") or DEFAULT_THETA),
        days_into_season=int(days_in) if days_in is not None else None,
        is_derby=is_derby(league_id, home_id, away_id),
        favourite_pillar_missing=fav_missing,
        fav_is_promoted=first_season.get(fav_id) == season,
        fav_round=season_counts.get(fav_id, 0) + 1,
        fav_n_season=season_counts.get(fav_id, 0),
        opp_n_season=season_counts.get(opp_id, 0),
        market_available=pred.get("ps") is not None,
    )
    return evaluate_banker(ctx).to_dict()


def insert_prediction_row(
    conn: sqlite3.Connection,
    *,
    match_id: str,
    pred: dict,
    elo_h: float,
    elo_a: float,
    ts: str,
    sieve: dict | None,
    analytics_extra: dict | None = None,
) -> None:
    """صف predictions + prediction_snapshots (متوافق مع الواجهة) بأعمدة v5."""
    tops = top_scores(pred["matrix"], 8)
    market = pred["components"]["market"]["p"]
    pm = pred["pm"]
    analytics = {
        "version": MODEL_VERSION,
        # components has tuples — roundtrip to plain lists
        "components": json.loads(json.dumps(pred["components"], default=list)),
        "edge": pred["edge"],
        "value": pred["value"],
        "weights": pred["weights"],
        "xpts": [pred["xpts_home"], pred["xpts_away"]],
        "double_chance": pred.get("double_chance"),
        "x2_baseline": pred.get("x2_baseline"),
        "randomness": pred.get("randomness"),
        "match_randomness_index": pred.get("match_randomness_index"),
        "stability_score": pred.get("stability_score"),
        "is_strictly_excluded": pred.get("is_strictly_excluded"),
        "alpha": pred.get("alpha"),
        "gap_pick": pred.get("gap_pick"),
        "demargin": pred.get("demargin_method"),
        "sieve": sieve,
        **(analytics_extra or {}),
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
          market_home, market_draw, market_away,
          pm_home, pm_draw, pm_away, alpha, p_draw_head, sieve_tier, sieve_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
            float(pm[0]),
            float(pm[1]),
            float(pm[2]),
            float(pred.get("alpha") if pred.get("alpha") is not None else 1.0),
            pred.get("p_draw_head"),
            (sieve or {}).get("tier"),
            json.dumps(sieve, ensure_ascii=False) if sieve is not None else None,
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


def write_timeline_snapshot(
    conn: sqlite3.Connection,
    match_id: str,
    kind: str,
    pred: dict,
    sieve: dict | None,
    *,
    overwrite: bool = True,
) -> None:
    """لقطة announce/lineup في prediction_timeline — للمباريات غير المنتهية فقط."""
    st = conn.execute("SELECT status FROM matches WHERE id=?", (match_id,)).fetchone()
    if not st or st["status"] in ("FINISHED", "AWARDED"):
        return
    mk = pred["components"]["market"]
    record_snapshot(
        conn,
        match_id,
        kind,
        pm=pred["pm"],
        ps=pred.get("ps"),
        odds=mk.get("odds"),
        odds_source=mk.get("source"),
        alpha=float(pred.get("alpha") if pred.get("alpha") is not None else 1.0),
        model_version=MODEL_VERSION,
        sieve=sieve,
        pf=pred["pf"],
        overwrite=overwrite,
    )


def fit_prior_dc(train_rows: list, current_season: str, ref: datetime, half_life: float, league_id: str):
    """DC على ما قبل الموسم الحالي فقط → أسبقيات ridge للموسم الحالي (الصاعدون: متوسط المغادرين)."""
    prev_rows = [m for m in train_rows if str(m["season"] or "") != str(current_season or "")]
    if len(prev_rows) < 100:
        return None
    prev_model = fit_dixon_coles(build_obs(prev_rows, ref), half_life_days=half_life, league_id=league_id)
    priors = dc_priors_from(prev_model) or {}
    cur_teams = {m["home_team_id"] for m in train_rows if str(m["season"] or "") == str(current_season or "")}
    cur_teams |= {m["away_team_id"] for m in train_rows if str(m["season"] or "") == str(current_season or "")}
    dropped = [t for t in priors if t not in cur_teams]
    if dropped:
        pa = sum(priors[t][0] for t in dropped) / len(dropped)
        pdf = sum(priors[t][1] for t in dropped) / len(dropped)
        for t in cur_teams:
            priors.setdefault(t, (pa, pdf))
    return priors


def repredict_flagged(conn: sqlite3.Connection) -> int:
    """إعادة توقع ضيقة للمباريات المؤكَّد تشكيلتها — لقطة «lineup» بأوزان/α آخر fit."""
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
        params = load_fit_params(conn, lid)
        calibration = load_league_calibration(conn, lid)
        half_life = float(params.get("dc_half_life") or HALF_LIFE)
        season = targets[0]["season"] if targets else (finished[-1]["season"] if finished else "")

        obs = build_obs(train, ref)
        priors = fit_prior_dc(train, season, ref, half_life, lid)
        model = fit_dixon_coles(obs, half_life_days=half_life, league_id=lid, priors=priors)
        shots_obs = build_obs_shots(train, obs)
        model_shots = fit_dixon_coles(shots_obs, half_life_days=half_life, league_id=lid) if shots_obs else None
        xg_obs = build_obs_true_xg(train, obs)
        model_true_xg = fit_dixon_coles(xg_obs, half_life_days=half_life, league_id=lid) if xg_obs else None

        si = season_index(finished, targets)
        elo_matches = build_elo_matches(finished)
        pi_matches = build_pi_matches(finished)
        form_matches = build_form_matches(finished)
        elo_seeds, pi_off_seeds, pi_def_seeds = promoted_seeds(elo_matches, pi_matches, si)
        profile = get_league_profile(lid)
        elo_ha = elo_home_adv_from_profile(profile.home_advantage)
        season_state = SeasonState()
        ratings, _ = update_elo(elo_matches, home_adv=elo_ha, seeds=elo_seeds, season_state=season_state)
        for t_, v_ in elo_seeds.items():
            ratings.setdefault(t_, v_)
        ratings_used = shrunk_ratings(ratings, season_state)
        pi_state = update_pi(pi_matches, off_seeds=pi_off_seeds, def_seeds=pi_def_seeds)
        for t_, v_ in pi_off_seeds.items():
            pi_state.off.setdefault(t_, v_)
        for t_, v_ in pi_def_seeds.items():
            pi_state.deff.setdefault(t_, v_)
        pi_used = shrunk_pi(pi_state)
        forms = rolling_form(form_matches, window=5)
        h2h = H2HIndex(finished)
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
        standings_map, n_teams = load_standings_map(conn, lid, season)
        season_counts = season_game_counts(finished, season)
        for t in targets:
            odds = odds3(t, "odds")
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
                elo_home=ratings_used.get(t["home_team_id"], 1500.0),
                elo_away=ratings_used.get(t["away_team_id"], 1500.0),
                pi=pi_used,
                form_home=forms.get(t["home_team_id"], empty_form()),
                form_away=forms.get(t["away_team_id"], empty_form()),
                market_odds=odds,
                temperature=params["temperature"],
                weights=params["weights"],
                dc_shots=model_shots,
                dc_true_xg=model_true_xg,
                h2h_matches=h2h.before(t["home_team_id"], t["away_team_id"]),
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
                temp_over25=params["temp_over25"],
                temp_btts=params["temp_btts"],
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
                alpha=params["alpha_lineup"],
                demargin_method=params["demargin_method"],
                draw_head_coefs=params.get("draw_head"),
                flags=params.get("flags"),
                **m2_ctx,
            )
            sieve = build_sieve(
                league_id=lid,
                pred=pred,
                home_id=t["home_team_id"],
                away_id=t["away_team_id"],
                season=season,
                season_counts=season_counts,
                first_season=si.first_season,
                days_in=enrich.get("days_into_season"),
                calibration=calibration,
                home_missing=enrich["home_missing"],
                away_missing=enrich["away_missing"],
                home_strength=enrich.get("home_strength"),
                away_strength=enrich.get("away_strength"),
            )
            conn.execute("DELETE FROM predictions WHERE match_id=?", (t["id"],))
            insert_prediction_row(
                conn,
                match_id=t["id"],
                pred=pred,
                elo_h=ratings_used.get(t["home_team_id"], 1500.0),
                elo_a=ratings_used.get(t["away_team_id"], 1500.0),
                ts=ts,
                sieve=sieve,
                analytics_extra={"narrow_repredict": True},
            )
            write_timeline_snapshot(conn, t["id"], "lineup", pred, sieve)
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
        WHERE m.status IN ('FINISHED','FT','AET','PEN','COMPLETED','AWARDED')
          AND m.home_goals IS NOT NULL
          AND m.away_goals IS NOT NULL
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
    ensure_model_schema(conn)

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

    all_probs = []      # الناتج النهائي المنشور (pf) على شرائح القياس النظيفة
    all_outcomes = []

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

        params = load_fit_params(conn, lid)
        calibration = load_league_calibration(conn, lid)
        half_life = float(params.get("dc_half_life") or HALF_LIFE)
        method = str(params.get("demargin_method") or DEFAULT_DEMARGIN)
        flags = params.get("flags") or dict(DEFAULT_FLAGS)

        train = finished[-MAX_TRAIN:]
        ref = datetime.now(timezone.utc)
        elo_matches = build_elo_matches(finished)
        pi_matches = build_pi_matches(finished)
        form_matches = build_form_matches(finished)
        obs = build_obs(train, ref)
        obs_shots = build_obs_shots(train, obs)
        obs_true_xg = build_obs_true_xg(train, obs)
        h2h = H2HIndex(finished)

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
        # غادرت الدوري قبل موسمه — زمني بحت (engine.pipeline.promoted_seeds)
        si = season_index(finished, targets)
        elo_seeds, pi_off_seeds, pi_def_seeds = promoted_seeds(elo_matches, pi_matches, si)

        season_row = conn.execute(
            "SELECT season FROM matches WHERE league_id=? ORDER BY utc_date DESC LIMIT 1",
            (lid,),
        ).fetchone()
        season = season_row["season"]

        # طريقة نزع الهامش لكل دوري: تُختار من إغلاق بيناكل الحقيقي إن لم يحسمها الحزام الطويل
        if calibration.get("demargin_method") is None:
            close_pairs = [
                (odds3(m, "odds_close"), "H" if int(m["home_goals"]) > int(m["away_goals"]) else ("A" if int(m["away_goals"]) > int(m["home_goals"]) else "D"))
                for m in finished
            ]
            close_pairs = [(o, y) for o, y in close_pairs if o is not None]
            if len(close_pairs) >= 100:
                choice = choose_demargin_method([o for o, _ in close_pairs], [y for _, y in close_pairs])
                method = choice["method"]
                params["demargin_method"] = method

        print(
            f"  {lid}: DC on {len(obs)} (hl={half_life:.0f}) · shots-DC {'on' if obs_shots else 'off'} · xG-DC {'on' if obs_true_xg else 'off'} · Elo/Pi on {len(finished)} · demargin={method}…",
            flush=True,
        )
        priors = fit_prior_dc(train, season, ref, half_life, lid)
        model = fit_dixon_coles(obs, half_life_days=half_life, league_id=lid, priors=priors)
        model_shots = fit_dixon_coles(obs_shots, half_life_days=half_life, league_id=lid) if obs_shots else None
        model_true_xg = fit_dixon_coles(obs_true_xg, half_life_days=half_life, league_id=lid) if obs_true_xg else None
        profile = get_league_profile(lid)
        elo_ha = elo_home_adv_from_profile(profile.home_advantage)
        # انكماش بداية الموسم بدلاً من تضخيم K: التقييم المستخدم = w·بداية الموسم + (1−w)·الحالي
        season_state = SeasonState()
        ratings, history = update_elo(elo_matches, home_adv=elo_ha, seeds=elo_seeds, season_state=season_state)
        for t_, v_ in elo_seeds.items():
            ratings.setdefault(t_, v_)
        ratings_used = shrunk_ratings(ratings, season_state)
        pi_state = update_pi(pi_matches, off_seeds=pi_off_seeds, def_seeds=pi_def_seeds)
        for t_, v_ in pi_off_seeds.items():
            pi_state.off.setdefault(t_, v_)
        for t_, v_ in pi_def_seeds.items():
            pi_state.deff.setdefault(t_, v_)
        pi_used = shrunk_pi(pi_state)
        forms = rolling_form(form_matches, window=5)

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

        # --- Walk-forward قصير: أوزان/حرارة/α/رأس تعادل عند غياب الحزام الطويل + مقاييس منشورة ---
        eval_n = min(200, max(len(train) // 5, 40))
        cut = len(train) - eval_n
        temp = 1.0
        temp_m = 1.0
        half = 0
        fitted_w = dict(params["weights"])
        alpha_ann = float(params["alpha_announce"])
        alpha_close = float(params["alpha_close"])
        dh_coefs = params.get("draw_head")
        temp_over25 = 1.0
        temp_btts = 1.0
        wf_ctx: dict[str, dict] = {}  # match_id → مدخلات التوقع عند نقطة الزمن الصادقة
        if cut >= 60:
            cut_full = len(finished) - eval_n
            eval_model = None
            eval_model_shots = None
            eval_model_true_xg = None

            comps = []  # احتمالات مكوّنات اللبّ لكل مباراة — لتعلّم الأوزان وإعادة المزج
            temp_mults = []  # مضاعف الحرارة لكل صف (بداية الموسم/العشوائية) كما يطبّقه predict_match
            outcomes = []
            ps_sharp_list = []   # السوق الحاد عند الإعلان (PSH) منزوع الهامش
            ps_close_list = []   # إغلاق بيناكل (PSCH) منزوع الهامش
            close_odds_list = []
            lam_list = []
            over_probs = []
            over_labels = []
            btts_probs = []
            btts_labels = []
            for k, m in enumerate(train[cut:]):
                if eval_model is None or (k and k % 50 == 0):
                    # إنعاش DC داخل النافذة — بيانات حتى ما قبل هذه المباراة فقط،
                    # والاندثار نسبةً إلى تاريخ المباراة المقيَّمة لا إلى اليوم
                    ref_k = datetime.fromisoformat(str(m["utc_date"]).replace("Z", "+00:00"))
                    if ref_k.tzinfo is None:
                        ref_k = ref_k.replace(tzinfo=timezone.utc)
                    obs_k = build_obs(train[: cut + k], ref_k)
                    priors_k = fit_prior_dc(train[: cut + k], m["season"], ref_k, half_life, lid)
                    eval_model = fit_dixon_coles(obs_k, half_life_days=half_life, league_id=lid, priors=priors_k)
                    prefix_shots = build_obs_shots(train[: cut + k], obs_k)
                    eval_model_shots = (
                        fit_dixon_coles(prefix_shots, half_life_days=half_life, league_id=lid) if prefix_shots else None
                    )
                    prefix_xg = build_obs_true_xg(train[: cut + k], obs_k)
                    eval_model_true_xg = (
                        fit_dixon_coles(prefix_xg, half_life_days=half_life, league_id=lid) if prefix_xg else None
                    )
                # حالات Elo/Pi/الفورم تتقدّم زمنياً حتى ما قبل هذه المباراة فقط
                st_k = SeasonState()
                elo_k, _ = update_elo(elo_matches[: cut_full + k], home_adv=elo_ha, seeds=elo_seeds, season_state=st_k)
                elo_k = shrunk_ratings(elo_k, st_k)
                pi_k = update_pi(
                    pi_matches[: cut_full + k],
                    off_seeds=pi_off_seeds,
                    def_seeds=pi_def_seeds,
                )
                for t_, v_ in pi_off_seeds.items():
                    pi_k.off.setdefault(t_, v_)
                for t_, v_ in pi_def_seeds.items():
                    pi_k.deff.setdefault(t_, v_)
                pi_k = shrunk_pi(pi_k)
                forms_k = rolling_form(form_matches[: cut_full + k], window=5)
                odds = odds3(m, "odds")
                sharp = odds3(m, "odds_sharp")
                close = odds3(m, "odds_close")
                open_o = odds3(m, "odds_open")
                h, a = m["home_team_id"], m["away_team_id"]
                eh = elo_k.get(h, elo_seeds.get(h, 1500.0))
                ea = elo_k.get(a, elo_seeds.get(a, 1500.0))
                fh = forms_k.get(h, empty_form())
                fa = forms_k.get(a, empty_form())
                h2h_k = h2h.before(h, a, before_gi=cut_full + k)
                # Walk-forward: اللبّ فقط (لا طقس/غيابات حية) — المقاييس المنشورة تبقى صادقة
                ppda_h, ppda_hn = rolling_team_ppda(train[: cut + k], h)
                ppda_a, ppda_an = rolling_team_ppda(train[: cut + k], a)
                dis = days_into_season(m["utc_date"], m["season"])
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
                    home_matches_7d=count_matches_in_window(train[: cut + k], h, m["utc_date"]),
                    away_matches_7d=count_matches_in_window(train[: cut + k], a, m["utc_date"]),
                    days_into_season=dis,
                    alpha=1.0,
                    demargin_method=method,
                    flags=flags,
                )
                comps.append(
                    {
                        "dc": pred["components"]["dixon_coles"]["p"],
                        "pi": pred["components"]["pi_ratings"]["p"],
                        "elo": pred["components"]["elo"]["p"],
                        "form": pred["components"]["form"]["p"],
                        "context": pred["components"].get("context", {}).get("p"),
                    }
                )
                temp_mults.append(float(pred["components"].get("temp_mult", 1.0)))
                hg, ag = int(m["home_goals"]), int(m["away_goals"])
                outcomes.append("H" if hg > ag else "A" if hg < ag else "D")
                ps_sharp_list.append(odds_to_probs(*sharp, method=method) if sharp else None)
                ps_close_list.append(odds_to_probs(*close, method=method) if close else None)
                close_odds_list.append(close)
                lam_list.append((float(pred["lambda_home"]), float(pred["lambda_away"])))
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
                    "days_into_season": dis,
                }

            # --- Stacking ---
            # مع حزام طويل مُطبَّق: الأوزان/الحرارة/رأس التعادل مُقدَّرة على مواسم كاملة
            # (production_params) — النافذة القصيرة (n≈200) تُستعمل للقياس فقط، لا لإعادة التقدير.
            # بدونه: أوزان اللبّ من النصف الأول فقط (شطر معايرة T وα نفسه) فتبقى شريحة القياس نظيفة.
            half = eval_n // 2
            seeded = bool(params.get("backtest_applied_at")) and bool(params.get("weights"))
            if seeded:
                fitted_w = normalize_weights(params["weights"])
            else:
                fitted_w = fit_weights(comps[:half], outcomes[:half])
            wf_blend = [blend_components(c, fitted_w) for c in comps]

            t_fit_ids = {m["id"] for m in train[cut : cut + half]}
            metric_ids = {m["id"] for m in train[cut + half :]}
            assert not (t_fit_ids & metric_ids), "calibration leakage: T-fit overlaps metric segment"
            if seeded:
                temp = temp_m = float(params.get("temperature") or 1.0)
            else:
                # حرارة العرض تُقدَّر على النافذة كاملة — مشروع للتوقعات الحية القادمة؛
                # والمقاييس المنشورة بحرارة النصف الأول فقط
                temp = fit_temperature(wf_blend, outcomes, mults=temp_mults)
                temp_m = fit_temperature(wf_blend[:half], outcomes[:half], mults=temp_mults[:half])
            pm_all = [apply_temperature(p, temp_m * tm) for p, tm in zip(wf_blend, temp_mults)]

            # α لكل لقطة: من الحزام الطويل إن وُجد، وإلا من النصف الأول (bootstrap مقترن، وإلا 0)
            if calibration.get("alpha_announce") is None:
                pairs = [(p, s, o) for p, s, o in zip(pm_all[:half], ps_sharp_list[:half], outcomes[:half]) if s]
                if len(pairs) >= 30:
                    a_res = fit_alpha([p for p, _, _ in pairs], [s for _, s, _ in pairs], [o for _, _, o in pairs])
                    alpha_ann = float(a_res["alpha"])
                else:
                    alpha_ann = 0.0
            if calibration.get("alpha_close") is None:
                pairs_c = [(p, s, o) for p, s, o in zip(pm_all[:half], ps_close_list[:half], outcomes[:half]) if s]
                if len(pairs_c) >= 30:
                    a_res_c = fit_alpha([p for p, _, _ in pairs_c], [s for _, s, _ in pairs_c], [o for _, _, o in pairs_c])
                    alpha_close = float(a_res_c["alpha"])
                else:
                    alpha_close = 0.0

            # رأس التعادل الثنائي (للغربال فقط) — من الحزام الطويل إن وُجد، وإلا من النصف الأول
            if not (seeded and params.get("draw_head")):
                feats = [draw_features(lm[0], lm[1], p[1]) for lm, p in zip(lam_list[:half], pm_all[:half])]
                dh_fit = fit_draw_head(feats, [1 if o == "D" else 0 for o in outcomes[:half]])
                if dh_fit is not None:
                    dh_coefs = dh_fit

            cal_pm = pm_all[half:]
            seg_outcomes = outcomes[half:]
            cal_pf = [
                logit_pool(p, s, alpha_ann) if s else p
                for p, s in zip(cal_pm, ps_sharp_list[half:])
            ]
            temp_over25 = fit_binary_temperature(over_probs[:half], over_labels[:half])
            temp_btts = fit_binary_temperature(btts_probs[:half], btts_labels[:half])
            metrics = summarize_with_closing(cal_pf, seg_outcomes, close_odds_list[half:])
            metrics_core = summarize(cal_pm, seg_outcomes)
            all_probs.extend(cal_pf)
            all_outcomes.extend(seg_outcomes)
            if metrics.get("close_n", 0) > 0:
                print(
                    f"    CLV/close: n={int(metrics['close_n'])} "
                    f"nll_edge={metrics.get('nll_edge_vs_close', 0):+.4f}",
                    flush=True,
                )

            for label, mv, mm in (
                (f"{MODEL_VERSION} · α={alpha_ann:.2f} · T={temp_m:.2f} · آخر {int(metrics['n'])}", MODEL_VERSION, metrics),
                (f"{MODEL_VERSION} لبّ بلا سوق · آخر {int(metrics_core['n'])}", f"{MODEL_VERSION}-core", metrics_core),
            ):
                conn.execute(
                    """
                    INSERT INTO model_metrics
                      (id, league_id, window_label, n_matches, accuracy, brier, log_loss, rps, model_version, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        lid,
                        label,
                        int(mm["n"]),
                        mm["accuracy"],
                        mm["brier"],
                        mm["log_loss"],
                        mm["rps"],
                        mv,
                        now_iso(),
                    ),
                )
            wtxt = " ".join(f"{k}={v:.2f}" for k, v in fitted_w.items())
            print(
                f"    weights {wtxt}\n"
                f"    cal T={temp:.2f}/{temp_m:.2f} α={alpha_ann:.2f}/{alpha_close:.2f} "
                f"final acc={metrics['accuracy']:.3f} brier={metrics['brier']:.3f} rps={metrics['rps']:.4f} "
                f"| core brier={metrics_core['brier']:.3f}",
                flush=True,
            )

            # خط الأساس: إغلاق بيناكل الحقيقي (PSCH) منزوع الهامش — لا سعر متوسط ولا اختلاق
            mkt = [(p, o) for p, o in zip(ps_close_list[half:], seg_outcomes) if p is not None]
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
                        f"إغلاق بيناكل · آخر {int(mm['n'])}",
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
                    f"    close acc={mm['accuracy']:.3f} brier={mm['brier']:.3f} rps={mm['rps']:.4f} (n={int(mm['n'])})",
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
        season_counts = season_game_counts(finished, season)

        for t in targets:
            odds = odds3(t, "odds")
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
                elo_home=ratings_used.get(t["home_team_id"], 1500.0),
                elo_away=ratings_used.get(t["away_team_id"], 1500.0),
                pi=pi_used,
                form_home=forms.get(t["home_team_id"], empty_form()),
                form_away=forms.get(t["away_team_id"], empty_form()),
                market_odds=odds,
                temperature=temp,
                weights=fitted_w,
                dc_shots=model_shots,
                dc_true_xg=model_true_xg,
                h2h_matches=h2h.before(t["home_team_id"], t["away_team_id"]),
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
                alpha=alpha_ann,
                demargin_method=method,
                draw_head_coefs=dh_coefs,
                flags=flags,
                **m2_ctx,
            )
            sieve = build_sieve(
                league_id=lid,
                pred=pred,
                home_id=t["home_team_id"],
                away_id=t["away_team_id"],
                season=season,
                season_counts=season_counts,
                first_season=si.first_season,
                days_in=enrich.get("days_into_season"),
                calibration=calibration,
                home_missing=enrich["home_missing"],
                away_missing=enrich["away_missing"],
                home_strength=enrich.get("home_strength"),
                away_strength=enrich.get("away_strength"),
            )
            insert_prediction_row(
                conn,
                match_id=t["id"],
                pred=pred,
                elo_h=ratings_used.get(t["home_team_id"], 1500.0),
                elo_a=ratings_used.get(t["away_team_id"], 1500.0),
                ts=ts,
                sieve=sieve,
            )
            # لقطة الإعلان تُكتب مرة واحدة (أول نشر) — التحديثات اللاحقة لقطات lineup/close
            write_timeline_snapshot(conn, t["id"], "announce", pred, sieve, overwrite=False)

        # المباريات المنتهية تُعرض بوصفها «توقّعنا» — فتُولَّد من نموذج نقطة التقييم
        # (DC حتى cut، وحالات متقدمة زمنياً فقط)، لا من نموذج رأى نتائجها
        retro = 0
        for r in recent:
            ctx = wf_ctx.get(r["id"])
            if ctx is None:
                # منتهية خارج نافذة walk-forward — نتخطّاها بدل التسريب
                continue
            # حرارة العرض هنا temp_m لا temp، وα من النصف الأول — فتتسق التوقعات
            # الرجعية مع المقاييس المنشورة بلا تسريب
            if ctx["idx"] < cut + half:
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
                alpha=alpha_ann,
                demargin_method=method,
                draw_head_coefs=dh_coefs,
                flags=flags,
            )
            insert_prediction_row(
                conn,
                match_id=r["id"],
                pred=pred,
                elo_h=ctx["elo_home"],
                elo_a=ctx["elo_away"],
                ts=ts,
                sieve=None,
                analytics_extra={"retro": True},
            )
            retro += 1
        print(f"    predictions: {len(targets)} scheduled + {retro} retro", flush=True)
        params.update(
            {
                "weights": fitted_w,
                "temperature": float(temp),
                "temp_over25": float(temp_over25),
                "temp_btts": float(temp_btts),
                "alpha_announce": float(alpha_ann),
                "alpha_lineup": float(calibration.get("alpha_lineup") if calibration.get("alpha_lineup") is not None else alpha_ann),
                "alpha_close": float(alpha_close),
                "demargin_method": method,
                "dc_half_life": float(half_life),
                "draw_head": list(dh_coefs) if dh_coefs is not None else None,
                "flags": resolve_flags(flags),
            }
        )
        save_fit_params(conn, lid, params)

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

    # سياسة القيمة (EV) خارج المنتج (خطة 006 §و) — تُحذف بطاقتها إن بقيت من إصدار سابق
    conn.execute("DELETE FROM app_meta WHERE key='value_backtest'")

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
