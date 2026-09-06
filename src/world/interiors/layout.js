// Red/Blue's original indoor maps are separate spaces, larger than the outside
// sprites. Retain their 8×8 / 10×12 tile plans with 1.2 m furnishing coordinates.
// Source: pret/pokered maps/{RedsHouse1F,RedsHouse2F,BluesHouse,OaksLab}.blk
// and the matching data/maps/objects files. Y in those maps becomes world Z.
export const ROOM_TILE = 1.2;
export const HOUSE_WIDTH = 9.6;
export const HOUSE_DEPTH = 9.6;
export const STOREY = 3.05;
export const RED_STAIRS = Object.freeze({
  minX: 3.0, maxX: 4.62, topZ: -3.3, bottomZ: 1.65,
  rise: STOREY, steps: 18,
});
export const roomTile = (x, y, columns=8, rows=8) => [
  (x-(columns-1)/2)*ROOM_TILE, (y-(rows-1)/2)*ROOM_TILE,
];

export const INTERIORS = {
  'reds-house': { id:'reds-house', label:'Red’s house', width:9.6, depth:9.6, doorX:-1.2, doorWidth:1.5, floors:2, stairs:RED_STAIRS },
  'blues-house': { id:'blues-house', label:'Blue’s house', width:9.6, depth:9.6, doorX:-1.2, doorWidth:1.5, floors:1 },
  'oaks-lab': { id:'oaks-lab', label:'Oak’s laboratory', width:12, depth:14.4, doorX:0, doorWidth:1.7, floors:1 },
};

// Every room has a shallow, open vestibule. The trigger is beyond the main
// room, so approaching furniture or turning beside the door cannot eject you.
export const interiorArrival = spec => ({x:spec.doorX, z:spec.depth/2-.85, y:0, yaw:0});
export const exteriorArrival = spec => ({x:spec.doorX, z:spec.z+spec.depth/2+.95, y:0, yaw:Math.PI});

export function exteriorDoorColliders(spec) {
  const edge=spec.z+spec.depth/2, half=spec.kind==='lab'?.675:.51;
  const left=spec.x-spec.width/2-.08, right=spec.x+spec.width/2+.08;
  return [
    {kind:'box',id:spec.id,minX:left,maxX:spec.doorX-half,minZ:spec.z-spec.depth/2-.1,maxZ:edge+.13},
    {kind:'box',id:spec.id,minX:spec.doorX+half,maxX:right,minZ:spec.z-spec.depth/2-.1,maxZ:edge+.13},
    {kind:'box',id:spec.id,minX:left,maxX:right,minZ:spec.z-spec.depth/2-.1,maxZ:edge-1.2},
    {kind:'box',id:`${spec.id}-open-door`,minX:spec.doorX-half-.23,maxX:spec.doorX-half+.06,minZ:edge+.15,maxZ:edge+half*2+.22},
  ];
}

export function entranceAt(buildings, x, z) {
  return buildings.find(spec => {
    const half=spec.kind==='lab'?.675:.51, edge=spec.z+spec.depth/2;
    return Math.abs(x-spec.doorX)<half-.13 && z<edge+.1 && z>edge-1.05;
  })?.id || null;
}

export function atInteriorExit(spec, x, z, height) {
  return height<.1 && Math.abs(x-spec.doorX)<spec.doorWidth/2-.1 && z>spec.depth/2+.28;
}
