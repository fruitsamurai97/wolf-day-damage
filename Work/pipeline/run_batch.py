# -*- coding: utf-8 -*-
"""Full-corpus extraction + evaluation.

Scores twice: on all 1,000 cases, and on the untouched test split (everything
except the 3 few-shot cases and the 20-case pilot dev set used for prompt
tuning). Writes eval_report.json for the dashboard.
"""
import json
import time
from pathlib import Path

import baseline
import evaluate
from extract import extract_many, load_cases
from lexicon import FEW_SHOT_IDS
from run_pilot import pick_pilot_ids

OUT = Path(__file__).resolve().parent / "eval_report.json"


def main(workers: int = 5) -> None:
    cases = load_cases()
    all_ids = sorted(set(cases) - set(FEW_SHOT_IDS))
    dev_ids = set(pick_pilot_ids(cases))
    test_ids = [i for i in all_ids if i not in dev_ids]
    print(f"batch: {len(all_ids)} cases ({len(test_ids)} test / {len(dev_ids)} dev)", flush=True)

    t0 = time.time()
    records = extract_many(all_ids, workers=workers)
    dt = time.time() - t0

    llm_preds = {cid: evaluate.preds_from_record(r) for cid, r in records.items()}
    base_preds = {cid: baseline.predict(cases[cid]) for cid in all_ids}

    def sub(preds, ids):
        return {i: preds[i] for i in ids}

    sc_llm_all = evaluate.score(llm_preds, cases)
    sc_llm_test = evaluate.score(sub(llm_preds, test_ids), cases)
    sc_base_all = evaluate.score(base_preds, cases)
    sc_base_test = evaluate.score(sub(base_preds, test_ids), cases)
    vrate, bad_quotes = evaluate.quote_verbatim_rate(records, cases)

    flagged = [cid for cid, r in records.items() if not r.validation_ok]
    retried = [cid for cid, r in records.items() if r.attempts > 1]
    unmapped = {}
    for r in records.values():
        for t in r.extraction.unmapped_terms:
            unmapped[t] = unmapped.get(t, 0) + 1
    ptok = sum(r.usage.get("prompt_tokens", 0) for r in records.values())
    ctok = sum(r.usage.get("completion_tokens", 0) for r in records.values())

    def clean(sc):
        return {k: v for k, v in sc.items() if k != "mismatches"}

    report = {
        "n_total": len(all_ids), "n_test": len(test_ids), "n_dev": len(dev_ids),
        "wall_seconds": round(dt), "prompt_tokens": ptok, "completion_tokens": ctok,
        "flagged_cases": flagged, "retried_cases": retried,
        "quote_verbatim_rate": round(vrate, 4),
        "non_verbatim_quotes": bad_quotes[:20],
        "unmapped_terms": dict(sorted(unmapped.items(), key=lambda kv: -kv[1])),
        "deepseek": {"all": clean(sc_llm_all), "test": clean(sc_llm_test)},
        "baseline": {"all": clean(sc_base_all), "test": clean(sc_base_test)},
        "deepseek_mismatches_test": sc_llm_test["mismatches"][:100],
    }
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"\ndone in {dt / 60:.1f} min — {ptok + ctok:,} tokens", flush=True)
    print("\n=== TEST SPLIT (untouched during tuning) ===")
    evaluate.print_report("deepseek", sc_llm_test, "baseline", sc_base_test)
    print(f"\nquotes verbatim: {100 * vrate:.1f}%  flagged: {len(flagged)}  retried: {len(retried)}")
    print(f"unmapped terms: {sum(unmapped.values())} mentions / {len(unmapped)} distinct")
    print(f"report -> {OUT}")


if __name__ == "__main__":
    main()
