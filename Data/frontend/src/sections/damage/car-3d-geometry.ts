import type { Mesh, Group, MeshStandardMaterial } from 'three';

export type Region = {
  part: string;
  side: 'links' | 'rechts' | 'ohne';
};

export type CarSurface = {
  mesh: Mesh;
  material: MeshStandardMaterial;
  region?: Region;
};

// The local GLB retains the reference car's geometry, UVs and embedded PBR maps.
// Its triangle groups are semantic surface patches, not CAD panel boundaries.
export function carSurfaces(scene: Group): CarSurface[] {
  const surfaces: CarSurface[] = [];
  scene.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const { part, side } = mesh.userData;
    surfaces.push({
      mesh,
      material: (Array.isArray(mesh.material)
        ? mesh.material[0]
        : mesh.material) as MeshStandardMaterial,
      region: part ? { part, side } : undefined,
    });
  });
  return surfaces;
}
