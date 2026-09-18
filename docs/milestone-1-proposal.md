# Milestone 1 — Repo inspection, parts taxonomy, R&I table, extraction schema

Status: **DRAFT for review** — nothing here is wired into code yet.
Blocking fact: **the 1,000-case dataset is not on this machine yet** (see §1). Everything in §3–§5 was designed from the domain material that IS in the kit (reference demo workflow, challenge text) and standard German bodyshop vocabulary. First action when the dataset lands: run the coverage scan described in §6 and adjust the vocabulary BEFORE building the pipeline.

---

## 1. What's actually in the repo

```
Hackathon/
├── .env.local                  # DEEPSEEK_API_KEY (36 chars, redacted)
├── .venv/                      # Python 3.11 venv (pydantic, pandas, openai, jupyter, …)
└── Data/                       # = extracted track-b.zip starter kit
    ├── CHALLENGE.md            # Track B hand-out
    ├── DATASET.md              # "dataset ships separately via briefing page"
    ├── frontend/               # Minimals MUI starter v7.5 — Next 15, React 19, MUI 7, port 8083
    └── reference-demo/         # static customer status page, three.js viewer, car.glb
```

- **Dataset: NOT present.** `DATASET.md`: the dataset "is a separate download and it appears
  on the briefing page when it is released." `Downloads/track-b.zip` (12 MB) is only the starter
  kit (783 entries, no CSV/JSON data files); the four `Unconfirmed *.crdownload` files are
  interrupted downloads of that same zip. → §1 of the milestone (real data shape + 5–10 raw
  notes) is blocked until the download link appears.
- **Frontend**: Minimals dashboard skeleton with placeholder pages under `src/app/dashboard/`
  (`page.tsx`, `two`, `three`, `group/five`, `group/six`) all rendering a `BlankView`. Stack:
  Next 15 (turbopack, port 8083), React 19, MUI 7, `zod`, `axios`, `@mui/x-data-grid`,
  `framer-motion`. Auth is mocked — no wiring needed. We replace the placeholder pages.
- **Reference demo**: 9-stage customer status page ("Meldewege"). The three.js viewer loads
  `car.glb` as ONE object (no per-part meshes exposed; the procedural fallback car has only
  ~8 named meshes). So the demo does NOT do per-part damage highlighting — confirms the
  top-down SVG with our own region geometry is the right v1, and per-part 3D is genuinely a
  stretch, not a copy-paste.
- **Gold mine for the schema**: the demo encodes the real dealership case lifecycle:
  1 Auftrag übernommen · 2 Kundenkontakt · 3 Termin vereinbart · 4 Fahrzeug eingetroffen ·
  5 Kalkulation und Freigabe · 6 Reparatur und Prognose · 7 Fertig und Kunde informiert ·
  8 Fahrzeugausgang · 9 Rechnung — plus codes like `REPARATUR_VERZOEGERT`,
  `verzoegerungsgrund: teil_fehlt`, `endkontrolle: bestanden`, and vocabulary
  (Kostenvoranschlag, Gutachten, Sachverständiger, Freigabe, Lack/Karosserie in Bearbeitung,
  Teil im Rückstand). The `status` enum below mirrors it.

## 2. Design decision surfaced by CHALLENGE.md

The corpus is "**service and damage** cases" — not only crash damage. Notes will contain
mechanical/service content (Inspektion, Bremsen, Ölservice, Klima, …) that has no body region.
Proposal: **one controlled vocabulary, two kinds of entries**:

- **Body parts** (§3): map to precise SVG regions → the damage viz.
- **Technical systems** (§3b, optional extension): map to coarse zones (engine bay, axles,
  underbody) or to a badge list next to the car. They make the corpus analysis much richer
  (case-type mix is exactly what the dealership wants to know).

Plus a case-level `case_type` (§5) so the analysis can split the corpus cleanly.

## 3. Canonical parts taxonomy — 22 body parts

Side is a **separate axis** (`LINKS/RECHTS/MITTE/BEIDE/UNBEKANNT`), not baked into part names —
keeps the enum at 22 instead of 40+, and the SVG keys regions by `(part, side)`.
German canonical names (extraction stays in German); synonyms = what we expect staff to type.

