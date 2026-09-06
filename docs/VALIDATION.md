# Pallet Town and interiors — validation

## Interior update — 6 September 2026

- Reconstructed and inspected the original Red/Blue maps from their block maps,
  blocksets and tile sheets. Those reference assets stay outside the distributed
  application; the room models and textures are newly authored.
- Built Red's two floors, Blue's single room, and Oak's laboratory. Verified
  furniture positions against the source maps and NPC / object positions.
- All 15 tests pass, including the existing outdoor movement checks and new
  tests using the actual furnished rooms' collision descriptions:
  - every exterior entrance and indoor exit is reachable;
  - a complete ground floor → stair → bedroom → stair → entrance walk;
  - smooth stair height, blocked side entry, and guarded upper edges;
  - clear access through the lab's book-bank aisle and around Blue's table;
  - doorway relocation preserving real eye height, room-scale offset and facing;
  - simulated Quest stick movement climbing without changing tracked eye height;
  - exactly one space visible on entry, exit and switching;
  - transfer only at full fade coverage, plus cancellation on reset.
- Vite production build succeeds with the existing locked dependencies.
- Native eye-level renders of the actual meshes, normals, textures and shadows
  were inspected for all four rooms and the stairwell. This corrected floor
  surface overlap and upper-floor shadows appearing on the lower ceiling.
- Interior geometry before view culling: Red 24,470 triangles, Blue 13,102,
  Oak 30,272. Static meshes merge to 54 / 44 / 52 material-and-shadow batches.
  Hidden spaces are excluded from rendering, including their lights.

Interior previews:

- [Red's ground floor](previews/pallet-red-interior.jpg)
- [Red's bedroom](previews/pallet-bedroom.jpg)
- [The stair flight](previews/pallet-stairs.jpg)
- [Blue's house](previews/pallet-blue-interior.jpg)
- [Oak's entrance aisle](previews/pallet-lab-interior.jpg)
- [Oak's research area](previews/pallet-starters.jpg)

## Completed checks

- Vite production build; all runtime code and hand manifest assets bundled.
- Separate clean dependency installation from the committed lockfile.
- Collision regression checks for a thin fence, wall sliding, open-space travel,
  and the southern shoreline.
- Controller dead-zone check and a repeated smooth-turn check proving the head
  stays in place when its tracked position is offset from the player rig.
- Original door coordinates and world-axis mapping.
- Full scene construction in Node using a canvas adapter, with geometry counts.
- Compilation of the actual water and sky shader bodies with their Three.js
  shader chunks in native OpenGL, using GLSL syntax adapters.
- Native rendering of the actual scene mesh positions, normals, instancing and
  textures, inspected from above and from standing height. These checks caught
  and corrected overlapping foundation surfaces and an unhelpful initial view.

## Limits of these checks

The available cloud browser could not create any WebGL context: it reported its
graphics renderer as disabled. The start-screen DOM and graphics-error fallback
were inspected, but this browser could not exercise the running 3D application.

The images in `docs/previews/` are **offline renders of the application's actual
geometry**, not browser screenshots or Quest captures. Their camera framing and
lighting approximate the application; the native preview's sky is simplified.
They are useful for checking layout, proportions, surface intersections and detail.

The user confirmed that the earlier outdoor build looks good and works on their
Quest. No physical Quest 3 was available for this interior update. Its stereo
doorway fade, stair comfort, session restoration and on-device frame time still
need headset validation. Custom hand GLBs are also untested.
The 72 Hz request is a target, not a verified achieved framerate. Thumbstick
collision does not constrain the user's physical room-scale head movement.

## Useful interior headset check

1. Open the deployed address in Quest Browser, select **Enter VR**.
2. Walk through Red's open door. Check that the short fade covers both eyes and
   that your height and facing feel consistent on arrival.
3. Walk around the table, climb the northeast stair, turn left at the landing,
   explore the bedroom, then descend and leave through the entrance.
4. Enter Blue's house and Oak's lab; check the table clearances and lab aisle.
5. Smooth-turn while stationary upstairs and halfway along the stair. Your head
   should remain the turning pivot without a lateral jump.
6. Exit VR, return to the overview, and enter VR again. The town should load at
   ground height with no leftover fade or indoor walls.
