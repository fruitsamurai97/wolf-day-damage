# -*- coding: utf-8 -*-
"""Composes the frontend artifacts from the extraction cache + structured fields.

Outputs (into Data/frontend/public/data/):
- cases.json       one entry per case: vehicle, states, note, extraction,
                   derived operations, zones, gt control labels
- aggregates.json  corpus stats from OUR extraction + reliability panel numbers
"""
import collections
import json
from datetime import datetime
from pathlib import Path

import pandas as pd

import evaluate
from extract import CACHE_DIR, load_cases
from lexicon import zone_string
from repair_logic import derive_operations
from schema import CaseRecord

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "Data" / "frontend" / "public" / "data"
EVAL_REPORT = Path(__file__).resolve().parent / "eval_report.json"
TODAY = pd.Timestamp("2026-09-18")


def load_records() -> dict[int, CaseRecord]:
    records = {}
    for p in CACHE_DIR.glob("*.json"):
        records[int(p.stem)] = CaseRecord.model_validate_json(p.read_text(encoding="utf-8"))
    return records


def build_case(case: dict, rec: CaseRecord) -> dict:
    ex = rec.extraction
    ops = derive_operations(ex)
    zones = sorted({z for s in ex.schaeden if (z := zone_string(s.part, s.seite))})
    sev = ex.overall_severity
    return {
        "id": case["id"],
        "vehicle": {"manufacturer": case["manufacturer"], "model": case["model"],
                    "plate": case["license_plate"], "mileage": case["mileage"],
                    "first_registration": case["first_registration"]},
        "created_at": case["created_at"],
        "in_open_list": case["in_open_list"],
        "canceled": case["canceled_at"] is not None,
        "states": [{"name": s["name"], "category": s["category"], "done": s["is_done"]}
                   for s in case["states"]],
        "freitext": case["freitext"],
        "extraction": {
            "case_kind": ex.case_kind.value,
            "case_type": ex.case_type,
            "schaeden": [{"part": s.part.value, "seite": s.seite.value,
                          "schadensart": s.schadensart.value, "schweregrad": s.schweregrad.value,
                          "beleg_zitat": s.beleg_zitat,
                          "explizite_aktionen": [a.value for a in s.explizite_aktionen]}
                         for s in ex.schaeden],
            "versicherung": {"typ": ex.versicherung.typ.value, "sb": ex.versicherung.sb_betrag_eur},
            "kunden_anliegen": ex.kunden_anliegen,
            "nebenbefunde": ex.nebenbefunde,
            "unmapped_terms": ex.unmapped_terms,
        },
        "operations": [{"part": o.part.value, "seite": o.seite.value, "op": o.op.value,
                        "source": o.source.value} for o in ops],
        "zones": zones,
        "severity": sev.value if sev else None,
        "validation_ok": rec.validation_ok,
        "gt": case["ground_truth"],
    }


def build_aggregates(built: list[dict], cases: dict[int, dict]) -> dict:
    kinds = collections.Counter(b["extraction"]["case_kind"] for b in built)
    types = collections.Counter(b["extraction"]["case_type"] for b in built)
    sev = collections.Counter(b["severity"] for b in built if b["severity"])
    ins = collections.Counter(b["extraction"]["versicherung"]["typ"] for b in built
                              if b["extraction"]["case_type"] == "damage")
    zones = collections.Counter(z for b in built for z in b["zones"])
    part_sev = collections.Counter((s["part"], s["schweregrad"]) for b in built
                                   for s in b["extraction"]["schaeden"])
    cooc = collections.Counter()
    for b in built:
        zz = b["zones"]
        for i in range(len(zz)):
            for j in range(i + 1, len(zz)):
                cooc[" + ".join(sorted([zz[i], zz[j]]))] += 1
    ops_replace = collections.Counter(o["part"] for b in built for o in b["operations"]
                                      if o["op"] == "ersetzen")
    ops_ri = collections.Counter(o["part"] for b in built for o in b["operations"]
                                 if o["op"] == "aus_einbau")
    neben = collections.Counter(n for b in built for n in b["extraction"]["nebenbefunde"])
    anliegen = collections.Counter(a for b in built for a in b["extraction"]["kunden_anliegen"])
    makes = collections.Counter(b["vehicle"]["manufacturer"] for b in built)
    months = collections.Counter(b["created_at"][:7] for b in built)
    open_ages = [(TODAY - pd.Timestamp(b["created_at"])).days for b in built if b["in_open_list"]]
    sb_amounts = [b["extraction"]["versicherung"]["sb"] for b in built
                  if b["extraction"]["versicherung"]["sb"]]

    agg = {
        "n_cases": len(built),
        "case_kinds": dict(kinds.most_common()),
        "case_types": dict(types),
        "severity": {k: sev.get(k, 0) for k in ["leicht", "mittel", "schwer"]},
        "insurance": dict(ins.most_common()),
        "zones": dict(zones.most_common()),
        "zone_severity": [{"part": p, "schweregrad": s, "n": n} for (p, s), n in part_sev.most_common()],
        "zone_cooccurrence": dict(cooc.most_common(15)),
        "ops_replace_by_part": dict(ops_replace.most_common()),
        "ops_ri_by_part": dict(ops_ri.most_common()),
        "nebenbefunde_top": dict(neben.most_common(12)),
        "kunden_anliegen_top": dict(anliegen.most_common(12)),
        "makes": dict(makes.most_common()),
        "cases_per_month": dict(sorted(months.items())),
        "open_cases": {"n": len(open_ages),
                       "median_age_days": int(pd.Series(open_ages).median()) if open_ages else 0},
        "sb_amounts": dict(collections.Counter(sb_amounts).most_common()),
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }
    if EVAL_REPORT.exists():
        rep = json.loads(EVAL_REPORT.read_text(encoding="utf-8"))
        agg["reliability"] = {
            "n_test": rep["n_test"], "n_dev": rep["n_dev"],
            "deepseek_test": rep["deepseek"]["test"], "baseline_test": rep["baseline"]["test"],
            "quote_verbatim_rate": rep["quote_verbatim_rate"],
            "flagged_cases": rep["flagged_cases"], "retried_cases": rep["retried_cases"],
            "unmapped_terms": rep["unmapped_terms"],
        }
    return agg


def main() -> None:
    cases = load_cases()
    records = load_records()
    built = [build_case(cases[cid], rec) for cid, rec in sorted(records.items())]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "cases.json").write_text(json.dumps(built, ensure_ascii=False), encoding="utf-8")
    agg = build_aggregates(built, cases)
    (OUT_DIR / "aggregates.json").write_text(json.dumps(agg, ensure_ascii=False, indent=1), encoding="utf-8")
    sizes = {p.name: f"{p.stat().st_size / 1e6:.2f} MB" for p in OUT_DIR.glob("*.json")}
    print(f"built {len(built)} cases -> {OUT_DIR}")
    print(sizes)


if __name__ == "__main__":
    main()