| # | Enum | English | Synonyms/variants to expect in notes |
|---|------|---------|--------------------------------------|
| 1 | `STOSSFAENGER_VORNE` | front bumper | Stoßstange vorn, Frontschürze, Frontstoßstange, vordere Stoßstange, "Stossstange" |
| 2 | `STOSSFAENGER_HINTEN` | rear bumper | Heckschürze, Stoßstange hinten, Heckstoßstange |
| 3 | `MOTORHAUBE` | hood | Haube, Fronthaube |
| 4 | `KOTFLUEGEL` | front fender | Kotflügel (vorn implied), Fender, "Kotfluegel" |
| 5 | `TUER_VORNE` | front door | Fahrertür (→ LINKS), Beifahrertür (→ RECHTS), Tür vorne, VL/VR Tür |
| 6 | `TUER_HINTEN` | rear door | hintere Tür, Fondtür, HL/HR Tür |
| 7 | `SEITENWAND` | rear quarter panel | Seitenwand hinten, Seitenteil, hinterer Kotflügel, Radlauf hinten |
| 8 | `SCHWELLER` | rocker panel / sill | Seitenschweller, Einstieg, Schwellerleiste |
| 9 | `AUSSENSPIEGEL` | side mirror | Spiegel, Außenspiegel, Spiegelkappe, Spiegelglas |
| 10 | `DACH` | roof | Dachhaut, Dachrahmen |
| 11 | `HECKKLAPPE` | tailgate / trunk lid | Kofferraumdeckel, Heckdeckel, Kofferraumklappe |
| 12 | `WINDSCHUTZSCHEIBE` | windshield | Frontscheibe, WSS, Scheibe vorne |
| 13 | `HECKSCHEIBE` | rear window | Heckglas, Scheibe hinten |
| 14 | `SEITENSCHEIBE` | side window | Türscheibe, Seitenglas, Dreiecksscheibe |
| 15 | `SCHEINWERFER` | headlight (incl. fog lights) | Hauptscheinwerfer, Frontscheinwerfer, Xenon/LED-Scheinwerfer, Nebelscheinwerfer/NSW |
| 16 | `RUECKLEUCHTE` | taillight | Heckleuchte, Rücklicht, Rückleuchte, Blinker hinten |
| 17 | `KUEHLERGRILL` | grille | Frontgrill, Kühlergitter, Niere (BMW) |
| 18 | `RAD_FELGE` | wheel / rim / tire | Felge, Alufelge, Rad, Reifen, Radkappe, Bordsteinschaden Felge |
| 19 | `A_SAEULE_B_SAEULE` | pillars | A-Säule, B-Säule, C-Säule, Säule |
| 20 | `UNTERBODEN` | underbody | Unterfahrschutz, Unterboden, aufgesetzt, Bodenblech |
| 21 | `ZIERLEISTE_ANBAUTEIL` | trim / small attachments | Zierleiste, Leiste, Emblem, Antenne, Türgriff, Kennzeichenhalter |
| 22 | `SONSTIGES_KAROSSERIE` | other body | catch-all with mandatory `unmapped_terms` entry |

Rules baked into the extraction prompt:
- "Fahrertür/Fahrerseite" → `LINKS`; "Beifahrer…" → `RECHTS` (German LHD convention).
- "Kotflügel hinten" → `SEITENWAND` (colloquial for quarter panel).
- Anything not mappable → `SONSTIGES_KAROSSERIE` + verbatim term into `unmapped_terms` (never guess silently).

### 3b. Technical systems (extension, pending your OK — needed because "service" cases)

`MOTOR_ANTRIEB` (Motor, Ölverlust, Turbolader) · `GETRIEBE_KUPPLUNG` · `BREMSEN` (Beläge, Scheiben) ·
`FAHRWERK_ACHSE` (Stoßdämpfer, Federbein, Querlenker, Spur) · `ABGASANLAGE` (Auspuff, Kat) ·
`KLIMA_HEIZUNG` · `ELEKTRIK_BATTERIE` (Batterie, Sensorik, Kamera, PDC) · `INNENRAUM` (Sitz, Armaturenbrett, Himmel) ·
`WARTUNG_ALLGEMEIN` (Inspektion, Service, TÜV/HU, Ölwechsel)

These render as coarse zones (engine bay = front center hatch, brakes/suspension = wheel corners,
exhaust = center line, underbody = full-floor hatch) or as chips beside the car — decision at viz time.

## 4. Adjacency / R&I table — first draft for your review

