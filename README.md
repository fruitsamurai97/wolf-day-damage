# Wolf Day — Damage Intelligence (Track B)

Turning messy, free-text **German** car-damage notes into reliable, **structured** data — and two connected views from a single record: a **data-driven car diagram** (2D + 3D) and a **corpus dashboard**.

Wolf Day hackathon · Track B — DaiL · Casablanca AI Lab
🔗 **Live demo:** https://wolf-day-damage.vercel.app/dashboard

---

## The problem
Car dealerships log vehicle damage as unstructured German notes — no schema, inconsistent wording, and severity almost never stated explicitly. That text can't be searched, analysed, or turned into a repair plan at scale. The Track B brief: take a working prototype to a **production-ready** product.

## How it works — *the LLM only reads; the code decides*
1. **Extraction (LLM).** DeepSeek reads each note and fills a strict JSON form validated by a **Pydantic schema with a closed vocabulary** (part, side, damage type, severity, case kind, insurer) — always backed by a **verbatim quote** from the note as evidence. The German is never translated.
2. **Decision (deterministic).** Reviewed rules — *not* LLM guesses — decide **repair vs. replace** and derive the **Remove-&-Install (R&I / Aus-/Einbau)** operations from a side-aware adjacency table. Every operation keeps a provenance tag (note-stated / severity-rule / adjacency-rule), so it's auditable.
3. **Two views, one record.** The same structured record feeds a colour-coded **top-down SVG + 3D car** and a **pandas corpus analysis** (KPIs, case mix, out-of-vocabulary flags).

## Results — scored against ground truth (977 unseen cases)
| Field | Result |
|---|---|
| Damage zones (multi-label) | **F1 99.9%** |
| Case type · Insurer | **100% · 100%** |
| Verbatim evidence present | **100%** |
| Records lost / dropped | **0** |
| Severity (DeepSeek) | **68.7%** — ≈ 86% of the data's own ceiling (**79.5%**) |

The severity limit lives in the **data**, not the model: identical sentences carry different severity labels in the ground truth.

### Severity model shootout (same 150-case test)
DeepSeek vs. classic ML (Logistic Regression / XGBoost / LightGBM) vs. a fine-tuned **German BERT (gBERT)**. The 17-point gap between two near-identical boosting models (XGBoost 82.0% vs. LightGBM 65.3%) is the tell: they **memorise** the synthetic phrase library instead of *understanding* severity — the highest score is the least trustworthy. We ship the LLM's severity because it **generalises**. See the `Work/ML *.ipynb` notebooks and the in-app **Model Lab** (live in-browser prediction).

## Repository layout
```
Dataset/              Track B data kit (provided by the organizers)
Data/
  CHALLENGE.md          challenge brief (organizers)
  frontend/             Next.js dashboard — the live app (Vercel root dir)
    public/data/*.json  data-driven inputs (cases, aggregates, model comparison)
  reference-demo/       organizers' reference demo
  *.pptx                presentation deck (final: Damage_Intelligence_EN_v2.pptx)
  wolf-day-qr.png       QR to the live demo
Work/
  *.ipynb               EDA + ML notebooks
  pipeline/             the Python engine
    schema.py             Pydantic closed-vocabulary schema
    extract.py            DeepSeek extraction — the LLM "reads"
    repair_logic.py       deterministic repair/replace + R&I — the code "decides"
    lexicon.py  baseline.py  evaluate.py
    ml_common.py  train_cpu_models.py  train_gbert.py
    build_dataset.py      composes the frontend JSON
    requirements.txt      Python dependencies
    models/*.joblib
docs/                 jury reliability report, fireside cheat-sheet, milestone notes
```

## Run it
**Frontend** — no backend or keys needed (it reads static JSON):
```bash
cd Data/frontend
yarn install && yarn dev      # or: npm install && npm run dev  →  http://localhost:3000
```

**Pipeline** (Python 3.10+):
```bash
pip install -r Work/pipeline/requirements.txt

# The DeepSeek key is server-side ONLY — it is never shipped to the client.
# Put it in a git-ignored .env.local at the repo root:
echo "DEEPSEEK_API_KEY=sk-..." > .env.local

cd Work/pipeline
python run_pilot.py        # small, scored pilot
python run_batch.py        # full corpus
python build_dataset.py    # regenerate the frontend JSON
python train_cpu_models.py # LogReg / XGBoost / LightGBM (CPU)
```
`train_gbert.py` fine-tunes German BERT and needs a GPU (`torch` + `transformers`).

## Limitations (stated up front)
- **Synthetic corpus** — part names are written exactly like the vocabulary, so a plain regex baseline is artificially strong on zones; the LLM's real edge shows on the fields that need *understanding* (severity, insurer) and on the nested structure that drives the drawing.
- **Severity ceiling** is a property of the data (identical sentence → conflicting labels), not of any model.
- **R&I table** is hand-reviewed business logic, not a measured model; mechanical dependencies (e.g. brakes → wheels) are out of scope.
- **2 out-of-vocabulary terms** in the entire corpus — flagged, never dropped.

## Data & credits
`Dataset/`, `Data/CHALLENGE.md`, `Data/DATASET.md` and `Data/reference-demo/` are **materials provided by the organizers** (DaiL · Casablanca AI Lab), included for reproducibility. All other code and analysis are the author's own.
