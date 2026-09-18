# -*- coding: utf-8 -*-
"""Fine-tune a German BERT (gbert-base) for damage-severity classification, on the
GPU pod. Runs on the EXACT same 284/150 split as the CPU models (ml_split.json).
Writes gbert_result.json (accuracy, confusion, per-test-id predictions) and saves
the model dir. This is the neural contender in the 4-model benchmark.
"""
import json
import sys
from pathlib import Path

import numpy as np
import torch
from datasets import Dataset
from sklearn.metrics import accuracy_score, confusion_matrix
from transformers import (AutoModelForSequenceClassification, AutoTokenizer,
                          Trainer, TrainingArguments)

HERE = Path(__file__).resolve().parent
SPLIT = json.loads((HERE / "ml_split.json").read_text(encoding="utf-8"))
MODEL = "deepset/gbert-base"
LABELS = ["leicht", "mittel", "schwer"]
L2I = {l: i for i, l in enumerate(LABELS)}

print("CUDA:", torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else "")

tok = AutoTokenizer.from_pretrained(MODEL)


def to_ds(rows):
    return Dataset.from_dict({
        "text": [r["note_body"] for r in rows],
        "label": [L2I[r["severity"]] for r in rows],
        "id": [r["id"] for r in rows],
    })


def tokenize(batch):
    return tok(batch["text"], truncation=True, padding="max_length", max_length=192)


train_ds = to_ds(SPLIT["train"]).map(tokenize, batched=True)
test_ds = to_ds(SPLIT["test"]).map(tokenize, batched=True)

model = AutoModelForSequenceClassification.from_pretrained(MODEL, num_labels=3)

args = TrainingArguments(
    output_dir=str(HERE / "gbert_out"),
    num_train_epochs=6,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    learning_rate=3e-5,
    warmup_ratio=0.1,
    weight_decay=0.01,
    logging_steps=20,
    report_to=[],
    seed=42,
)

trainer = Trainer(model=model, args=args, train_dataset=train_ds, eval_dataset=test_ds)
trainer.train()

pred_logits = trainer.predict(test_ds).predictions
pred_idx = np.argmax(pred_logits, axis=1)
true_idx = [L2I[r["severity"]] for r in SPLIT["test"]]

acc = accuracy_score(true_idx, pred_idx)
cm = confusion_matrix(true_idx, pred_idx, labels=[0, 1, 2]).tolist()
preds = {str(r["id"]): LABELS[int(p)] for r, p in zip(SPLIT["test"], pred_idx)}

result = {"model": "gbert-base (fine-tuned)", "device": torch.cuda.get_device_name(0),
          "accuracy": round(float(acc), 4), "confusion": cm, "labels": LABELS,
          "test_ids": SPLIT["test_ids"], "predictions": preds}
(HERE / "gbert_result.json").write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")

# save a lightweight artifact for the Model Lab (tokenizer + model)
model.save_pretrained(str(HERE / "gbert_model"))
tok.save_pretrained(str(HERE / "gbert_model"))

print(f"\ngbert accuracy on 150 test: {acc*100:.1f}%")
print("confusion (rows=true light/med/severe):", cm)