Semantics: `REPLACE(key)` ⇒ the listed parts must be **removed and reinstalled** (Aus-/Einbau)
to do the job, but are NOT themselves damaged. Deterministic Python dict, LLM never touches it.
Side-aware: R&I inherits the side of the damaged part (e.g. Kotflügel LINKS ⇒ Scheinwerfer LINKS);
parts marked ⬌ apply to that side only.

| Part being replaced | R&I (remove & reinstall) | Rationale / note |
|---|---|---|
| `STOSSFAENGER_VORNE` | `SCHEINWERFER` (beide), `KUEHLERGRILL`, `ZIERLEISTE_ANBAUTEIL` (Kennzeichen, Sensorik) | headlights & grille unbolt with/behind bumper skin |
| `STOSSFAENGER_HINTEN` | `RUECKLEUCHTE` (beide), `ZIERLEISTE_ANBAUTEIL` | taillights overlap bumper mounts |
| `MOTORHAUBE` | — | hinge-off, nothing else |
| `KOTFLUEGEL` ⬌ | `STOSSFAENGER_VORNE`, `SCHEINWERFER` ⬌, `ZIERLEISTE_ANBAUTEIL` | bumper corner + headlight sit over fender edge |
| `TUER_VORNE` ⬌ | `AUSSENSPIEGEL` ⬌, `SEITENSCHEIBE` ⬌ | mirror + glass carried by door shell |
| `TUER_HINTEN` ⬌ | `SEITENSCHEIBE` ⬌ | |
| `SEITENWAND` ⬌ | `STOSSFAENGER_HINTEN`, `RUECKLEUCHTE` ⬌, `TUER_HINTEN` ⬌ | quarter panel welds under bumper/light; door for access/gap |
| `SCHWELLER` ⬌ | `TUER_VORNE` ⬌, `TUER_HINTEN` ⬌ | doors off for sill section |
| `HECKKLAPPE` | `RUECKLEUCHTE` (falls in Klappe verbaut — modellabhängig), `HECKSCHEIBE` (bei Klappentausch mit Verklebung) | flag `model_dependent: true` |
| `DACH` | `WINDSCHUTZSCHEIBE`, `HECKSCHEIBE` | glued glass must come out for roof skin |
| `WINDSCHUTZSCHEIBE` | `ZIERLEISTE_ANBAUTEIL` (Wischer, Zierleisten) | |
| `SCHEINWERFER` ⬌ | `STOSSFAENGER_VORNE` | on most modern cars bumper off to swap headlight |
| `KUEHLERGRILL` | `STOSSFAENGER_VORNE` | grille usually clipped into bumper |
| `RUECKLEUCHTE` ⬌ | — | accessible from trunk |
| `AUSSENSPIEGEL` ⬌ / `SEITENSCHEIBE` ⬌ | `ZIERLEISTE_ANBAUTEIL` (Türverkleidung ≈ trim) | interior door panel off |
| `RAD_FELGE` / `UNTERBODEN` / `A_SAEULE_B_SAEULE` / `ZIERLEISTE_ANBAUTEIL` / `SONSTIGES` | — | none at this granularity |

Deliberately NOT in v1 (noted for the fireside chat): paint blending into adjacent panels
("Beilackierung"), model-specific tables, structural parts (Längsträger). The table is one dict —
swapping in a reviewed/OEM version later is free.

## 5. Pydantic schema (v1 proposal)

