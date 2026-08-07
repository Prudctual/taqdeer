"""مطابقة أسماء الفرق: Unicode NFKD + aliases من scripts/data/team-aliases.json."""

from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ALIASES_PATH = ROOT / "scripts" / "data" / "team-aliases.json"


@lru_cache(maxsize=1)
def _aliases() -> dict[str, str]:
    if not ALIASES_PATH.exists():
        return {}
    return json.loads(ALIASES_PATH.read_text(encoding="utf-8"))


def normalize_key(name: str) -> str:
    s = unicodedata.normalize("NFKD", name or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def slugify(name: str) -> str:
    s = normalize_key(name).replace(" ", "-")
    return s.strip("-")


def resolve_alias(name: str) -> str:
    """يعيد الاسم الكانوني إن وُجد في القاموس."""
    aliases = _aliases()
    if name in aliases:
        return aliases[name]
    nk = normalize_key(name)
    for k, v in aliases.items():
        if normalize_key(k) == nk:
            return v
    return name


def name_variants(name: str) -> set[str]:
    """كل الأشكال المفيدة للمقارنة."""
    out = {name, resolve_alias(name)}
    # إن كان الاسم هو القيمة الكانونية، أضف المفاتيح التي تشير إليه
    canon = resolve_alias(name)
    for k, v in _aliases().items():
        if v == canon or normalize_key(v) == normalize_key(canon):
            out.add(k)
            out.add(v)
    return {x for x in out if x}


def names_match(a: str, b: str) -> bool:
    """تطابق مرن بعد alias + slug."""
    if not a or not b:
        return False
    va, vb = name_variants(a), name_variants(b)
    for x in va:
        for y in vb:
            if normalize_key(x) == normalize_key(y):
                return True
            sx, sy = slugify(x), slugify(y)
            if sx == sy or (len(sx) >= 4 and (sx in sy or sy in sx)):
                return True
    return False
