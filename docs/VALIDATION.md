# Pallet Town visual slice — validation

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

No physical Quest 3 was available. Immersive session entry, controller behavior,
on-device frame time, and custom hand GLBs therefore still need headset validation.
The 72 Hz request is a target, not a verified achieved framerate. Thumbstick
collision does not constrain the user's physical room-scale head movement.

## Useful first headset check

1. Open the deployed address in Quest Browser, select **Enter VR**.
2. Check that the ground is at floor level and the town is at human scale.
3. Walk with the left stick; turn with the right stick while standing still.
4. Walk toward a building, a short fence, and the water, checking that movement stops.
5. Exit VR and enter again; the initial view and height should be restored.
