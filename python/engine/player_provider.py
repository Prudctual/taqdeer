"""Player Statistics, Lineups, and Health Status Engine."""

from __future__ import annotations

import random
from typing import Dict, List, Optional


# Mock catalog of key European stars for realistic seeding & demonstration
PLAYER_CATALOG: Dict[str, List[Dict]] = {
    "real_madrid": [
        {"name_ar": "فينيسيوس جونيور", "name_en": "Vinícius Júnior", "pos": "FW", "no": 7, "mins": 2150, "goals": 15, "assists": 9, "xg": 14.2, "xa": 8.1, "status": "fit", "fatigue": 22, "consecutive": 8},
        {"name_ar": "جود بيلينجهام", "name_en": "Jude Bellingham", "pos": "MF", "no": 5, "mins": 2280, "goals": 18, "assists": 7, "xg": 16.5, "xa": 6.4, "status": "fit", "fatigue": 35, "consecutive": 12},
        {"name_ar": "كيليان مبابي", "name_en": "Kylian Mbappé", "pos": "FW", "no": 9, "mins": 2040, "goals": 21, "assists": 5, "xg": 20.1, "xa": 4.8, "status": "fit", "fatigue": 18, "consecutive": 6},
        {"name_ar": "فيديريكو فالفيردي", "name_en": "Federico Valverde", "pos": "MF", "no": 8, "mins": 2430, "goals": 4, "assists": 6, "xg": 3.8, "xa": 5.2, "status": "fit", "fatigue": 40, "consecutive": 14},
        {"name_ar": "أنطونيو روديجير", "name_en": "Antonio Rüdiger", "pos": "DF", "no": 22, "mins": 2350, "goals": 2, "assists": 1, "xg": 1.9, "xa": 0.8, "status": "fit", "fatigue": 28, "consecutive": 10},
        {"name_ar": "مواطنه كورتوا", "name_en": "Thibaut Courtois", "pos": "GK", "no": 1, "mins": 1800, "goals": 0, "assists": 0, "xg": 0.0, "xa": 0.0, "status": "fit", "fatigue": 10, "consecutive": 5},
    ],
    "man_city": [
        {"name_ar": "إيرلينج هالاند", "name_en": "Erling Haaland", "pos": "FW", "no": 9, "mins": 2100, "goals": 24, "assists": 4, "xg": 23.5, "xa": 3.2, "status": "fit", "fatigue": 30, "consecutive": 9},
        {"name_ar": "كيفين دي بروين", "name_en": "Kevin De Bruyne", "pos": "MF", "no": 17, "mins": 1450, "goals": 6, "assists": 14, "xg": 5.2, "xa": 12.8, "status": "doubtful", "fatigue": 55, "consecutive": 2},
        {"name_ar": "رودري", "name_en": "Rodri", "pos": "MF", "no": 16, "mins": 2500, "goals": 7, "assists": 8, "xg": 6.1, "xa": 7.0, "status": "injured", "fatigue": 85, "consecutive": 0},
        {"name_ar": "فيل فودين", "name_en": "Phil Foden", "pos": "FW", "no": 47, "mins": 2200, "goals": 14, "assists": 10, "xg": 12.8, "xa": 9.2, "status": "fit", "fatigue": 25, "consecutive": 7},
        {"name_ar": "روبن دياز", "name_en": "Rúben Dias", "pos": "DF", "no": 3, "mins": 2150, "goals": 1, "assists": 1, "xg": 1.2, "xa": 0.5, "status": "fit", "fatigue": 20, "consecutive": 6},
    ],
    "liverpool": [
        {"name_ar": "محمد صلاح", "name_en": "Mohamed Salah", "pos": "FW", "no": 11, "mins": 2300, "goals": 19, "assists": 11, "xg": 18.2, "xa": 10.5, "status": "fit", "fatigue": 25, "consecutive": 11},
        {"name_ar": "فيرجيل فان دايك", "name_en": "Virgil van Dijk", "pos": "DF", "no": 4, "mins": 2400, "goals": 3, "assists": 2, "xg": 2.8, "xa": 1.4, "status": "fit", "fatigue": 20, "consecutive": 15},
        {"name_ar": "ألكسيس ماك أليستر", "name_en": "Alexis Mac Allister", "pos": "MF", "no": 10, "mins": 2100, "goals": 5, "assists": 5, "xg": 4.1, "xa": 4.8, "status": "fit", "fatigue": 32, "consecutive": 8},
        {"name_ar": "داروين نونيز", "name_en": "Darwin Núñez", "pos": "FW", "no": 9, "mins": 1650, "goals": 11, "assists": 7, "xg": 13.6, "xa": 5.1, "status": "fit", "fatigue": 15, "consecutive": 4},
        {"name_ar": "أليسون بيكر", "name_en": "Alisson Becker", "pos": "GK", "no": 1, "mins": 1980, "goals": 0, "assists": 0, "xg": 0.0, "xa": 0.0, "status": "fit", "fatigue": 10, "consecutive": 6},
    ],
    "barcelona": [
        {"name_ar": "لامين يامال", "name_en": "Lamine Yamal", "pos": "FW", "no": 19, "mins": 2100, "goals": 9, "assists": 12, "xg": 8.5, "xa": 11.2, "status": "fit", "fatigue": 30, "consecutive": 10},
        {"name_ar": "ربرت ليفاندوفسكي", "name_en": "Robert Lewandowski", "pos": "FW", "no": 9, "mins": 2200, "goals": 20, "assists": 4, "xg": 19.4, "xa": 3.5, "status": "fit", "fatigue": 28, "consecutive": 9},
        {"name_ar": "بيدري", "name_en": "Pedri", "pos": "MF", "no": 8, "mins": 1850, "goals": 4, "assists": 6, "xg": 3.9, "xa": 5.8, "status": "fit", "fatigue": 24, "consecutive": 6},
        {"name_ar": "جول كوندي", "name_en": "Jules Koundé", "pos": "DF", "no": 23, "mins": 2350, "goals": 1, "assists": 4, "xg": 1.1, "xa": 3.2, "status": "fit", "fatigue": 35, "consecutive": 13},
    ],
    "arsenal": [
        {"name_ar": "بوكايو ساكا", "name_en": "Bukayo Saka", "pos": "FW", "no": 7, "mins": 2250, "goals": 13, "assists": 11, "xg": 12.1, "xa": 9.8, "status": "fit", "fatigue": 32, "consecutive": 12},
        {"name_ar": "مارتن أوديجارد", "name_en": "Martin Ødegaard", "pos": "MF", "no": 8, "mins": 2100, "goals": 8, "assists": 9, "xg": 7.4, "xa": 8.5, "status": "fit", "fatigue": 22, "consecutive": 7},
        {"name_ar": "ويليام ساليبا", "name_en": "William Saliba", "pos": "DF", "no": 2, "mins": 2430, "goals": 2, "assists": 1, "xg": 1.8, "xa": 0.6, "status": "fit", "fatigue": 18, "consecutive": 16},
        {"name_ar": "ديكلان رايس", "name_en": "Declan Rice", "pos": "MF", "no": 41, "mins": 2380, "goals": 6, "assists": 6, "xg": 4.9, "xa": 5.1, "status": "fit", "fatigue": 28, "consecutive": 14},
    ],
}


