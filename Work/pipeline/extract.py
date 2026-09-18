# -*- coding: utf-8 -*-
"""DeepSeek extraction client.

- one call per case, JSON mode, temperature 0, few-shot from real cases
- strict Pydantic validation; on failure the error is fed back once, then the
  case is flagged (never dropped)
- idempotent cache: one JSON per case id under cache/, reruns are free
- tenacity backoff for the shared, rate-limited key; capped concurrency
"""
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import openai
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import ValidationError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from lexicon import FEW_SHOT_IDS
from schema import CaseExtraction, CaseRecord

ROOT = Path(__file__).resolve().parents[2]
DATA_FILE = ROOT / "Dataset" / "kit" / "dataset" / "da-cases.json"
CACHE_DIR = Path(__file__).resolve().parent / "cache"
MODEL = "deepseek-chat"
PROMPT_VERSION = "p2"
MAX_VALIDATION_RETRIES = 2

load_dotenv(ROOT / ".env.local")

_client: OpenAI | None = None
_cases: dict[int, dict] | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.environ["DEEPSEEK_API_KEY"], base_url="https://api.deepseek.com")
    return _client


def load_cases() -> dict[int, dict]:
    global _cases
    if _cases is None:
        with open(DATA_FILE, encoding="utf-8") as f:
            _cases = {c["id"]: c for c in json.load(f)}
    return _cases


SYSTEM_PROMPT = """You are a structured-data extraction engine for a German car dealership workshop (Autohaus). You receive ONE German workshop note (Freitext) and return ONLY one JSON object — no markdown, no commentary. The note stays German; never translate extracted text.

JSON structure to return:
{
 "case_kind": "...",
 "schaeden": [{"part": "...", "seite": "...", "schadensart": "...", "schweregrad": "...", "beleg_zitat": "...", "explizite_aktionen": []}],
 "versicherung": {"typ": "...", "sb_betrag_eur": null},
 "kunden_anliegen": [],
 "nebenbefunde": [],
 "unmapped_terms": []
}

Allowed values (copy exactly):
- case_kind: "Parkschaden","Rangierschaden","Auffahrunfall","Hagelschaden","Steinschlag","Vandalismus","Wildunfall","Inspektion","Ölwechsel","HU/AU","Räder und Reifen","Bremsen","unklar"
- part: "stossfaenger_vorne","stossfaenger_hinten","motorhaube","kotfluegel_vorne","kotfluegel_hinten","tuer_vorne","tuer_hinten","schweller","aussenspiegel","dach","heckklappe","windschutzscheibe","sonstiges_karosserie"
- seite: "links","rechts","ohne","unbekannt"
- schadensart: "kratzer","delle","riss_bruch","steinschlag","glasbruch","lackschaden","hagelschaden","verformung","sonstige"
- schweregrad: "leicht","mittel","schwer","unbekannt"
- explizite_aktionen items: "ersetzen","instandsetzen","lackieren","aus_einbau","polieren","kalibrieren","pruefen"
- versicherung.typ: "teilkasko","vollkasko","haftpflicht_gegner","selbstzahler","gesteuert","unbekannt"

Rules:
1. One entry in "schaeden" per damaged zone the note names. Service notes (Inspektion, Ölwechsel, HU/AU, Räder und Reifen, Bremsen) normally have "schaeden": [].
2. Part mapping: "Fahrertür" -> part "tuer_vorne" + seite "links". "Beifahrertür" -> "tuer_vorne" + "rechts". "Kotflügel hinten" -> "kotfluegel_hinten". "Heckdeckel"/"Kofferraumdeckel" -> "heckklappe". "Frontscheibe" -> "windschutzscheibe". "Spiegel" -> "aussenspiegel".
3. seite is "links"/"rechts" only when stated. motorhaube, dach, heckklappe, windschutzscheibe: always "ohne". Bumper with no stated side: "ohne". Zone damaged on both sides: two entries.
4. Damage to a body part not in the list (Scheinwerfer, Felge, Rückleuchte, ...): part "sonstiges_karosserie" and add the German term to "unmapped_terms".
5. schweregrad is never written literally — infer from the wording cues:
   - leicht: surface only. Kratzer im Klarlack, feine Kratzspuren, Schrammen (auch 15 cm), Druckstelle (auch handtellergroß), kleine Delle, Lackschaden oberflächlich.
   - mittel: local deformation or paint penetrated. Eingedrückt, deutliche Delle, Delle mit Lackschaden, Riss im Lack, Lack abgeplatzt, Kratzer bis auf Grundierung, Halterung gebrochen, Anbauteil-Austausch nötig. Hagel mit "mehreren Dellen" -> mittel.
   - schwer: structural or large-area. Träger verformt, über zwei/mehrere Bauteile, gerissen und lose, großflächig deformiert, stark verformt, nicht fahrbereit. Hagel "flächig"/"zahlreiche Dellen" -> schwer.
   - Steinschlag Windschutzscheibe special case: "Riss wird größer", "am Rand", "Harzreparatur angeboten", "außerhalb Sichtfeld" -> schwer; "im Sichtfeld" + "Austausch nötig" -> mittel.
   The severity of the case is decided per damage entry; use "unbekannt" only with no cue at all.
6. beleg_zitat: exact verbatim substring of the note naming this damage.
7. explizite_aktionen: only actions the note literally states for that zone (erneuern/tauschen -> ersetzen; richten/ausbeulen/instand setzen -> instandsetzen; lackieren/Beilackierung/Lackabgleich -> lackieren; aus-/einbauen/Zerlegung -> aus_einbau; polieren/aufbereiten -> polieren; kalibrieren/einstellen -> kalibrieren; prüfen/kontrollieren -> pruefen). Never guess.
8. versicherung.typ: TK/Teilkasko -> teilkasko; VK/Vollkasko -> vollkasko; gegnerische Haftpflicht / Haftung anerkannt -> haftpflicht_gegner; Selbstzahler / keine Vers. -> selbstzahler; Schadensteuerer/gesteuert/vermittelt -> gesteuert; else unbekannt. "SB 500 EUR" -> sb_betrag_eur: 500.
9. kunden_anliegen: customer wishes as short verbatim snippets (KVA erwünscht, Rückruf, Leihwagen, Termin, ...). nebenbefunde: secondary findings outside the main job (Batterie schwach, Klappern, Innenraumfilter, Scheibenwischer, ...).
10. Lines after "~~~" are dated staff process history (Kalkulation, Teile, Freigabe ...), NOT new damage.
11. Extract only what the note states. Never invent. Return the JSON object only."""