```python
from enum import Enum
from pydantic import BaseModel, Field

# --- controlled vocabulary (German canonical values) ---

class BodyPart(str, Enum):
    STOSSFAENGER_VORNE = "stossfaenger_vorne"
    STOSSFAENGER_HINTEN = "stossfaenger_hinten"
    MOTORHAUBE = "motorhaube"
    KOTFLUEGEL = "kotfluegel"
    TUER_VORNE = "tuer_vorne"
    TUER_HINTEN = "tuer_hinten"
    SEITENWAND = "seitenwand"
    SCHWELLER = "schweller"
    AUSSENSPIEGEL = "aussenspiegel"
    DACH = "dach"
    HECKKLAPPE = "heckklappe"
    WINDSCHUTZSCHEIBE = "windschutzscheibe"
    HECKSCHEIBE = "heckscheibe"
    SEITENSCHEIBE = "seitenscheibe"
    SCHEINWERFER = "scheinwerfer"
    RUECKLEUCHTE = "rueckleuchte"
    KUEHLERGRILL = "kuehlergrill"
    RAD_FELGE = "rad_felge"
    A_SAEULE_B_SAEULE = "a_saeule_b_saeule"
    UNTERBODEN = "unterboden"
    ZIERLEISTE_ANBAUTEIL = "zierleiste_anbauteil"
    SONSTIGES_KAROSSERIE = "sonstiges_karosserie"

class Seite(str, Enum):
    LINKS = "links"          # Fahrerseite (DE)
    RECHTS = "rechts"        # Beifahrerseite
    MITTE = "mitte"
    BEIDE = "beide"
    UNBEKANNT = "unbekannt"

class Schadensart(str, Enum):
    KRATZER = "kratzer"                  # Kratzer, Schramme, Lackkratzer
    DELLE = "delle"                      # Delle, Beule, eingedrückt
    RISS_BRUCH = "riss_bruch"            # Riss, gebrochen, gerissen, geplatzt
    STEINSCHLAG = "steinschlag"
    GLASBRUCH = "glasbruch"
    LACKSCHADEN = "lackschaden"          # Lack ab, abgeplatzt, verkratzt großflächig
    HAGELSCHADEN = "hagelschaden"
    MARDERBISS = "marderbiss"
    ROST_KORROSION = "rost_korrosion"
    VERFORMUNG_DEFORMATION = "verformung"  # verzogen, gestaucht (schwerer als Delle)
    FUNKTIONSDEFEKT = "funktionsdefekt"    # defekt, ohne Funktion, Fehlermeldung
    VERSCHLEISS = "verschleiss"            # verschlissen, abgefahren, ausgeschlagen
    UNDICHTIGKEIT = "undichtigkeit"        # undicht, Ölverlust, verliert Wasser
    FEHLT_VERLOREN = "fehlt"               # fehlt, abgerissen, verloren
    UNBEKANNT = "unbekannt"

class Schweregrad(str, Enum):
    LEICHT = "leicht"      # kosmetisch, polierbar, smart repair
    MITTEL = "mittel"      # instandsetzbar, spot repair + Lack
    SCHWER = "schwer"      # Austausch wahrscheinlich / Strukturschaden
    UNBEKANNT = "unbekannt"

class ExplizitAktion(str, Enum):
    """Only when the NOTE says so — never inferred by the LLM."""
    ERSETZEN = "ersetzen"            # erneuern, tauschen, austauschen, "muss neu"
    INSTANDSETZEN = "instandsetzen"  # richten, ausbeulen, spachteln, instand setzen
    LACKIEREN = "lackieren"          # lackieren, beilackieren, Lackaufbereitung
    AUS_EINBAU = "aus_einbau"        # aus-/einbauen, demontieren (explicit R&I in note!)
    POLIEREN_AUFBEREITEN = "polieren"
    KALIBRIEREN_EINSTELLEN = "kalibrieren"  # Kamera/Sensor kalibrieren, einstellen
    PRUEFEN = "pruefen"              # prüfen, kontrollieren, Diagnose

class CaseType(str, Enum):
    UNFALLSCHADEN = "unfallschaden"          # Kollision, Wildunfall, Parkrempler
    HAGELSCHADEN = "hagelschaden"
    GLASSCHADEN = "glasschaden"
    VANDALISMUS = "vandalismus"              # zerkratzt (mutwillig), eingeschlagen
    MARDERSCHADEN = "marderschaden"
    WARTUNG_SERVICE = "wartung_service"      # Inspektion, Ölservice, HU/TÜV
    VERSCHLEISSREPARATUR = "verschleissreparatur"  # Bremsen, Fahrwerk, Auspuff
    GARANTIE_KULANZ = "garantie_kulanz"
    SONSTIGES = "sonstiges"
    UNKLAR = "unklar"

class FallStatus(str, Enum):
    """Mirrors the 9 Meldewege of the reference demo, compressed."""
    ANGENOMMEN = "angenommen"                    # MW1-2
    TERMIN_VEREINBART = "termin_vereinbart"      # MW3
    FAHRZEUG_EINGETROFFEN = "fahrzeug_da"        # MW4
    KV_FREIGABE_OFFEN = "kv_freigabe_offen"      # MW5 Kostenvoranschlag/Gutachten
    IN_REPARATUR = "in_reparatur"                # MW6
    VERZOEGERT = "verzoegert"                    # MW6 (Teil fehlt, Rückstand)
    FERTIG_ABHOLBEREIT = "fertig"                # MW7
    UEBERGEBEN_ABGESCHLOSSEN = "uebergeben"      # MW8-9
    UNBEKANNT = "unbekannt"

# --- what DeepSeek must return, one call per case ---

class Schadenposition(BaseModel):
    part: BodyPart
    seite: Seite = Seite.UNBEKANNT
    schadensart: Schadensart = Schadensart.UNBEKANNT
    schweregrad: Schweregrad = Schweregrad.UNBEKANNT
    beleg_zitat: str = Field(description="Verbatim German span from the note that supports this damage")
    explizite_aktionen: list[ExplizitAktion] = []

class CaseExtraction(BaseModel):
    """LLM output — validated with model_validate_json; retry once on failure, then flag."""
    case_id: str
    case_type: CaseType = CaseType.UNKLAR
    fall_status: FallStatus = FallStatus.UNBEKANNT
    schaeden: list[Schadenposition] = []
    unmapped_terms: list[str] = Field(default=[], description="Damage/part terms that fit no enum value — NEVER silently dropped")
    notiz_leer_oder_unlesbar: bool = False

# --- deterministic layer (Python, not LLM) ---

class OpType(str, Enum):
    ERSETZEN = "ersetzen"
    INSTANDSETZEN = "instandsetzen"
    LACKIEREN = "lackieren"
    AUS_EINBAU = "aus_einbau"    # R&I

class OpSource(str, Enum):
    NOTIZ_EXPLIZIT = "notiz_explizit"       # stated in the note (highest trust)
    REGEL_SCHWERE = "regel_schwere"          # severity/damage-type rule → replace vs repair
    REGEL_ADJAZENZ = "regel_adjazenz"        # R&I from the adjacency table

class Operation(BaseModel):
    part: BodyPart
    seite: Seite
    op: OpType
    source: OpSource

class CaseRecord(BaseModel):
    """Final record: extraction + derived ops + provenance. Feeds SVG and pandas."""
    extraction: CaseExtraction
    operations: list[Operation]
    vehicle: dict = {}            # structured car info passthrough (shape TBD when dataset lands)
    raw_note: str                 # keep the original German, always
    schema_version: str = "1.0"
    model_name: str               # deepseek model id used
    extracted_at: str             # ISO timestamp
    validation_ok: bool
    validation_errors: list[str] = []
```

