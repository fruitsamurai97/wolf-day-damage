# -*- coding: utf-8 -*-
"""Schema v1.1 — controlled vocabulary + Pydantic models for the extraction.

The 12 BodyPart values x Seite reconstruct exactly the 22 ground-truth zone
strings (see lexicon.zone_string). German canonical values everywhere: the
notes stay German, so does the structure.
"""
from enum import Enum

from pydantic import BaseModel, Field


class BodyPart(str, Enum):
    STOSSFAENGER_VORNE = "stossfaenger_vorne"
    STOSSFAENGER_HINTEN = "stossfaenger_hinten"
    MOTORHAUBE = "motorhaube"
    KOTFLUEGEL_VORNE = "kotfluegel_vorne"
    KOTFLUEGEL_HINTEN = "kotfluegel_hinten"
    TUER_VORNE = "tuer_vorne"
    TUER_HINTEN = "tuer_hinten"
    SCHWELLER = "schweller"
    AUSSENSPIEGEL = "aussenspiegel"
    DACH = "dach"
    HECKKLAPPE = "heckklappe"
    WINDSCHUTZSCHEIBE = "windschutzscheibe"
    SONSTIGES_KAROSSERIE = "sonstiges_karosserie"  # escape hatch -> unmapped_terms


class Seite(str, Enum):
    LINKS = "links"
    RECHTS = "rechts"
    OHNE = "ohne"          # part has no side in the note (Motorhaube, Dach, bumper center hit ...)
    UNBEKANNT = "unbekannt"


class Schadensart(str, Enum):
    KRATZER = "kratzer"
    DELLE = "delle"
    RISS_BRUCH = "riss_bruch"
    STEINSCHLAG = "steinschlag"
    GLASBRUCH = "glasbruch"
    LACKSCHADEN = "lackschaden"
    HAGELSCHADEN = "hagelschaden"
    VERFORMUNG = "verformung"
    SONSTIGE = "sonstige"


class Schweregrad(str, Enum):
    LEICHT = "leicht"
    MITTEL = "mittel"
    SCHWER = "schwer"
    UNBEKANNT = "unbekannt"


SEVERITY_ORDER = {Schweregrad.LEICHT: 1, Schweregrad.MITTEL: 2, Schweregrad.SCHWER: 3}


class ExplizitAktion(str, Enum):
    """Only when the note literally states it — never inferred."""
    ERSETZEN = "ersetzen"
    INSTANDSETZEN = "instandsetzen"
    LACKIEREN = "lackieren"
    AUS_EINBAU = "aus_einbau"
    POLIEREN = "polieren"
    KALIBRIEREN = "kalibrieren"
    PRUEFEN = "pruefen"


class CaseKind(str, Enum):
    # damage kinds (7)
    PARKSCHADEN = "Parkschaden"
    RANGIERSCHADEN = "Rangierschaden"
    AUFFAHRUNFALL = "Auffahrunfall"
    HAGELSCHADEN = "Hagelschaden"
    STEINSCHLAG = "Steinschlag"
    VANDALISMUS = "Vandalismus"
    WILDUNFALL = "Wildunfall"
    # service kinds (5)
    INSPEKTION = "Inspektion"
    OELWECHSEL = "Ölwechsel"
    HU_AU = "HU/AU"
    RAEDER_REIFEN = "Räder und Reifen"
    BREMSEN = "Bremsen"
    UNKLAR = "unklar"


DAMAGE_KINDS = {CaseKind.PARKSCHADEN, CaseKind.RANGIERSCHADEN, CaseKind.AUFFAHRUNFALL,
                CaseKind.HAGELSCHADEN, CaseKind.STEINSCHLAG, CaseKind.VANDALISMUS,
                CaseKind.WILDUNFALL}


class VersicherungsTyp(str, Enum):
    TEILKASKO = "teilkasko"
    VOLLKASKO = "vollkasko"
    HAFTPFLICHT_GEGNER = "haftpflicht_gegner"
    SELBSTZAHLER = "selbstzahler"
    GESTEUERT = "gesteuert"
    UNBEKANNT = "unbekannt"


