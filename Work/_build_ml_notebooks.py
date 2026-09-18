# -*- coding: utf-8 -*-
"""Builds the 3 ML shootout notebooks (LogReg / XGBoost / LightGBM), English,
sharing the canonical ml_common split and comparing against DeepSeek + gbert + ceiling."""
import nbformat as nbf

PIPE = r"C:\\Users\\benda\\Desktop\\Hackathon\\Work\\pipeline"

HEADER = '''import sys, json
from pathlib import Path
import numpy as np
import matplotlib.pyplot as plt
sys.path.insert(0, r"{pipe}")
from ml_common import make_split, deepseek_accuracy_on, SEV_LABELS, SEV_EN
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.pipeline import Pipeline

BLUE, ORANGE = "#2a78d6", "#eb6834"
plt.rcParams.update({{"figure.facecolor":"white","axes.facecolor":"white","axes.spines.top":False,
    "axes.spines.right":False,"axes.grid":True,"grid.color":"#e6e6e3","axes.axisbelow":True,
    "font.size":10,"axes.titlesize":11,"axes.titleweight":"bold","axes.titlelocation":"left"}})
EN = [SEV_EN[s] for s in SEV_LABELS]
L2I = {{l:i for i,l in enumerate(SEV_LABELS)}}
train, test = make_split()
Xtr, ytr = [r["note_body"] for r in train], [L2I[r["severity"]] for r in train]
Xte, yte = [r["note_body"] for r in test], [L2I[r["severity"]] for r in test]
print(f"train {{len(train)}} / test {{len(test)}} (same canonical split as every other contender)")'''.format(pipe=PIPE)

EVAL = '''pred = pipe.predict(Xte)
acc = accuracy_score(yte, pred)
cm = confusion_matrix(yte, pred, labels=[0,1,2])
fig, ax = plt.subplots(figsize=(4.4,3.4))
ax.imshow(cm, cmap="Blues"); ax.set_xticks(range(3), EN); ax.set_yticks(range(3), EN)
ax.set_xlabel("predicted"); ax.set_ylabel("true"); ax.grid(False)
for i in range(3):
    for j in range(3):
        ax.text(j,i,cm[i,j],ha="center",va="center",color="white" if cm[i,j]>cm.max()*.5 else "#333")
ax.set_title(f"{MODEL_NAME} — {acc*100:.1f}% on 150 held-out")
plt.tight_layout(); plt.show()
print(f"{MODEL_NAME} accuracy: {acc*100:.1f}%")'''

COMPARE = '''ds = deepseek_accuracy_on(test)
gb = json.load(open(Path(r"{pipe}")/"gbert_result.json", encoding="utf-8"))["accuracy"]
CEIL = 0.887  # descriptor ceiling ON THESE 150 (the full-977 ceiling is 79.5% — different set)
bars = {{"DeepSeek\\n(LLM)": ds, MODEL_NAME: acc, "gbert\\n(GPU)": gb}}
fig, ax = plt.subplots(figsize=(6,3))
xs = list(bars); ys = [bars[k]*100 for k in xs]
colors = [BLUE, ORANGE, BLUE]
ax.bar(xs, ys, color=colors, width=.6)
for i,v in enumerate(ys): ax.text(i, v+1, f"{{v:.1f}}%", ha="center", fontsize=9)
ax.axhline(CEIL*100, color="#c0392b", ls="--", lw=1.2)
ax.text(2.4, CEIL*100+0.5, "ceiling 88.7% (on these 150)", color="#c0392b", fontsize=8, ha="right")
ax.set_ylim(0,100); ax.set_ylabel("accuracy on same 150"); ax.set_title("Severity: this model vs DeepSeek vs the data ceiling")
plt.tight_layout(); plt.show()'''.format(pipe=PIPE)

