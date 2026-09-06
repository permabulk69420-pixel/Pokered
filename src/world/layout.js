// Pokémon Red/Blue Pallet Town: 20 × 18 movement tiles.
// X = east, Z = south, Y = up. One movement tile is two metres.
// Reference: pret/pokered data/maps/objects/PalletTown.asm and maps/PalletTown.blk.
export const TILE = 2;
export const tileToWorld = (x, y) => [(x - 9.5) * TILE, (y - 8.5) * TILE];
export const PALLET_TOWN = {
  id: 'pallet-town',
  size: [20, 18],
  buildings: [
    { id: 'reds-house', kind: 'house', name: "RED’S HOUSE", x: -8, z: -9.1, width: 7.1, depth: 5.8, doorX: -9, accent: 'red' },
    { id: 'blues-house', kind: 'house', name: "BLUE’S HOUSE", x: 8, z: -9.1, width: 7.1, depth: 5.8, doorX: 7, accent: 'blue' },
    { id: 'oaks-lab', kind: 'lab', name: 'OAK POKÉMON RESEARCH LAB', x: 6, z: 1.7, width: 11.1, depth: 7.1, doorX: 5, accent: 'teal' },
  ],
  signs: [
    { id: 'reds-house-sign', tile: [3, 5], title: 'RED’S HOUSE', lines: ['Home, sweet home.'], width: 1.5 },
    { id: 'blues-house-sign', tile: [11, 5], title: 'BLUE’S HOUSE', lines: ['Home, sweet home.'], width: 1.5 },
    { id: 'town-sign', tile: [7, 9], title: 'PALLET TOWN', lines: ['Shades of your', 'journey await!'], width: 1.75 },
    { id: 'lab-sign', tile: [13, 13], title: 'OAK POKÉMON', lines: ['RESEARCH LAB'], width: 1.9 },
  ],
  gardens: [
    { x: -8, z: 4, width: 7.3, depth: 3.25, palette: 'pink' },
    { x: 6, z: 12, width: 11.2, depth: 3.0, palette: 'pink' },
  ],
  exits: [
    { id: 'route-1', tile: [10, 0], implemented: true, kind: 'land' },
    { id: 'route-21', tile: [5, 17], implemented: false, kind: 'water' },
  ],
  spawns: { start: { x: -11.8, z: 7.8, yaw: -.45 }, home: { x: -9, z: -4.8, yaw: Math.PI } },
};
