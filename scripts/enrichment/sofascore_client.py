"""عميل Sofascore خفيف عبر curl_cffi — بلا متصفح."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any, Dict, Optional

BASE = "https://api.sofascore.com/api/v1"
CACHE_DIR = Path(os.environ.get("TAQDEER_ENRICH_CACHE", "/tmp/taqdeer-enrich-cache"))
MIN_INTERVAL = float(os.environ.get("SOFA_MIN_INTERVAL", "1.6"))

# Sofascore uniqueTournament ids للدوريات الثمانية
LEAGUE_TOURNAMENTS: Dict[str, int] = {
    "pl": 17,
    "pd": 8,
    "bl1": 35,
    "sa": 23,
    "fl1": 34,
    "ppd": 238,
    "ded": 37,
    "tur1": 52,
}

_last_req = 0.0
_session = None


def _get_session():
    global _session
    if _session is not None:
        return _session
    try:
        from curl_cffi import requests as crequests

        _session = crequests.Session(impersonate="chrome124")
    except Exception:
        import requests as crequests  # type: ignore

        _session = crequests.Session()
    return _session


def _throttle() -> None:
    global _last_req
    wait = MIN_INTERVAL - (time.time() - _last_req)
    if wait > 0:
        time.sleep(wait)
    _last_req = time.time()


def _cache_path(key: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    safe = key.replace("/", "_").replace("?", "_")
    return CACHE_DIR / f"{safe}.json"


def get_json(
    path: str,
    *,
    ttl_sec: int = 900,
    force: bool = False,
) -> Optional[Dict[str, Any]]:
    """GET مع كاش ملفّي وتباعد طلبات."""
    cp = _cache_path(path)
    if not force and cp.exists():
        age = time.time() - cp.stat().st_mtime
        if age < ttl_sec:
            try:
                return json.loads(cp.read_text(encoding="utf-8"))
            except Exception:
                pass

    url = f"{BASE}{path}"
    sess = _get_session()
    headers = {
        "Accept": "application/json",
        "Referer": "https://www.sofascore.com/",
        "Origin": "https://www.sofascore.com",
    }
    for attempt in range(3):
        _throttle()
        try:
            r = sess.get(url, headers=headers, timeout=25)
            if r.status_code == 429 or r.status_code == 403:
                time.sleep(8 * (attempt + 1))
                continue
            if r.status_code != 200:
                return None
            data = r.json()
            cp.write_text(json.dumps(data), encoding="utf-8")
            return data
        except Exception:
            time.sleep(3 * (attempt + 1))
    return None


def scheduled_events(date_yyyy_mm_dd: str, *, ttl_sec: int = 1800) -> list:
    data = get_json(f"/sport/football/scheduled-events/{date_yyyy_mm_dd}", ttl_sec=ttl_sec)
    if not data:
        return []
    return list(data.get("events") or [])


def event_lineups(
    event_id: int | str, *, ttl_sec: int = 600, force: bool = False
) -> Optional[Dict[str, Any]]:
    return get_json(f"/event/{event_id}/lineups", ttl_sec=ttl_sec, force=force)


def event_detail(event_id: int | str, *, ttl_sec: int = 1800) -> Optional[Dict[str, Any]]:
    return get_json(f"/event/{event_id}", ttl_sec=ttl_sec)


def search(query: str, *, ttl_sec: int = 86400) -> Optional[Dict[str, Any]]:
    from urllib.parse import quote

    return get_json(f"/search/all?q={quote(query)}", ttl_sec=ttl_sec)
