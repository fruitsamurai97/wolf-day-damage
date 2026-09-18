# -*- coding: utf-8 -*-
"""Single source of truth for the severity-classification benchmark split.

Every contender (LogReg, XGBoost, LightGBM, gbert, and DeepSeek) is scored on
the EXACT SAME held-out test cases produced here — otherwise the comparison is
meaningless. Damage cases only; the 23 LLM-dev ids are excluded; stratified
150-case test split, fixed seed.
"""
import json
from pathlib import Path

from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[2]
DATA_FILE = ROOT / "Dataset" / "kit" / "dataset" / "da-cases.json"
CACHE_DIR = Path(__file__).resolve().parent / "cache"
SEED = 42
TEST_SIZE = 150

SEV_ORDER = {"leicht": 1, "mittel": 2, "schwer": 3}
SEV_LABELS = ["leicht", "mittel", "schwer"]
SEV_EN = {"leicht": "light", "mittel": "medium", "schwer": "severe"}

# the 3 few-shot ids + 20 pilot ids used to tune the DeepSeek prompt -> excluded
FEW_SHOT_IDS = [834726, 858388, 852719]
PILOT_IDS = [820141, 820258, 820558, 820709, 820223, 821084, 821794, 821961, 820002,
             820498, 821314, 826460, 823577, 823588, 821520, 820951, 820579, 820879, 820869, 823016]
DEV_IDS = set(FEW_SHOT_IDS + PILOT_IDS)


def load_damage_rows():
    """Return sorted list of {id, note_body, severity} for damage cases minus dev ids."""
    cases = json.load(open(DATA_FILE, encoding="utf-8"))
    rows = []
    for c in sorted(cases, key=lambda x: x["id"]):
        gt = c["ground_truth"]
        if gt["severity"] and c["id"] not in DEV_IDS:
            rows.append({
                "id": c["id"],
                "note_body": c["freitext"].split("~~~")[0].strip(),
                "severity": gt["severity"],
            })
    return rows


def make_split():
    """Deterministic train/test split. Returns (train_rows, test_rows)."""
    rows = load_damage_rows()
    y = [r["severity"] for r in rows]
    train, test = train_test_split(rows, test_size=TEST_SIZE, random_state=SEED, stratify=y)
    return train, test


def deepseek_pred(case_id: int):
    """Case-level severity from the cached DeepSeek extraction (max over entries)."""
    p = CACHE_DIR / f"{case_id}.json"
    if not p.exists():
        return None
    rec = json.loads(p.read_text(encoding="utf-8"))
    sevs = [s["schweregrad"] for s in rec["extraction"]["schaeden"] if s["schweregrad"] != "unbekannt"]
    if not sevs:
        return None
    return max(sevs, key=lambda s: SEV_ORDER.get(s, 0))


def deepseek_accuracy_on(test_rows):
    ok = sum(1 for r in test_rows if deepseek_pred(r["id"]) == r["severity"])
    return ok / len(test_rows)


if __name__ == "__main__":
    train, test = make_split()
    out = {"seed": SEED, "test_size": TEST_SIZE,
           "train_ids": [r["id"] for r in train], "test_ids": [r["id"] for r in test],
           "test": [{"id": r["id"], "note_body": r["note_body"], "severity": r["severity"]} for r in test],
           "train": [{"id": r["id"], "note_body": r["note_body"], "severity": r["severity"]} for r in train]}
    (Path(__file__).parent / "ml_split.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"train {len(train)} / test {len(test)} -> ml_split.json")
    print(f"DeepSeek accuracy on this test split: {deepseek_accuracy_on(test) * 100:.1f}%")
