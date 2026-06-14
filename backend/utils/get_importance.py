import re
from html import unescape

# Aligned with the 0–5 scale in utils/get_countries.py
# Single-word keywords only; matched on word boundaries to reduce false positives.

importance_5 = [
    "war",
    "invasion",
    "genocide",
    "massacre",
    "bombing",
    "missile",
    "airstrike",
    "shelling",
    "artillery",
    "coup",
    "nuclear",
    "pandemic",
    "catastrophe",
    "terrorism",
    "terrorist",
    "holocaust",
    "meltdown",
    "radiation",
    "hostages",
    "assassinated",
    "assassination",
    "casualties",
    "evacuation",
    "virus",
    "outbreak",
    "bioweapon",
    "chemical",
    "biological",
]

importance_4 = [
    "sanctions",
    "nato",
    "summit",
    "referendum",
    "annexation",
    "secession",
    "impeachment",
    "espionage",
    "cyberattack",
    "ransomware",
    "recession",
    "inflation",
    "default",
    "bankruptcy",
    "cyclone",
    "hurricane",
    "typhoon",
    "earthquake",
    "tsunami",
    "refugee",
    "exodus",
    "hostage",
    "embargo",
    "blockade",
    "ceasefire",
    "treaty",
    "diplomatic",
    "ambassador",
    "icbm",
    "ballistic",
    "hypersonic",
    "collapse",
    "plunge",
    "crash",
]

importance_3 = [
    "election",
    "elected",
    "parliament",
    "cabinet",
    "budget",
    "verdict",
    "ruling",
    "amendment",
    "impeach",
    "policy",
    "gdp",
    "unemployment",
    "merger",
    "acquisition",
    "protest",
    "strikes",
    "strike",
    "curfew",
    "scandal",
    "corruption",
    "resign",
    "resignation",
    "satellite",
    "vaccine",
    "climate",
    "emissions",
    "summoned",
    "indicted",
    "convicted",
    "sentenced",
    "bail",
    "summons",
    "tariff",
    "subsidy",
    "ipo",
    "inauguration",
    "sworn",
    "oath",
    "bill",
    "legislation",
    "ordinance",
]

importance_2 = [
    "arrest",
    "arrested",
    "detained",
    "charges",
    "hearing",
    "profit",
    "revenue",
    "shares",
    "market",
    "trade",
    "launch",
    "launched",
    "flood",
    "floods",
    "landslide",
    "wildfire",
    "heatwave",
    "drought",
    "alert",
    "warning",
    "poll",
    "survey",
    "campaign",
    "debate",
    "minister",
    "official",
    "police",
    "court",
    "trial",
    "probe",
    "inquiry",
    "audit",
    "quarterly",
    "earnings",
    "exports",
    "imports",
    "tender",
    "contract",
    "agreement",
    "partnership",
    "appointment",
    "transferred",
]

importance_1 = [
    "update",
    "report",
    "ceremony",
    "workshop",
    "seminar",
    "conference",
    "meeting",
    "forecast",
    "match",
    "celebrity",
    "entertainment",
    "district",
    "village",
    "local",
    "routine",
    "minor",
    "awareness",
    "pilot",
    "discussion",
    "review",
    "statement",
    "spokesperson",
    "sources",
]

importance_0 = [
    "obituary",
    "horoscope",
    "crossword",
    "recipe",
    "lifestyle",
    "fashion",
    "gardening",
    "lottery",
    "beauty",
    "pet",
]

_SCORE_KEYWORDS: tuple[tuple[int, list[str]], ...] = (
    (5, importance_5),
    (4, importance_4),
    (3, importance_3),
    (2, importance_2),
    (1, importance_1),
    (0, importance_0),
)


def _normalize_text(title: str, summary: str) -> str:
    raw = f"{title} {summary}".lower()
    raw = unescape(raw)
    raw = re.sub(r"<[^>]+>", " ", raw)
    raw = re.sub(r"[^a-z0-9\s'-]", " ", raw)
    raw = re.sub(r"\s+", " ", raw)
    return raw.strip()


def _contains_word(text: str, word: str) -> bool:
    return re.search(rf"\b{re.escape(word)}\b", text) is not None


def get_importance(title: str, summary: str) -> int:
    """Return the highest importance score (0–5) matched by headline keywords."""
    text = _normalize_text(title, summary)

    for score, keywords in _SCORE_KEYWORDS:
        if any(_contains_word(text, word) for word in keywords):
            return score

    return 1
