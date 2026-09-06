# Pokédex asset

Upload the Pokédex model here as:

`public/assets/pokedex/pokedex.glb`

## Screen requirements

Please make the display a separate mesh named `Screen` with its own unique material (for example `ScreenMaterial`). The screen should:
- be a clean, flat rectangular surface;
- have normal 0-1 UVs covering the whole display;
- contain no baked menu text, icons, reflections, or permanent UI;
- sit slightly above/in front of the surrounding casing so replacement screen content does not z-fight;
- face +Z in the model's local space with +Y as up, if practical.

This lets the game replace the screen material with dynamic UI, menus, Pokédex entries, and a camera preview/photo display.

## Helpful model conventions

- Use sensible handheld real-world scale and +Y up.
- Keep the model origin around the device body/handhold rather than far away.
- If physical buttons are modeled, separate/name important ones where practical (for example `CameraButton`, `ConfirmButton`, `BackButton`).
- A separate mesh named `CameraLens` is useful visually, but no special camera functionality needs to be built into the GLB.
- If the Pokédex physically opens/closes, include clean `Open` and `Close` animation clips or an obvious hinge bone/pivot.
- Keep materials/textures embedded or otherwise self-contained in the GLB where practical.

The game will handle the actual UI, photo capture, camera render, body holster, grabbing, and input logic.
