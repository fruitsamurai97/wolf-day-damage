# Detailed car for the damage viewer

`damage-car.glb` is derived locally from the existing project asset
`Data/reference-demo/assets/car.glb`. No remote model or texture service is used.
The source geometry, embedded color/normal/ORM textures and UV layout are retained.
Triangles crossing semantic region boundaries were subdivided before segmentation. Body normals were smoothed locally for softer reflections.
The model is a generic compact hatchback, not an exact reconstruction of a case vehicle.

Orientation: +Z front, negative X links; length 4.5, ground Y=0.
Each mesh node carries `extras.part` and `extras.side`. Wheels and underbody use
`fixed`, without a damage region. The split is an approximate surface annotation,
not a set of manufacturer CAD body panels. Door linings are inset copies of the
door surfaces in the viewer, revealed through a ghosted exterior for R&I.

The viewer uses the embedded detail on neutral regions and an opaque PBR tint on
highlighted regions so dark texture pixels cannot hide damage or heat colors.
Plates are separate neutral geometry. `zierleiste_anbauteil` is belt-line trim.

29 mesh nodes, 292849 triangles, approximately 9.1 MB, embedded textures only.
The GLB is cached by the loader and shared by case and dashboard views.

