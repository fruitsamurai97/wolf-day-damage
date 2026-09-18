'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { Operation, Schaden } from './types';
import { heatColor, zoneLabel } from './car-diagram';
import { useLang } from './i18n';
import { NEUTRAL_FILL, RI_COLOR, SEVERITY_COLORS } from './labels';

// ----------------------------------------------------------------------
// Low-poly 3D car: every panel is a mesh keyed (part, side) and colored from
// the SAME extraction data and severity palette as the 2D CarDiagram.
// The drawing contains zero intelligence — pure data-driven coloring.

type Part3D = {
  part: string;
  side: 'links' | 'rechts' | 'ohne';
  pos: [number, number, number];
  size: [number, number, number];
  rotX?: number;
};

// +z = front of the car, x < 0 = driver side (links, German LHD)
const PARTS: Part3D[] = [
  { part: 'kuehlergrill', side: 'ohne', pos: [0, 0.55, 2.22], size: [0.9, 0.2, 0.08] },
  { part: 'scheinwerfer', side: 'links', pos: [-0.62, 0.62, 2.2], size: [0.45, 0.16, 0.1] },
  { part: 'scheinwerfer', side: 'rechts', pos: [0.62, 0.62, 2.2], size: [0.45, 0.16, 0.1] },
  { part: 'stossfaenger_vorne', side: 'links', pos: [-0.48, 0.34, 2.2], size: [0.94, 0.28, 0.26] },
  { part: 'stossfaenger_vorne', side: 'rechts', pos: [0.48, 0.34, 2.2], size: [0.94, 0.28, 0.26] },
  { part: 'zierleiste_anbauteil', side: 'ohne', pos: [0, 0.34, 2.34], size: [0.42, 0.13, 0.02] },
  { part: 'zierleiste_anbauteil', side: 'ohne', pos: [0, 0.34, -2.34], size: [0.42, 0.13, 0.02] },
  { part: 'motorhaube', side: 'ohne', pos: [0, 0.84, 1.45], size: [1.55, 0.1, 1.15] },
  { part: 'kotfluegel_vorne', side: 'links', pos: [-0.86, 0.55, 1.45], size: [0.18, 0.55, 1.15] },
  { part: 'kotfluegel_vorne', side: 'rechts', pos: [0.86, 0.55, 1.45], size: [0.18, 0.55, 1.15] },
  { part: 'windschutzscheibe', side: 'ohne', pos: [0, 1.1, 0.68], size: [1.35, 0.62, 0.06], rotX: -0.5 },
  { part: 'dach', side: 'ohne', pos: [0, 1.4, -0.18], size: [1.4, 0.09, 1.5] },
  { part: 'seitenscheibe', side: 'links', pos: [-0.71, 1.12, -0.18], size: [0.05, 0.44, 1.55] },
  { part: 'seitenscheibe', side: 'rechts', pos: [0.71, 1.12, -0.18], size: [0.05, 0.44, 1.55] },
  { part: 'aussenspiegel', side: 'links', pos: [-1.02, 1.0, 0.8], size: [0.18, 0.11, 0.11] },
  { part: 'aussenspiegel', side: 'rechts', pos: [1.02, 1.0, 0.8], size: [0.18, 0.11, 0.11] },
  { part: 'tuer_vorne', side: 'links', pos: [-0.88, 0.6, 0.33], size: [0.14, 0.62, 1.0] },
  { part: 'tuer_vorne', side: 'rechts', pos: [0.88, 0.6, 0.33], size: [0.14, 0.62, 1.0] },
  { part: 'tuer_hinten', side: 'links', pos: [-0.88, 0.6, -0.68], size: [0.14, 0.62, 0.95] },
  { part: 'tuer_hinten', side: 'rechts', pos: [0.88, 0.6, -0.68], size: [0.14, 0.62, 0.95] },
  { part: 'schweller', side: 'links', pos: [-0.86, 0.21, -0.18], size: [0.12, 0.14, 2.4] },
  { part: 'schweller', side: 'rechts', pos: [0.86, 0.21, -0.18], size: [0.12, 0.14, 2.4] },
  { part: 'kotfluegel_hinten', side: 'links', pos: [-0.86, 0.58, -1.65], size: [0.18, 0.58, 1.0] },
  { part: 'kotfluegel_hinten', side: 'rechts', pos: [0.86, 0.58, -1.65], size: [0.18, 0.58, 1.0] },
  { part: 'heckklappe', side: 'ohne', pos: [0, 1.05, -1.72], size: [1.42, 0.7, 0.08], rotX: 0.55 },
  { part: 'heckklappe', side: 'ohne', pos: [0, 0.78, -2.0], size: [1.5, 0.12, 0.5] },
  { part: 'rueckleuchte', side: 'links', pos: [-0.62, 0.62, -2.2], size: [0.42, 0.15, 0.08] },
  { part: 'rueckleuchte', side: 'rechts', pos: [0.62, 0.62, -2.2], size: [0.42, 0.15, 0.08] },
  { part: 'stossfaenger_hinten', side: 'links', pos: [-0.48, 0.34, -2.2], size: [0.94, 0.28, 0.26] },
  { part: 'stossfaenger_hinten', side: 'rechts', pos: [0.48, 0.34, -2.2], size: [0.94, 0.28, 0.26] },
];

