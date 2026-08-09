#!/usr/bin/env python3
"""عامل مزامنة البث الحي عبر استدعاء API المحلي (Next.js يستخدم better-sqlite3)."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request

INTERVAL_SEC = 5
URL = "http://127.0.0.1:3000/api/v1/live-matches"


def tick() -> None:
    try:
        with urllib.request.urlopen(URL, timeout=45) as res:
            body = res.read().decode("utf-8", errors="replace")
        data = json.loads(body)
        n = data.get("count", 0)
        print(f"[live-poll] ok count={n} @ {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}", flush=True)
    except Exception as e:
        print(f"[live-poll] error: {e}", flush=True)


def main() -> None:
    print("[live-poll] starting (python → local API)", flush=True)
    while True:
        tick()
        time.sleep(INTERVAL_SEC)


if __name__ == "__main__":
    main()
