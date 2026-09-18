# -*- coding: utf-8 -*-
"""Train the 3 CPU contenders (LogReg, XGBoost, LightGBM) on the canonical split,
save .joblib artifacts, export the LogReg as pure JSON for in-browser inference,
and write model_comparison.json (all 4 models + DeepSeek on the SAME 150 test).
"""
import json
from pathlib import Path

import joblib
import numpy as np
from lightgbm import LGBMClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from ml_common import (SEV_LABELS, deepseek_accuracy_on, deepseek_pred, make_split)

HERE = Path(__file__).resolve().parent
MODELS_DIR = HERE / "models"
MODELS_DIR.mkdir(exist_ok=True)
FRONT_DATA = HERE.parents[1] / "Data" / "frontend" / "public" / "data"
L2I = {l: i for i, l in enumerate(SEV_LABELS)}

train, test = make_split()
Xtr, ytr = [r["note_body"] for r in train], [L2I[r["severity"]] for r in train]
Xte, yte = [r["note_body"] for r in test], [L2I[r["severity"]] for r in test]


def tfidf():
    return TfidfVectorizer(lowercase=True, ngram_range=(1, 2), max_features=5000)


MODELS = {
    "logreg": ("Logistic Regression", Pipeline([("tfidf", tfidf()),
              ("clf", LogisticRegression(max_iter=2000, C=4.0, class_weight="balanced"))])),
    "xgboost": ("XGBoost", Pipeline([("tfidf", tfidf()),
               ("clf", XGBClassifier(n_estimators=300, max_depth=5, learning_rate=0.2,
                                     subsample=0.9, eval_metric="mlogloss", verbosity=0))])),
    "lightgbm": ("LightGBM", Pipeline([("tfidf", tfidf()),
                ("clf", LGBMClassifier(n_estimators=300, max_depth=6, learning_rate=0.1,
                                       class_weight="balanced", verbose=-1))])),
}

results = {}
for key, (name, pipe) in MODELS.items():
    pipe.fit(Xtr, ytr)
    pred = pipe.predict(Xte)
    acc = accuracy_score(yte, pred)
    cm = confusion_matrix(yte, pred, labels=[0, 1, 2]).tolist()
    joblib.dump(pipe, MODELS_DIR / f"{key}.joblib")
    preds_by_id = {str(r["id"]): SEV_LABELS[int(p)] for r, p in zip(test, pred)}
    results[key] = {"name": name, "accuracy": round(float(acc), 4), "confusion": cm, "predictions": preds_by_id}
    print(f"{name:22s} {acc*100:5.1f}%  saved models/{key}.joblib")

# --- export LogReg to pure JSON for in-browser (TF-IDF + linear) inference ---
lr = MODELS["logreg"][1]
vec = lr.named_steps["tfidf"]
clf = lr.named_steps["clf"]
logreg_json = {
    "vocabulary": {t: int(i) for t, i in vec.vocabulary_.items()},   # term -> feature index
    "idf": vec.idf_.tolist(),
    "ngram_range": list(vec.ngram_range),
    "classes": [SEV_LABELS[c] for c in clf.classes_],
    "coef": clf.coef_.tolist(),                          # [n_classes-1 or n_classes][n_features]
    "intercept": clf.intercept_.tolist(),
    "sublinear_tf": bool(vec.sublinear_tf),
    "norm": vec.norm,
}
FRONT_DATA.mkdir(parents=True, exist_ok=True)
(FRONT_DATA / "logreg_model.json").write_text(json.dumps(logreg_json, ensure_ascii=False), encoding="utf-8")
print(f"exported logreg_model.json ({(FRONT_DATA / 'logreg_model.json').stat().st_size/1024:.0f} KB, {len(vec.vocabulary_)} terms)")

# --- gbert (from pod) + DeepSeek on the SAME test ---
gbert = json.loads((HERE / "gbert_result.json").read_text(encoding="utf-8"))
ds_acc = deepseek_accuracy_on(test)
ds_preds = {str(r["id"]): (deepseek_pred(r["id"]) or "unbekannt") for r in test}
ds_cm = confusion_matrix(
    yte, [L2I.get(deepseek_pred(r["id"]), 0) for r in test], labels=[0, 1, 2]).tolist()

comparison = {
    "n_test": len(test),
    "ceiling": 0.795,
    "labels": SEV_LABELS,
    "test": [{"id": r["id"], "note_body": r["note_body"], "severity": r["severity"]} for r in test],
    "models": {
        "deepseek": {"name": "DeepSeek (LLM, no training)", "accuracy": round(ds_acc, 4),
                     "confusion": ds_cm, "predictions": ds_preds, "kind": "llm"},
        "gbert": {"name": "gbert-base (fine-tuned, GPU)", "accuracy": gbert["accuracy"],
                  "confusion": gbert["confusion"], "predictions": gbert["predictions"], "kind": "neural"},
        **{k: {**v, "kind": "cpu"} for k, v in results.items()},
    },
}
(FRONT_DATA / "model_comparison.json").write_text(json.dumps(comparison, ensure_ascii=False), encoding="utf-8")
print(f"\nDeepSeek (same 150):   {ds_acc*100:5.1f}%")
print(f"gbert (same 150):      {gbert['accuracy']*100:5.1f}%")
print(f"ceiling:                79.5%")
print(f"wrote model_comparison.json")
