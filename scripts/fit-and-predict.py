#!/usr/bin/env python3
"""Pitchlab v2: Dixon-Coles + Pi-ratings + Elo + Form + Market + temperature calibration."""

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
MODEL_VERSION = "ensemble-v2"

from engine.calibrate import fit_temperature  # noqa: E402
from engine.dixon_coles import MatchObs, fit_dixon_coles  # noqa: E402
from engine.elo import EloMatch, update_elo  # noqa: E402
from engine.ensemble import predict_match  # noqa: E402
from engine.evaluate import summarize  # noqa: E402
from engine.form import FormMatch, TeamForm, rolling_form  # noqa: E402
from engine.pi_ratings import PiMatch, update_pi  # noqa: E402
from engine.dixon_coles import top_scores  # noqa: E402

DB_PATH = ROOT / "data" / "pitchlab.db"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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


def empty_form() -> TeamForm:
    return TeamForm(0, 0, 0, 0, 0, 0, 0)


def main() -> None:
    if not DB_PATH.exists():
        print("DB missing. Run: bun run sync")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    ensure_columns(conn)

    leagues = conn.execute("SELECT id, code, name_ar FROM leagues").fetchall()
    print(f"ensemble-v2 fitting {len(leagues)} leagues…")

    conn.execute("DELETE FROM predictions")
    conn.execute("DELETE FROM elo_snapshots")
    conn.execute("DELETE FROM team_strengths")
    conn.execute("DELETE FROM model_metrics")

    all_probs = []
    all_outcomes = []

    for league in leagues:
        lid = league["id"]
        finished = conn.execute(
            """
            SELECT id, home_team_id, away_team_id, home_goals, away_goals, utc_date,
                   odds_home, odds_draw, odds_away,
                   shots_home, shots_away, sot_home, sot_away, source
            FROM matches
            WHERE league_id = ? AND status = 'FINISHED'
              AND home_goals IS NOT NULL AND away_goals IS NOT NULL
            ORDER BY utc_date ASC
            """,
            (lid,),
        ).fetchall()
        if len(finished) < 50:
            print(f"  skip {lid}: {len(finished)} matches")
            continue

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
                    weight=1.0,
                )
            )

        print(f"  {lid}: DC on {len(obs)} · Elo/Pi on {len(elo_source)}…", flush=True)
        model = fit_dixon_coles(obs, half_life_days=HALF_LIFE)
        ratings, history = update_elo(elo_matches)
        pi_state = update_pi(pi_matches)
        forms = rolling_form(form_matches, window=5)

        # Persist strengths
        season = finished[-1]["utc_date"][:4]
        season_row = conn.execute(
            "SELECT season FROM matches WHERE league_id=? ORDER BY utc_date DESC LIMIT 1",
            (lid,),
        ).fetchone()
        season = season_row["season"] if season_row else season

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
        eval_n = min(100, max(len(train) // 5, 40))
        cut = len(train) - eval_n
        temp = 1.0
        if cut >= 60:
            eval_model = fit_dixon_coles(obs[:cut], half_life_days=HALF_LIFE)
            eval_elo, _ = update_elo(elo_matches[: len(elo_source) - eval_n])
            eval_pi = update_pi(pi_matches[: len(elo_source) - eval_n])
            # form up to cut using full history slice
            eval_forms = rolling_form(form_matches[: len(elo_source) - eval_n], window=5)

            raw_probs = []
            outcomes = []
            for m in train[cut:]:
                odds = None
                if m["odds_home"] and m["odds_draw"] and m["odds_away"]:
                    odds = (
                        float(m["odds_home"]),
                        float(m["odds_draw"]),
                        float(m["odds_away"]),
                    )
                pred = predict_match(
                    home=m["home_team_id"],
                    away=m["away_team_id"],
                    dc=eval_model,
                    elo_home=eval_elo.get(m["home_team_id"], 1500.0),
                    elo_away=eval_elo.get(m["away_team_id"], 1500.0),
                    pi=eval_pi,
                    form_home=eval_forms.get(m["home_team_id"], empty_form()),
                    form_away=eval_forms.get(m["away_team_id"], empty_form()),
                    market_odds=odds,
                    temperature=1.0,
                )
                raw_probs.append((pred["p_home"], pred["p_draw"], pred["p_away"]))
                hg, ag = int(m["home_goals"]), int(m["away_goals"])
                outcomes.append("H" if hg > ag else "A" if hg < ag else "D")

            temp = fit_temperature(raw_probs, outcomes)
            # re-apply temp for metrics
            from engine.calibrate import apply_temperature

            cal_probs = [apply_temperature(p, temp) for p in raw_probs]
            metrics = summarize(cal_probs, outcomes)
            all_probs.extend(cal_probs)
            all_outcomes.extend(outcomes)
            conn.execute(
                """
                INSERT INTO model_metrics
                  (id, league_id, window_label, n_matches, accuracy, brier, log_loss, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    lid,
                    f"ensemble-v2 · T={temp:.2f} · آخر {int(metrics['n'])}",
                    int(metrics["n"]),
                    metrics["accuracy"],
                    metrics["brier"],
                    metrics["log_loss"],
                    now_iso(),
                ),
            )
            print(
                f"    cal T={temp:.2f} acc={metrics['accuracy']:.3f} brier={metrics['brier']:.3f}",
                flush=True,
            )

        # --- Targets: real scheduled + last 12 finished ---
        targets = conn.execute(
            """
            SELECT id, home_team_id, away_team_id, odds_home, odds_draw, odds_away, status
            FROM matches
            WHERE league_id=?
              AND status IN ('SCHEDULED','TIMED','IN_PLAY','PAUSED')
              AND source NOT IN ('preview-holdout','synthetic','demo')
            ORDER BY utc_date ASC
            """,
            (lid,),
        ).fetchall()
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
        seen = {t["id"] for t in targets}
        for r in recent:
            if r["id"] not in seen:
                targets.append(r)
                seen.add(r["id"])

        ts = now_iso()
        for t in targets:
            odds = None
            if t["odds_home"] and t["odds_draw"] and t["odds_away"]:
                odds = (
                    float(t["odds_home"]),
                    float(t["odds_draw"]),
                    float(t["odds_away"]),
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
            )
            tops = top_scores(pred["matrix"], 8)
            market = pred["components"]["market"]["p"]
            analytics = {
                "version": MODEL_VERSION,
                "components": pred["components"],
                "edge": pred["edge"],
                "weights": pred["weights"],
                "xpts": [pred["xpts_home"], pred["xpts_away"]],
            }
            # Strip non-serializable / huge nested if needed — components has tuples
            analytics["components"] = json.loads(
                json.dumps(pred["components"], default=list)
            )

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
                    ratings.get(t["home_team_id"], 1500.0),
                    ratings.get(t["away_team_id"], 1500.0),
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
        print(f"    predictions: {len(targets)}", flush=True)

    if all_probs:
        overall = summarize(all_probs, all_outcomes)
        conn.execute(
            """
            INSERT INTO model_metrics
              (id, league_id, window_label, n_matches, accuracy, brier, log_loss, created_at)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                "ensemble-v2 كل الدوريات",
                int(overall["n"]),
                overall["accuracy"],
                overall["brier"],
                overall["log_loss"],
                now_iso(),
            ),
        )
        print(
            f"overall acc={overall['accuracy']:.3f} brier={overall['brier']:.3f} n={int(overall['n'])}"
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
    conn.commit()
    conn.close()
    print("fit complete —", MODEL_VERSION)


if __name__ == "__main__":
    main()
