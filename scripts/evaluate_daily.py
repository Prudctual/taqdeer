#!/usr/bin/env python3
"""تقييم يومي مقابل إغلاق بيناكل — خطة 006 §د/§هـ.

- daily_metrics: مقياسان منفصلان (coverage = كل المباريات، banker = «المحسوم» فقط) لكل لقطة
  (announce/lineup/close) ولكل دوري + 'all': Brier/log-loss/RPS/دقة، مقابل الإغلاق، CLV،
  حصة التعادل كأعلى توقع.
- banker_incidents: كل «محسوم» خسر → حكم أولي (variance/news/unknown) مع الأدلة.
- team_streaks: «الفائزون المتكررون» تُكسَر السلسلة بخسارة كمفضّل أو بانغلاق الفجوة.
- league_calibration: تحديث الشريحة، θ بالرفع فقط، وتحويل الدوري إلى watch عند فشل ≥70%.
- تحقيق آلي: رسالة Telegram للمشرف عند هبوط شريحة المحسوم تحت 70%.

الاستخدام: evaluate_daily.py [--days 45] [--no-telegram]
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
import urllib.request
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))

from engine.calibrate import DEFAULT_DEMARGIN, odds_to_probs  # noqa: E402
from engine.evaluate import summarize  # noqa: E402
from engine.schema import ensure_model_schema  # noqa: E402
from engine.timeline import CLOSING_SOURCE_PRIORITY  # noqa: E402

DB_PATH = ROOT / "data" / "taqdeer.db"
OUT_IDX = {"H": 0, "D": 1, "A": 2}
SNAPSHOT_KINDS = ("announce", "lineup", "close")
BANKER_FAIL_HIT = 0.70          # عتبة التحقيق الآلي (خطة 006 §د)
BANKER_MIN_N_FOR_STATUS = 30
THETA_STEP = 0.02
THETA_MAX = 0.75
STREAK_FAV_MIN = 0.50


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 📏 evaluate_daily: {msg}", flush=True)


def _load_env_file() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def outcome_of(hg: int, ag: int) -> str:
    return "H" if hg > ag else ("A" if ag > hg else "D")


def league_methods(conn: sqlite3.Connection) -> dict[str, str]:
    out: dict[str, str] = {}
    for r in conn.execute("SELECT league_id, demargin_method FROM league_calibration"):
        if r["demargin_method"]:
            out[r["league_id"]] = str(r["demargin_method"])
    return out


def load_closing(conn: sqlite3.Connection, match_ids: list[str]) -> dict[str, sqlite3.Row]:
    """أفضل خط إغلاق لكل مباراة بحسب أسبقية المصدر."""
    out: dict[str, sqlite3.Row] = {}
    if not match_ids:
        return out
    rank = {s: i for i, s in enumerate(CLOSING_SOURCE_PRIORITY)}
    for i in range(0, len(match_ids), 800):
        chunk = match_ids[i : i + 800]
        rows = conn.execute(
            f"""
            SELECT match_id, source, oh, od, oa
            FROM closing_lines
            WHERE match_id IN ({','.join('?' * len(chunk))}) AND oh IS NOT NULL AND od IS NOT NULL AND oa IS NOT NULL
            """,
            chunk,
        ).fetchall()
        for r in rows:
            cur = out.get(r["match_id"])
            if cur is None or rank.get(r["source"], 99) < rank.get(cur["source"], 99):
                out[r["match_id"]] = r
    return out


def collect_records(conn: sqlite3.Connection, since_date: str) -> list[dict]:
    """سجل لكل (مباراة منتهية × لقطة): pf، pick، النتيجة، إغلاق منزوع الهامش."""
    methods = league_methods(conn)
    matches = conn.execute(
        """
        SELECT id, league_id, utc_date, home_team_id, away_team_id, home_goals, away_goals
        FROM matches
        WHERE status IN ('FINISHED','AWARDED') AND home_goals IS NOT NULL AND away_goals IS NOT NULL
          AND substr(utc_date, 1, 10) >= ?
        ORDER BY utc_date ASC
        """,
        (since_date,),
    ).fetchall()
    if not matches:
        return []
    by_id = {m["id"]: m for m in matches}
    ids = list(by_id)
    closing = load_closing(conn, ids)

    snaps: dict[str, dict[str, sqlite3.Row]] = defaultdict(dict)
    for i in range(0, len(ids), 800):
        chunk = ids[i : i + 800]
        for r in conn.execute(
            f"""
            SELECT match_id, snapshot_kind, pf_home, pf_draw, pf_away, ps_home, ps_draw, ps_away,
                   pm_home, pm_draw, pm_away, pick, p_pick, is_banker, banker_tier, alpha, model_version
            FROM prediction_timeline WHERE match_id IN ({','.join('?' * len(chunk))})
            """,
            chunk,
        ):
            snaps[r["match_id"]][r["snapshot_kind"]] = r
    # مباريات بلا لقطة إعلان (ما قبل الخطة): صف predictions بوصفه «announce»
    missing = [mid for mid in ids if "announce" not in snaps[mid]]
    for i in range(0, len(missing), 800):
        chunk = missing[i : i + 800]
        for r in conn.execute(
            f"""
            SELECT match_id, p_home, p_draw, p_away, pm_home, pm_draw, pm_away,
                   market_home, market_draw, market_away, alpha, sieve_tier, model_version
            FROM predictions WHERE match_id IN ({','.join('?' * len(chunk))}) AND p_home IS NOT NULL
            """,
            chunk,
        ):
            p = (float(r["p_home"]), float(r["p_draw"]), float(r["p_away"]))
            k = max(range(3), key=lambda i_: p[i_])
            snaps[r["match_id"]]["announce"] = {
                "match_id": r["match_id"],
                "snapshot_kind": "announce",
                "pf_home": p[0], "pf_draw": p[1], "pf_away": p[2],
                "ps_home": r["market_home"], "ps_draw": r["market_draw"], "ps_away": r["market_away"],
                "pm_home": r["pm_home"], "pm_draw": r["pm_draw"], "pm_away": r["pm_away"],
                "pick": "HDA"[k], "p_pick": p[k],
                "is_banker": 1 if r["sieve_tier"] == "banker" else 0,
                "banker_tier": r["sieve_tier"], "alpha": r["alpha"], "model_version": r["model_version"],
            }

    records: list[dict] = []
    for mid, m in by_id.items():
        y = outcome_of(int(m["home_goals"]), int(m["away_goals"]))
        cl = closing.get(mid)
        ps_close = None
        if cl is not None:
            method = methods.get(m["league_id"], DEFAULT_DEMARGIN)
            try:
                ps_close = odds_to_probs(float(cl["oh"]), float(cl["od"]), float(cl["oa"]), method=method)
            except Exception:
                ps_close = None
        for kind, s in snaps.get(mid, {}).items():
            if s["pf_home"] is None:
                continue
            pf = (float(s["pf_home"]), float(s["pf_draw"]), float(s["pf_away"]))
            ps = None
            if s["ps_home"] is not None and s["ps_draw"] is not None and s["ps_away"] is not None:
                ps = (float(s["ps_home"]), float(s["ps_draw"]), float(s["ps_away"]))
            pick = s["pick"] or "HDA"[max(range(3), key=lambda i_: pf[i_])]
            records.append(
                {
                    "match_id": mid,
                    "league_id": m["league_id"],
                    "date": str(m["utc_date"])[:10],
                    "home": m["home_team_id"],
                    "away": m["away_team_id"],
                    "kind": kind,
                    "pf": pf,
                    "ps": ps,
                    "ps_close": ps_close,
                    "pick": pick,
                    "p_pick": float(s["p_pick"]) if s["p_pick"] is not None else pf[OUT_IDX[pick]],
                    "is_banker": int(s["is_banker"] or 0),
                    "outcome": y,
                    "model_version": s["model_version"],
                }
            )
    return records


def metrics_row(recs: list[dict]) -> dict | None:
    if not recs:
        return None
    probs = [r["pf"] for r in recs]
    ys = [r["outcome"] for r in recs]
    s = summarize(probs, ys)
    row = {
        "n": int(s["n"]),
        "brier": s["brier"],
        "log_loss": s["log_loss"],
        "rps": s["rps"],
        "accuracy": s["accuracy"],
        "close_brier": None,
        "close_log_loss": None,
        "close_rps": None,
        "skill_vs_close": None,
        "clv_mean": None,
        "clv_n": 0,
        "hit_rate": sum(1 for r in recs if r["pick"] == r["outcome"]) / len(recs),
        "stated_mean": sum(r["p_pick"] for r in recs) / len(recs),
        "draw_top_share": sum(1 for r in recs if r["pick"] == "D") / len(recs),
        "draw_actual_share": sum(1 for r in recs if r["outcome"] == "D") / len(recs),
    }
    with_close = [r for r in recs if r["ps_close"] is not None]
    if with_close:
        cs = summarize([r["ps_close"] for r in with_close], [r["outcome"] for r in with_close])
        ms = summarize([r["pf"] for r in with_close], [r["outcome"] for r in with_close])
        row["close_brier"] = cs["brier"]
        row["close_log_loss"] = cs["log_loss"]
        row["close_rps"] = cs["rps"]
        row["skill_vs_close"] = (1.0 - ms["brier"] / cs["brier"]) if cs["brier"] > 0 else None
        clv = [
            r["ps_close"][OUT_IDX[r["pick"]]] - r["ps"][OUT_IDX[r["pick"]]]
            for r in with_close
            if r["ps"] is not None
        ]
        if clv:
            row["clv_mean"] = sum(clv) / len(clv)
            row["clv_n"] = len(clv)
    return row


def write_daily_metrics(conn: sqlite3.Connection, records: list[dict], since_date: str) -> int:
    conn.execute("DELETE FROM daily_metrics WHERE date >= ?", (since_date,))
    groups: dict[tuple, list[dict]] = defaultdict(list)
    for r in records:
        for lid in (r["league_id"], "all"):
            groups[(r["date"], lid, "coverage", r["kind"])].append(r)
            if r["is_banker"]:
                groups[(r["date"], lid, "banker", r["kind"])].append(r)
    n = 0
    for (date, lid, scope, kind), recs in groups.items():
        row = metrics_row(recs)
        if row is None:
            continue
        conn.execute(
            """
            INSERT INTO daily_metrics (
              date, league_id, scope, snapshot_kind, n, brier, log_loss, rps, accuracy,
              close_brier, close_log_loss, close_rps, skill_vs_close, clv_mean, clv_n,
              hit_rate, stated_mean, draw_top_share, draw_actual_share, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(date, league_id, scope, snapshot_kind) DO UPDATE SET
              n=excluded.n, brier=excluded.brier, log_loss=excluded.log_loss, rps=excluded.rps,
              accuracy=excluded.accuracy, close_brier=excluded.close_brier, close_log_loss=excluded.close_log_loss,
              close_rps=excluded.close_rps, skill_vs_close=excluded.skill_vs_close, clv_mean=excluded.clv_mean,
              clv_n=excluded.clv_n, hit_rate=excluded.hit_rate, stated_mean=excluded.stated_mean,
              draw_top_share=excluded.draw_top_share, draw_actual_share=excluded.draw_actual_share,
              created_at=excluded.created_at
            """,
            (
                date, lid, scope, kind, row["n"], row["brier"], row["log_loss"], row["rps"], row["accuracy"],
                row["close_brier"], row["close_log_loss"], row["close_rps"], row["skill_vs_close"],
                row["clv_mean"], row["clv_n"], row["hit_rate"], row["stated_mean"],
                row["draw_top_share"], row["draw_actual_share"], now_iso(),
            ),
        )
        n += 1
    return n


def latest_banker_records(records: list[dict]) -> list[dict]:
    """آخر لقطة لكل مباراة كانت «محسوم» فيها (close > lineup > announce)."""
    order = {"close": 2, "lineup": 1, "announce": 0}
    best: dict[str, dict] = {}
    for r in records:
        if not r["is_banker"]:
            continue
        cur = best.get(r["match_id"])
        if cur is None or order[r["kind"]] > order[cur["kind"]]:
            best[r["match_id"]] = r
    return list(best.values())


def write_incidents(conn: sqlite3.Connection, records: list[dict]) -> int:
    by_match_kind: dict[tuple, dict] = {(r["match_id"], r["kind"]): r for r in records}
    n = 0
    for r in latest_banker_records(records):
        if r["pick"] == r["outcome"]:
            continue
        ann = by_match_kind.get((r["match_id"], "announce"))
        close_p = r["ps_close"][OUT_IDX[r["pick"]]] if r["ps_close"] else None
        ann_p = ann["ps"][OUT_IDX[r["pick"]]] if ann and ann["ps"] else None
        if close_p is not None and ann_p is not None and (ann_p - close_p) >= 0.08:
            verdict = "news"      # السوق تحرّك ضدنا بقوة قبل الصافرة — خبر لم نلتقطه
        elif close_p is not None and close_p >= 0.60:
            verdict = "variance"  # السوق أيضاً رأى المفضّل قوياً — خسارة عادية إحصائياً
        else:
            verdict = "unknown"
        evidence = {
            "kind": r["kind"],
            "pf": r["pf"],
            "ps_snapshot": r["ps"],
            "ps_close": r["ps_close"],
            "announce_market_pick_p": ann_p,
            "close_market_pick_p": close_p,
            "model_version": r["model_version"],
        }
        conn.execute(
            """
            INSERT INTO banker_incidents (id, match_id, league_id, date, stated_p, close_market_p, pick, outcome, verdict, evidence_json, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(match_id) DO UPDATE SET
              stated_p=excluded.stated_p, close_market_p=excluded.close_market_p, pick=excluded.pick,
              outcome=excluded.outcome, verdict=CASE WHEN banker_incidents.verdict='unknown' THEN excluded.verdict ELSE banker_incidents.verdict END,
              evidence_json=excluded.evidence_json
            """,
            (
                str(uuid.uuid4()), r["match_id"], r["league_id"], r["date"], r["p_pick"], close_p,
                r["pick"], r["outcome"], verdict, json.dumps(evidence, ensure_ascii=False), now_iso(),
            ),
        )
        n += 1
    return n


def update_team_streaks(conn: sqlite3.Connection, lookback_days: int = 240) -> int:
    """سلسلة «فائز متكرر» = انتصارات متتالية كمفضّل واضح (ps ≥ 0.50) — تُكسَر بخسارة/تعادل
    كمفضّل أو بانغلاق الفجوة (لم يعد مفضّلاً واضحاً)."""
    since = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).strftime("%Y-%m-%d")
    methods = league_methods(conn)
    rows = conn.execute(
        """
        SELECT id, league_id, utc_date, home_team_id, away_team_id, home_goals, away_goals,
               odds_close_home, odds_close_draw, odds_close_away,
               odds_sharp_home, odds_sharp_draw, odds_sharp_away
        FROM matches
        WHERE status IN ('FINISHED','AWARDED') AND home_goals IS NOT NULL AND away_goals IS NOT NULL
          AND substr(utc_date, 1, 10) >= ?
        ORDER BY utc_date ASC
        """,
        (since,),
    ).fetchall()
    state: dict[str, dict] = {}
    for m in rows:
        odds = None
        for pre in ("odds_close", "odds_sharp"):
            h, d, a = m[f"{pre}_home"], m[f"{pre}_draw"], m[f"{pre}_away"]
            if h and d and a and min(float(h), float(d), float(a)) > 1.01:
                odds = (float(h), float(d), float(a))
                break
        if odds is None:
            continue
        ps = odds_to_probs(*odds, method=methods.get(m["league_id"], DEFAULT_DEMARGIN))
        y = outcome_of(int(m["home_goals"]), int(m["away_goals"]))
        for team, side, p_fav in ((m["home_team_id"], "H", ps[0]), (m["away_team_id"], "A", ps[2])):
            st = state.setdefault(team, {"league_id": m["league_id"], "streak_len": 0, "last_win_at": None, "last_break_at": None, "break_reason": None})
            st["league_id"] = m["league_id"]
            if p_fav < STREAK_FAV_MIN:
                if st["streak_len"] > 0:
                    st["streak_len"] = 0
                    st["last_break_at"] = m["utc_date"]
                    st["break_reason"] = "gap_closed"
                continue
            if y == side:
                st["streak_len"] += 1
                st["last_win_at"] = m["utc_date"]
            else:
                st["streak_len"] = 0
                st["last_break_at"] = m["utc_date"]
                st["break_reason"] = "loss_as_favourite" if y != "D" else "draw_as_favourite"
    n = 0
    for team, st in state.items():
        conn.execute(
            """
            INSERT INTO team_streaks (team_id, league_id, streak_len, last_win_at, last_break_at, break_reason, updated_at)
            VALUES (?,?,?,?,?,?,?)
            ON CONFLICT(team_id) DO UPDATE SET
              league_id=excluded.league_id, streak_len=excluded.streak_len, last_win_at=excluded.last_win_at,
              last_break_at=excluded.last_break_at, break_reason=excluded.break_reason, updated_at=excluded.updated_at
            """,
            (team, st["league_id"], st["streak_len"], st["last_win_at"], st["last_break_at"], st["break_reason"], now_iso()),
        )
        n += 1
    return n


def update_league_calibration(conn: sqlite3.Connection, records: list[dict], window_days: int = 90) -> list[str]:
    """شريحة المحسوم والتغطية لكل دوري؛ θ بالرفع فقط؛ active → watch عند فشل الشريحة."""
    since = (datetime.now(timezone.utc) - timedelta(days=window_days)).strftime("%Y-%m-%d")
    alerts: list[str] = []
    leagues = {r["league_id"] for r in records}
    bankers_latest = [r for r in latest_banker_records(records) if r["date"] >= since]
    for lid in sorted(leagues):
        cov = [r for r in records if r["league_id"] == lid and r["kind"] == "announce" and r["date"] >= since]
        cov_close = [r for r in cov if r["ps_close"] is not None]
        bank = [r for r in bankers_latest if r["league_id"] == lid]
        bank_close = [r for r in bank if r["ps_close"] is not None]
        row = conn.execute("SELECT theta, status FROM league_calibration WHERE league_id=?", (lid,)).fetchone()
        theta = float(row["theta"]) if row and row["theta"] is not None else 0.60
        status = str(row["status"]) if row and row["status"] else "watch"
        reason = None
        slice_n = len(bank)
        slice_hit = (sum(1 for r in bank if r["pick"] == r["outcome"]) / slice_n) if slice_n else None
        slice_stated = (sum(r["p_pick"] for r in bank) / slice_n) if slice_n else None
        slice_brier = summarize([r["pf"] for r in bank], [r["outcome"] for r in bank])["brier"] if bank else None
        slice_close_brier = (
            summarize([r["ps_close"] for r in bank_close], [r["outcome"] for r in bank_close])["brier"] if bank_close else None
        )
        cov_brier = summarize([r["pf"] for r in cov_close], [r["outcome"] for r in cov_close])["brier"] if cov_close else None
        cov_close_brier = (
            summarize([r["ps_close"] for r in cov_close], [r["outcome"] for r in cov_close])["brier"] if cov_close else None
        )
        if slice_n >= BANKER_MIN_N_FOR_STATUS and slice_hit is not None and slice_stated is not None:
            if slice_hit < slice_stated - 0.05 and theta < THETA_MAX:
                theta = min(THETA_MAX, round(theta + THETA_STEP, 3))  # رفع فقط — لا تخفيض آلي
                reason = f"θ↑ {theta:.2f}: hit {slice_hit:.2f} < stated {slice_stated:.2f} − 0.05"
            if slice_hit < BANKER_FAIL_HIT and status == "active":
                status = "watch"
                reason = f"active→watch: banker hit {slice_hit:.2f} < {BANKER_FAIL_HIT:.2f} (n={slice_n})"
                alerts.append(f"{lid}: {reason}")
        conn.execute(
            """
            INSERT INTO league_calibration (league_id, theta, slice_n, slice_hit, slice_stated, slice_brier,
                                            slice_close_brier, coverage_brier, coverage_close_brier, status, status_reason, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(league_id) DO UPDATE SET
              theta=excluded.theta, slice_n=excluded.slice_n, slice_hit=excluded.slice_hit, slice_stated=excluded.slice_stated,
              slice_brier=excluded.slice_brier, slice_close_brier=excluded.slice_close_brier,
              coverage_brier=excluded.coverage_brier, coverage_close_brier=excluded.coverage_close_brier,
              status=excluded.status,
              status_reason=COALESCE(excluded.status_reason, league_calibration.status_reason),
              updated_at=excluded.updated_at
            """,
            (lid, theta, slice_n, slice_hit, slice_stated, slice_brier, slice_close_brier, cov_brier, cov_close_brier, status, reason, now_iso()),
        )
    return alerts


def telegram_admin(text: str) -> bool:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = (os.environ.get("TELEGRAM_ADMIN_CHAT_ID") or os.environ.get("TELEGRAM_CHAT_ID") or "").strip()
    if not token or not chat_id:
        return False
    try:
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=json.dumps({"chat_id": chat_id, "text": text[:3800]}).encode(),
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=15)
        return True
    except Exception as e:  # noqa: BLE001
        log(f"telegram failed: {e}")
        return False


def investigation_digest(conn: sqlite3.Connection, records: list[dict], alerts: list[str]) -> str | None:
    """تحقيق آلي عند هبوط آخر 30 «محسوم» تحت 70% أو عند تحويل دوري إلى watch."""
    bankers = sorted(latest_banker_records(records), key=lambda r: r["date"])[-30:]
    lines: list[str] = []
    if len(bankers) >= 15:
        hit = sum(1 for r in bankers if r["pick"] == r["outcome"]) / len(bankers)
        stated = sum(r["p_pick"] for r in bankers) / len(bankers)
        if hit < BANKER_FAIL_HIT:
            lines.append(f"⚠️ شريحة المحسوم (آخر {len(bankers)}): إصابة {hit:.0%} مقابل معلَن {stated:.0%}")
    lines.extend(f"⚠️ {a}" for a in alerts)
    if not lines:
        return None
    inc = conn.execute(
        """
        SELECT bi.date, bi.league_id, bi.pick, bi.outcome, bi.stated_p, bi.close_market_p, bi.verdict,
               ht.name_ar AS home, at.name_ar AS away
        FROM banker_incidents bi
        JOIN matches m ON m.id = bi.match_id
        JOIN teams ht ON ht.id = m.home_team_id
        JOIN teams at ON at.id = m.away_team_id
        ORDER BY bi.date DESC LIMIT 8
        """
    ).fetchall()
    if inc:
        lines.append("آخر الحوادث:")
        for r in inc:
            lines.append(
                f"• {r['date']} {r['home']}×{r['away']} ({r['league_id']}) اختيار {r['pick']}→{r['outcome']} "
                f"معلَن {float(r['stated_p'] or 0):.2f} إغلاق {float(r['close_market_p'] or 0):.2f} [{r['verdict']}]"
            )
    return "🔎 تقدير — تحقيق آلي في المحسوم\n" + "\n".join(lines)


def main() -> None:
    _load_env_file()
    days = 45
    if "--days" in sys.argv:
        try:
            days = int(sys.argv[sys.argv.index("--days") + 1])
        except (IndexError, ValueError):
            pass
    if not DB_PATH.exists():
        log("DB missing")
        sys.exit(1)
    conn = sqlite3.connect(DB_PATH, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 15000")
    ensure_model_schema(conn)
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    records = collect_records(conn, since)
    log(f"records: {len(records)} (since {since})")
    n_rows = write_daily_metrics(conn, records, since)
    n_inc = write_incidents(conn, records)
    n_streaks = update_team_streaks(conn)
    alerts = update_league_calibration(conn, records)
    conn.commit()
    log(f"daily_metrics rows={n_rows} · incidents={n_inc} · streaks={n_streaks} · alerts={len(alerts)}")
    digest = investigation_digest(conn, records, alerts)
    if digest:
        log(digest)
        if "--no-telegram" not in sys.argv:
            telegram_admin(digest)
    conn.close()


if __name__ == "__main__":
    main()
