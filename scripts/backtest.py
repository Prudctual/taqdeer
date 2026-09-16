#!/usr/bin/env python3
"""حزام walk-forward طويل + ablation لكل دوري — خطة 006 §1.1/1.2/2.4.

الاستخدام:
  backtest.py [--league pl,pd] [--refit 10] [--half-life 140] [--ablation]
              [--half-life-grid] [--workers 4] [--apply] [--tag name]

- افتراضياً: المتغيّر base فقط (سريع). --ablation يشغّل كل أعلام السياق التاريخية.
- --half-life-grid يجرّب {90,120,150,200,270} على base.
- --apply يكتب league_calibration (α لكل لقطة، half-life، demargin، status) وبذور fit_params.
- التقرير JSON في data/reports/backtest-<tag>.json.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))

from engine.backtest import (  # noqa: E402
    BacktestConfig,
    Record,
    ablation_table,
    default_ablation_variants,
    evaluate_variant,
    run_league,
)
from engine.calibrate import choose_demargin_method  # noqa: E402
from engine.ensemble import DEFAULT_FLAGS  # noqa: E402
from engine.pipeline import odds3, outcome_of  # noqa: E402
from engine.schema import ensure_model_schema  # noqa: E402

DB_PATH = ROOT / "data" / "taqdeer.db"
REPORTS = ROOT / "data" / "reports"
HALF_LIFE_GRID = (90.0, 120.0, 150.0, 200.0, 270.0)
MIN_SEASON = "2022"   # بداية التقييم الطويل (المواسم قبلها تدريب فقط)


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def load_rows(conn: sqlite3.Connection, league_id: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT id, home_team_id, away_team_id, home_goals, away_goals, utc_date, season,
               odds_home, odds_draw, odds_away,
               odds_open_home, odds_open_draw, odds_open_away,
               odds_close_home, odds_close_draw, odds_close_away,
               odds_sharp_home, odds_sharp_draw, odds_sharp_away,
               shots_home, shots_away, sot_home, sot_away,
               fouls_home, fouls_away, corners_home, corners_away,
               xg_true_home, xg_true_away, ppda_home, ppda_away
        FROM matches
        WHERE league_id = ? AND status = 'FINISHED'
          AND home_goals IS NOT NULL AND away_goals IS NOT NULL
          AND source NOT IN ('preview-holdout','synthetic','demo')
        ORDER BY utc_date ASC
        """,
        (league_id,),
    ).fetchall()


def load_closing(conn: sqlite3.Connection, league_id: str) -> dict[str, dict]:
    """خطوط الإغلاق الحادة (O/U, AH): بيناكل أولاً، وإن غاب فبورصة Betfair."""
    rows = conn.execute(
        """
        SELECT c.match_id, c.source, c.oh, c.od, c.oa, c.ou_line, c.ou_over, c.ou_under, c.ah_line, c.ah_home, c.ah_away
        FROM closing_lines c JOIN matches m ON m.id = c.match_id
        WHERE m.league_id = ? AND c.source IN ('pinnacle-csv', 'betfair-csv')
        """,
        (league_id,),
    ).fetchall()
    out: dict[str, dict] = {}
    for r in rows:
        cur = out.get(r["match_id"])
        if cur is None or (cur["source"] != "pinnacle-csv" and r["source"] == "pinnacle-csv"):
            out[r["match_id"]] = dict(r)
    return out


def first_eval_season(rows: list[sqlite3.Row]) -> str | None:
    seasons = sorted({str(r["season"] or "") for r in rows})
    for s in seasons:
        if s[:4] >= MIN_SEASON:
            return s
    return seasons[1] if len(seasons) > 1 else None


def _rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict]:
    return [dict(r) for r in rows]


def worker(league_id: str, rows: list[dict], closing: dict, cfg_kwargs: dict, variants: dict) -> tuple[str, float, list[Record]]:
    cfg = BacktestConfig(league_id=league_id, **cfg_kwargs)
    t0 = time.time()
    recs = run_league(rows, closing, cfg, variants, progress=log)
    return league_id, cfg.half_life, recs


def choose_demargin(rows: list[sqlite3.Row]) -> str:
    pairs = [(odds3(r, "odds_close"), outcome_of(int(r["home_goals"]), int(r["away_goals"]))) for r in rows]
    pairs = [(o, y) for o, y in pairs if o is not None]
    if len(pairs) < 100:
        return "power"
    return choose_demargin_method([o for o, _ in pairs], [y for _, y in pairs])["method"]


