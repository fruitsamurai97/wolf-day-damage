export type Schaden = {
  part: string;
  seite: string;
  schadensart: string;
  schweregrad: string;
  beleg_zitat: string;
  explizite_aktionen: string[];
};

export type Operation = {
  part: string;
  seite: string;
  op: string;
  source: string;
};

export type CaseData = {
  id: number;
  vehicle: {
    manufacturer: string;
    model: string;
    plate: string;
    mileage: number;
    first_registration: string;
  };
  created_at: string;
  in_open_list: boolean;
  canceled: boolean;
  states: { name: string; category: string; done: boolean }[];
  freitext: string;
  extraction: {
    case_kind: string;
    case_type: string;
    schaeden: Schaden[];
    versicherung: { typ: string; sb: number | null };
    kunden_anliegen: string[];
    nebenbefunde: string[];
    unmapped_terms: string[];
  };
  operations: Operation[];
  zones: string[];
  severity: string | null;
  validation_ok: boolean;
  gt: {
    case_type: string;
    case_kind: string;
    zones: string[];
    severity: string | null;
    insurance_type: string | null;
    lifecycle_stage: string;
  };
};

export type Aggregates = {
  n_cases: number;
  case_kinds: Record<string, number>;
  case_types: Record<string, number>;
  severity: Record<string, number>;
  insurance: Record<string, number>;
  zones: Record<string, number>;
  zone_severity: { part: string; schweregrad: string; n: number }[];
  zone_cooccurrence: Record<string, number>;
  ops_replace_by_part: Record<string, number>;
  ops_ri_by_part: Record<string, number>;
  nebenbefunde_top: Record<string, number>;
  kunden_anliegen_top: Record<string, number>;
  makes: Record<string, number>;
  cases_per_month: Record<string, number>;
  open_cases: { n: number; median_age_days: number };
  sb_amounts: Record<string, number>;
  reliability?: {
    n_test: number;
    n_dev: number;
    deepseek_test: Record<string, number | null>;
    baseline_test: Record<string, number | null>;
    quote_verbatim_rate: number;
    flagged_cases: number[];
    retried_cases: number[];
    unmapped_terms: Record<string, number>;
  };
};