Design choices worth defending in the finals:
- **`beleg_zitat` (evidence span) on every damage** → every highlighted region is traceable to
  verbatim German. "Where does it break" gets a concrete answer: show the quote, show the enum,
  show `unmapped_terms` for what didn't fit.
- **`ExplizitAktion` ≠ `Operation`.** The LLM only records what the note SAYS. Replace-vs-repair
  and all R&I come from deterministic rules with `source` provenance — auditable, tweakable
  without re-running 1,000 API calls.
- **Everything has an `UNBEKANNT`/escape value** → the model is never forced to hallucinate a
  fit; validation failure → one retry with the error message → then flagged, never dropped.
- German enum values so extraction quotes and values stay in one language (no translation task).

## 6. First actions once the dataset lands (pre-pipeline sanity pass)

1. Load it, show shape + 5–10 raw notes (the deferred milestone item).
2. **Coverage scan** (no LLM): regex/fuzzy-match the synonym lexicon over all 1,000 notes →
   % of notes with ≥1 known part term, top unmatched frequent tokens → adjust taxonomy/synonyms.
3. 20-case extraction pilot → measure schema-validation pass rate before the full batch.

## 7. Proposed repo layout (next milestone, after your OK)

```
Hackathon/
├── pipeline/
│   ├── schema.py        # §5 verbatim
│   ├── lexicon.py       # synonym → enum map (coverage scan + prompt building)
│   ├── extract.py       # DeepSeek client: batch, cache by case_id (JSON per case), backoff, concurrency cap
│   ├── repair_logic.py  # RI_TABLE dict + severity rules → operations
│   └── build_dataset.py # notes → cases.parquet/JSON for frontend + analysis
├── analysis/corpus.ipynb
├── Data/frontend/       # viz pages built into the skeleton (top-down SVG car, data-driven)
└── docs/milestone-1-proposal.md   # this file
```

Environment ready: `.venv` (pydantic, pandas, openai, python-dotenv, tenacity, jupyter, matplotlib,
seaborn, plotly, pyarrow, tqdm, rapidfuzz) · frontend `yarn install` + `three`/`@react-three/fiber`/
`@react-three/drei` for the 3D stretch.