def league_summary(res: dict) -> str:
    if res.get("n", 0) == 0:
        return "  (no eval records)"
    vs_c = res.get("vs_close") or {}
    vs_s = res.get("vs_sharp") or {}
    bs = res.get("banker_slice") or {}
    parts = [
        f"  n={res['n']} core brier={res['model']['brier']:.4f} ll={res['model']['log_loss']:.4f} acc={res['model']['accuracy']:.3f}",
        f"  draw-top share model={res['draw_top_share_model']:.3f} final={res['draw_top_share_final']:.3f} actual={res['draw_actual_share']:.3f}",
    ]
    if vs_c:
        d = vs_c["d_log_loss"]
        f = vs_c.get("final_d_log_loss", {})
        parts.append(
            f"  vs CLOSE (n={vs_c['n']}): market brier={vs_c['market']['brier']:.4f} ll={vs_c['market']['log_loss']:.4f} · "
            f"Δll core={d['mean']:+.4f} [{d['ci95'][0]:+.4f},{d['ci95'][1]:+.4f}] · "
            f"Δll final(α OOS)={f.get('mean', 0):+.4f} [{f.get('ci95', [0, 0])[0]:+.4f},{f.get('ci95', [0, 0])[1]:+.4f}] · skill={vs_c['skill_brier']:+.4f}"
        )
    if vs_s:
        d = vs_s["d_log_loss"]
        parts.append(f"  vs SHARP@announce (n={vs_s['n']}): market ll={vs_s['market']['log_loss']:.4f} · Δll core={d['mean']:+.4f} [{d['ci95'][0]:+.4f},{d['ci95'][1]:+.4f}]")
    for tag, lp in (("latest", res.get("latest_params")), ("production", res.get("production_params"))):
        if not lp:
            continue
        w = " ".join(f"{k}={v:.2f}" for k, v in (lp.get("weights") or {}).items())
        parts.append(
            f"  {tag}: n={lp.get('n_train')} T={lp.get('temperature', 1):.2f} α_sharp={lp['alpha_sharp']['alpha']:.2f} "
            f"α_close={lp['alpha_close']['alpha']:.2f} weights {w}"
        )
    grid = res.get("theta_grid") or []
    if grid:
        parts.append(
            "  θ grid: " + " · ".join(
                f"{g['theta']:.2f}→n={g['n']} hit={g['hit']:.2f}" if g["hit"] is not None else f"{g['theta']:.2f}→n=0"
                for g in grid
            )
        )
    if bs.get("n"):
        parts.append(
            f"  BANKER slice @θ={bs['theta']:.2f}: n={bs['n']} ({bs['share_of_matches']:.1%}) hit={bs['hit_rate']:.3f} stated={bs['stated_mean']:.3f} "
            f"brier={bs['brier']:.4f} close_brier={bs['close_brier']:.4f}"
        )
    else:
        parts.append(f"  BANKER slice @θ={bs.get('theta', 0.6):.2f}: none")
    ou = res.get("over25") or {}
    if ou.get("n"):
        parts.append(f"  O/U 2.5: n={ou['n']} model brier={ou.get('brier')} market brier={ou.get('market_brier')} use_market_only={ou.get('use_market_only')}")
    return "\n".join(parts)


def decide_status(res: dict) -> tuple[str, str]:
    """active إذا لم يخسر الناتج النهائي أمام الإغلاق (CI) وكانت الشريحة معايَرة؛ وإلا watch."""
    vs_c = res.get("vs_close") or {}
    if not vs_c or vs_c.get("n", 0) < 300:
        return "watch", "closing pairs < 300"
    f = vs_c.get("final_d_log_loss") or {}
    ci = f.get("ci95") or [0.0, 0.0]
    if ci[1] < -0.002:
        return "watch", f"final loses to close: Δll {f.get('mean', 0):+.4f} ci [{ci[0]:+.4f},{ci[1]:+.4f}]"
    bs = res.get("banker_slice") or {}
    if bs.get("n", 0) >= 30 and bs["hit_rate"] < bs["stated_mean"] - 0.08:
        return "watch", f"banker slice under-calibrated: hit {bs['hit_rate']:.2f} < stated {bs['stated_mean']:.2f} − 0.08"
    if bs.get("n", 0) < 20:
        return "watch", f"banker slice too small (n={bs.get('n', 0)})"
    return "active", f"final ≈/≥ close (Δll {f.get('mean', 0):+.4f}), banker hit {bs['hit_rate']:.2f} vs stated {bs['stated_mean']:.2f} (n={bs['n']})"