def get_squad_for_team(team_key: str) -> List[Dict]:
    """Retrieve player squad list with health and stat metrics."""
    clean_key = team_key.lower().replace(" ", "").replace("-", "")
    for k, squad in PLAYER_CATALOG.items():
        if k in clean_key or clean_key in k:
            return squad
    
    # Generic fallback generator for unknown teams
    return [
        {"name_ar": "قائد الفريق", "name_en": "Captain", "pos": "MF", "no": 10, "mins": 1800, "goals": 5, "assists": 4, "xg": 4.2, "xa": 3.8, "status": "fit", "fatigue": 15, "consecutive": 8},
        {"name_ar": "الهداف الأول", "name_en": "Top Scorer", "pos": "FW", "no": 9, "mins": 1750, "goals": 11, "assists": 2, "xg": 10.5, "xa": 1.8, "status": "fit", "fatigue": 20, "consecutive": 6},
        {"name_ar": "صانع الألعاب", "name_en": "Playmaker", "pos": "MF", "no": 7, "mins": 1600, "goals": 3, "assists": 7, "xg": 2.9, "xa": 6.4, "status": "fit", "fatigue": 25, "consecutive": 5},
        {"name_ar": "صخرة الدفاع", "name_en": "Center Back", "pos": "DF", "no": 4, "mins": 1900, "goals": 1, "assists": 0, "xg": 0.9, "xa": 0.2, "status": "fit", "fatigue": 18, "consecutive": 9},
    ]


def get_missing_players(team_key: str) -> List[Dict]:
    """Get key absent/injured starters that trigger RAPM missing player adjustments."""
    squad = get_squad_for_team(team_key)
    missing = [p for p in squad if p.get("status") in ("injured", "suspended", "doubtful")]
    return [
        {
            "name": p["name_ar"],
            "position": p["pos"],
            "importance": 1.0 if p["goals"] >= 10 or p["assists"] >= 8 else 0.75,
            "status": p["status"],
        }
        for p in missing
    ]
