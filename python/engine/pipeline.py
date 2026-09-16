"""بناء مدخلات النموذج من صفوف القاعدة — مشترك بين fit-and-predict.py والحزام الطويل backtest.py.

كل دالة هنا نقية زمنياً: لا تقرأ إلا ما قبل نقطة الزمن المطلوبة.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Sequence, Tuple

from .dixon_coles import DixonColesResult, MatchObs
from .elo import EloMatch, update_elo
from .form import FormMatch, TeamForm
from .pi_ratings import PiMatch, update_pi
from .xg_engine import compute_advanced_metrics

Odds3 = Tuple[float, float, float]


def row_get(m: Any, key: str, default: Any = None) -> Any:
    """قراءة آمنة من sqlite3.Row أو dict."""
    try:
        v = m[key]
    except (KeyError, IndexError):
        return default
    return default if v is None else v


def outcome_of(hg: int, ag: int) -> str:
    return "H" if hg > ag else ("A" if ag > hg else "D")


def parse_utc(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def days_into_season(utc_date: str | None, season: str | None) -> float | None:
    dt = parse_utc(utc_date)
    if dt is None:
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


def count_matches_in_window(rows: Sequence[Any], team_id: str, as_of_utc: str, *, days: float = 7.0) -> float:
    """عدد مباريات الفريق في النافذة السابقة لتاريخ as_of (ازدحام)."""
    ref = parse_utc(as_of_utc)
    if ref is None:
        return 0.0
    n = 0
    for m in reversed(rows):
        if m["home_team_id"] != team_id and m["away_team_id"] != team_id:
            continue
        dt = parse_utc(m["utc_date"])
        if dt is None:
            continue
        delta = (ref - dt).total_seconds() / 86400.0
        if 0 < delta <= days:
            n += 1
        elif delta > days + 1:
            break  # الصفوف مرتبة زمنياً — لا حاجة للمتابعة
    return float(n)


def odds3(m: Any, prefix: str) -> Odds3 | None:
    h = row_get(m, f"{prefix}_home")
    d = row_get(m, f"{prefix}_draw")
    a = row_get(m, f"{prefix}_away")
    if not h or not d or not a:
        return None
    try:
        vals = (float(h), float(d), float(a))
    except (TypeError, ValueError):
        return None
    if min(vals) <= 1.01:
        return None
    return vals


def empty_form() -> TeamForm:
    return TeamForm(0, 0, 0, 0, 0, 0, 0)


# --- PPDA proxy ---
def row_ppda(m: Any, side: str) -> float | None:
    key = f"ppda_{side}"
    v = row_get(m, key)
    if v is not None:
        try:
            return float(v)
        except (TypeError, ValueError):
            pass
    hg, ag = row_get(m, "home_goals"), row_get(m, "away_goals")
    if hg is None or ag is None:
        return None
    adv = compute_advanced_metrics(
        home_goals=int(hg),
        away_goals=int(ag),
        shots_home=row_get(m, "shots_home"),
        shots_away=row_get(m, "shots_away"),
        sot_home=row_get(m, "sot_home"),
        sot_away=row_get(m, "sot_away"),
        fouls_home=row_get(m, "fouls_home"),
        fouls_away=row_get(m, "fouls_away"),
        corners_home=row_get(m, "corners_home"),
        corners_away=row_get(m, "corners_away"),
    )
    v = adv.get(f"ppda_{side}")
    return float(v) if v is not None else None


def rolling_team_ppda(rows: Sequence[Any], team_id: str, *, last_n: int = 12) -> tuple[float | None, int]:
    vals: list[float] = []
    for m in reversed(rows):
        if m["home_team_id"] == team_id:
            v = row_ppda(m, "home")
        elif m["away_team_id"] == team_id:
            v = row_ppda(m, "away")
        else:
            continue
        if v is not None:
            vals.append(v)
        if len(vals) >= last_n:
            break
    if not vals:
        return None, 0
    return sum(vals) / len(vals), len(vals)


# --- Builders ---
def build_elo_matches(rows: Sequence[Any]) -> List[EloMatch]:
    return [
        EloMatch(
            home=m["home_team_id"],
            away=m["away_team_id"],
            home_goals=int(m["home_goals"]),
            away_goals=int(m["away_goals"]),
            date=m["utc_date"],
            season=str(row_get(m, "season", "") or ""),
        )
        for m in rows
    ]


def build_pi_matches(rows: Sequence[Any]) -> List[PiMatch]:
    return [
        PiMatch(
            home=m["home_team_id"],
            away=m["away_team_id"],
            home_goals=int(m["home_goals"]),
            away_goals=int(m["away_goals"]),
            season=str(row_get(m, "season", "") or ""),
        )
        for m in rows
    ]


def build_form_matches(rows: Sequence[Any]) -> List[FormMatch]:
    return [
        FormMatch(
            home=m["home_team_id"],
            away=m["away_team_id"],
            home_goals=int(m["home_goals"]),
            away_goals=int(m["away_goals"]),
            shots_home=row_get(m, "shots_home"),
            shots_away=row_get(m, "shots_away"),
            sot_home=row_get(m, "sot_home"),
            sot_away=row_get(m, "sot_away"),
            date=m["utc_date"],
        )
        for m in rows
    ]


def build_obs(rows: Sequence[Any], ref: datetime) -> List[MatchObs]:
    out: List[MatchObs] = []
    for m in rows:
        dt = parse_utc(m["utc_date"]) or ref
        days = max((ref - dt).total_seconds() / 86400.0, 0.0)
        out.append(
            MatchObs(
                home=m["home_team_id"],
                away=m["away_team_id"],
                home_goals=int(m["home_goals"]),
                away_goals=int(m["away_goals"]),
                days_ago=days,
            )
        )
    return out


def build_obs_shots(rows: Sequence[Any], obs_prefix: Sequence[MatchObs], *, min_n: int = 300) -> List[MatchObs] | None:
    """أهداف زائفة من التسديدات (بديل xG عملي) لـDC موازٍ — يحتاج ≥ min_n مباراة بتسديدات."""

    def shot_value(shots: float, sot: float) -> float:
        return 0.30 * sot + 0.04 * max(shots - sot, 0.0)

    sh = [
        m
        for m in rows
        if row_get(m, "shots_home") is not None
        and row_get(m, "sot_home") is not None
        and row_get(m, "shots_away") is not None
        and row_get(m, "sot_away") is not None
    ]
    if len(sh) < min_n:
        return None
    tot_g = sum(int(m["home_goals"]) + int(m["away_goals"]) for m in sh)
    tot_v = sum(
        shot_value(float(m["shots_home"]), float(m["sot_home"]))
        + shot_value(float(m["shots_away"]), float(m["sot_away"]))
        for m in sh
    )
    scale = tot_g / tot_v if tot_v > 0 else 1.0

    def pseudo(g: int, shots, sot) -> float:
        if shots is None or sot is None:
            return float(g)
        return 0.5 * g + 0.5 * scale * shot_value(float(shots), float(sot))

    return [
        MatchObs(
            home=o.home,
            away=o.away,
            home_goals=pseudo(int(m["home_goals"]), row_get(m, "shots_home"), row_get(m, "sot_home")),
            away_goals=pseudo(int(m["away_goals"]), row_get(m, "shots_away"), row_get(m, "sot_away")),
            days_ago=o.days_ago,
        )
        for o, m in zip(obs_prefix, rows)
    ]


def build_obs_true_xg(rows: Sequence[Any], obs_prefix: Sequence[MatchObs], *, min_n: int = 200) -> List[MatchObs] | None:
    """DC موازٍ على xG تتبّعي (Understat) — يحتاج ≥ min_n مباراة بـ xg_true."""
    keyed: List[MatchObs] = []
    for o, m in zip(obs_prefix, rows):
        xh = row_get(m, "xg_true_home")
        xa = row_get(m, "xg_true_away")
        if xh is None or xa is None:
            continue
        try:
            xh_f, xa_f = float(xh), float(xa)
        except (TypeError, ValueError):
            continue
        if xh_f < 0.01 or xa_f < 0.01:
            continue
        keyed.append(MatchObs(home=o.home, away=o.away, home_goals=xh_f, away_goals=xa_f, days_ago=o.days_ago))
    if len(keyed) < min_n:
        return None
    return keyed


def dc_priors_from(model: DixonColesResult | None) -> Dict[str, Tuple[float, float]] | None:
    """أسبقيات DC للملاءمة التالية: تقدير كل فريق في الملاءمة السابقة (الموسم السابق فعلياً)."""
    if model is None:
        return None
    return {t: (model.attack.get(t, 0.0), model.defense.get(t, 0.0)) for t in model.teams}


# --- H2H index ---
class H2HIndex:
    def __init__(self, rows: Sequence[Any]):
        self.pairs: Dict[frozenset, List[Tuple[int, Any]]] = {}
        for gi, m in enumerate(rows):
            self.pairs.setdefault(frozenset((m["home_team_id"], m["away_team_id"])), []).append((gi, m))

    def before(self, home_id: str, away_id: str, before_gi: int | None = None, last: int = 5) -> List[dict]:
        rows = self.pairs.get(frozenset((home_id, away_id)), [])
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


# --- Promoted-team priors (بذور الصاعدين) ---
@dataclass
class SeasonIndex:
    first_idx: Dict[str, int] = field(default_factory=dict)
    teams: Dict[str, set] = field(default_factory=dict)
    first_season: Dict[str, str] = field(default_factory=dict)

    @property
    def ordered(self) -> List[str]:
        return sorted(self.first_idx, key=lambda s: self.first_idx[s])


def season_index(finished: Sequence[Any], targets: Sequence[Any] = ()) -> SeasonIndex:
    si = SeasonIndex()
    for i, m in enumerate(finished):
        s = str(row_get(m, "season", "") or "")
        si.first_idx.setdefault(s, i)
        for tid in (m["home_team_id"], m["away_team_id"]):
            si.teams.setdefault(s, set()).add(tid)
            si.first_season.setdefault(tid, s)
    for m in targets:
        s = str(row_get(m, "season", "") or "")
        si.first_idx.setdefault(s, len(finished))
        for tid in (m["home_team_id"], m["away_team_id"]):
            si.teams.setdefault(s, set()).add(tid)
            si.first_season.setdefault(tid, s)
    return si


def promoted_seeds(
    elo_matches: Sequence[EloMatch],
    pi_matches: Sequence[PiMatch],
    si: SeasonIndex,
) -> tuple[Dict[str, float], Dict[str, float], Dict[str, float]]:
    """فريق يظهر لأول مرة يرث متوسط تقييم الفرق التي غادرت قبل موسمه — زمني بحت."""
    elo_seeds: Dict[str, float] = {}
    pi_off: Dict[str, float] = {}
    pi_def: Dict[str, float] = {}
    seasons = si.ordered
    for k in range(1, len(seasons)):
        s = seasons[k]
        prev_teams = si.teams[seasons[k - 1]]
        dropped = prev_teams - si.teams[s]
        newcomers = [t for t in si.teams[s] if si.first_season[t] == s]
        if not dropped or not newcomers:
            continue
        idx0 = si.first_idx[s]
        pre_elo, _ = update_elo(list(elo_matches[:idx0]), seeds=elo_seeds)
        pre_pi = update_pi(list(pi_matches[:idx0]), off_seeds=pi_off, def_seeds=pi_def)
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
                pi_off[t] = so
                pi_def[t] = sd
    return elo_seeds, pi_off, pi_def