const WHEELS: [number, number][] = [[-0.84, 1.45], [0.84, 1.45], [-0.84, -1.5], [0.84, -1.5]];

function matches3d(part: string, seite: string, mesh: Part3D): boolean {
  if (part !== mesh.part) return false;
  if (seite === 'links' || seite === 'rechts') return mesh.side === seite || mesh.side === 'ohne';
  return true;
}

type Props = {
  damages?: Schaden[];
  operations?: Operation[];
  heat?: Record<string, number>;
  height?: number;
  showLegend?: boolean;
};

export function Car3D({ damages = [], operations = [], heat, height = 330, showLegend = true }: Props) {
  const { t } = useLang();
  const riOps = operations.filter((o) => o.op === 'aus_einbau');
  const maxHeat = heat ? Math.max(1, ...Object.values(heat)) : 1;

  const colorOf = (mesh: Part3D): { color: string; emissive: number } => {
    if (heat) {
      const own = heat[zoneLabel(mesh.part, mesh.side) ?? ''] ?? 0;
      const whole = mesh.side !== 'ohne' ? (heat[zoneLabel(mesh.part, 'ohne') ?? ''] ?? 0) : 0;
      return { color: heatColor(own + whole, maxHeat), emissive: 0 };
    }
    const dmg = damages.find((d) => matches3d(d.part, d.seite, mesh));
    if (dmg) return { color: SEVERITY_COLORS[dmg.schweregrad] ?? SEVERITY_COLORS.mittel, emissive: 0.25 };
    const ri = riOps.find((o) => matches3d(o.part, o.seite, mesh));
    if (ri) return { color: RI_COLOR, emissive: 0.2 };
    const glass = mesh.part === 'windschutzscheibe' || mesh.part === 'seitenscheibe';
    return { color: glass ? '#B7C6CE' : NEUTRAL_FILL, emissive: 0 };
  };

  return (
    <Stack alignItems="center" spacing={1} sx={{ width: 1 }}>
      <Box sx={{ width: 1, height, borderRadius: 1.5, overflow: 'hidden' }}>
        <Canvas dpr={[1, 2]} camera={{ position: [3.4, 2.4, 4.4], fov: 38 }}>
          <ambientLight intensity={0.85} />
          <directionalLight position={[5, 8, 4]} intensity={1.1} />
          <directionalLight position={[-5, 4, -5]} intensity={0.4} />
          <group position={[0, -0.55, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
              <circleGeometry args={[3.4, 48]} />
              <meshStandardMaterial color="#90A4AE" transparent opacity={0.25} />
            </mesh>
            <mesh position={[0, 0.52, -0.1]}>
              <boxGeometry args={[1.62, 0.5, 4.35]} />
              <meshStandardMaterial color={NEUTRAL_FILL} roughness={0.6} metalness={0.15} />
            </mesh>
            <mesh position={[0, 1.05, -0.18]}>
              <boxGeometry args={[1.3, 0.5, 1.55]} />
              <meshStandardMaterial color={NEUTRAL_FILL} roughness={0.6} metalness={0.15} />
            </mesh>
            {PARTS.map((p, i) => {
              const { color, emissive } = colorOf(p);
              return (
                <mesh key={i} position={p.pos} rotation={p.rotX ? [p.rotX, 0, 0] : undefined}>
                  <boxGeometry args={p.size} />
                  <meshStandardMaterial
                    color={color}
                    roughness={0.45}
                    metalness={0.2}
                    emissive={color}
                    emissiveIntensity={emissive}
                  />
                </mesh>
              );
            })}
            {WHEELS.map(([x, z], i) => (
              <mesh key={`w${i}`} position={[x, 0.34, z]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.34, 0.34, 0.24, 24]} />
                <meshStandardMaterial color="#37474F" roughness={0.8} />
              </mesh>
            ))}
          </group>
          <OrbitControls
            autoRotate
            autoRotateSpeed={1.4}
            enablePan={false}
            minDistance={3}
            maxDistance={9}
            target={[0, 0.15, 0]}
          />
        </Canvas>
      </Box>

      {showLegend && (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="center" useFlexGap>
          {(heat
            ? [
                { c: heatColor(0.999 * maxHeat, maxHeat), l: t('legendFrequent') },
                { c: heatColor(0.15 * maxHeat, maxHeat), l: t('legendRare') },
                { c: NEUTRAL_FILL, l: t('legendNone') },
              ]
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
