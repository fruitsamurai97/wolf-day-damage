export const PART_LABELS: Record<string, string> = {
  stossfaenger_vorne: 'Stoßstange vorne',
  stossfaenger_hinten: 'Stoßstange hinten',
  motorhaube: 'Motorhaube',
  kotfluegel_vorne: 'Kotflügel vorne',
  kotfluegel_hinten: 'Kotflügel hinten',
  tuer_vorne: 'Tür vorne',
  tuer_hinten: 'Tür hinten',
  schweller: 'Schweller',
  aussenspiegel: 'Außenspiegel',
  dach: 'Dach',
  heckklappe: 'Heckklappe',
  windschutzscheibe: 'Windschutzscheibe',
  sonstiges_karosserie: 'Sonstiges (Karosserie)',
  scheinwerfer: 'Scheinwerfer',
  rueckleuchte: 'Rückleuchte',
  kuehlergrill: 'Kühlergrill',
  zierleiste_anbauteil: 'Zierleiste / Anbauteil',
  seitenscheibe: 'Seitenscheibe',
  tuerverkleidung: 'Türverkleidung',
};

export const SEITE_LABELS: Record<string, string> = {
  links: 'links',
  rechts: 'rechts',
  ohne: '',
  unbekannt: '(Seite unbekannt)',
};

export const OP_LABELS: Record<string, string> = {
  ersetzen: 'Ersetzen (Neuteil)',
  instandsetzen: 'Instandsetzen',
  lackieren: 'Lackieren',
  aus_einbau: 'Aus-/Einbau (R&I)',
  polieren: 'Polieren / Aufbereiten',
  kalibrieren: 'Kalibrieren',
  pruefen: 'Prüfen',
};

export const OP_SOURCE_LABELS: Record<string, string> = {
  notiz_explizit: 'laut Notiz',
  regel_schwere: 'Regel: Schweregrad',
  regel_adjazenz: 'Regel: Adjazenz',
};

export const INSURANCE_LABELS: Record<string, string> = {
  teilkasko: 'Teilkasko',
  vollkasko: 'Vollkasko',
  haftpflicht_gegner: 'Gegnerische Haftpflicht',
  selbstzahler: 'Selbstzahler',
  gesteuert: 'Schadensteuerung',
  unbekannt: '—',
};

export const ART_LABELS: Record<string, string> = {
  kratzer: 'Kratzer',
  delle: 'Delle',
  riss_bruch: 'Riss / Bruch',
  steinschlag: 'Steinschlag',
  glasbruch: 'Glasbruch',
  lackschaden: 'Lackschaden',
  hagelschaden: 'Hagelschaden',
  verformung: 'Verformung',
  sonstige: 'Sonstige',
};

export const PART_LABELS_EN: Record<string, string> = {
  stossfaenger_vorne: 'Front bumper',
  stossfaenger_hinten: 'Rear bumper',
  motorhaube: 'Bonnet',
  kotfluegel_vorne: 'Front fender',
  kotfluegel_hinten: 'Rear quarter panel',
  tuer_vorne: 'Front door',
  tuer_hinten: 'Rear door',
  schweller: 'Sill',
  aussenspiegel: 'Side mirror',
  dach: 'Roof',
  heckklappe: 'Tailgate',
  windschutzscheibe: 'Windscreen',
  sonstiges_karosserie: 'Other (body)',
  scheinwerfer: 'Headlight',
  rueckleuchte: 'Taillight',
  kuehlergrill: 'Grille',
  zierleiste_anbauteil: 'Trim / attachment',
  seitenscheibe: 'Side window',
  tuerverkleidung: 'Door panel',
};

export const SEITE_LABELS_EN: Record<string, string> = {
  links: 'left',
  rechts: 'right',
  ohne: '',
  unbekannt: '(side unknown)',
};

export const OP_LABELS_EN: Record<string, string> = {
  ersetzen: 'Replace (new part)',
  instandsetzen: 'Repair',
  lackieren: 'Paint',
  aus_einbau: 'Remove & install (R&I)',
  polieren: 'Polish / detail',
  kalibrieren: 'Calibrate',
  pruefen: 'Inspect',
};

export const OP_SOURCE_LABELS_EN: Record<string, string> = {
  notiz_explizit: 'stated in note',
  regel_schwere: 'rule: severity',
  regel_adjazenz: 'rule: adjacency',
};

