/* eslint-disable react/no-unknown-property -- Three.js JSX properties are validated by React Three Fiber types. */

'use client';

import type { ReactNode } from 'react';
import type { Region } from './car-3d-geometry';
import type { Schaden, Operation } from './types';

import { DoubleSide } from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { useRef, useMemo, Suspense, useState, Component, useEffect } from 'react';
import {
  Html,
  useGLTF,
  RoundedBox,
  Environment,
  Lightformer,
  OrbitControls,
  ContactShadows,
} from '@react-three/drei';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

import { useLang } from './i18n';
import { carSurfaces } from './car-3d-geometry';
import { heatColor, zoneLabel } from './car-diagram';
import { RI_COLOR, NEUTRAL_FILL, SEVERITY_COLORS } from './labels';

type Appearance = { color: string; emissive: number };

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

class ViewerBoundary extends Component<
  { children: ReactNode; message: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <Typography sx={{ p: 3 }}>{this.props.message}</Typography>
    ) : (
      this.props.children
    );
  }
}

// Fit narrow cards and mobile screens without changing the user's orbit on data updates.
function ResponsiveCamera() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const factor = Math.max(1, 1.3 / (size.width / Math.max(1, size.height)));
    camera.position.set(-4.2 * factor, 0.82 + 1.58 * factor, 4.9 * factor);
    camera.lookAt(0, 0.82, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return null;
}

function CarModel({
  colorOf,
  revealLining,
}: {
  colorOf: (region: Region) => Appearance;
  revealLining: (region: Region) => boolean;
}) {
  const { scene } = useGLTF('/assets/car/damage-car.glb?v=2');
  const surfaces = useMemo(() => carSurfaces(scene), [scene]);
  return (
    <group>
      {surfaces.map(({ mesh, material, region }) => {
        const appearance = region ? colorOf(region) : undefined;
        const glass = region?.part === 'windschutzscheibe' || region?.part === 'seitenscheibe';
        const highlighted = appearance && appearance.color !== (glass ? '#B7C6CE' : NEUTRAL_FILL);
        const door = region?.part === 'tuer_vorne' || region?.part === 'tuer_hinten';
        const lining = region && door && revealLining(region);
        const ghost = lining && appearance?.emissive === 0;
        return (
          <group
            key={mesh.uuid}
            position={mesh.position}
            quaternion={mesh.quaternion}
            scale={mesh.scale}
          >
            <mesh geometry={mesh.geometry} name={mesh.name} renderOrder={ghost ? 2 : 0}>
              <meshPhysicalMaterial
                color={appearance?.color ?? '#FFFFFF'}
                map={highlighted ? null : material.map}
                normalMap={region ? null : material.normalMap}
                normalScale={[0.28, 0.28]}
                roughness={glass ? 0.19 : region ? 0.43 : 0.78}
                metalness={glass ? 0.18 : region ? 0.2 : 0.12}
                clearcoat={region ? 0.35 : 0.1}
                clearcoatRoughness={0.24}
                envMapIntensity={0.65}
                emissive={appearance?.color ?? '#000000'}
                emissiveIntensity={appearance?.emissive ?? 0}
                transparent={Boolean(ghost)}
                opacity={ghost ? 0.14 : 1}
                depthWrite={!ghost}
                side={DoubleSide}
              />
            </mesh>
            {lining && region && (
              <mesh
                geometry={mesh.geometry}
                name={`tuerverkleidung:${region.side}`}
                position={[region.side === 'links' ? 0.018 : -0.018, 0, 0]}
              >
                {/* An inset inner door surface, visible through the ghosted outer door. */}
                <meshStandardMaterial
                  color={colorOf({ part: 'tuerverkleidung', side: region.side }).color}
                  emissive={colorOf({ part: 'tuerverkleidung', side: region.side }).color}
                  emissiveIntensity={0.2}
                  roughness={0.85}
                  side={DoubleSide}
                />
              </mesh>
            )}
          </group>
        );
      })}
      {/* Soft ambient occlusion anchors the car even on low-end WebGL renderers. */}
      <mesh position={[0, -0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 5.1]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          toneMapped={false}
          vertexShader="varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
          fragmentShader="varying vec2 vUv; void main() { float r = length((vUv - 0.5) * 2.0); float a = 0.24 * (1.0 - smoothstep(0.15, 1.0, r)); gl_FragColor = vec4(0.06, 0.08, 0.10, a); }"
        />
      </mesh>
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
      {/* Registration plates are neutral accessories, never the trim/R&I region. */}
      {[1, -1].map((end) => (
        <group
          key={end}
          position={[0, end === 1 ? 0.53 : 0.85, end === 1 ? 2.241 : -2.185]}
          rotation={[0, end === 1 ? 0 : Math.PI, 0]}
        >
          <RoundedBox args={[0.49, 0.106, 0.013]} radius={0.009} smoothness={3}>
            <meshStandardMaterial color="#F0F3F5" roughness={0.52} />
          </RoundedBox>
          <mesh position={[-0.213, 0, 0.009]}>
            <planeGeometry args={[0.036, 0.082]} />
            <meshStandardMaterial color="#244F89" roughness={0.55} />
          </mesh>
        </group>
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
        <ViewerBoundary
          message={
            lang === 'de'
              ? 'Das 3D-Modell konnte nicht geladen werden. Bitte die 2D-Ansicht verwenden.'
              : 'The 3D model could not load. Please use the 2D view.'
          }
        >
          <Canvas
            dpr={[1, 1.75]}
            frameloop={rotating ? 'always' : 'demand'}
            camera={{ position: [-4.2, 2.4, 4.9], fov: 32 }}
            gl={{ alpha: true, antialias: true }}
            fallback={
              <Typography sx={{ p: 3 }}>
                {lang === 'de'
                  ? '3D benötigt WebGL. Bitte die 2D-Ansicht verwenden.'
                  : '3D requires WebGL. Please use the 2D view.'}
              </Typography>
            }
          >
            <ResponsiveCamera />
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
            <Suspense
              fallback={
                <Html center>
                  <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                    {lang === 'de' ? 'Fahrzeug wird geladen…' : 'Loading vehicle…'}
                  </Typography>
                </Html>
              }
            >
              <CarModel colorOf={colorOf} revealLining={revealLining} />
            </Suspense>
            <OrbitControls
              makeDefault
              autoRotate={rotating}
              autoRotateSpeed={0.65}
              enablePan={false}
              minDistance={2.7}
              maxDistance={13}
              minPolarAngle={0.15}
              maxPolarAngle={Math.PI / 2.05}
              target={[0, 0.82, 0]}
            />
          </Canvas>
        </ViewerBoundary>
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