def apply_results(conn: sqlite3.Connection, per_league: dict[str, dict], demargin: dict[str, str], best_hl: dict[str, float]) -> None:
    ensure_model_schema(conn)
    now = datetime.now(timezone.utc).isoformat()
    for lid, res in per_league.items():
        if res.get("n", 0) == 0:
            continue
        # معاملات الإنتاج مُقدَّرة على كل السجلات؛ آخر موسم احتياطاً
        lp = res.get("production_params") or res.get("latest_params") or {}
        a_ann = float((lp.get("alpha_sharp") or {}).get("alpha", 0.0))
        a_close = float((lp.get("alpha_close") or {}).get("alpha", 0.0))
        status, reason = decide_status(res)
        bs = res.get("banker_slice") or {}
        vs_c = res.get("vs_close") or {}
        row = conn.execute("SELECT theta, status FROM league_calibration WHERE league_id=?", (lid,)).fetchone()
        theta_cur = float(row["theta"]) if row and row["theta"] is not None else 0.60
        # θ بالرفع فقط: لا تُخفَّض آلياً حتى لو أوصى الحزام بأقل
        theta = max(theta_cur, float(res.get("theta_recommended") or theta_cur))
        conn.execute(
            """
            INSERT INTO league_calibration (league_id, theta, alpha_announce, alpha_lineup, alpha_close, dc_half_life,
                                            demargin_method, slice_n, slice_hit, slice_stated, slice_brier, slice_close_brier,
                                            coverage_brier, coverage_close_brier, status, status_reason, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(league_id) DO UPDATE SET
              theta=MAX(league_calibration.theta, excluded.theta),
              alpha_announce=excluded.alpha_announce, alpha_lineup=excluded.alpha_lineup, alpha_close=excluded.alpha_close,
              dc_half_life=excluded.dc_half_life, demargin_method=excluded.demargin_method,
              slice_n=excluded.slice_n, slice_hit=excluded.slice_hit, slice_stated=excluded.slice_stated,
              slice_brier=excluded.slice_brier, slice_close_brier=excluded.slice_close_brier,
              coverage_brier=excluded.coverage_brier, coverage_close_brier=excluded.coverage_close_brier,
              status=excluded.status, status_reason=excluded.status_reason, updated_at=excluded.updated_at
            """,
            (
                lid, theta, a_ann, a_ann, a_close, best_hl.get(lid, 140.0), demargin.get(lid, "power"),
                bs.get("n", 0), bs.get("hit_rate"), bs.get("stated_mean"), bs.get("brier"), bs.get("close_brier"),
                (vs_c.get("model") or {}).get("brier"), (vs_c.get("market") or {}).get("brier"),
                status, f"backtest {now[:10]}: {reason}", now,
            ),
        )
        # بذور fit_params: أوزان/حرارة/رأس تعادل آخر موسم من الحزام الطويل
        key = f"fit_params_{lid}"
        cur = conn.execute("SELECT value FROM app_meta WHERE key=?", (key,)).fetchone()
        params = {}
        if cur and cur["value"]:
            try:
                params = json.loads(cur["value"])
            except Exception:
                params = {}
        params.update(
            {
                "weights": lp.get("weights") or params.get("weights"),
                "temperature": lp.get("temperature", params.get("temperature", 1.0)),
                "alpha_announce": a_ann,
                "alpha_lineup": a_ann,
                "alpha_close": a_close,
                "demargin_method": demargin.get(lid, "power"),
                "dc_half_life": best_hl.get(lid, 140.0),
                "draw_head": lp.get("draw_head"),
                "backtest_applied_at": now,
            }
        )
        conn.execute(
            "INSERT INTO app_meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, json.dumps(params, ensure_ascii=False)),
        )
        log(f"  applied {lid}: status={status} θ={theta:.2f} α={a_ann:.2f}/{a_close:.2f} hl={best_hl.get(lid, 140.0):.0f} demargin={demargin.get(lid)} — {reason}")
    conn.commit()