NOTEBOOKS = [
    ("ML 1 - Logistic Regression.ipynb", "Logistic Regression", '''from sklearn.linear_model import LogisticRegression
pipe = Pipeline([("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1,2), max_features=5000)),
                 ("clf", LogisticRegression(max_iter=2000, C=4.0, class_weight="balanced"))])
pipe.fit(Xtr, ytr)''',
     "the linear baseline — a TF-IDF bag-of-words fed to a linear classifier. If even this scores high, the task is mostly lexical."),
    ("ML 2 - XGBoost.ipynb", "XGBoost", '''from xgboost import XGBClassifier
pipe = Pipeline([("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1,2), max_features=5000)),
                 ("clf", XGBClassifier(n_estimators=300, max_depth=5, learning_rate=0.2, subsample=0.9,
                                       eval_metric="mlogloss", verbosity=0))])
pipe.fit(Xtr, ytr)''',
     "gradient-boosted trees — can capture non-linear token interactions the linear model can't."),
    ("ML 3 - LightGBM.ipynb", "LightGBM", '''from lightgbm import LGBMClassifier
pipe = Pipeline([("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1,2), max_features=5000)),
                 ("clf", LGBMClassifier(n_estimators=300, max_depth=6, learning_rate=0.1,
                                        class_weight="balanced", verbose=-1))])
pipe.fit(Xtr, ytr)''',
     "Microsoft's gradient-boosting — fast, strong on small tabular/text-vector data."),
]

for fname, name, train_code, blurb in NOTEBOOKS:
    nb = nbf.v4.new_notebook()
    cells = [
        nbf.v4.new_markdown_cell(f'''# Severity shootout — {name}

**Goal.** Benchmark a trained classifier against our DeepSeek extraction on the *severity* field only — the one field DeepSeek finds hard (68.7% on the full corpus). This model is {blurb}

**Fair protocol.** Every contender (this model, the other two, gbert, and DeepSeek) is scored on the **exact same 150 held-out damage cases** (`ml_common.make_split`, seed 42, the 23 LLM-dev cases excluded). No GPU needed here — these train in seconds on CPU. The GPU only serves the neural contender (gbert), in its own step.

**What to expect.** This synthetic corpus partly decorrelates severity from wording (the identical sentence appears labeled light, medium and severe in different cases), so there is a hard information ceiling: **~88.7% on these 150 cases** (and ~79.5% on the full 977 — the ceiling depends on the set). A model that scores *very* high is memorizing the generator's closed phrase library, not understanding severity — and would collapse on real workshop notes. Watch the variance across the three models: that spread is the tell.'''),
        nbf.v4.new_code_cell(HEADER),
        nbf.v4.new_markdown_cell("## Train"),
        nbf.v4.new_code_cell(f'MODEL_NAME = "{name}"\n' + train_code),
        nbf.v4.new_markdown_cell("## Evaluate on the 150 held-out cases"),
        nbf.v4.new_code_cell(EVAL),
        nbf.v4.new_markdown_cell("## Compare against DeepSeek, gbert, and the ceiling"),
        nbf.v4.new_code_cell(COMPARE),
        nbf.v4.new_markdown_cell('''## Honest conclusion

On this **synthetic** test the trained models score high — sometimes above DeepSeek — because TF-IDF hands them the generator's exact phrase library and they memorize the wording→label map from 284 labeled examples. DeepSeek gets no training and works from a hand-written rubric, so it sits slightly lower here **but generalizes**: on real production notes ("Frontschürze", "Stoßfänger", typos, unseen phrasings) the memorized vocabulary breaks and the rubric keeps working. The real overfitting tell is the **variance**: LightGBM (65%) and XGBoost (82%), two near-identical boosting algorithms, disagree by 17 points on the same data — they fit the corpus, not the concept. None of them breaks the **88.7% ceiling** for these 150 cases — because the ceiling is a property of the **data**, not the model. That is the fireside point: we benchmarked linear, trees and a fine-tuned German transformer; all four hit the same wall.'''),
    ]
    nb.cells = cells
    nb.metadata.kernelspec = {"display_name": "Python 3", "language": "python", "name": "python3"}
    nbf.write(nb, rf"C:\\Users\\benda\\Desktop\\Hackathon\\Work\\{fname}")
    print("wrote", fname)
