'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { Operation, Schaden } from './types';
import { useLang } from './i18n';
import { getLabels, NEUTRAL_FILL, NEUTRAL_STROKE, RI_COLOR, SEVERITY_COLORS } from './labels';

// ----------------------------------------------------------------------
// Top-down schematic car. Every element is keyed (part, side) and colored
// from the extraction data — the drawing itself contains zero intelligence.

type Elem = {
  part: string;
  side: 'links' | 'rechts' | 'ohne';
  shape: { kind: 'rect'; x: number; y: number; w: number; h: number; rx?: number } | { kind: 'path'; d: string };
};

const ELEMENTS: Elem[] = [
  { part: 'kuehlergrill', side: 'ohne', shape: { kind: 'rect', x: 95, y: 14, w: 50, h: 10, rx: 2 } },
  { part: 'scheinwerfer', side: 'links', shape: { kind: 'rect', x: 48, y: 14, w: 34, h: 10, rx: 2 } },
  { part: 'scheinwerfer', side: 'rechts', shape: { kind: 'rect', x: 158, y: 14, w: 34, h: 10, rx: 2 } },
  { part: 'stossfaenger_vorne', side: 'links', shape: { kind: 'path', d: 'M42,28 h78 v16 h-72 a8,8 0 0 1 -6,-8 z' } },
  { part: 'stossfaenger_vorne', side: 'rechts', shape: { kind: 'path', d: 'M120,28 h78 a8,8 0 0 1 -6,8 v0 l0,8 h-72 z' } },
  { part: 'zierleiste_anbauteil', side: 'ohne', shape: { kind: 'rect', x: 106, y: 31, w: 28, h: 9, rx: 1 } },
  { part: 'motorhaube', side: 'ohne', shape: { kind: 'path', d: 'M60,48 L180,48 L186,120 L54,120 Z' } },
  { part: 'kotfluegel_vorne', side: 'links', shape: { kind: 'rect', x: 32, y: 50, w: 20, h: 70, rx: 3 } },
  { part: 'kotfluegel_vorne', side: 'rechts', shape: { kind: 'rect', x: 188, y: 50, w: 20, h: 70, rx: 3 } },
  { part: 'windschutzscheibe', side: 'ohne', shape: { kind: 'path', d: 'M62,124 L178,124 L172,152 L68,152 Z' } },
  { part: 'aussenspiegel', side: 'links', shape: { kind: 'rect', x: 20, y: 122, w: 11, h: 14, rx: 2 } },
  { part: 'aussenspiegel', side: 'rechts', shape: { kind: 'rect', x: 209, y: 122, w: 11, h: 14, rx: 2 } },
  { part: 'tuer_vorne', side: 'links', shape: { kind: 'rect', x: 32, y: 124, w: 20, h: 60 } },
  { part: 'tuer_vorne', side: 'rechts', shape: { kind: 'rect', x: 188, y: 124, w: 20, h: 60 } },
  { part: 'tuer_hinten', side: 'links', shape: { kind: 'rect', x: 32, y: 188, w: 20, h: 56 } },
  { part: 'tuer_hinten', side: 'rechts', shape: { kind: 'rect', x: 188, y: 188, w: 20, h: 56 } },
  { part: 'seitenscheibe', side: 'links', shape: { kind: 'rect', x: 55, y: 128, w: 7, h: 112, rx: 3 } },
  { part: 'seitenscheibe', side: 'rechts', shape: { kind: 'rect', x: 178, y: 128, w: 7, h: 112, rx: 3 } },
  { part: 'schweller', side: 'links', shape: { kind: 'rect', x: 24, y: 124, w: 6, h: 120, rx: 3 } },
  { part: 'schweller', side: 'rechts', shape: { kind: 'rect', x: 210, y: 124, w: 6, h: 120, rx: 3 } },
  { part: 'dach', side: 'ohne', shape: { kind: 'rect', x: 64, y: 156, w: 112, h: 88, rx: 6 } },
  { part: 'kotfluegel_hinten', side: 'links', shape: { kind: 'rect', x: 32, y: 248, w: 20, h: 64, rx: 3 } },
  { part: 'kotfluegel_hinten', side: 'rechts', shape: { kind: 'rect', x: 188, y: 248, w: 20, h: 64, rx: 3 } },
  { part: 'heckklappe', side: 'ohne', shape: { kind: 'path', d: 'M62,248 L178,248 L184,318 L56,318 Z' } },
  { part: 'rueckleuchte', side: 'links', shape: { kind: 'rect', x: 48, y: 322, w: 34, h: 10, rx: 2 } },
  { part: 'rueckleuchte', side: 'rechts', shape: { kind: 'rect', x: 158, y: 322, w: 34, h: 10, rx: 2 } },
  { part: 'stossfaenger_hinten', side: 'links', shape: { kind: 'path', d: 'M42,336 a8,8 0 0 0 6,8 h72 v-8 z M42,336 h78 v16 h-72 a8,8 0 0 1 -6,-8 z' } },
  { part: 'stossfaenger_hinten', side: 'rechts', shape: { kind: 'path', d: 'M120,336 h78 a8,8 0 0 1 -6,8 l0,8 h-72 z' } },
];

const WHEELS = [
  { x: 22, y: 62 }, { x: 204, y: 62 }, { x: 22, y: 254 }, { x: 204, y: 254 },
];

