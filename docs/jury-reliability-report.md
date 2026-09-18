# Extraction reliability report — Wolf Day Track B

*This is the quality certificate of the extraction pipeline. It is deliberately kept OUT of the
product UI: the dashboard shows the dealership's business, this file shows the jury our homework.*

## The system in one paragraph

Each of the 1,000 cases carries a free-text German workshop note. DeepSeek (`deepseek-chat`,
temperature 0, JSON mode, 3 worked examples in the prompt) reads one note and fills a **strict
form** (Pydantic schema, closed vocabularies): case kind, damaged zones (part + side), damage
type, severity, payer + deductible, customer requests, secondary findings — plus a **verbatim
quote** from the note justifying every damage entry. Every response is schema-validated; an
invalid one is retried once with the error message, then flagged (never silently dropped).
Results are cached per case id, so crashes and reruns cost nothing. Everything downstream —
replace/repair decisions, the remove-and-install (R&I) list from the adjacency table, the car
drawing, the statistics — is **deterministic code, no LLM**.

## How we measure error

- **Split discipline.** 3 cases are burned as prompt examples, 20 as the tuning pilot ("dev set").
  All numbers below come from the remaining **977 test cases, never used to tune anything**.
- **Ground truth.** The dataset ships hidden labels per case, placed by the organizers precisely
  so extraction can be scored. The model never sees them; the scorer does.
- **Single-value fields** (case kind, severity, insurance): **accuracy** = share of cases where
  the extracted value equals the label. Severity/insurance are scored on damage cases only
  (service cases have no such labels).
- **Zones** (a case can have several): set comparison per case.
  TP = zones found that are in the label, FP = zones invented, FN = zones missed.
  Precision = TP/(TP+FP), Recall = TP/(TP+FN), **F1 = harmonic mean of the two** —
  the standard F1 score, yes.
- **Verbatim evidence rate**: share of the model's justification quotes that appear
  character-for-character in the original note — proof it cites rather than paraphrases
  or invents.

## Results (977 unseen test cases)

| Metric | DeepSeek | Regex baseline (Ctrl+F) |
|---|---|---|
| Case kind accuracy | **100.0 %** | 99.2 % |
| Zones precision | **100.0 %** (FP = 0) | 100.0 % |
| Zones recall | **99.9 %** (TP = 751, FN = 1) | 100.0 % |
| Zones F1 | **99.9 %** | 100.0 % |
| Severity accuracy | **68.7 %** | 0 % (impossible: never written) |
| Insurance accuracy | **100.0 %** | 76.0 % |
| Evidence quotes verbatim | **100.0 %** | — |
| Cases flagged / lost | **0 / 0** | — |

Run cost: 10.8 min wall time, 2.68 M tokens for the full corpus, 4 concurrent workers with
exponential backoff on the shared key, zero validation retries needed.

**Why keep a baseline that ties on zones?** Because this corpus is synthetic: zone names appear
with canonical spelling, which is exactly the situation a Ctrl+F wins. Production notes
("Frontschürze", "Stoßfänger", typos) break the Ctrl+F and not the LLM — and the baseline's
0 % severity / 76 % insurance show, with numbers, where reading comprehension already pays today.

## The severity finding (our favourite result)

Severity is never stated; it hides in wording ("Kratzer im Klarlack" = clear-coat scratch → light;
"Träger verformt" = carrier deformed → severe). Our 68.7 % looked improvable, so we measured the
**ceiling**: fingerprint every note's damage wording, map each fingerprint to its majority label —
a perfect lookup would reach **79.5 %**. Two case kinds (stone chip, hail) turn out to carry
almost no signal, and we can prove it — the **identical sentence**, character for character,

> „Steinschlag Windschutzscheibe im Sichtfeld Fahrer, Reparatur nicht möglich, Austausch nötig."
> *(stone chip on the windscreen in the driver's field of view, repair not possible, replacement necessary)*

is labeled **light** in case 843743, **medium** in case 820002 and **severe** in case 846256.
61 test cases contain no severity cue at all (split 25/15/21 — dice). The generator rolled
severity partly independently of the text for these kinds. Conclusion: 68.7 % captures ~86 % of
the extractable signal; the remaining errors concentrate exactly in stone chip (43) and hail (39),
the two decorrelated kinds. We kept the honest number rather than tuning on the test set.

## Where it breaks — the complete list

1. **1 zone out of 752**: case 834217 mentions the same front bumper twice ("front bumper left,
   dent 25 cm" then "front bumper: plastic pressed in"); the label counts two zones, the model
   merged them into one physical part. Arguably the more sensible reading.
2. **2 out-of-vocabulary terms** in the whole corpus: "Bremsscheiben" (brake discs, 3×) and
   "Aufnahme" (mounting, 2×) — flagged into `unmapped_terms`, never dropped.
3. **Severity on stone-chip/hail cases**: see above — a data property, not a model property.
4. Synthetic tell: the corpus is built from a phrase library (61 notes contain the identical
   sentence "Fotos liegen im Vorgang."). Our pipeline does not rely on it, but it explains why
   the regex baseline looks unrealistically strong on zones.

## Reproduce

```
.venv/Scripts/python Work/pipeline/run_pilot.py        # 20-case dev pilot
.venv/Scripts/python Work/pipeline/run_batch.py        # full corpus + this report's numbers
.venv/Scripts/python Work/pipeline/build_dataset.py    # regenerate the dashboard data
```

Full metric detail: `Work/pipeline/eval_report.json` · analysis notebooks: `Work/First EDA.ipynb`,
`Work/EDA 2 - Extraction.ipynb`.