class Versicherung(BaseModel, extra="forbid"):
    typ: VersicherungsTyp = VersicherungsTyp.UNBEKANNT
    sb_betrag_eur: int | None = Field(default=None, description="Selbstbeteiligung amount if stated")


class Schadenposition(BaseModel, extra="forbid"):
    part: BodyPart
    seite: Seite = Seite.UNBEKANNT
    schadensart: Schadensart = Schadensart.SONSTIGE
    schweregrad: Schweregrad = Schweregrad.UNBEKANNT
    beleg_zitat: str = Field(description="Verbatim German span from the note naming this damage")
    explizite_aktionen: list[ExplizitAktion] = []


class CaseExtraction(BaseModel, extra="forbid"):
    """What DeepSeek returns for one case. Validated strictly; failures are retried then flagged."""
    case_kind: CaseKind = CaseKind.UNKLAR
    schaeden: list[Schadenposition] = []
    versicherung: Versicherung = Versicherung()
    kunden_anliegen: list[str] = Field(default=[], description="Customer requests as stated (KVA erwünscht, Leihwagen, Rückruf ...)")
    nebenbefunde: list[str] = Field(default=[], description="Secondary findings outside the main job (Batterie schwach, Klappern ...)")
    unmapped_terms: list[str] = Field(default=[], description="Part/damage terms that fit no enum value")

    @property
    def case_type(self) -> str:
        if self.case_kind == CaseKind.UNKLAR:
            return "unklar"
        return "damage" if self.case_kind in DAMAGE_KINDS else "service"

    @property
    def overall_severity(self) -> Schweregrad | None:
        known = [s.schweregrad for s in self.schaeden if s.schweregrad != Schweregrad.UNBEKANNT]
        if not known:
            return None
        return max(known, key=lambda s: SEVERITY_ORDER[s])


class RIPart(str, Enum):
    """Operation targets: the 12 body parts plus removable attachments that are
    valid R&I targets but never ground-truth damage zones."""
    STOSSFAENGER_VORNE = "stossfaenger_vorne"
    STOSSFAENGER_HINTEN = "stossfaenger_hinten"
    MOTORHAUBE = "motorhaube"
    KOTFLUEGEL_VORNE = "kotfluegel_vorne"
    KOTFLUEGEL_HINTEN = "kotfluegel_hinten"
    TUER_VORNE = "tuer_vorne"
    TUER_HINTEN = "tuer_hinten"
    SCHWELLER = "schweller"
    AUSSENSPIEGEL = "aussenspiegel"
    DACH = "dach"
    HECKKLAPPE = "heckklappe"
    WINDSCHUTZSCHEIBE = "windschutzscheibe"
    SONSTIGES_KAROSSERIE = "sonstiges_karosserie"
    SCHEINWERFER = "scheinwerfer"
    RUECKLEUCHTE = "rueckleuchte"
    KUEHLERGRILL = "kuehlergrill"
    ZIERLEISTE_ANBAUTEIL = "zierleiste_anbauteil"
    SEITENSCHEIBE = "seitenscheibe"
    TUERVERKLEIDUNG = "tuerverkleidung"


class OpType(str, Enum):
    ERSETZEN = "ersetzen"
    INSTANDSETZEN = "instandsetzen"
    LACKIEREN = "lackieren"
    AUS_EINBAU = "aus_einbau"
    POLIEREN = "polieren"
    KALIBRIEREN = "kalibrieren"
    PRUEFEN = "pruefen"


class OpSource(str, Enum):
    NOTIZ_EXPLIZIT = "notiz_explizit"
    REGEL_SCHWERE = "regel_schwere"
    REGEL_ADJAZENZ = "regel_adjazenz"


class Operation(BaseModel):
    part: RIPart
    seite: Seite
    op: OpType
    source: OpSource


class CaseRecord(BaseModel):
    """Extraction + provenance, one JSON file per case in the cache."""
    case_id: int
    extraction: CaseExtraction
    validation_ok: bool = True
    validation_errors: list[str] = []
    attempts: int = 1
    model_name: str = ""
    prompt_version: str = ""
    extracted_at: str = ""
    usage: dict = {}
    schema_version: str = "1.1"
