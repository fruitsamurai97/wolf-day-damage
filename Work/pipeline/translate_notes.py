# -*- coding: utf-8 -*-
"""One-shot DeepSeek batch translation of the 1,000 workshop notes DE->EN.
Shown in the UI as an OPTIONAL machine translation under the German original —
the original stays the primary artifact (challenge rule). Cached to
frontend public/data/notes_en.json; reruns skip already-translated ids."""
import json
from pathlib import Path

from extract import ROOT, get_client, load_cases

OUT = ROOT / "Data" / "frontend" / "public" / "data" / "notes_en.json"
BATCH = 20

PROMPT = """Translate these German car-workshop notes to natural English. Keep line breaks,
dates, abbreviations expanded sensibly (Fzg. = vehicle, KVA/KV = cost estimate, SB = deductible,
HU/TÜV = roadworthiness test, KD = customer, TK/VK = partial/full cover). Keep the '~~~' separator
lines and the dated follow-up lines' structure. Return ONLY a JSON object mapping each case id
(as string key, exactly as given) to the full English translation.
Notes:
"""


def main() -> None:
    cases = load_cases()
    done: dict[str, str] = {}
    if OUT.exists():
        done = json.loads(OUT.read_text(encoding="utf-8"))
    todo = [cid for cid in sorted(cases) if str(cid) not in done]
    print(f"{len(todo)} notes to translate ({len(done)} cached)")
    client = get_client()
    for i in range(0, len(todo), BATCH):
        chunk = todo[i:i + BATCH]
        payload = {str(cid): cases[cid]["freitext"] for cid in chunk}
        resp = client.chat.completions.create(
            model="deepseek-chat", temperature=0, max_tokens=8000,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": PROMPT + json.dumps(payload, ensure_ascii=False)}])
        out = json.loads(resp.choices[0].message.content or "{}")
        for cid in chunk:
            if str(cid) in out and out[str(cid)].strip():
                done[str(cid)] = out[str(cid)]
        OUT.write_text(json.dumps(done, ensure_ascii=False), encoding="utf-8")
        print(f"{min(i + BATCH, len(todo))}/{len(todo)}", flush=True)
    print(f"written {OUT} — {len(done)} translations")


if __name__ == "__main__":
    main()
