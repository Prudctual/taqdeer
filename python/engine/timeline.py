"""لقطات التوقع الزمنية: announce / lineup / close.

كل لقطة تحفظ: لبّ النموذج pm، سعر السوق المنزوع الهامش ps، الأودز الخام، الناتج المدمج pf،
α، الاختيار والفجوة، وحكم الغربال. التقييم النهائي يكون مقابل لقطة close.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Mapping, Sequence

from .market_anchor import logit_pool

SNAPSHOT_KINDS = ("announce", "lineup", "close")
CLOSING_SOURCE_PRIORITY = (
    "pinnacle-csv",
    "pinnacle-live",
    "betfair-csv",
    "avg-live",
    "avg-csv",
    "max-csv",
    "b365-csv",
)


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _argmax_pick(p: Sequence[float]) -> tuple[str, float, float]:
    labels = ("H", "D", "A")
    order = sorted(range(3), key=lambda i: -float(p[i]))
    top, second = order[0], order[1]
    return labels[top], float(p[top]), float(p[top]) - float(p[second])


def record_snapshot(
    conn: sqlite3.Connection,
    match_id: str,
    kind: str,
    *,
    pm: Sequence[float],
    ps: Sequence[float] | None,
    odds: Sequence[float] | None,
    odds_source: str | None,
    alpha: float,
    model_version: str,
    sieve: Mapping | None = None,
    pf: Sequence[float] | None = None,
    overwrite: bool = True,
) -> dict:
    """يكتب لقطة (أو يحدّثها إن overwrite). يعيد القاموس المكتوب."""
    if kind not in SNAPSHOT_KINDS:
        raise ValueError(f"snapshot kind غير معروف: {kind}")
    final = tuple(pf) if pf is not None else logit_pool(pm, ps, alpha)
    pick, p_pick, gap = _argmax_pick(final)
    tier = (sieve or {}).get("tier")
    is_banker = 1 if tier == "banker" else 0
    row = {
        "id": str(uuid.uuid4()),
        "match_id": match_id,
        "snapshot_kind": kind,
        "snapshot_at": now_iso(),
        "pm_home": float(pm[0]), "pm_draw": float(pm[1]), "pm_away": float(pm[2]),
        "ps_home": float(ps[0]) if ps else None,
        "ps_draw": float(ps[1]) if ps else None,
        "ps_away": float(ps[2]) if ps else None,
        "odds_home": float(odds[0]) if odds else None,
        "odds_draw": float(odds[1]) if odds else None,
        "odds_away": float(odds[2]) if odds else None,
        "odds_source": odds_source,
        "pf_home": float(final[0]), "pf_draw": float(final[1]), "pf_away": float(final[2]),
        "alpha": float(alpha),
        "pick": pick, "p_pick": p_pick, "gap_pick": gap,
        "is_banker": is_banker,
        "banker_tier": tier,
        "sieve_json": json.dumps(sieve, ensure_ascii=False) if sieve is not None else None,
        "model_version": model_version,
    }
    conflict = (
        """
        ON CONFLICT(match_id, snapshot_kind) DO UPDATE SET
          snapshot_at=excluded.snapshot_at,
          pm_home=excluded.pm_home, pm_draw=excluded.pm_draw, pm_away=excluded.pm_away,
          ps_home=excluded.ps_home, ps_draw=excluded.ps_draw, ps_away=excluded.ps_away,
          odds_home=excluded.odds_home, odds_draw=excluded.odds_draw, odds_away=excluded.odds_away,
          odds_source=excluded.odds_source,
          pf_home=excluded.pf_home, pf_draw=excluded.pf_draw, pf_away=excluded.pf_away,
          alpha=excluded.alpha, pick=excluded.pick, p_pick=excluded.p_pick, gap_pick=excluded.gap_pick,
          is_banker=excluded.is_banker, banker_tier=excluded.banker_tier,
          sieve_json=excluded.sieve_json, model_version=excluded.model_version
        """
        if overwrite
        else "ON CONFLICT(match_id, snapshot_kind) DO NOTHING"
    )
    cols = list(row.keys())
    conn.execute(
        f"INSERT INTO prediction_timeline ({','.join(cols)}) VALUES ({','.join('?' * len(cols))}) {conflict}",
        [row[c] for c in cols],
    )
    return row


def has_snapshot(conn: sqlite3.Connection, match_id: str, kind: str) -> bool:
    r = conn.execute(
        "SELECT 1 FROM prediction_timeline WHERE match_id=? AND snapshot_kind=?",
        (match_id, kind),
    ).fetchone()
    return r is not None


def best_closing_line(conn: sqlite3.Connection, match_id: str) -> sqlite3.Row | None:
    """أفضل خط إغلاق 1X2 متاح حسب أولوية المصدر (بيناكل CSV ثم بيناكل الحي…)."""
    rows = conn.execute(
        """
        SELECT source, oh, od, oa, ou_line, ou_over, ou_under, ah_line, ah_home, ah_away, captured_at
        FROM closing_lines WHERE match_id=? AND oh IS NOT NULL AND od IS NOT NULL AND oa IS NOT NULL
        """,
        (match_id,),
    ).fetchall()
    if not rows:
        return None
    rank = {s: i for i, s in enumerate(CLOSING_SOURCE_PRIORITY)}
    rows.sort(key=lambda r: rank.get(r["source"] if isinstance(r, sqlite3.Row) else r[0], 99))
    return rows[0]
