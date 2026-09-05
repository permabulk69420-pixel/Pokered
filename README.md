# Pokered — Pallet Town VR

A small, standalone Three.js / WebXR remaster study of Pokémon Red's Pallet Town,
intended for Meta Quest 3. This first slice concentrates on the town's appearance
and walking around it. No ROM or emulator is needed.

## Play

Open the GitHub Pages address in **Meta Quest Browser** and select **Enter VR**.

| Input | Action |
| --- | --- |
| Left thumbstick | Head-relative smooth walking |
| Right thumbstick | Smooth turning, about 83°/second at full deflection |
| Left thumbstick click | Jog while moving |
| WASD / up and down arrows | Desktop walking |
| Mouse | Desktop looking; click the scene to capture the mouse |
| Q/E / left and right arrows | Desktop smooth turning |
| Shift | Desktop jogging |
| Escape / Menu | Release the mouse / return to the overview |
| Touchscreen | Left virtual stick to move; drag the scene to look |

The town loads directly into the overview. Nothing needs to be imported to see it.
Walls, signs, fences, residents, the tree perimeter, and the water's edge stop
thumbstick/keyboard movement. Building interiors and adjoining routes are closed
for this visual slice. The two outdoor residents are static, replaceable models.

## What is faithful, and what is interpreted

The original Red/Blue **20 × 18 movement-tile** plan provides the placement of the
two northern houses, the southeastern lab, four signs, two flower plots, the
central Route 1 opening, and the southwestern water inlet. The original sign and
door tile coordinates are retained in the layout reference.

Two metres per tile gives a roughly **40 × 36 metre** town. Building footprints
are adapted slightly for walkable clearances and plausible doors and storeys.
White siding, warm red house roofs, slate laboratory roofing, subtle grass trails,
side/rear windows, vegetation, and distant hills are this remaster's interpretation
of details that the monochrome map cannot specify. The original map is a reference,
not a texture pasted into the world. The project authors its own geometry and
materials; it does not bundle Nintendo's sprites, textures, ROM, or soundtrack.

References:

- [Original object, sign and door positions](https://github.com/pret/pokered/blob/master/data/maps/objects/PalletTown.asm)
- [Original Pallet Town block map](https://github.com/pret/pokered/blob/master/maps/PalletTown.blk)
- [Pallet Town geography and original map comparison](https://bulbapedia.bulbagarden.net/wiki/Pallet_Town)

## Hand model slot

Put your GLBs into **`public/assets/hands/`**, then fill in `left` and `right` in
**`hands.json`**. That folder's README explains scale, orientation and offsets.
The empty slots already work with small grip markers. Models load automatically
and attach to the controller grip for the correct hand. There is no file picker.
Finger animation and optical hand tracking are not implemented yet.

## Development

Requires Node 22.12 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
```

`dist/` is the static deployment output. Relative asset paths support a repository
subdirectory on GitHub Pages. The Pages workflow builds and publishes `main`.
Keep the repository's Pages source set to **GitHub Actions** when using that workflow.

| File | Responsibility |
| --- | --- |
| `src/world/layout.js` | Town identity, map coordinates, building/sign/garden positions, exit stubs |
| `src/world/buildings.js` | Reusable exterior architecture, independent door hinges |
| `src/world/landscape.js` | Ground, shoreline, instanced plants and trees, sky |
| `src/world/residents.js` | The two visual-only residents, each in a named group |
| `src/world/pallet-town.js` | Town assembly, lighting and collision descriptions |
| `src/xr/locomotion.js` | Desktop, touch and Quest movement; tracked-head turning pivot |
| `src/xr/collision.js` | Shared horizontal collision/slide logic |
| `src/xr/hands.js` | Optional GLB hand loading, independent of the town |
| `src/main.js` | Renderer, start screen, session lifecycle and frame loop |

## Rendering choices

- Geometry is merged by material within each building; door hinges stay separate.
- Trees, grass, stems and flowers use instancing. Grass needs no alpha texture.
- One static 2048px directional shadow atlas is generated once, then reused.
- Simple opaque animated water; no reflections pass, bloom, SSAO or full-screen outline pass.
- Quest requests a 72 Hz session when available, with fixed foveation at 0.7.
- The complete scene is roughly 300,000 triangles before view culling. This is a
  geometry count, **not a measured Quest framerate**.
- JavaScript is bundled locally. The only external visual dependency is optional
  Google Fonts for the desktop start screen; system fonts are the fallback.

Append `?debug` for scene statistics. `?view=home`, `?view=lab`, `?view=shore`,
`?view=map`, and `?view=walk` provide convenient inspection views. Add `&clean`
to hide the interface for screenshots.

## Verification for this first slice

The production build and collision/turn-pivot checks pass. The actual scene
geometry was also rendered offline to inspect the overview and standing-height
views. See [validation notes](docs/VALIDATION.md).

![Offline render of the actual town geometry](docs/previews/pallet-overview.jpg)

This is a personal fan project. Pokémon names and the original setting belong to
their respective owners; this project is not an official release.
