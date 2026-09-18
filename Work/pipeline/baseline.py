# -*- coding: utf-8 -*-
"""Deterministic regex baseline — the honest comparison point for the LLM.

Zones: longest-first matching with word boundaries, matched spans are masked so
"Stoßstange vorne" never re-fires inside "Stoßstange vorne links".
Kind + insurance: keyword rules. Severity: impossible by design (never literal),
the baseline returns None there — that gap IS the finding.
"""
import re

from lexicon import GT_ZONES

_ZONES_BY_LEN = sorted(GT_ZONES, key=len, reverse=True)
_ZONE_RE = {z: re.compile(r"(?<![\wäöüÄÖÜß])" + re.escape(z) + r"(?![\wäöüÄÖÜß])", re.IGNORECASE)
            for z in _ZONES_BY_LEN}

_KIND_DAMAGE = ["Parkschaden", "Rangierschaden", "Auffahrunfall", "Hagelschaden",
                "Steinschlag", "Vandalismus", "Wildunfall"]
_KIND_SERVICE = [("Inspektion", re.compile(r"Inspektion", re.I)),
                 ("Ölwechsel", re.compile(r"Ölwechsel|Longlife|Ölservice", re.I)),
                 ("HU/AU", re.compile(r"\bHU\b|\bTÜV\b|\bAU\b|Hauptuntersuchung", re.I)),
                 ("Räder und Reifen", re.compile(r"Reifen|Räder|Radwechsel|Felge", re.I)),
                 ("Bremsen", re.compile(r"Brems", re.I))]

_INSURANCE = [("haftpflicht_gegner", re.compile(r"gegnerische Haftpflicht|Haftung anerkannt|Gegnerische", re.I)),
              ("vollkasko", re.compile(r"Vollkasko|\bVK\b")),
              ("teilkasko", re.compile(r"Teilkasko|\bTK\b")),
              ("selbstzahler", re.compile(r"Selbstzahler|keine Vers", re.I)),
              ("gesteuert", re.compile(r"Schadensteuer|gesteuert|vermittelt", re.I))]


def predict_zones(text: str) -> set[str]:
    found, masked = set(), text
    for z in _ZONES_BY_LEN:
        def _mask(m):
            found.add(z)
            return "#" * len(m.group(0))
        masked = _ZONE_RE[z].sub(_mask, masked)
    return found


def predict_kind(text: str) -> str:
    for k in _KIND_DAMAGE:
        if re.search(re.escape(k), text, re.I):
            return k
    for k, rx in _KIND_SERVICE:
        if rx.search(text):
            return k
    return "unklar"


def predict_insurance(text: str) -> str:
    for name, rx in _INSURANCE:
        if rx.search(text):
            return name
    return "unbekannt"


def predict(case: dict) -> dict:
    body = case["freitext"].split("~~~")[0]
    kind = predict_kind(body)
    damage = kind in _KIND_DAMAGE
    return {"kind": kind,
            "type": "damage" if damage else ("service" if kind != "unklar" else "unklar"),
            "zones": predict_zones(body) if damage else set(),
            "severity": None,
            "insurance": predict_insurance(body) if damage else None}