export const INSURANCE_LABELS_EN: Record<string, string> = {
  teilkasko: 'Partial cover (TK)',
  vollkasko: 'Full comprehensive (VK)',
  haftpflicht_gegner: "Other party's liability",
  selbstzahler: 'Self-payer',
  gesteuert: 'Steered claim',
  unbekannt: '—',
};

export const ART_LABELS_EN: Record<string, string> = {
  kratzer: 'Scratch',
  delle: 'Dent',
  riss_bruch: 'Crack / break',
  steinschlag: 'Stone chip',
  glasbruch: 'Glass breakage',
  lackschaden: 'Paint damage',
  hagelschaden: 'Hail damage',
  verformung: 'Deformation',
  sonstige: 'Other',
};

export const SEVERITY_LABELS: Record<string, Record<string, string>> = {
  de: { leicht: 'leicht', mittel: 'mittel', schwer: 'schwer' },
  en: { leicht: 'light', mittel: 'medium', schwer: 'severe' },
};

const ZONE_WORDS_EN: Record<string, string> = {
  'Stoßstange': 'bumper', 'Kotflügel': 'fender', 'Tür': 'door', 'Fahrertür': 'driver door',
  'Beifahrertür': 'passenger door', 'Schweller': 'sill', 'Außenspiegel': 'mirror',
  'Motorhaube': 'bonnet', 'Heckklappe': 'tailgate', 'Dach': 'roof', 'Windschutzscheibe': 'windscreen',
  'vorne': 'front', 'hinten': 'rear', 'links': 'left', 'rechts': 'right',
};

export function zoneToEn(zone: string): string {
  const words = zone.split(' ').map((w) => ZONE_WORDS_EN[w] ?? w);
  if (words.length > 1 && ['front', 'rear'].includes(words[1])) [words[0], words[1]] = [words[1], words[0]];
  return words.join(' ');
}

export const KIND_LABELS_EN: Record<string, string> = {
  Parkschaden: 'Parking damage',
  Rangierschaden: 'Maneuvering damage',
  Auffahrunfall: 'Rear-end collision',
  Hagelschaden: 'Hail damage',
  Steinschlag: 'Stone chip',
  Vandalismus: 'Vandalism',
  Wildunfall: 'Wildlife collision',
  Inspektion: 'Inspection',
  'Ölwechsel': 'Oil change',
  'HU/AU': 'Roadworthiness test',
  'Räder und Reifen': 'Wheels & tyres',
  Bremsen: 'Brakes',
  unklar: 'unclear',
};

export const STAGE_LABELS_EN: Record<string, string> = {
  neu: 'new',
  laufend: 'in progress',
  fertig: 'ready for pickup',
  abgeschlossen: 'closed',
  storniert: 'cancelled',
};

const IDENTITY = new Proxy({} as Record<string, string>, { get: (_, k) => String(k) });

export function getLabels(lang: string) {
  const en = lang === 'en';
  return {
    part: en ? PART_LABELS_EN : PART_LABELS,
    seite: en ? SEITE_LABELS_EN : SEITE_LABELS,
    op: en ? OP_LABELS_EN : OP_LABELS,
    opSource: en ? OP_SOURCE_LABELS_EN : OP_SOURCE_LABELS,
    insurance: en ? INSURANCE_LABELS_EN : INSURANCE_LABELS,
    art: en ? ART_LABELS_EN : ART_LABELS,
    sev: SEVERITY_LABELS[en ? 'en' : 'de'],
    kind: en ? KIND_LABELS_EN : IDENTITY,
    stage: en ? STAGE_LABELS_EN : IDENTITY,
    zone: (z: string) => (en ? zoneToEn(z) : z),
  };
}

export const SEVERITY_COLORS: Record<string, string> = {
  leicht: '#FFB74D',
  mittel: '#F4511E',
  schwer: '#B71C1C',
};

export const RI_COLOR = '#1E88E5';
export const NEUTRAL_FILL = '#ECEFF1';
export const NEUTRAL_STROKE = '#90A4AE';

export const SEVERITY_ORDER = ['leicht', 'mittel', 'schwer'];

export const KIND_TYPE: Record<string, 'damage' | 'service'> = {
  Parkschaden: 'damage',
  Rangierschaden: 'damage',
  Auffahrunfall: 'damage',
  Hagelschaden: 'damage',
  Steinschlag: 'damage',
  Vandalismus: 'damage',
  Wildunfall: 'damage',
  Inspektion: 'service',
  'Ölwechsel': 'service',
  'HU/AU': 'service',
  'Räder und Reifen': 'service',
  Bremsen: 'service',
};
