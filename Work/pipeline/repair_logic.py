# -*- coding: utf-8 -*-
"""Deterministic repair logic — the LLM never touches this.

1. Primary operation per damage: explicit note statement wins, otherwise a
   severity rule decides (provenance is kept on every operation).
2. R&I (Aus-/Einbau): parts that must come off to do a REPLACE, from the
   reviewed adjacency table. Side-aware: "same" inherits the damage side,
   "both" always does both sides, "none" has no side.
"""
from schema import (BodyPart, CaseExtraction, ExplizitAktion, Operation, OpSource, OpType,
                    RIPart, Schadenposition, Schadensart, Schweregrad, Seite)

# part being REPLACED -> parts to remove & reinstall (approved milestone-1 table)
RI_TABLE: dict[BodyPart, list[tuple[RIPart, str]]] = {
    BodyPart.STOSSFAENGER_VORNE: [(RIPart.SCHEINWERFER, "both"), (RIPart.KUEHLERGRILL, "none"),
                                  (RIPart.ZIERLEISTE_ANBAUTEIL, "none")],
    BodyPart.STOSSFAENGER_HINTEN: [(RIPart.RUECKLEUCHTE, "both"), (RIPart.ZIERLEISTE_ANBAUTEIL, "none")],
    BodyPart.KOTFLUEGEL_VORNE: [(RIPart.STOSSFAENGER_VORNE, "none"), (RIPart.SCHEINWERFER, "same"),
                                (RIPart.ZIERLEISTE_ANBAUTEIL, "same")],
    BodyPart.TUER_VORNE: [(RIPart.AUSSENSPIEGEL, "same"), (RIPart.SEITENSCHEIBE, "same"),
                          (RIPart.TUERVERKLEIDUNG, "same")],
    BodyPart.TUER_HINTEN: [(RIPart.SEITENSCHEIBE, "same"), (RIPart.TUERVERKLEIDUNG, "same")],
    BodyPart.KOTFLUEGEL_HINTEN: [(RIPart.STOSSFAENGER_HINTEN, "none"), (RIPart.RUECKLEUCHTE, "same"),
                                 (RIPart.TUER_HINTEN, "same")],
    BodyPart.SCHWELLER: [(RIPart.TUER_VORNE, "same"), (RIPart.TUER_HINTEN, "same")],
    BodyPart.DACH: [(RIPart.WINDSCHUTZSCHEIBE, "none")],
    BodyPart.HECKKLAPPE: [(RIPart.RUECKLEUCHTE, "both")],
    BodyPart.WINDSCHUTZSCHEIBE: [(RIPart.ZIERLEISTE_ANBAUTEIL, "none")],
    BodyPart.AUSSENSPIEGEL: [(RIPart.TUERVERKLEIDUNG, "same")],
}

_UNPAINTED = {BodyPart.WINDSCHUTZSCHEIBE}
_ACTION_TO_OP = {
    ExplizitAktion.ERSETZEN: OpType.ERSETZEN,
    ExplizitAktion.INSTANDSETZEN: OpType.INSTANDSETZEN,
    ExplizitAktion.LACKIEREN: OpType.LACKIEREN,
    ExplizitAktion.AUS_EINBAU: OpType.AUS_EINBAU,
    ExplizitAktion.POLIEREN: OpType.POLIEREN,
    ExplizitAktion.KALIBRIEREN: OpType.KALIBRIEREN,
    ExplizitAktion.PRUEFEN: OpType.PRUEFEN,
}


def _primary_ops(s: Schadenposition) -> list[tuple[OpType, OpSource]]:
    """Main operation(s) for one damage entry, with provenance."""
    if s.explizite_aktionen:
        ops = [(_ACTION_TO_OP[a], OpSource.NOTIZ_EXPLIZIT) for a in s.explizite_aktionen]
        if not any(o in (OpType.ERSETZEN, OpType.INSTANDSETZEN, OpType.POLIEREN) for o, _ in ops):
            ops += _severity_ops(s)
        return ops
    return _severity_ops(s)


def _severity_ops(s: Schadenposition) -> list[tuple[OpType, OpSource]]:
    src = OpSource.REGEL_SCHWERE
    if s.part == BodyPart.WINDSCHUTZSCHEIBE:
        op = OpType.ERSETZEN if s.schweregrad in (Schweregrad.MITTEL, Schweregrad.SCHWER) else OpType.INSTANDSETZEN
        return [(op, src)]
    if s.schweregrad == Schweregrad.SCHWER:
        return [(OpType.ERSETZEN, src)]
    if s.schweregrad == Schweregrad.MITTEL:
        return [(OpType.INSTANDSETZEN, src), (OpType.LACKIEREN, src)]
    if s.schweregrad == Schweregrad.LEICHT:
        if s.schadensart in (Schadensart.KRATZER, Schadensart.LACKSCHADEN):
            return [(OpType.POLIEREN, src), (OpType.LACKIEREN, src)]
        return [(OpType.INSTANDSETZEN, src)]
    return [(OpType.PRUEFEN, src)]


def derive_operations(extraction: CaseExtraction) -> list[Operation]:
    ops: list[Operation] = []
    damaged = {(s.part.value, s.seite) for s in extraction.schaeden}
    seen: set[tuple] = set()

    def add(part: RIPart, seite: Seite, op: OpType, source: OpSource):
        key = (part, seite, op)
        if key not in seen:
            seen.add(key)
            ops.append(Operation(part=part, seite=seite, op=op, source=source))

    for s in extraction.schaeden:
        replaced = False
        for op, src in _primary_ops(s):
            if s.part in _UNPAINTED and op == OpType.LACKIEREN:
                continue
            add(RIPart(s.part.value), s.seite, op, src)
            replaced = replaced or op == OpType.ERSETZEN
        if replaced:
            for ri_part, mode in RI_TABLE.get(s.part, []):
                sides = ([Seite.LINKS, Seite.RECHTS] if mode == "both"
                         else [s.seite] if mode == "same" else [Seite.OHNE])
                for side in sides:
                    if (ri_part.value, side) in damaged:
                        continue  # already damaged -> has its own primary op
                    add(ri_part, side, OpType.AUS_EINBAU, OpSource.REGEL_ADJAZENZ)
    return ops
