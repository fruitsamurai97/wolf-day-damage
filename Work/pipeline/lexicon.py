# -*- coding: utf-8 -*-
"""Bridge between the schema and the ground-truth zone vocabulary.

zone_string(part, seite) reconstructs the exact GT label ("Kotflügel hinten rechts",
"Fahrertür", "Stoßstange vorne" ...). GT_ZONES lists all 22 valid labels.
"""
from schema import BodyPart, Seite

# parts whose GT label never carries a side suffix
_NO_SIDE = {BodyPart.MOTORHAUBE, BodyPart.DACH, BodyPart.HECKKLAPPE, BodyPart.WINDSCHUTZSCHEIBE}

_BASE = {
    BodyPart.STOSSFAENGER_VORNE: "Stoßstange vorne",
    BodyPart.STOSSFAENGER_HINTEN: "Stoßstange hinten",
    BodyPart.MOTORHAUBE: "Motorhaube",
    BodyPart.KOTFLUEGEL_VORNE: "Kotflügel vorne",
    BodyPart.KOTFLUEGEL_HINTEN: "Kotflügel hinten",
    BodyPart.TUER_HINTEN: "Tür hinten",
    BodyPart.SCHWELLER: "Schweller",
    BodyPart.AUSSENSPIEGEL: "Außenspiegel",
    BodyPart.DACH: "Dach",
    BodyPart.HECKKLAPPE: "Heckklappe",
    BodyPart.WINDSCHUTZSCHEIBE: "Windschutzscheibe",
}


def zone_string(part: BodyPart, seite: Seite) -> str | None:
    """(part, seite) -> ground-truth zone label, or None if not a GT zone."""
    if part == BodyPart.TUER_VORNE:
        return {Seite.LINKS: "Fahrertür", Seite.RECHTS: "Beifahrertür"}.get(seite)
    base = _BASE.get(part)
    if base is None:                      # sonstiges_karosserie
        return None
    if part in _NO_SIDE:
        return base
    if seite in (Seite.LINKS, Seite.RECHTS):
        return f"{base} {seite.value}"
    if part in (BodyPart.STOSSFAENGER_VORNE, BodyPart.STOSSFAENGER_HINTEN):
        return base                       # bumpers exist without side (center hit)
    return None                           # sided part with unknown side -> no exact GT zone


GT_ZONES = [
    "Außenspiegel links", "Außenspiegel rechts", "Beifahrertür", "Dach", "Fahrertür",
    "Heckklappe", "Kotflügel hinten links", "Kotflügel hinten rechts",
    "Kotflügel vorne links", "Kotflügel vorne rechts", "Motorhaube",
    "Schweller links", "Schweller rechts", "Stoßstange hinten", "Stoßstange hinten links",
    "Stoßstange hinten rechts", "Stoßstange vorne", "Stoßstange vorne links",
    "Stoßstange vorne rechts", "Tür hinten links", "Tür hinten rechts", "Windschutzscheibe",
]

# case ids used as few-shot examples in the prompt -> excluded from any scoring
FEW_SHOT_IDS = [834726, 858388, 852719]
