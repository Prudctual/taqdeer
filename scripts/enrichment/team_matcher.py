"""مطابقة معرّفات خارجية (FotMob) مع فرق Taqdeer عبر كاش DB."""

from __future__ import annotations

import sqlite3
import time
from typing import Optional

SOURCE = "fotmob"


def get_mapped(conn: sqlite3.Connection, entity_type: str, local_id: str) -> Optional[str]:
    row = conn.execute(
        """
        SELECT external_id FROM external_id_map
        WHERE source=? AND entity_type=? AND local_id=?
        """,
        (SOURCE, entity_type, local_id),
    ).fetchone()
    return str(row[0]) if row else None


def put_mapped(
    conn: sqlite3.Connection,
    entity_type: str,
    local_id: str,
    external_id: str,
    label: str | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO external_id_map(source, entity_type, local_id, external_id, label, updated_at)
        VALUES (?,?,?,?,?,?)
        ON CONFLICT(source, entity_type, local_id) DO UPDATE SET
          external_id=excluded.external_id,
          label=excluded.label,
          updated_at=excluded.updated_at
        """,
        (SOURCE, entity_type, local_id, str(external_id), label, time.strftime("%Y-%m-%dT%H:%M:%SZ")),
    )
