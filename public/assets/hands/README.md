# Drop-in hand models

This folder is the hand asset slot. The town works immediately without adding anything.

1. Place your left and right GLB files here, for example `left.glb` and `right.glb`.
2. Change `hands.json` to set `"left": "left.glb"` and `"right": "right.glb"`.
3. Leave `scale` at `1` for models authored in metres. Offsets are metres; rotations are radians.

Models attach to WebXR controller **grip** poses by handedness, not controller index.
The loader clones skinned models safely. Skeletons and existing animations are retained,
but finger-pose animation and controller-button bindings are intentionally future work.
Export neutral models around the wrist/grip origin, with +Y up and forward along -Z.
If your models have a different convention, set the manifest rotation and offsets.

The light grip marker disappears when a model loads successfully. Missing GLBs keep
that fallback visible. This is a controller-driven hand model slot, not optical hand
tracking. No runtime file chooser or manual loading step is added to the game.
