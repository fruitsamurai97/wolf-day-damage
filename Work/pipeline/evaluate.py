# -*- coding: utf-8 -*-
"""Scoring against ground truth. Works for both the LLM records and the baseline.

Predictions format per case id:
{"kind": str, "type": str, "zones": set[str], "severity": str|None, "insurance": str|None}
"""
from lexicon import zone_string
from schema import CaseRecord


def preds_from_record(rec: CaseRecord) -> dict:
    ex = rec.extraction
    zones = {zone_string(s.part, s.seite) for s in ex.schaeden}
    zones.discard(None)
    sev = ex.overall_severity
    return {"kind": ex.case_kind.value, "type": ex.case_type, "zones": zones,
            "severity": sev.value if sev else None,
            "insurance": ex.versicherung.typ.value if ex.versicherung.typ.value != "unbekannt" else None}


def score(preds: dict[int, dict], cases: dict[int, dict]) -> dict:
    n = len(preds)
    kind_ok = type_ok = 0
    sev_ok = sev_n = ins_ok = ins_n = 0
    tp = fp = fn = 0
    mismatches = []
    for cid, p in preds.items():
        gt = cases[cid]["ground_truth"]
        if p["kind"] == gt["case_kind"]:
            kind_ok += 1
        else:
            mismatches.append((cid, "kind", p["kind"], gt["case_kind"]))
        if p["type"] == gt["case_type"]:
            type_ok += 1
        gt_zones = set(gt["zones"])
        tp += len(p["zones"] & gt_zones)
        fp += len(p["zones"] - gt_zones)
        fn += len(gt_zones - p["zones"])
        for z in p["zones"] - gt_zones:
            mismatches.append((cid, "zone+", z, "not in GT"))
        for z in gt_zones - p["zones"]:
            mismatches.append((cid, "zone-", "missed", z))
        if gt["severity"]:
            sev_n += 1
            if p["severity"] == gt["severity"]:
                sev_ok += 1
            else:
                mismatches.append((cid, "severity", str(p["severity"]), gt["severity"]))
        if gt["insurance_type"]:
            ins_n += 1
            if p["insurance"] == gt["insurance_type"]:
                ins_ok += 1
            else:
                mismatches.append((cid, "insurance", str(p["insurance"]), gt["insurance_type"]))
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return {"n": n, "kind_acc": kind_ok / n, "type_acc": type_ok / n,
            "zones_precision": prec, "zones_recall": rec, "zones_f1": f1,
            "zones_tp": tp, "zones_fp": fp, "zones_fn": fn,
            "severity_acc": sev_ok / sev_n if sev_n else None, "severity_n": sev_n,
            "insurance_acc": ins_ok / ins_n if ins_n else None, "insurance_n": ins_n,
            "mismatches": mismatches}


def quote_verbatim_rate(records: dict[int, CaseRecord], cases: dict[int, dict]) -> tuple[float, list]:
    ok = total = 0
    bad = []
    for cid, rec in records.items():
        note = cases[cid]["freitext"]
        for s in rec.extraction.schaeden:
            total += 1
            if s.beleg_zitat and s.beleg_zitat.strip(" .") in note:
                ok += 1
            else:
                bad.append((cid, s.beleg_zitat[:60]))
    return (ok / total if total else 1.0), bad


def fmt_pct(x) -> str:
    return "  —  " if x is None else f"{100 * x:5.1f}%"


def print_report(name_a: str, sc_a: dict, name_b: str, sc_b: dict) -> None:
    print(f"\n{'metric':<22}{name_a:>12}{name_b:>12}")
    print("-" * 46)
    rows = [("case kind acc", "kind_acc"), ("case type acc", "type_acc"),
            ("zones precision", "zones_precision"), ("zones recall", "zones_recall"),
            ("zones F1", "zones_f1"), ("severity acc", "severity_acc"),
            ("insurance acc", "insurance_acc")]
    for label, key in rows:
        print(f"{label:<22}{fmt_pct(sc_a[key]):>12}{fmt_pct(sc_b[key]):>12}")
    print(f"{'zones tp/fp/fn':<22}{sc_a['zones_tp']}/{sc_a['zones_fp']}/{sc_a['zones_fn']:>4}"
          f"{'':>6}{sc_b['zones_tp']}/{sc_b['zones_fp']}/{sc_b['zones_fn']}")