FEW_SHOT_EXPECTED: dict[int, dict] = {
    834726: {
        "case_kind": "Vandalismus",
        "schaeden": [
            {"part": "kotfluegel_hinten", "seite": "rechts", "schadensart": "kratzer", "schweregrad": "leicht",
             "beleg_zitat": "Kotflügel hinten rechts: Kratzer im Klarlack, ca. 5 cm.", "explizite_aktionen": []},
            {"part": "tuer_vorne", "seite": "links", "schadensart": "kratzer", "schweregrad": "leicht",
             "beleg_zitat": "Fahrertür ebenfalls: feine Kratzspuren.", "explizite_aktionen": []},
            {"part": "kotfluegel_vorne", "seite": "rechts", "schadensart": "kratzer", "schweregrad": "leicht",
             "beleg_zitat": "Auch Kotflügel vorne rechts beschädigt (Kratzer im Klarlack).", "explizite_aktionen": []},
        ],
        "versicherung": {"typ": "vollkasko", "sb_betrag_eur": 500},
        "kunden_anliegen": ["Kunde möchte Fzg. bis Monatsende zurück", "Kunde wartet vor Ort"],
        "nebenbefunde": [],
        "unmapped_terms": [],
    },
    858388: {
        "case_kind": "Steinschlag",
        "schaeden": [
            {"part": "windschutzscheibe", "seite": "ohne", "schadensart": "steinschlag", "schweregrad": "schwer",
             "beleg_zitat": "Windschutzscheibe Steinschlag am Rand, Reparatur laut Prüfung möglich.",
             "explizite_aktionen": ["lackieren"]},
        ],
        "versicherung": {"typ": "teilkasko", "sb_betrag_eur": 150},
        "kunden_anliegen": ["Kunde will erst nach Preis entscheiden", "Abholung durch Kunde am Nachmittag"],
        "nebenbefunde": [],
        "unmapped_terms": [],
    },
    852719: {
        "case_kind": "Inspektion",
        "schaeden": [],
        "versicherung": {"typ": "unbekannt", "sb_betrag_eur": None},
        "kunden_anliegen": ["Rückruf erwünscht bevor zusätzliche Arbeiten"],
        "nebenbefunde": ["Scheibenwischer schmieren, bitte erneuern"],
        "unmapped_terms": [],
    },
}


