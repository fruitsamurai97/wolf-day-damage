'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DoubleSide } from 'three';
import { Canvas } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  RoundedBox,
} from '@react-three/drei';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

import type { Operation, Schaden } from './types';
import type { Region } from './car-3d-geometry';
import { createCarPanels } from './car-3d-geometry';
import { heatColor, zoneLabel } from './car-diagram';
import { useLang } from './i18n';
import { NEUTRAL_FILL, RI_COLOR, SEVERITY_COLORS } from './labels';

type Part3D = Region & {
  pos: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
};
type Appearance = { color: string; emissive: number };

// Lamps, mirrors and actual trim. Registration plates remain separate neutral objects.
const DETAILS: Part3D[] = [
  { part: 'kuehlergrill', side: 'ohne', pos: [0, 0.66, 2.225], size: [1.04, 0.19, 0.055] },
  ...([-1, 1] as const).flatMap((sign): Part3D[] => {
    const side = sign < 0 ? 'links' : 'rechts';
    return [
      {
        part: 'scheinwerfer',
        side,
        pos: [sign * 0.644, 0.874, 2.168],
        size: [0.345, 0.073, 0.085],
        rotation: [0, sign * 0.16, 0],
      },
      {
        part: 'rueckleuchte',
        side,
        pos: [sign * 0.632, 0.852, -2.17],
        size: [0.365, 0.069, 0.085],
        rotation: [0, -sign * 0.16, 0],
      },
      {
        part: 'aussenspiegel',
        side,
        pos: [sign * 0.988, 1.092, 0.64],
        size: [0.22, 0.125, 0.245],
        rotation: [0, sign * 0.16, 0],
      },
      {
        part: 'zierleiste_anbauteil',
        side,
        pos: [sign * 0.889, 1.038, -0.23],
        size: [0.022, 0.025, 2.05],
      },
      {
        part: 'zierleiste_anbauteil',
        side,
        pos: [sign * 0.64, 0.467, 2.166],
        size: [0.36, 0.037, 0.05],
        rotation: [0, sign * 0.16, 0],
      },
      {
        part: 'zierleiste_anbauteil',
        side,
        pos: [sign * 0.64, 0.467, -2.166],
        size: [0.36, 0.037, 0.05],
        rotation: [0, -sign * 0.16, 0],
      },
    ];
  }),
  { part: 'zierleiste_anbauteil', side: 'ohne', pos: [0, 1.032, 0.889], size: [1.53, 0.03, 0.035] },
];