def apply_saved_report(conn: sqlite3.Connection, path: Path) -> None:
    """يعيد تطبيق تقرير حزام محفوظ (أفضل half-life لكل دوري) على league_calibration/fit_params."""
    report = json.loads(path.read_text(encoding="utf-8"))
    per_league: dict[str, dict] = {}
    demargin: dict[str, str] = {}
    best_hl: dict[str, float] = {}
    for lid, entry in (report.get("leagues") or {}).items():
        hl = entry.get("best_half_life")
        if hl is None:
            continue
        res = (entry.get("half_life") or {}).get(str(hl))
        if not res:
            continue
        per_league[lid] = res
        demargin[lid] = entry.get("demargin") or "power"
        best_hl[lid] = float(hl)
    log(f"apply report {path.name} ({report.get('tag')}) → {len(per_league)} leagues")
    apply_results(conn, per_league, demargin, best_hl)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--league", default="")
    ap.add_argument("--refit", type=int, default=10)
    ap.add_argument("--half-life", type=float, default=140.0)
    ap.add_argument("--ablation", action="store_true")
    ap.add_argument("--half-life-grid", action="store_true")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--tag", default=datetime.now().strftime("%Y%m%d-%H%M"))
    ap.add_argument("--theta", type=float, default=0.60)
    ap.add_argument("--apply-report", default="", help="تطبيق تقرير محفوظ (JSON) بلا إعادة تشغيل الحزام")
    args = ap.parse_args()

    if not DB_PATH.exists():
        print("DB missing. Run: bun run sync")
        sys.exit(1)
    conn = sqlite3.connect(DB_PATH, timeout=15.0)
    conn.row_factory = sqlite3.Row
    ensure_model_schema(conn)

    if args.apply_report:
        apply_saved_report(conn, Path(args.apply_report))
        conn.close()
        return
    leagues = [r["id"] for r in conn.execute("SELECT id FROM leagues ORDER BY id")]
    if args.league:
        wanted = {x.strip() for x in args.league.split(",") if x.strip()}
        leagues = [l for l in leagues if l in wanted]

    jobs = []
    demargin: dict[str, str] = {}
    for lid in leagues:
        rows = load_rows(conn, lid)
        if len(rows) < 400:
            log(f"skip {lid}: {len(rows)} rows")
            continue
        closing = load_closing(conn, lid)
        demargin[lid] = choose_demargin(rows)
        eval_from = first_eval_season(rows)
        variants = default_ablation_variants() if args.ablation else {"base": dict(DEFAULT_FLAGS)}
        hls = HALF_LIFE_GRID if args.half_life_grid else (args.half_life,)
        for hl in hls:
            cfg_kwargs = dict(refit_every=args.refit, half_life=hl, eval_from_season=eval_from, demargin=demargin[lid])
            jobs.append((lid, _rows_to_dicts(rows), closing, cfg_kwargs, variants))
        log(f"{lid}: {len(rows)} rows · closing lines {len(closing)} · eval from {eval_from} · demargin={demargin[lid]}")
    conn.close()

    results: dict[str, dict[float, list[Record]]] = {}
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=max(1, args.workers)) as ex:
        futs = [ex.submit(worker, *j) for j in jobs]
        for fut in as_completed(futs):
            lid, hl, recs = fut.result()
            results.setdefault(lid, {})[hl] = recs
    log(f"all leagues done in {time.time() - t0:.0f}s")

    report: dict = {"tag": args.tag, "created_at": datetime.now(timezone.utc).isoformat(), "refit_every": args.refit, "leagues": {}}
    per_league_best: dict[str, dict] = {}
    best_hl: dict[str, float] = {}
    for lid, by_hl in results.items():
        entry: dict = {"half_life": {}, "demargin": demargin.get(lid)}
        best = None
        for hl, recs in sorted(by_hl.items()):
            res = evaluate_variant(recs, "base", theta=args.theta)
            entry["half_life"][str(hl)] = res
            score = res.get("model", {}).get("log_loss", 9.0) if res.get("n") else 9.0
            if best is None or score < best[0]:
                best = (score, hl, res)
            log(f"== {lid} · half-life {hl:.0f}")
            print(league_summary(res), flush=True)
            if args.ablation:
                abl = ablation_table(recs, "base")
                entry.setdefault("ablation", {})[str(hl)] = abl
                for a in abl:
                    log(
                        f"   ablation {a['variant']:<28} Δll={a['d_log_loss']:+.4f} [{a['d_log_loss_ci95'][0]:+.4f},{a['d_log_loss_ci95'][1]:+.4f}] "
                        f"Δbrier={a['d_brier']:+.4f} → {a['verdict']}"
                    )
        if best is not None:
            best_hl[lid] = best[1]
            per_league_best[lid] = best[2]
            entry["best_half_life"] = best[1]
        report["leagues"][lid] = entry

    REPORTS.mkdir(parents=True, exist_ok=True)
    out = REPORTS / f"backtest-{args.tag}.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
    log(f"report → {out}")

    if args.apply:
        conn = sqlite3.connect(DB_PATH, timeout=15.0)
        conn.row_factory = sqlite3.Row
        apply_results(conn, per_league_best, demargin, best_hl)
        conn.close()


if __name__ == "__main__":
    main()
