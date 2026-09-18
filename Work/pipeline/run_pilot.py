# -*- coding: utf-8 -*-
"""Pilot: stratified 20 cases (few-shot ids excluded), DeepSeek vs regex baseline,
both scored against ground truth. Run before any full batch."""
import collections
import sys

import baseline
import evaluate
from extract import extract_many, load_cases
from lexicon import FEW_SHOT_IDS


def pick_pilot_ids(cases: dict[int, dict], per_damage_kind: int = 2, per_service_kind: int = 1) -> list[int]:
    by_kind: dict[str, list[int]] = collections.defaultdict(list)
    for cid in sorted(cases):
        if cid in FEW_SHOT_IDS:
            continue
        by_kind[cases[cid]["ground_truth"]["case_kind"]].append(cid)
    damage = ["Parkschaden", "Rangierschaden", "Auffahrunfall", "Hagelschaden",
              "Steinschlag", "Vandalismus", "Wildunfall"]
    service = ["Inspektion", "Ölwechsel", "HU/AU", "Räder und Reifen", "Bremsen"]
    ids = [cid for k in damage for cid in by_kind[k][:per_damage_kind]]
    ids += [cid for k in service for cid in by_kind[k][:per_service_kind]]
    ids += by_kind["Inspektion"][per_service_kind:per_service_kind + 1]
    return ids


def main(workers: int = 4, force: bool = False) -> None:
    cases = load_cases()
    ids = pick_pilot_ids(cases)
    dmg = sum(1 for i in ids if cases[i]["ground_truth"]["case_type"] == "damage")
    print(f"pilot: {len(ids)} cases ({dmg} damage / {len(ids) - dmg} service)")

    records = extract_many(ids, workers=workers, force=force)
    llm_preds = {cid: evaluate.preds_from_record(r) for cid, r in records.items()}
    base_preds = {cid: baseline.predict(cases[cid]) for cid in ids}

    sc_llm = evaluate.score(llm_preds, cases)
    sc_base = evaluate.score(base_preds, cases)
    evaluate.print_report("deepseek", sc_llm, "baseline", sc_base)

    vrate, bad_quotes = evaluate.quote_verbatim_rate(records, cases)
    flagged = [cid for cid, r in records.items() if not r.validation_ok]
    ptok = sum(r.usage.get("prompt_tokens", 0) for r in records.values())
    ctok = sum(r.usage.get("completion_tokens", 0) for r in records.values())
    print(f"\nevidence quotes verbatim: {100 * vrate:.1f}%   flagged cases: {flagged or 'none'}")
    print(f"tokens: {ptok} prompt + {ctok} completion  (~{(ptok + ctok) / len(ids):.0f}/case)")

    print("\n-- deepseek mismatches --")
    for m in sc_llm["mismatches"][:20]:
        print("  ", m)
    if bad_quotes:
        print("-- non-verbatim quotes --")
        for q in bad_quotes[:5]:
            print("  ", q)
    print("\n-- baseline mismatches (first 12) --")
    for m in sc_base["mismatches"][:12]:
        print("  ", m)


if __name__ == "__main__":
    main(workers=int(sys.argv[1]) if len(sys.argv) > 1 else 4, force="--force" in sys.argv)