function matches3d(part: string, seite: string, mesh: Region): boolean {
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

function Wheel({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.407, z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <torusGeometry args={[0.316, 0.086, 12, 48]} />
        <meshStandardMaterial color="#171D23" roughness={0.92} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.29, 0.29, 0.15, 40]} />
        <meshStandardMaterial color="#29313A" metalness={0.7} roughness={0.37} />
      </mesh>
      {[-0.083, 0.083].map((face) => (
        <group key={face} position={[0, 0, face]}>
          <mesh>
            <torusGeometry args={[0.279, 0.017, 8, 40]} />
            <meshStandardMaterial color="#C1CAD2" metalness={0.82} roughness={0.24} />
          </mesh>
          {Array.from({ length: 7 }, (_, i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 7]}>
              <mesh position={[0.018, 0.159, 0]} rotation={[0, 0, -0.14]}>
                <boxGeometry args={[0.043, 0.215, 0.023]} />
                <meshStandardMaterial color="#D2D9DE" metalness={0.78} roughness={0.25} />
              </mesh>
            </group>
          ))}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.066, 0.066, 0.035, 24]} />
            <meshStandardMaterial color="#A6B4BE" metalness={0.75} roughness={0.28} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CarModel({
  colorOf,
  revealLining,
}: {
  colorOf: (region: Region) => Appearance;
  revealLining: (region: Region) => boolean;
}) {
  const panels = useMemo(createCarPanels, []);
  useEffect(() => () => panels.forEach(({ geometry }) => geometry.dispose()), [panels]);
  return (
    <group>
      <RoundedBox args={[1.54, 0.12, 3.35]} radius={0.05} position={[0, 0.29, 0]}>
        <meshStandardMaterial color="#222C34" roughness={0.85} />
      </RoundedBox>
      {panels.map((panel, i) => {
        const { color, emissive } = colorOf(panel);
        const ghost = panel.part.startsWith('tuer_') && revealLining(panel) && emissive === 0;
        if (panel.lining && !revealLining(panel)) return null;
        return (
          <mesh
            key={i}
            geometry={panel.geometry}
            name={`${panel.part}:${panel.side}`}
            renderOrder={ghost ? 2 : 0}
          >
            <meshPhysicalMaterial
              color={color}
              side={DoubleSide}
              roughness={panel.glass ? 0.2 : 0.34}
              metalness={panel.glass ? 0.32 : 0.26}
              clearcoat={panel.lining ? 0 : 0.65}
              clearcoatRoughness={0.24}
              envMapIntensity={0.65}
              emissive={color}
              emissiveIntensity={emissive}
              transparent={ghost}
              opacity={ghost ? 0.16 : 1}
              depthWrite={!ghost}
            />
          </mesh>
        );
      })}
      {DETAILS.map((part, i) => {
        const { color, emissive } = colorOf(part);
        return (
          <RoundedBox
            key={i}
            name={`${part.part}:${part.side}`}
            position={part.pos}
            rotation={part.rotation}
            args={part.size}
            radius={Math.min(...part.size) * 0.35}
            smoothness={3}
          >
            <meshPhysicalMaterial
              color={color}
              roughness={0.27}
              metalness={0.25}
              clearcoat={0.7}
              envMapIntensity={0.6}
              emissive={color}
              emissiveIntensity={emissive}
            />
          </RoundedBox>
        );
      })}
      {[-1, 1].map((sign) => (
        <group key={sign}>
          <Wheel x={sign * 0.92} z={1.38} />
          <Wheel x={sign * 0.92} z={-1.39} />
          <mesh position={[sign * 0.79, 1.26, -0.344]} rotation={[0, 0, sign * 0.4]}>
            <boxGeometry args={[0.023, 0.428, 0.039]} />
            <meshStandardMaterial color="#253440" roughness={0.36} />
          </mesh>
          <RoundedBox
            args={[0.15, 0.04, 0.065]}
            radius={0.012}
            position={[sign * 0.897, 1.058, 0.65]}
          >
            <meshStandardMaterial color="#27343C" roughness={0.5} />
          </RoundedBox>
          {[-0.73, 0.025].map((z) => (
            <RoundedBox
              key={z}
              args={[0.024, 0.026, 0.165]}
              radius={0.01}
              position={[sign * 0.945, 0.904, z]}
            >
              <meshStandardMaterial color="#76858F" metalness={0.65} roughness={0.3} />
            </RoundedBox>
          ))}
          <RoundedBox
            args={[0.44, 0.095, 0.018]}
            radius={0.012}
            position={[0, 0.473, sign * 2.248]}
          >
            <meshStandardMaterial color="#F3F5F6" roughness={0.48} />
          </RoundedBox>
          <mesh position={[-0.193, 0.473, sign * 2.26]}>
            <boxGeometry args={[0.031, 0.079, 0.003]} />
            <meshStandardMaterial color="#253B67" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {[-0.054, 0, 0.054].map((dy) => (
        <mesh key={dy} position={[0, 0.66 + dy, 2.258]}>
          <boxGeometry args={[0.94, 0.016, 0.009]} />
          <meshStandardMaterial color="#24323A" roughness={0.48} />
        </mesh>
      ))}
    </group>
  );
}

export function Car3D({
  damages = [],
  operations = [],
  heat,
  height = 330,
  showLegend = true,
}: Props) {
  const { t, lang } = useLang();
  const [expanded, setExpanded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const host = useRef<HTMLDivElement>(null);
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const riOps = operations.filter((o) => o.op === 'aus_einbau');
  const maxHeat = heat ? Math.max(1, ...Object.values(heat)) : 1;

  useEffect(() => {
    let onScreen = true;
    const update = () => setVisible(onScreen && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      update();
    });
    if (host.current) observer.observe(host.current);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [expanded]);

  // Keep the original priority and the no-side heat contribution unchanged.
  const colorOf = (mesh: Region): Appearance => {
    if (heat) {
      const own = heat[zoneLabel(mesh.part, mesh.side) ?? ''] ?? 0;
      const whole = mesh.side !== 'ohne' ? (heat[zoneLabel(mesh.part, 'ohne') ?? ''] ?? 0) : 0;
      return { color: heatColor(own + whole, maxHeat), emissive: 0 };
    }
    const dmg = damages.find((d) => matches3d(d.part, d.seite, mesh));
    if (dmg)
      return { color: SEVERITY_COLORS[dmg.schweregrad] ?? SEVERITY_COLORS.mittel, emissive: 0.25 };
    const ri = riOps.find((o) => matches3d(o.part, o.seite, mesh));
    if (ri) return { color: RI_COLOR, emissive: 0.2 };
    const glass = mesh.part === 'windschutzscheibe' || mesh.part === 'seitenscheibe';
    return { color: glass ? '#B7C6CE' : NEUTRAL_FILL, emissive: 0 };
  };
  const revealLining = (region: Region) =>
    !heat &&
    riOps.some(
      (o) =>
        o.part === 'tuerverkleidung' &&
        matches3d(o.part, o.seite, { part: 'tuerverkleidung', side: region.side })
    );
  const rotating = !paused && !reduceMotion && visible;

  const viewer = (
    <Stack ref={host} alignItems="center" spacing={1} sx={{ width: 1, p: expanded ? 2 : 0 }}>
      <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ width: 1 }}>
        {!reduceMotion && (
          <Button
            size="small"
            color="inherit"
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
          >
            {lang === 'de'
              ? paused
                ? 'Rotation starten'
                : 'Rotation pausieren'
              : paused
                ? 'Resume rotation'
                : 'Pause rotation'}
          </Button>
        )}
        <Button
          size="small"
          color="inherit"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {lang === 'de'
            ? expanded
              ? 'Verkleinern'
              : 'Vergrößern'
            : expanded
              ? 'Collapse view'
              : 'Enlarge view'}
        </Button>
      </Stack>
      <Box
        sx={{
          width: 1,
          height: expanded ? `max(${height}px, min(72vh, 720px))` : height,
          borderRadius: 1.5,
          overflow: 'hidden',
          position: 'relative',
          '& canvas': { touchAction: 'none' },
        }}
        role="img"
        aria-label={
          lang === 'de'
            ? 'Interaktives 3D-Fahrzeug. Ziehen zum Drehen, scrollen zum Zoomen.'
            : 'Interactive 3D vehicle. Drag to orbit, scroll to zoom.'
        }
      >
        <Canvas
          dpr={[1, 1.75]}
          frameloop={rotating ? 'always' : 'demand'}
          camera={{ position: [-4.6, 2.7, 5.6], fov: 40 }}
          gl={{ alpha: true, antialias: true }}
          fallback={
            <Typography sx={{ p: 3 }}>
              {lang === 'de'
                ? '3D benötigt WebGL. Bitte die 2D-Ansicht verwenden.'
                : '3D requires WebGL. Please use the 2D view.'}
            </Typography>
          }
        >
          <ambientLight intensity={0.65} />
          <directionalLight position={[-4, 7, 5]} intensity={2.2} />
          <directionalLight position={[4, 3, -4]} intensity={1.1} />
          {/* A local studio environment avoids remote HDR downloads. */}
          <Environment frames={1} resolution={128}>
            <Lightformer
              intensity={2}
              position={[0, 5, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[4, 7, 1]}
            />
            <Lightformer
              intensity={2.4}
              position={[-4, 2, 1]}
              rotation={[0, Math.PI / 2, 0]}
              scale={[5, 2, 1]}
            />
            <Lightformer
              intensity={1.3}
              position={[4, 3, -2]}
              rotation={[0, -Math.PI / 2, 0]}
              scale={[5, 3, 1]}
            />
          </Environment>
          <CarModel colorOf={colorOf} revealLining={revealLining} />
          <ContactShadows
            position={[0, 0.002, 0]}
            opacity={0.45}
            scale={8}
            blur={2.8}
            far={2.4}
            resolution={256}
            frames={3}
            color="#18262F"
          />
          <OrbitControls
            makeDefault
            autoRotate={rotating}
            autoRotateSpeed={0.65}
            enablePan={false}
            minDistance={2.7}
            maxDistance={13}
            minPolarAngle={0.15}
            maxPolarAngle={Math.PI / 2.05}
            target={[0, 0.7, 0]}
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
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 0.5,
                  bgcolor: item.c,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {item.l}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
  return expanded ? (
    <Dialog
      open
      fullWidth
      maxWidth="lg"
      onClose={() => setExpanded(false)}
      aria-label={lang === 'de' ? '3D-Fahrzeug vergrößert' : 'Enlarged 3D vehicle'}
    >
      {viewer}
    </Dialog>
  ) : (
    viewer
  );
}
