# Pokémon assets

Upload the Charmander model here as:

`public/assets/pokemon/charmander.glb`

Preferred GLB conventions:
- Realistic in-game scale, +Y up.
- One skinned model with animation clips embedded in the GLB.
- Useful clip names: `Idle`, `Walk`, `Run`, `Scratch` (additional clips are fine).
- Keep animation names clear and unique; do not bake multiple actions into one long clip.
- Keep materials/textures embedded or otherwise self-contained in the GLB where practical.

The game code will load the model from this exact path once the asset is added.
