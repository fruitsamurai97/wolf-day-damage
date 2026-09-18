'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// ----------------------------------------------------------------------
// Minimal two-language layer. UI chrome + canonical vocab are static dicts;
// dynamic corpus vocabulary (status names, note snippets) comes from
// /data/translations_en.json, produced once by DeepSeek (translate_ui.py).
// The original German notes are never translated — challenge rule.

export type Lang = 'en' | 'de';

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'en',
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('app-lang');
      if (saved === 'de' || saved === 'en') setLangState(saved);
    } catch {
      /* private mode */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('app-lang', l);
    } catch {
      /* private mode */
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

const UI: Record<string, { de: string; en: string }> = {
  overviewTitle: { de: 'Überblick — 1.000 Werkstattfälle', en: 'Overview — 1,000 workshop cases' },
  overviewSub: {
    de: 'Alle Zahlen stammen aus unserer DeepSeek-Extraktion der deutschen Freitexte — Ground Truth dient nur der Bewertung.',
    en: 'Every number comes from our DeepSeek extraction of the German free-text notes — ground truth is used for scoring only.',
  },
  totalCases: { de: 'Fälle gesamt', en: 'Total cases' },
  damageCases: { de: 'Schadenfälle', en: 'Damage cases' },
  serviceCasesSub: { de: 'Servicefälle', en: 'service cases' },
  openFiles: { de: 'Offene Dossiers', en: 'Open cases' },
  medianAge: { de: 'Median {d} Tage alt', en: 'median age {d} days' },
  newPartsKpi: { de: 'Benötigte Neuteile', en: 'New parts to order' },
  riKpi: { de: 'Aus-/Einbau-Arbeiten (R&I)', en: 'R&I operations' },
  riKpiSub: { de: 'durch Ersetzungen ausgelöst', en: 'induced by replacements' },
  acrossDamage: { de: 'über {n} Schadenfälle', en: 'across {n} damage cases' },
  heatmapTitle: { de: 'Schaden-Heatmap', en: 'Damage heatmap' },
  heatmapSub: { de: 'Zonenhäufigkeit über alle Schadenfälle', en: 'Zone frequency across all damage cases' },
  caseKinds: { de: 'Fallarten', en: 'Case kinds' },
  damage: { de: 'Schaden', en: 'Damage' },
  service: { de: 'Service', en: 'Service' },
  severityTitle: { de: 'Schweregrad', en: 'Severity' },
  whoPays: { de: 'Wer zahlt (Schadenfälle)', en: 'Who pays (damage cases)' },
  replaceByPart: { de: 'Neuteile — Ersetzen nach Teil', en: 'New parts — replacements by part' },
  riByPart: { de: 'Aus-/Einbau (R&I) nach Teil', en: 'Remove & install (R&I) by part' },
  zoneCombos: { de: 'Zonen-Kombinationen', en: 'Zone combinations' },
  secondaryFindings: { de: 'Nebenbefunde (Upsell-Potenzial)', en: 'Secondary findings (upsell potential)' },
  reliability: { de: 'Zuverlässigkeit der Extraktion', en: 'Extraction reliability' },
  reliabilitySub: {
    de: 'Test-Split: {n} Fälle, nie fürs Prompt-Tuning benutzt · Vergleich DeepSeek vs. Regex-Baseline',
    en: 'Test split: {n} cases never used for prompt tuning · DeepSeek vs. regex baseline',
  },
  metric: { de: 'Metrik', en: 'Metric' },
  caseKind: { de: 'Fallart', en: 'Case kind' },
  zonesRow: { de: 'Zonen F1', en: 'Zones F1' },
  insuranceRow: { de: 'Versicherung', en: 'Insurance' },
  ceilingNote: {
    de: 'Schweregrad-Obergrenze im Korpus: ~79,5 % — der Generator koppelt die Schwere nur teilweise an den Wortlaut (61 Testfälle ganz ohne Hinweis). 68,7 % ≈ 86 % des extrahierbaren Signals.',
    en: 'Severity ceiling in this corpus: ~79.5% — the generator only partially ties severity to the wording (61 test cases carry no cue at all). Our 68.7% captures ~86% of the extractable signal.',
  },
  unmappedTitle: { de: 'Nicht gemappte Begriffe (geflaggt, nie verworfen)', en: 'Unmapped terms (flagged, never dropped)' },
  loadError: { de: 'Daten fehlen ({e}) — pipeline/build_dataset.py ausführen.', en: 'Data missing ({e}) — run pipeline/build_dataset.py.' },
  loading: { de: 'Lade Daten…', en: 'Loading…' },
  casesTitle: { de: 'Fälle', en: 'Cases' },
  search: { de: 'Suche', en: 'Search' },
  kind: { de: 'Art', en: 'Kind' },
  type: { de: 'Typ', en: 'Type' },
  all: { de: 'alle', en: 'all' },
  severity: { de: 'Schwere', en: 'Severity' },
  payer: { de: 'Zahler', en: 'Payer' },
  openOnly: { de: 'nur offene', en: 'open only' },
  colCase: { de: 'Dossier', en: 'Case' },
  colVehicle: { de: 'Fahrzeug', en: 'Vehicle' },
  colZones: { de: 'Zonen', en: 'Zones' },
  colStatus: { de: 'Status', en: 'Status' },
  colOpen: { de: 'Offen', en: 'Open' },
  backToList: { de: '← Liste', en: '← List' },
  notFound: { de: 'Dossier {id} nicht gefunden', en: 'Case {id} not found' },
  back: { de: 'Zurück zur Liste', en: 'Back to list' },
  extractionFlagged: { de: 'Extraktion geflaggt', en: 'Extraction flagged' },
  created: { de: 'angelegt', en: 'created' },
  openState: { de: 'offen', en: 'open' },
  closedState: { de: 'abgeschlossen', en: 'closed' },
  canceledState: { de: 'STORNIERT', en: 'CANCELLED' },
  firstReg: { de: 'EZ', en: 'first reg.' },
  noteTitle: { de: 'Werkstattnotiz (Original, Belege markiert)', en: 'Workshop note (original German, evidence highlighted)' },
  serviceHint: { de: 'Servicefall — keine Karosserieschäden extrahiert', en: 'Service case — no body damage extracted' },
  workPlan: { de: 'Schäden & Arbeitsplan', en: 'Damages & work plan' },
  customerRequests: { de: 'Kundenanliegen', en: 'Customer requests' },
  secondary: { de: 'Nebenbefunde', en: 'Secondary findings' },
  unmappedTerms: { de: 'Nicht gemappte Begriffe', en: 'Unmapped terms' },
  gtTitle: { de: 'Kontrolle (Ground Truth des Generators)', en: 'Control panel (generator ground truth)' },
  gtCaption: {
    de: 'Nur zur Bewertung sichtbar — die Extraktion hat diese Labels nie gesehen.',
    en: 'Shown for scoring transparency only — the extraction never saw these labels.',
  },
  gtZones: { de: 'Zonen', en: 'Zones' },
  gtStage: { de: 'Stadium', en: 'Stage' },
  legendLight: { de: 'leicht', en: 'light' },
  legendMedium: { de: 'mittel', en: 'medium' },
  legendSevere: { de: 'schwer', en: 'severe' },
  legendRi: { de: 'Aus-/Einbau (R&I)', en: 'Remove & install (R&I)' },
  legendIntact: { de: 'intakt', en: 'intact' },
  legendFrequent: { de: 'häufig', en: 'frequent' },
  legendRare: { de: 'selten', en: 'rare' },
  legendNone: { de: 'keine Fälle', en: 'no cases' },
  carCaption: { de: '▲ Front oben · links = Fahrerseite', en: '▲ front at top · left = driver side' },
  casesUnit: { de: 'Fälle', en: 'cases' },
  showNoteEn: { de: 'Englische Übersetzung anzeigen', en: 'Show English translation' },
  hideNoteEn: { de: 'Übersetzung ausblenden', en: 'Hide translation' },
  noteEnCaption: {
    de: 'Maschinelle Übersetzung (DeepSeek) — das deutsche Original bleibt maßgeblich.',
    en: 'Machine translation (DeepSeek) — the German original remains authoritative.',
  },
  labTitle: { de: 'Model Lab — Schweregrad', en: 'Model Lab — severity' },
  labIntro: {
    de: 'Benchmark der Schweregrad-Klassifikation: LLM (DeepSeek) vs. klassische ML-Modelle vs. ein feinjustierter deutscher BERT — alle auf denselben 150 Testfällen.',
    en: 'Severity-classification benchmark: LLM (DeepSeek) vs. classic ML models vs. a fine-tuned German BERT — all on the same 150 test cases.',
  },
  labLive: { de: 'Live ausprobieren', en: 'Try it live' },
  labLiveSub: {
    de: 'Läuft komplett im Browser (exportierte Logistische Regression). Tippe eine deutsche Notiz.',
    en: 'Runs entirely in your browser (exported Logistic Regression). Type a German note.',
  },
  labPrediction: { de: 'Vorhersage', en: 'Prediction' },
  labBench: { de: 'Benchmark', en: 'Benchmark' },
  labBenchSub: { de: 'Genauigkeit auf {n} ungesehenen Testfällen', en: 'Accuracy on {n} held-out test cases' },
  labCeiling: { de: 'Obergrenze', en: 'ceiling' },
  labCaveat: {
    de: 'Auf synthetischen Daten scoren die trainierten Modelle hoch, weil TF-IDF ihnen die Phrasen-Bibliothek des Generators liefert (Auswendiglernen). DeepSeek generalisiert dagegen auf echte Notizen. Keiner durchbricht die ~79,5%-Datengrenze belastbar.',
    en: 'On synthetic data the trained models score high because TF-IDF hands them the generator\'s phrase library (memorization). DeepSeek instead generalizes to real notes. None robustly breaks the ~79.5% data ceiling.',
  },
  labCaseByCase: { de: 'Fall für Fall', en: 'Case by case' },
  labPickCase: { de: 'Testfall wählen', en: 'Pick a test case' },
};

export function useLang() {
  const { lang, setLang } = useContext(LangContext);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = UI[key]?.[lang] ?? key;
      if (vars) Object.entries(vars).forEach(([k, v]) => (s = s.replace(`{${k}}`, String(v))));
      return s;
    },
    [lang]
  );
  return { lang, setLang, t };
}

