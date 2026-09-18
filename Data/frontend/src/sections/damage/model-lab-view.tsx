'use client';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { useLang } from './i18n';
import { getLabels, SEVERITY_COLORS } from './labels';
import { loadLogReg, predict, type LogRegModel } from './logreg-infer';

// ----------------------------------------------------------------------

type Comparison = {
  n_test: number;
  ceiling: number;
  labels: string[];
  test: { id: number; note_body: string; severity: string }[];
  models: Record<string, {
    name: string;
    accuracy: number;
    confusion: number[][];
    predictions: Record<string, string>;
    kind: string;
  }>;
};

const SAMPLES = [
  'Kunde berichtet: Rangierschaden, Poller übersehen. An Stoßstange hinten links Kunststoff eingedrückt (ca. 3 cm Durchmesser). Auch Kotflügel hinten rechts beschädigt (Riss im Lack).',
  'Steinschlag Windschutzscheibe im Sichtfeld Fahrer, Reparatur nicht möglich, Austausch nötig.',
  'Träger verformt an Stoßstange hinten, über zwei Bauteile. Kunde zahlt selbst.',
  'Kotflügel hinten rechts: Kratzer im Klarlack, ca. 5 cm. Fahrertür ebenfalls: feine Kratzspuren.',
];

const MODEL_ORDER = ['deepseek', 'logreg', 'xgboost', 'lightgbm', 'gbert'];
const KIND_COLOR: Record<string, string> = { llm: '#7E57C2', cpu: '#1E88E5', neural: '#F4511E' };

export function ModelLabView() {
  const { t, lang } = useLang();
  const L = getLabels(lang);

  const [model, setModel] = useState<LogRegModel | null>(null);
  const [comp, setComp] = useState<Comparison | null>(null);
  const [text, setText] = useState(SAMPLES[0]);
  const [selectedCase, setSelectedCase] = useState<number | ''>('');

  useEffect(() => {
    loadLogReg().then(setModel);
    fetch('/data/model_comparison.json')
      .then((r) => (r.ok ? r.json() : null))
      .then(setComp)
      .catch(() => {});
  }, []);

  const live = useMemo(() => (model && text.trim() ? predict(model, text) : null), [model, text]);

  const selCase = comp?.test.find((c) => c.id === selectedCase);

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4">{t('labTitle')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('labIntro')}
      </Typography>

      <Grid container spacing={3}>
        {/* Live in-browser LogReg */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ p: 2, height: 1 }}>
            <Typography variant="h6">{t('labLive')}</Typography>
            <Typography variant="caption" color="text.secondary">{t('labLiveSub')}</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ my: 1 }}>
              {SAMPLES.map((s, i) => (
                <Chip key={i} size="small" variant="outlined" label={`#${i + 1}`} onClick={() => setText(s)} />
              ))}
            </Stack>
            <TextField
              multiline
              minRows={4}
              fullWidth
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Werkstattnotiz (Deutsch)…"
              sx={{ mb: 2 }}
            />
            {live && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">{t('labPrediction')}:</Typography>
                  <Chip
                    label={L.sev[live.label] ?? live.label}
                    sx={{ bgcolor: SEVERITY_COLORS[live.label], color: '#fff', fontWeight: 600 }}
                  />
                </Stack>
                {live.probs.map((p) => (
                  <Stack key={p.label} direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ width: 70 }} color="text.secondary">
                      {L.sev[p.label] ?? p.label}
                    </Typography>
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ height: 10, borderRadius: 0.5, width: `${p.p * 100}%`, minWidth: 2, bgcolor: SEVERITY_COLORS[p.label] }} />
                      <Typography variant="caption">{(p.p * 100).toFixed(0)}%</Typography>
                    </Box>
                  </Stack>
                ))}
              </Box>
            )}
          </Card>
        </Grid>

        {/* Benchmark */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ p: 2, height: 1 }}>
            <Typography variant="h6">{t('labBench')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {comp ? t('labBenchSub', { n: comp.n_test }) : ''}
            </Typography>
            {comp && (
              <Box sx={{ mt: 2 }}>
                {MODEL_ORDER.filter((k) => comp.models[k]).map((k) => {
                  const m = comp.models[k];
                  return (
                    <Stack key={k} direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ width: 96, flexShrink: 0 }} noWrap>{m.name.split(' (')[0]}</Typography>
                      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1, position: 'relative' }}>
                        <Box sx={{ height: 14, borderRadius: 0.5, width: `${m.accuracy * 100}%`, minWidth: 2, bgcolor: KIND_COLOR[m.kind] }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{(m.accuracy * 100).toFixed(1)}%</Typography>
                      </Box>
                    </Stack>
                  );
                })}
                <Box sx={{ position: 'relative', ml: '104px', mt: 1 }}>
                  <Box sx={{ borderLeft: '2px dashed', borderColor: 'error.main', height: 12, position: 'absolute', left: `${comp.ceiling * 100}%` }} />
                  <Typography variant="caption" color="error.main" sx={{ position: 'absolute', left: `${comp.ceiling * 100}%`, transform: 'translateX(-50%)', top: 12 }}>
                    {t('labCeiling')} {(comp.ceiling * 100).toFixed(1)}%
                  </Typography>
                </Box>
                <Stack direction="row" spacing={2} sx={{ mt: 5 }}>
                  {[['llm', 'LLM'], ['cpu', 'CPU (TF-IDF)'], ['neural', 'GPU (BERT)']].map(([k, lbl]) => (
                    <Stack key={k} direction="row" spacing={0.5} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: KIND_COLOR[k] }} />
                      <Typography variant="caption" color="text.secondary">{lbl}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              {t('labCaveat')}
            </Typography>
          </Card>
        </Grid>

        {/* Case-by-case */}
        <Grid size={12}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>{t('labCaseByCase')}</Typography>
            {comp && (
              <TextField
                select
                size="small"
                label={t('labPickCase')}
                value={selectedCase}
                onChange={(e) => setSelectedCase(Number(e.target.value))}
                sx={{ minWidth: 260, mb: 2 }}
              >
                {comp.test.slice(0, 60).map((c) => (
                  <MenuItem key={c.id} value={c.id}>#{c.id} — {c.note_body.slice(0, 40)}…</MenuItem>
                ))}
              </TextField>
            )}
            {comp && selCase && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                  {selCase.note_body}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`${t('gtTitle').split(' (')[0]}: ${L.sev[selCase.severity] ?? selCase.severity}`}
                    sx={{ bgcolor: SEVERITY_COLORS[selCase.severity], color: '#fff', fontWeight: 600 }}
                  />
                  {MODEL_ORDER.filter((k) => comp.models[k]).map((k) => {
                    const p = comp.models[k].predictions[String(selCase.id)];
                    const correct = p === selCase.severity;
                    return (
                      <Chip
                        key={k}
                        variant="outlined"
                        label={`${comp.models[k].name.split(' (')[0]}: ${L.sev[p] ?? p} ${correct ? '✓' : '✗'}`}
                        sx={{ borderColor: correct ? 'success.main' : 'error.main', color: correct ? 'success.dark' : 'error.dark' }}
                      />
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
