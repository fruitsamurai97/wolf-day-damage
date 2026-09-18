'use client';

import type { GridColDef } from '@mui/x-data-grid';

import { useMemo, useState } from 'react';

import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid } from '@mui/x-data-grid';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { useCases } from './hooks';
import { useCorpusTranslations, useLang } from './i18n';
import { getLabels, SEVERITY_COLORS } from './labels';
import type { CaseData } from './types';

// ----------------------------------------------------------------------

const KINDS = ['Parkschaden', 'Rangierschaden', 'Auffahrunfall', 'Hagelschaden', 'Steinschlag',
  'Vandalismus', 'Wildunfall', 'Inspektion', 'Ölwechsel', 'HU/AU', 'Räder und Reifen', 'Bremsen'];

export function CasesView() {
  const router = useRouter();
  const { cases, error, loading } = useCases();
  const { t, lang } = useLang();
  const { trStatus } = useCorpusTranslations();
  const L = getLabels(lang);

  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('alle');
  const [type, setType] = useState('alle');
  const [severity, setSeverity] = useState('alle');
  const [insurance, setInsurance] = useState('alle');
  const [openOnly, setOpenOnly] = useState(false);

  const rows = useMemo(() => {
    if (!cases) return [];
    const q = search.toLowerCase();
    return cases.filter((c) => {
      if (q && !`${c.id} ${c.vehicle.manufacturer} ${c.vehicle.model} ${c.vehicle.plate} ${c.freitext}`.toLowerCase().includes(q)) return false;
      if (kind !== 'alle' && c.extraction.case_kind !== kind) return false;
      if (type !== 'alle' && c.extraction.case_type !== type) return false;
      if (severity !== 'alle' && c.severity !== severity) return false;
      if (insurance !== 'alle' && c.extraction.versicherung.typ !== insurance) return false;
      if (openOnly && !c.in_open_list) return false;
      return true;
    });
  }, [cases, search, kind, type, severity, insurance, openOnly]);

  const columns: GridColDef<CaseData>[] = useMemo(() => [
    { field: 'id', headerName: t('colCase'), width: 90 },
    {
      field: 'vehicle', headerName: t('colVehicle'), flex: 1, minWidth: 160,
      valueGetter: (_, row) => `${row.vehicle.manufacturer} ${row.vehicle.model}`,
    },
    { field: 'kind', headerName: t('kind'), width: 150, valueGetter: (_, row) => L.kind[row.extraction.case_kind] ?? row.extraction.case_kind },
    {
      field: 'severity', headerName: t('severity'), width: 100, sortable: false,
      renderCell: (params) =>
        params.row.severity ? (
          <Chip size="small" label={L.sev[params.row.severity] ?? params.row.severity}
            sx={{ bgcolor: SEVERITY_COLORS[params.row.severity], color: '#fff', fontWeight: 600 }} />
        ) : (
          <Typography variant="caption" color="text.disabled">—</Typography>
        ),
    },
    { field: 'zones', headerName: t('colZones'), width: 70, valueGetter: (_, row) => row.zones.length || '' },
    {
      field: 'insurance', headerName: t('payer'), width: 170,
      valueGetter: (_, row) => (row.extraction.case_type === 'damage' ? L.insurance[row.extraction.versicherung.typ] : ''),
    },
    {
      field: 'status', headerName: t('colStatus'), flex: 1, minWidth: 180,
      valueGetter: (_, row) => (row.states[0] ? trStatus(row.states[0].name) : ''),
    },
    {
      field: 'open', headerName: t('colOpen'), width: 80, type: 'boolean',
      valueGetter: (_, row) => row.in_open_list,
    },
  ], [t, L, trStatus]);

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4">{t('casesTitle')} ({rows.length})</Typography>

      <Stack direction="row" spacing={1.5} sx={{ my: 2 }} flexWrap="wrap" useFlexGap alignItems="center">
        <TextField size="small" label={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 220 }} />
        <TextField size="small" select label={t('kind')} value={kind} onChange={(e) => setKind(e.target.value)} sx={{ width: 170 }}>
          <MenuItem value="alle">{t('all')}</MenuItem>
          {KINDS.map((k) => <MenuItem key={k} value={k}>{L.kind[k] ?? k}</MenuItem>)}
        </TextField>
        <TextField size="small" select label={t('type')} value={type} onChange={(e) => setType(e.target.value)} sx={{ width: 130 }}>
          <MenuItem value="alle">{t('all')}</MenuItem>
          <MenuItem value="damage">{t('damage')}</MenuItem>
          <MenuItem value="service">{t('service')}</MenuItem>
        </TextField>
        <TextField size="small" select label={t('severity')} value={severity} onChange={(e) => setSeverity(e.target.value)} sx={{ width: 130 }}>
          <MenuItem value="alle">{t('all')}</MenuItem>
          {['leicht', 'mittel', 'schwer'].map((s) => <MenuItem key={s} value={s}>{L.sev[s]}</MenuItem>)}
        </TextField>
        <TextField size="small" select label={t('payer')} value={insurance} onChange={(e) => setInsurance(e.target.value)} sx={{ width: 200 }}>
          <MenuItem value="alle">{t('all')}</MenuItem>
          {Object.entries(L.insurance).filter(([k]) => k !== 'unbekannt').map(([k, v]) => (
            <MenuItem key={k} value={k}>{v}</MenuItem>
          ))}
        </TextField>
        <FormControlLabel control={<Switch checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />} label={t('openOnly')} />
      </Stack>

      {error && <Typography color="error">{t('loadError', { e: error })}</Typography>}

      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        density="compact"
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
        onRowClick={(params) => router.push(paths.dashboard.caseDetail(params.row.id))}
        sx={{ cursor: 'pointer', minHeight: 480 }}
      />
    </DashboardContent>
  );
}