// ---- dynamic vocabulary translated once by DeepSeek --------------------

type TranslationFile = { status: Record<string, string>; snippets: Record<string, string> };

let trCache: TranslationFile | null = null;
let trPromise: Promise<TranslationFile> | null = null;

export function useCorpusTranslations() {
  const { lang } = useContext(LangContext);
  const [tr, setTr] = useState<TranslationFile | null>(trCache);

  useEffect(() => {
    if (trCache) return undefined;
    let active = true;
    trPromise ??= fetch('/data/translations_en.json')
      .then((r) => (r.ok ? r.json() : { status: {}, snippets: {} }))
      .then((d: TranslationFile) => {
        trCache = d;
        return d;
      });
    trPromise.then((d) => active && setTr(d)).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const trStatus = useCallback(
    (name: string) => (lang === 'en' ? (tr?.status[name] ?? name) : name),
    [lang, tr]
  );
  const trSnippet = useCallback(
    (s: string) => (lang === 'en' ? (tr?.snippets[s] ?? s) : s),
    [lang, tr]
  );
  return { trStatus, trSnippet };
}

// ---- full note translations (optional EN view; original stays German) --

let notesCache: Record<string, string> | null = null;
let notesPromise: Promise<Record<string, string>> | null = null;

export function useNoteEn(caseId: number): string | null {
  const [notes, setNotes] = useState<Record<string, string> | null>(notesCache);

  useEffect(() => {
    if (notesCache) return undefined;
    let active = true;
    notesPromise ??= fetch('/data/notes_en.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Record<string, string>) => {
        notesCache = d;
        return d;
      });
    notesPromise.then((d) => active && setNotes(d)).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return notes?.[String(caseId)] ?? null;
}
