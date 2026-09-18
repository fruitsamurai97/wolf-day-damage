import { BufferGeometry, Float32BufferAttribute } from 'three';

export type Region = { part: string; side: 'links' | 'rechts' | 'ohne' };
export type CarPanel = Region & { geometry: BufferGeometry; glass?: boolean; lining?: boolean };
type Point = [number, number, number];

// Metres, +z forward, x < 0 is the driver's side. All painted surfaces are
// separate panels, including the two halves of each bumper. No neutral shell
// sits over them, so changing a region's material always changes its surface.
function surface(at: (u: number, v: number) => Point, nu = 24, nv = 16) {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= nv; j += 1) {
    for (let i = 0; i <= nu; i += 1) vertices.push(...at(i / nu, j / nv));
  }
  for (let j = 0; j < nv; j += 1) {
    for (let i = 0; i < nu; i += 1) {
      const a = j * (nu + 1) + i;
      indices.push(a, a + 1, a + nu + 1, a + 1, a + nu + 2, a + nu + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const widthAt = (z: number) => 0.955 - 0.13 * (Math.abs(z) / 2.25) ** 4;
const beltAt = (z: number) => 1.005 - 0.095 * (Math.abs(z) / 2.25) ** 3;
const archBottom = (z: number) => {
  const d = Math.min(Math.abs(z - 1.38), Math.abs(z + 1.39));
  return d < 0.465 ? 0.405 + Math.sqrt(0.465 ** 2 - d ** 2) : 0.31;
};

function quad(a: Point, b: Point, c: Point, d: Point) {
  return surface(
    (u, v) => [
      mix(mix(a[0], b[0], u), mix(d[0], c[0], u), v),
      mix(mix(a[1], b[1], u), mix(d[1], c[1], u), v),
      mix(mix(a[2], b[2], u), mix(d[2], c[2], u), v),
    ],
    16,
    10
  );
}

export function createCarPanels(): CarPanel[] {
  const panels: CarPanel[] = [];
  function add(
    part: string,
    side: Region['side'],
    geometry: BufferGeometry,
    glass = false,
    lining = false
  ) {
    panels.push({ part, side, geometry, glass, lining });
  }
  // Crown and longitudinal taper give the bonnet a gently sculpted surface.
  add(
    'motorhaube',
    'ohne',
    surface((u, v) => {
      const z = mix(0.89, 2.075, v);
      const x = (u * 2 - 1) * (widthAt(z) - 0.145);
      return [x, beltAt(z) + 0.045 + 0.046 * Math.sin(Math.PI * u), z];
    })
  );
  add(
    'dach',
    'ohne',
    surface((u, v) => {
      const z = mix(-0.91, 0.18, v);
      const x = (u * 2 - 1) * (0.684 + 0.012 * Math.sin(v * Math.PI));
      return [x, 1.485 + 0.055 * Math.sin(Math.PI * u) + 0.018 * Math.sin(Math.PI * v), z];
    })
  );
  add(
    'windschutzscheibe',
    'ohne',
    surface((u, v) => {
      const x = (u * 2 - 1) * mix(0.676, 0.796, v);
      return [
        x,
        mix(1.48, 1.049, v) + mix(0.055, 0.033, v) * Math.sin(Math.PI * u),
        mix(0.194, 0.862, v),
      ];
    }),
    true
  );
  // The hatch includes the sloped rear window and the rear deck. The window
  // is part of this region because the public vocabulary has no rear-glass key.
  add(
    'heckklappe',
    'ohne',
    surface((u, v) => {
      const z = mix(-2.105, -0.924, v);
      const y = v < 0.38 ? mix(0.963, 1.033, v / 0.38) : mix(1.033, 1.486, (v - 0.38) / 0.62);
      return [
        (u * 2 - 1) * mix(0.735, 0.682, v),
        y + mix(0.03, 0.055, v) * Math.sin(Math.PI * u),
        z,
      ];
    })
  );

  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'links' : 'rechts';
    // Side panels flow into the shoulders. Wheel openings are actual cutouts.
    const sections: [string, number, number][] = [
      ['kotfluegel_hinten', -2.1, -0.925],
      ['tuer_hinten', -0.911, -0.17],
      ['tuer_vorne', -0.155, 0.901],
      ['kotfluegel_vorne', 0.915, 2.1],
    ];
    sections.forEach(([part, from, to]) => {
      add(
        part,
        side,
        surface(
          (u, v) => {
            const z = mix(from, to, u);
            const bottom = part.startsWith('kotfluegel') ? archBottom(z) : 0.32;
            const y = mix(bottom, beltAt(z) + 0.041, v);
            const x =
              widthAt(z) - 0.055 * (1 - v) ** 2 - 0.147 * v ** 10 + 0.015 * Math.sin(v * Math.PI);
            return [sign * x, y, z];
          },
          56,
          18
        )
      );
    });
    // Close the rear shoulders between the narrow hatch and the quarter panel.
    add(
      'kotfluegel_hinten',
      side,
      surface((u, v) => {
        const z = mix(-2.105, -0.925, u);
        const hatchY =
          u < 0.38 ? mix(0.963, 1.033, u / 0.38) : mix(1.033, 1.486, (u - 0.38) / 0.62);
        return [
          sign * mix(widthAt(z) - 0.147, mix(0.735, 0.682, u), v),
          mix(beltAt(z) + 0.041, hatchY, v),
          z,
        ];
      })
    );
    add(
      'schweller',
      side,
      surface(
        (u, v) => [
          sign * (0.875 + 0.047 * Math.sin(v * Math.PI)),
          mix(0.255, 0.312, v),
          mix(-0.92, 0.91, u),
        ],
        20,
        8
      )
    );
    // Cabin pillars and window frames are painted and mapped to their panels.
    add(
      'tuer_vorne',
      side,
      quad(
        [sign * 0.81, 1.041, 0.88],
        [sign * 0.688, 1.486, 0.18],
        [sign * 0.701, 1.472, 0.115],
        [sign * 0.815, 1.042, 0.792]
      )
    );
    add(
      'kotfluegel_hinten',
      side,
      quad(
        [sign * 0.684, 1.484, -0.914],
        [sign * 0.772, 1.053, -1.652],
        [sign * 0.827, 1.043, -1.32],
        [sign * 0.721, 1.453, -0.85]
      )
    );
    add(
      'seitenscheibe',
      side,
      quad(
        [sign * 0.823, 1.066, 0.758],
        [sign * 0.707, 1.455, 0.113],
        [sign * 0.709, 1.453, -0.32],
        [sign * 0.878, 1.067, -0.32]
      ),
      true
    );
    add(
      'seitenscheibe',
      side,
      quad(
        [sign * 0.877, 1.067, -0.368],
        [sign * 0.711, 1.453, -0.368],
        [sign * 0.713, 1.446, -0.829],
        [sign * 0.827, 1.066, -1.263]
      ),
      true
    );
    add(
      'dach',
      'ohne',
      quad(
        [sign * 0.687, 1.491, 0.163],
        [sign * 0.687, 1.487, -0.904],
        [sign * 0.711, 1.452, -0.839],
        [sign * 0.707, 1.457, 0.12]
      )
    );
    // Genuine interior linings. The scene reveals these through a ghosted
    // neutral door when R&I requests them, instead of painting exterior metal.
    for (const [from, to] of [
      [-0.89, -0.19],
      [-0.13, 0.79],
    ]) {
      add(
        'tuerverkleidung',
        side,
        quad(
          [sign * 0.82, 0.43, from],
          [sign * 0.82, 0.43, to],
          [sign * 0.82, 0.94, to],
          [sign * 0.82, 0.94, from]
        ),
        false,
        true
      );
    }
    // Split rounded nose/tail surfaces: sideless inputs still color both halves.
    for (const end of [-1, 1]) {
      add(
        end > 0 ? 'stossfaenger_vorne' : 'stossfaenger_hinten',
        side,
        surface(
          (u, v) => {
            const x = sign * u * 0.846;
            return [
              x,
              mix(0.34, 0.955, v),
              end * (2.245 - 0.16 * u ** 4 - 0.095 * (2 * v - 1) ** 2),
            ];
          },
          20,
          16
        )
      );
      // Rounded upper lip closes the nose/tail against the bonnet/hatch.
      // Without this return surface a grazing camera sees through the body.
      add(
        end > 0 ? 'stossfaenger_vorne' : 'stossfaenger_hinten',
        side,
        surface(
          (u, v) => {
            const x = sign * u * 0.846;
            const edgeWidth = end > 0 ? widthAt(2.075) - 0.145 : 0.735;
            const crown = Math.cos((Math.min(1, Math.abs(x) / edgeWidth) * Math.PI) / 2);
            const backY = end > 0 ? beltAt(2.075) + 0.045 + 0.046 * crown : 0.963 + 0.03 * crown;
            return [
              x,
              mix(backY, 0.955, v),
              end * mix(end > 0 ? 2.075 : 2.105, 2.15 - 0.16 * u ** 4, v),
            ];
          },
          24,
          8
        )
      );
    }
  }
  return panels;
}