def build_messages(freitext: str) -> list[dict]:
    msgs = [{"role": "system", "content": SYSTEM_PROMPT}]
    cases = load_cases()
    for fid in FEW_SHOT_IDS:
        msgs.append({"role": "user", "content": cases[fid]["freitext"]})
        msgs.append({"role": "assistant", "content": json.dumps(FEW_SHOT_EXPECTED[fid], ensure_ascii=False)})
    msgs.append({"role": "user", "content": freitext})
    return msgs


@retry(retry=retry_if_exception_type((openai.RateLimitError, openai.APIConnectionError,
                                      openai.APITimeoutError, openai.InternalServerError)),
       wait=wait_exponential(multiplier=2, min=2, max=30), stop=stop_after_attempt(6), reraise=True)
def _chat(messages: list[dict]):
    return get_client().chat.completions.create(
        model=MODEL, messages=messages, temperature=0, max_tokens=1400,
        response_format={"type": "json_object"})


def _cache_path(case_id: int) -> Path:
    return CACHE_DIR / f"{case_id}.json"


def read_cached(case_id: int) -> CaseRecord | None:
    p = _cache_path(case_id)
    if not p.exists():
        return None
    try:
        return CaseRecord.model_validate_json(p.read_text(encoding="utf-8"))
    except ValidationError:
        return None


def extract_case(case_id: int, force: bool = False) -> CaseRecord:
    if not force:
        cached = read_cached(case_id)
        if cached is not None and cached.validation_ok:
            return cached
    case = load_cases()[case_id]
    messages = build_messages(case["freitext"])
    errors: list[str] = []
    usage = {"prompt_tokens": 0, "completion_tokens": 0}
    extraction, ok, attempts = None, False, 0
    for attempt in range(1 + MAX_VALIDATION_RETRIES):
        attempts = attempt + 1
        resp = _chat(messages)
        usage["prompt_tokens"] += resp.usage.prompt_tokens
        usage["completion_tokens"] += resp.usage.completion_tokens
        raw = resp.choices[0].message.content or ""
        try:
            extraction = CaseExtraction.model_validate_json(raw)
            ok = True
            break
        except ValidationError as e:
            errors.append(str(e)[:600])
            messages = messages + [
                {"role": "assistant", "content": raw},
                {"role": "user", "content": f"Your JSON failed schema validation:\n{e}\nReturn the corrected JSON object only."},
            ]
    if extraction is None:
        extraction = CaseExtraction()  # empty, flagged record — never dropped
    record = CaseRecord(
        case_id=case_id, extraction=extraction, validation_ok=ok,
        validation_errors=errors, attempts=attempts, model_name=MODEL,
        prompt_version=PROMPT_VERSION,
        extracted_at=datetime.now(timezone.utc).isoformat(timespec="seconds"), usage=usage)
    CACHE_DIR.mkdir(exist_ok=True)
    _cache_path(case_id).write_text(record.model_dump_json(indent=1), encoding="utf-8")
    return record


def extract_many(case_ids: list[int], workers: int = 4, force: bool = False) -> dict[int, CaseRecord]:
    results: dict[int, CaseRecord] = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(extract_case, cid, force): cid for cid in case_ids}
        for i, fut in enumerate(as_completed(futures), 1):
            cid = futures[fut]
            results[cid] = fut.result()
            flag = "" if results[cid].validation_ok else "  !! FLAGGED"
            print(f"[{i}/{len(case_ids)}] case {cid} ok={results[cid].validation_ok}{flag}", flush=True)
    return results
