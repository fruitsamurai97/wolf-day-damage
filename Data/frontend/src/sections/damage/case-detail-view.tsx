'use client';

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { useParams, useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import Collapse from '@mui/material/Collapse';
import { useState } from 'react';
import dynamic from 'next/dynamic';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { CarDiagram } from './car-diagram';

const Car3D = dynamic(() => import('./car-3d').then((m) => m.Car3D), {
  ssr: false,
  loading: () => <Box sx={{ height: 330 }} />,
});
import { useCases } from './hooks';
import { useCorpusTranslations, useLang, useNoteEn } from './i18n';
import { getLabels, SEVERITY_COLORS } from './labels';

// ----------------------------------------------------------------------

function highlightNote(text: string, quotes: string[]): ReactNode[] {
  const body = text.split('~~~')[0];
  const followups = text.slice(body.length).replace(/^~+\s*/, '');
  const ranges: [number, number][] = [];
  quotes
    .map((q) => q.replace(/[\s.]+$/, ''))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .forEach((q) => {
      const idx = body.indexOf(q);
      if (idx >= 0 && !ranges.some(([s, e]) => idx < e && idx + q.length > s)) {
        ranges.push([idx, idx + q.length]);
      }
    });
  ranges.sort((a, b) => a[0] - b[0]);
  const nodes: ReactNode[] = [];
  let pos = 0;
  ranges.forEach(([s, e], i) => {
    if (s > pos) nodes.push(body.slice(pos, s));
    nodes.push(
      <Box key={i} component="mark" sx={{ bgcolor: 'warning.lighter', color: 'warning.darker', px: 0.25, borderRadius: 0.5 }}>
        {body.slice(s, e)}
      </Box>
    );
    pos = e;
  });
  if (pos < body.length) nodes.push(body.slice(pos));
  if (followups.trim()) {
    nodes.push(
      <Box key="fu" sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider', color: 'text.secondary' }}>
        {followups.trim()}
      </Box>
    );
  }
  return nodes;
}

export function CaseDetailView() {
  const params = useParams();
  const router = useRouter();
  const { cases, loading } = useCases();
  const { t, lang } = useLang();
  const { trStatus, trSnippet } = useCorpusTranslations();
  const L = getLabels(lang);
  const [showNoteEn, setShowNoteEn] = useState(false);
  const [carView, setCarView] = useState<'2d' | '3d'>('3d');

  const id = Number(params.id);
  const c = cases?.find((x) => x.id === id);
  const noteEn = useNoteEn(id);

  const partLabel = (part: string, seite: string) =>
    `${L.part[part] ?? part}${L.seite[seite] ? ` ${L.seite[seite]}` : ''}`;

  if (loading) {
    return (
      <DashboardContent maxWidth="xl">
        <Typography>{t('loading')}</Typography>
      </DashboardContent>
    );
  }
  if (!c) {
    return (
      <DashboardContent maxWidth="xl">
        <Typography variant="h5">{t('notFound', { id })}</Typography>
        <Button sx={{ mt: 2 }} onClick={() => router.push(paths.dashboard.cases)}>{t('back')}</Button>
      </DashboardContent>
    );
  }

  const ex = c.extraction;
  const isDamage = ex.case_type === 'damage';

  return (
    <DashboardContent maxWidth="xl">
      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
        <Button variant="outlined" size="small" onClick={() => router.push(paths.dashboard.cases)}>{t('backToList')}</Button>
        <Typography variant="h4">
          {t('colCase')} {c.id} — {c.vehicle.manufacturer} {c.vehicle.model}
        </Typography>
        {!c.validation_ok && <Chip color="error" size="small" label={t('extractionFlagged')} />}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {c.vehicle.plate} · {c.vehicle.mileage.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')} km · {t('firstReg')} {c.vehicle.first_registration?.slice(0, 7)} ·
        {' '}{t('created')} {c.created_at?.slice(0, 10)} {c.canceled ? `· ${t('canceledState')}` : c.in_open_list ? `· ${t('openState')}` : `· ${t('closedState')}`}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
        <Chip size="small" color={isDamage ? 'error' : 'info'} label={L.kind[ex.case_kind] ?? ex.case_kind} />
        {c.severity && (
          <Chip size="small" label={`${t('severityTitle')}: ${L.sev[c.severity] ?? c.severity}`} sx={{ bgcolor: SEVERITY_COLORS[c.severity], color: '#fff' }} />
        )}
        {isDamage && (
          <Chip size="small" variant="outlined" label={`${t('payer')}: ${L.insurance[ex.versicherung.typ]}${ex.versicherung.sb ? ` · SB ${ex.versicherung.sb} €` : ''}`} />
        )}
        {c.states.slice(0, 3).map((s) => (
          <Chip key={s.name} size="small" variant="outlined" label={trStatus(s.name)} sx={{ maxWidth: 320 }} />
        ))}
      </Stack>

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ p: 2, height: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={carView}
              onChange={(_, v) => v && setCarView(v)}
              sx={{ alignSelf: 'flex-end', mb: 1 }}
            >
              <ToggleButton value="2d">2D</ToggleButton>
              <ToggleButton value="3d">3D</ToggleButton>
            </ToggleButtonGroup>
            {carView === '3d' ? (
              <Car3D damages={ex.schaeden} operations={c.operations} height={330} />
            ) : (
              <CarDiagram damages={ex.schaeden} operations={c.operations} width={280} />
            )}
            {!isDamage && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {t('serviceHint')}
              </Typography>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={3}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>{t('noteTitle')}</Typography>
              <Typography component="div" variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {highlightNote(c.freitext, ex.schaeden.map((s) => s.beleg_zitat))}
              </Typography>
              {lang === 'en' && noteEn && (
                <>
                  <Button size="small" sx={{ mt: 1.5 }} onClick={() => setShowNoteEn((v) => !v)}>
                    {showNoteEn ? t('hideNoteEn') : t('showNoteEn')}
                  </Button>
                  <Collapse in={showNoteEn}>
                    <Typography
                      component="div"
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, mt: 1, pl: 1.5, borderLeft: '3px solid', borderColor: 'info.main' }}
                    >
                      {noteEn}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">{t('noteEnCaption')}</Typography>
                  </Collapse>
                </>
              )}
            </Card>

            {isDamage && (
              <Card sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>{t('workPlan')}</Typography>
                {ex.schaeden.map((s, i) => (
                  <Box key={i} sx={{ mb: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: SEVERITY_COLORS[s.schweregrad] ?? 'grey.400' }} />
                      <Typography variant="subtitle2">{partLabel(s.part, s.seite)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {L.art[s.schadensart] ?? s.schadensart} · {L.sev[s.schweregrad] ?? s.schweregrad}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
                <Divider sx={{ my: 1.5 }} />
                <Stack spacing={0.75}>
                  {c.operations.map((o, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label={L.op[o.op]}
                        color={o.op === 'ersetzen' ? 'error' : o.op === 'aus_einbau' ? 'info' : 'default'}
                        variant={o.op === 'aus_einbau' ? 'filled' : 'outlined'}
                      />
                      <Typography variant="body2">{partLabel(o.part, o.seite)}</Typography>
                      <Typography variant="caption" color="text.disabled">{L.opSource[o.source]}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Card>
            )}

            {(ex.kunden_anliegen.length > 0 || ex.nebenbefunde.length > 0 || ex.unmapped_terms.length > 0) && (
              <Card sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  {ex.kunden_anliegen.length > 0 && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2">{t('customerRequests')}</Typography>
                      {ex.kunden_anliegen.map((k) => (
                        <Typography key={k} variant="body2" color="text.secondary">• {trSnippet(k)}</Typography>
                      ))}
                    </Grid>
                  )}
                  {ex.nebenbefunde.length > 0 && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2">{t('secondary')}</Typography>
                      {ex.nebenbefunde.map((k) => (
                        <Typography key={k} variant="body2" color="text.secondary">• {trSnippet(k)}</Typography>
                      ))}
                    </Grid>
                  )}
                  {ex.unmapped_terms.length > 0 && (
                    <Grid size={12}>
                      <Typography variant="subtitle2" color="warning.main">{t('unmappedTerms')}</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {ex.unmapped_terms.map((term) => <Chip key={term} size="small" color="warning" variant="outlined" label={trSnippet(term)} />)}
                      </Stack>
                    </Grid>
                  )}
                </Grid>
              </Card>
            )}

            <Card sx={{ p: 2, bgcolor: 'background.neutral' }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t('gtTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {L.kind[c.gt.case_kind] ?? c.gt.case_kind} · {t('gtZones')}: {c.gt.zones.map((z) => L.zone(z)).join(', ') || '—'} · {t('severityTitle')}: {c.gt.severity ? (L.sev[c.gt.severity] ?? c.gt.severity) : '—'} ·
                {' '}{t('insuranceRow')}: {c.gt.insurance_type ? (L.insurance[c.gt.insurance_type] ?? c.gt.insurance_type) : '—'} · {t('gtStage')}: {L.stage[c.gt.lifecycle_stage] ?? c.gt.lifecycle_stage}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {t('gtCaption')}
              </Typography>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