// (part, side) -> ground-truth zone label, mirrors pipeline/lexicon.py
export function zoneLabel(part: string, side: string): string | null {
  const noSide: Record<string, string> = {
    motorhaube: 'Motorhaube', dach: 'Dach', heckklappe: 'Heckklappe', windschutzscheibe: 'Windschutzscheibe',
  };
  if (noSide[part]) return noSide[part];
  if (part === 'tuer_vorne') return side === 'links' ? 'Fahrertür' : side === 'rechts' ? 'Beifahrertür' : null;
  const base: Record<string, string> = {
    stossfaenger_vorne: 'Stoßstange vorne', stossfaenger_hinten: 'Stoßstange hinten',
    kotfluegel_vorne: 'Kotflügel vorne', kotfluegel_hinten: 'Kotflügel hinten',
    tuer_hinten: 'Tür hinten', schweller: 'Schweller', aussenspiegel: 'Außenspiegel',
  };
  if (!base[part]) return null;
  if (side === 'links' || side === 'rechts') return `${base[part]} ${side}`;
  if (part.startsWith('stossfaenger')) return base[part];
  return null;
}

function matches(part: string, seite: string, e: Elem): boolean {
  if (part !== e.part) return false;
  if (seite === 'links' || seite === 'rechts') return e.side === seite || e.side === 'ohne';
  return true; // ohne / unbekannt covers the whole part
}

export function heatColor(value: number, max: number): string {
  if (!value) return NEUTRAL_FILL;
  const t = value / max;
  const from = [255, 224, 218];
  const to = [163, 20, 20];
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

type Props = {
  damages?: Schaden[];
  operations?: Operation[];
  heat?: Record<string, number>;
  width?: number;
  showLegend?: boolean;
};

export function CarDiagram({ damages = [], operations = [], heat, width = 250, showLegend = true }: Props) {
  const { t, lang } = useLang();
  const L = getLabels(lang);
  const riOps = operations.filter((o) => o.op === 'aus_einbau');
  const maxHeat = heat ? Math.max(1, ...Object.values(heat)) : 1;

  const name = (e: Elem) => `${L.part[e.part]}${e.side !== 'ohne' ? ` ${L.seite[e.side]}` : ''}`;

  const elemInfo = (e: Elem) => {
    if (heat) {
      const own = heat[zoneLabel(e.part, e.side) ?? ''] ?? 0;
      const whole = e.side !== 'ohne' ? (heat[zoneLabel(e.part, 'ohne') ?? ''] ?? 0) : 0;
      const v = own + whole;
      return { fill: heatColor(v, maxHeat), stroke: NEUTRAL_STROKE, tip: `${name(e)} — ${v} ${t('casesUnit')}` };
    }
    const dmg = damages.find((d) => matches(d.part, d.seite, e));
    if (dmg) {
      return {
        fill: SEVERITY_COLORS[dmg.schweregrad] ?? SEVERITY_COLORS.mittel,
        stroke: '#7F0000',
        tip: `${name(e)} — ${L.art[dmg.schadensart] ?? dmg.schadensart} (${L.sev[dmg.schweregrad] ?? dmg.schweregrad})`,
      };
    }
    const ri = riOps.find((o) => matches(o.part, o.seite, e));
    if (ri) {
      return { fill: RI_COLOR, stroke: '#0D47A1', tip: `${name(e)} — ${t('legendRi')}` };
    }
    return { fill: NEUTRAL_FILL, stroke: NEUTRAL_STROKE, tip: name(e) };
  };

  return (
    <Stack alignItems="center" spacing={1}>
      <svg viewBox="0 0 240 360" width={width} role="img" aria-label="Fahrzeug von oben, Schadenzonen markiert">
        {WHEELS.map((w, i) => (
          <rect key={i} x={w.x} y={w.y} width={14} height={40} rx={6} fill="#546E7A" opacity={0.55} />
        ))}
        <path
          d="M54,26 Q54,10 78,10 L162,10 Q186,10 186,26 L198,120 L198,330 Q198,352 176,352 L64,352 Q42,352 42,330 L42,120 Z"
          fill="none"
          stroke={NEUTRAL_STROKE}
          strokeWidth={1.5}
          opacity={0.6}
        />
        {ELEMENTS.map((e, i) => {
          const { fill, stroke, tip } = elemInfo(e);
          const common = { fill, stroke, strokeWidth: 1, style: { transition: 'fill .2s' } };
          return (
            <g key={i}>
              {e.shape.kind === 'rect' ? (
                <rect x={e.shape.x} y={e.shape.y} width={e.shape.w} height={e.shape.h} rx={e.shape.rx ?? 2} {...common}>
                  <title>{tip}</title>
                </rect>
              ) : (
                <path d={e.shape.d} {...common}>
                  <title>{tip}</title>
                </path>
              )}
            </g>
          );
        })}
        <text x={120} y={356} textAnchor="middle" fontSize={8} fill={NEUTRAL_STROKE}>
          {t('carCaption')}
        </text>
      </svg>

      {showLegend && (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="center" useFlexGap>
          {(heat
            ? [{ c: heatColor(0.999 * maxHeat, maxHeat), l: t('legendFrequent') }, { c: heatColor(0.15 * maxHeat, maxHeat), l: t('legendRare') }, { c: NEUTRAL_FILL, l: t('legendNone') }]
            : [
                { c: SEVERITY_COLORS.leicht, l: t('legendLight') },
                { c: SEVERITY_COLORS.mittel, l: t('legendMedium') },
                { c: SEVERITY_COLORS.schwer, l: t('legendSevere') },
                { c: RI_COLOR, l: t('legendRi') },
                { c: NEUTRAL_FILL, l: t('legendIntact') },
              ]
          ).map((item) => (
            <Stack key={item.l} direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: item.c, border: '1px solid', borderColor: 'divider' }} />
              <Typography variant="caption" color="text.secondary">{item.l}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
