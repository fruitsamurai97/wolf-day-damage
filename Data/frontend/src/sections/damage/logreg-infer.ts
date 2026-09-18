// In-browser re-implementation of the exported scikit-learn TF-IDF + LogisticRegression.
// Mirrors TfidfVectorizer(lowercase, ngram_range=(1,2), norm='l2', sublinear_tf=False)
// + multinomial LogisticRegression decision. Runs with zero backend.

export type LogRegModel = {
  vocabulary: Record<string, number>;
  idf: number[];
  ngram_range: [number, number];
  classes: string[];
  coef: number[][];
  intercept: number[];
  sublinear_tf: boolean;
  norm: string;
};

export type Prediction = {
  label: string;
  probs: { label: string; p: number }[];
};

// sklearn default token_pattern r"(?u)\b\w\w+\b": runs of >=2 word chars (unicode).
const TOKEN_RE = /[\p{L}\p{N}_]{2,}/gu;

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  return Array.from(lower.matchAll(TOKEN_RE), (m) => m[0]);
}

function ngrams(tokens: string[], range: [number, number]): string[] {
  const out: string[] = [];
  const [lo, hi] = range;
  for (let n = lo; n <= hi; n += 1) {
    for (let i = 0; i + n <= tokens.length; i += 1) {
      out.push(tokens.slice(i, i + n).join(' '));
    }
  }
  return out;
}

export function predict(model: LogRegModel, text: string): Prediction {
  const terms = ngrams(tokenize(text), model.ngram_range);
  // raw term frequencies over the fitted vocabulary
  const tf = new Map<number, number>();
  for (const term of terms) {
    const idx = model.vocabulary[term];
    if (idx !== undefined) tf.set(idx, (tf.get(idx) ?? 0) + 1);
  }
  // tf-idf weighting
  const weighted = new Map<number, number>();
  let norm = 0;
  for (const [idx, count] of tf) {
    const t = model.sublinear_tf ? 1 + Math.log(count) : count;
    const w = t * model.idf[idx];
    weighted.set(idx, w);
    norm += w * w;
  }
  // L2 normalization
  norm = Math.sqrt(norm) || 1;
  // linear scores per class
  const scores = model.intercept.map((b, c) => {
    let s = b;
    for (const [idx, w] of weighted) s += model.coef[c][idx] * (w / norm);
    return s;
  });
  // softmax for display
  const max = Math.max(...scores);
  const exp = scores.map((s) => Math.exp(s - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  const probs = model.classes
    .map((label, c) => ({ label, p: exp[c] / sum }))
    .sort((a, b) => b.p - a.p);
  return { label: probs[0].label, probs };
}

let cache: LogRegModel | null = null;
let promise: Promise<LogRegModel | null> | null = null;

export function loadLogReg(): Promise<LogRegModel | null> {
  if (cache) return Promise.resolve(cache);
  promise ??= fetch('/data/logreg_model.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((m: LogRegModel | null) => {
      cache = m;
      return m;
    })
    .catch(() => null);
  return promise;
}
