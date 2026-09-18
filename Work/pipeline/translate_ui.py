# -*- coding: utf-8 -*-
"""One-shot DeepSeek batch translation DE->EN of the dynamic vocabulary shown in
the UI: the 213 workshop status names and the recurring note snippets
(kunden_anliegen / nebenbefunde). The original notes are NEVER translated —
the challenge keeps them German. Output cached to frontend public/data/."""
import json
from pathlib import Path

from extract import ROOT, get_client, load_cases, read_cached

OUT = ROOT / "Data" / "frontend" / "public" / "data" / "translations_en.json"
STATES_FILE = ROOT / "Dataset" / "kit" / "dataset" / "states.json"

PROMPT = """You translate German car-workshop vocabulary to concise English for a dealership dashboard.
Return ONLY a JSON object mapping each input string EXACTLY as given to its English translation.
Keep any leading emoji unchanged. Keep abbreviations sensible (Fzg. = vehicle, KVA/KV = cost estimate,
SB = deductible, HU/TÜV = roadworthiness test, KD = customer). Keep it short, dashboard-style.
Strings to translate:
"""


def translate_batch(strings: list[str]) -> dict[str, str]:
    resp = get_client().chat.completions.create(
        model="deepseek-chat", temperature=0, max_tokens=4000,
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": PROMPT + json.dumps(strings, ensure_ascii=False, indent=0)}])
    return json.loads(resp.choices[0].message.content or "{}")


def main() -> None:
    states = json.load(open(STATES_FILE, encoding="utf-8"))
    status_names = [s["name"] for s in states["states"]]
    categories = [c["name"] for c in states["state_categories"]]

    snippets: set[str] = set()
    for cid in load_cases():
        rec = read_cached(cid)
        if rec:
            snippets.update(rec.extraction.kunden_anliegen)
            snippets.update(rec.extraction.nebenbefunde)
            snippets.update(rec.extraction.unmapped_terms)
    snippet_list = sorted(snippets)
    print(f"{len(status_names)} statuses, {len(categories)} categories, {len(snippet_list)} distinct snippets")

    result: dict[str, dict[str, str]] = {"status": {}, "snippets": {}}
    todo = status_names + categories
    for i in range(0, len(todo), 60):
        result["status"].update(translate_batch(todo[i:i + 60]))
        print(f"status {min(i + 60, len(todo))}/{len(todo)}")
    for i in range(0, len(snippet_list), 60):
        result["snippets"].update(translate_batch(snippet_list[i:i + 60]))
        print(f"snippets {min(i + 60, len(snippet_list))}/{len(snippet_list)}")

    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    missing = [s for s in todo if s not in result["status"]]
    print(f"written {OUT} — missing status translations: {len(missing)}")


if __name__ == "__main__":
    main()
