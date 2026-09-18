'use client';

import { useEffect, useState } from 'react';

import type { Aggregates, CaseData } from './types';

let casesCache: CaseData[] | null = null;
let aggCache: Aggregates | null = null;
let casesPromise: Promise<CaseData[]> | null = null;
let aggPromise: Promise<Aggregates> | null = null;

function fetchJson<T>(url: string): Promise<T> {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<T>;
  });
}

export function useCases() {
  const [cases, setCases] = useState<CaseData[] | null>(casesCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (casesCache) return undefined;
    let active = true;
    casesPromise ??= fetchJson<CaseData[]>('/data/cases.json').then((d) => {
      casesCache = d;
      return d;
    });
    casesPromise
      .then((d) => active && setCases(d))
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, []);

  return { cases, error, loading: !cases && !error };
}

export function useAggregates() {
  const [agg, setAgg] = useState<Aggregates | null>(aggCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (aggCache) return undefined;
    let active = true;
    aggPromise ??= fetchJson<Aggregates>('/data/aggregates.json').then((d) => {
      aggCache = d;
      return d;
    });
    aggPromise
      .then((d) => active && setAgg(d))
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, []);

  return { agg, error, loading: !agg && !error };
}
