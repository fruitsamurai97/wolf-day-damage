'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { DashboardContent } from 'src/layouts/dashboard';

import { CarDiagram } from './car-diagram';

const Car3D = dynamic(() => import('./car-3d').then((m) => m.Car3D), {
  ssr: false,
  loading: () => <Box sx={{ height: 320 }} />,
});
import { useAggregates } from './hooks';
import { useCorpusTranslations, useLang } from './i18n';
import { getLabels, KIND_TYPE, SEVERITY_COLORS } from './labels';

// ----------------------------------------------------------------------

const BLUE = '#1E88E5';
const ORANGE = '#F4511E';

function BarList({ data, color, labelMap, labelFn }: {
  data: [string, number][];
  color: string | ((k: string) => string);
  labelMap?: Record<string, string>;
  labelFn?: (k: string) => string;
}) {
  const max = Math.max(1, ...data.map(([, v]) => v));
  return (
    <Stack spacing={0.75}>
      {data.map(([k, v]) => (
        <Stack key={k} direction="row" alignItems="center" spacing={1}>
          <Typography variant="caption" sx={{ width: 150, flexShrink: 0 }} noWrap color="text.secondary">
            {labelFn ? labelFn(k) : (labelMap?.[k] ?? k)}
          </Typography>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              height: 10, borderRadius: 0.5, width: `${(100 * v) / max}%`, minWidth: 2,
              bgcolor: typeof color === 'function' ? color(k) : color,
            }} />
            <Typography variant="caption">{v}</Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card sx={{ p: 2, flex: 1, minWidth: 150 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h4">{value}</Typography>
      {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
    </Card>
  );
}

export function DamageDashboardView() {
  const { agg, error, loading } = useAggregates();
  const { t, lang } = useLang();
  const { trSnippet } = useCorpusTranslations();
  const L = getLabels(lang);
  const [carView, setCarView] = useState<'2d' | '3d'>('2d');

  if (loading || !agg) {
    return (
      <DashboardContent maxWidth="xl">
        <Typography variant="h4">{t('overviewTitle')}</Typography>
        <Typography sx={{ mt: 2 }} color={error ? 'error' : 'text.secondary'}>
          {error ? t('loadError', { e: error }) : t('loading')}
        </Typography>
      </DashboardContent>
    );
  }

  const nDamage = agg.case_types.damage ?? 0;
  const nReplace = Object.values(agg.ops_replace_by_part).reduce((a, b) => a + b, 0);
  const nRi = Object.values(agg.ops_ri_by_part).reduce((a, b) => a + b, 0);
  const comboLabel = (k: string) => k.split(' + ').map((z) => L.zone(z)).join(' + ');

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 2 }}>{t('overviewTitle')}</Typography>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        <Kpi label={t('totalCases')} value={String(agg.n_cases)} />
        <Kpi label={t('damageCases')} value={String(nDamage)} sub={`${agg.case_types.service ?? 0} ${t('serviceCasesSub')}`} />
        <Kpi label={t('openFiles')} value={String(agg.open_cases.n)} sub={t('medianAge', { d: agg.open_cases.median_age_days })} />
        <Kpi label={t('newPartsKpi')} value={String(nReplace)} sub={t('acrossDamage', { n: nDamage })} />
        <Kpi label={t('riKpi')} value={String(nRi)} sub={t('riKpiSub')} />
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 2, height: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h6">{t('heatmapTitle')}</Typography>
                <Typography variant="caption" color="text.secondary">{t('heatmapSub')}</Typography>
              </Box>
              <ToggleButtonGroup exclusive size="small" value={carView} onChange={(_, v) => v && setCarView(v)}>
                <ToggleButton value="2d">2D</ToggleButton>
                <ToggleButton value="3d">3D</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
              {carView === '3d' ? <Car3D heat={agg.zones} height={320} /> : <CarDiagram heat={agg.zones} width={250} />}
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 2, height: 1 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('caseKinds')}</Typography>
            <BarList
              data={Object.entries(agg.case_kinds)}
              color={(k) => (KIND_TYPE[k] === 'damage' ? ORANGE : BLUE)}
              labelFn={(k) => L.kind[k] ?? k}
            />
            <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 10, height: 10, bgcolor: ORANGE, borderRadius: 0.5 }} />
                <Typography variant="caption" color="text.secondary">{t('damage')}</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 10, height: 10, bgcolor: BLUE, borderRadius: 0.5 }} />
                <Typography variant="caption" color="text.secondary">{t('service')}</Typography>
              </Stack>
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3} sx={{ height: 1 }}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>{t('severityTitle')}</Typography>
              <BarList
                data={Object.entries(agg.severity)}
                color={(k) => SEVERITY_COLORS[k] ?? BLUE}
                labelMap={L.sev}
              />
            </Card>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>{t('whoPays')}</Typography>
              <BarList data={Object.entries(agg.insurance)} color={ORANGE} labelMap={L.insurance} />
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 2, height: 1 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('replaceByPart')}</Typography>
            <BarList data={Object.entries(agg.ops_replace_by_part).slice(0, 8)} color={ORANGE} labelMap={L.part} />
            <Typography variant="h6" sx={{ my: 2 }}>{t('riByPart')}</Typography>
            <BarList data={Object.entries(agg.ops_ri_by_part).slice(0, 8)} color={BLUE} labelMap={L.part} />
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 2, height: 1 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('zoneCombos')}</Typography>
            <BarList data={Object.entries(agg.zone_cooccurrence).slice(0, 10)} color={ORANGE} labelFn={comboLabel} />
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 2, height: 1 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('secondaryFindings')}</Typography>
            <BarList data={Object.entries(agg.nebenbefunde_top).slice(0, 10)} color={BLUE} labelFn={trSnippet} />
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
