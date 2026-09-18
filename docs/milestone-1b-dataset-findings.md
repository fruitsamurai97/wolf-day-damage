# Milestone 1b — Dataset findings & schema revisions (v1.1)

Dataset read in full: `Dataset/kit/dataset/` — `da-cases.json` (1,000 nested cases), `da-cases.csv`
(44 flat cols), `schema.json` (field docs + vocabularies), `states.json` (213 statuses, 8 categories).
Synthetic, seed 20260918, UTF-8. Structure mirrors the production "DA Dealer Assistant" system.

## Case anatomy (verified)

Flat fields: id, timestamps (created/updated/canceled, completion, reparation start/end),
vehicle (plate, VIN, manufacturer, model, model_type, first_registration, mileage),
contact (name, address, email ~1/5 null, phone, customer_number), `in_open_list`.
Nested: `states` (resolved, first = general case status), `statables` (raw status rows),
`orders` (1,167 total; insurer_id on 391), `workshop_tasks` (1,767; team/date/work_load, no text),
`note` (HTML) / `freitext` (plain), `ground_truth`.

Corpus: 550 service / 450 damage. Makes: VW 175, Audi 144, Mercedes 141, BMW 135, Skoda 134,
Ford 97, Seat 87, Opel 87. Lifecycle: neu 175, laufend 324, fertig 169, abgeschlossen 288,
storniert 44. Insurance (damage only): teilkasko 140, selbstzahler 112, vollkasko 80,
haftpflicht_gegner 75, gesteuert 43. Severity: leicht 164, mittel 183, schwer 103.

## The three discoveries that reshape the plan

1. **`ground_truth` per case** (case_type, case_kind, zones, severity, insurance_type,
   lifecycle_stage; also as `gt_*` CSV cols) — "there so you can score your extraction".
   → We add an **evaluation module**: precision/recall per field, confusion by case kind.
   Reliability stops being a claim and becomes a number.
2. **All 785 GT zone mentions appear VERBATIM in the notes** (checked case-insensitively; zero
   misses). Notes name zones in prose but with canonical spelling ("Kotflügel hinten rechts:
   Kratzer im Klarlack"). → A deterministic regex/lexicon **baseline** is feasible and we build
   it as comparison. The LLM's real job is what is NOT literal: **severity is never stated**
   (0/1000 notes contain leicht/mittel/schwer — it hides in descriptors: "Kratzer im Klarlack"
   vs "Kratzer bis auf Grundierung" vs "Riss wird laut Kunde größer"), insurance context
   (TK/VK/SB-Beträge), customer requests, secondary complaints, follow-up history.
   Substring trap for the baseline: "Stoßstange vorne" ⊂ "Stoßstange vorne links".
3. **Status is structured data** — 213 emoji statuses in 8 categories (Vorgangsstatus, Teile,
   Termin, Werkstatt Mech., Karosserie, Lack, Teiledienst, Schadensteuerer) resolved inline in
   `states`. → **Drop FallStatus from LLM extraction entirely**; lifecycle/status come from
   `states` + `gt_lifecycle_stage`. The 9-Meldewege enum idea is obsolete.

## Note structure (verified)

~75–623 chars, median 290. Body = kind + zones + descriptors + customer wish + insurance line +
logistics line. 688/1000 carry a `~~~~~~~~~~~~~` block with dated role-prefixed follow-ups
("08.02.26 12:50 Lack: Kalkulation fertig, an Prüfer") — parse separately as `followups[]`.
Abbreviations everywhere: KVA/KV, HU/TÜV, TK/VK, SB (=Selbstbeteiligung), Fzg., KD, Dispo.
Synthetic tell: recurring phrase library (47× "Zusätzlich Klappern vorne rechts bei Bodenwellen",
47× "Innenraumfilter riecht", 61× "Fotos liegen im Vorgang") — say it openly at the fireside;
the pipeline doesn't depend on it.

## Schema v1.1 deltas (vs milestone-1 proposal §5)

| Change | Reason |
| --- | --- |
| `BodyPart` aligned to GT: 12 parts — STOSSFAENGER_VORNE/HINTEN, MOTORHAUBE, KOTFLUEGEL_VORNE, **KOTFLUEGEL_HINTEN** (was SEITENWAND), TUER_VORNE, TUER_HINTEN, SCHWELLER, AUSSENSPIEGEL, DACH, HECKKLAPPE, WINDSCHUTZSCHEIBE (+ SONSTIGES escape) | GT zone vocab = these 12 × side; scoring needs 1:1 mapping. Extra parts (Scheinwerfer, Felge, …) stay in the lexicon as `SONSTIGES`+term so nothing is lost |
| `seite` axis kept: links/rechts/none; Fahrertür→(TUER_VORNE, links), Beifahrertür→(TUER_VORNE, rechts); bumpers may carry no side | exact GT reconstruction `(part, seite) → zone string` |
| `CaseKind` = the 12 GT kinds (7 damage: Parkschaden, Rangierschaden, Auffahrunfall, Hagelschaden, Steinschlag, Vandalismus, Wildunfall; 5 service: Inspektion, Ölwechsel, HU/AU, Räder und Reifen, Bremsen) + UNKLAR | replaces guessed CaseType; named in note 863/1000, inferable otherwise |
| NEW `versicherung`: typ (teilkasko/vollkasko/haftpflicht_gegner/selbstzahler/gesteuert/unbekannt) + `sb_betrag_eur` | GT field; notes carry "TK, SB 300 EUR" lines |
| REMOVED `FallStatus` from extraction | comes from structured `states` |
| `schweregrad` stays leicht/mittel/schwer + beleg_zitat | never literal → the genuine inference, evidence-backed |
| NEW `nebenbefunde: list[str]` (secondary complaints: Batterie schwach, Klappern, Innenraumfilter…) | service-note richness → corpus analysis |
| NEW module `evaluate.py` | GT scoring: zones P/R/F1, kind & severity accuracy, per-kind confusion |
| NEW `baseline.py` (regex lexicon over the enumerable vocabulary) | honest comparison LLM vs deterministic; substring-safe matching |

Unchanged: extraction→Pydantic validation→flag-never-drop, per-case cache, backoff;
deterministic R&I table (GT has **no** replace/repair labels → stretch stays rule-based);
top-down SVG keyed by (part, seite); pandas corpus analysis.

## Analysis angles the data just unlocked

Zone×kind heatmap (Hagel→Dach/Motorhaube/Heckklappe; Rangier→Stoßstangen corners),
severity×insurance (who pays for heavy damage), open-worklist aging (668 open, created_at→today),
storno analysis (44), follow-up-role activity, secondary-complaint upsell frequency,
mileage/make vs case kind, multi-zone patterns (254 cases >1 zone).
