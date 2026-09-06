// Original Red/Blue movement tiles, at the same 1.2 m scale as Pallet interiors.
// Source: pret/pokered maps/*.blk, object coordinates and ViridianGym.asm.
export const VIRIDIAN_INTERIORS={
  'viridian-pokecenter':{id:'viridian-pokecenter',label:'Viridian Pokémon Center',columns:14,rows:8,width:16.8,depth:9.6,doorX:-3.6,doorWidth:1.7,floors:1,theme:'center',viridian:true},
  'viridian-mart':{id:'viridian-mart',label:'Viridian Poké Mart',columns:8,rows:8,width:9.6,depth:9.6,doorX:0,doorWidth:1.7,floors:1,theme:'mart',viridian:true},
  'viridian-school':{id:'viridian-school',label:'Viridian school',columns:8,rows:8,width:9.6,depth:9.6,doorX:-1.2,doorWidth:1.5,floors:1,theme:'school',viridian:true},
  'viridian-nickname-house':{id:'viridian-nickname-house',label:'Viridian nickname house',columns:8,rows:8,width:9.6,depth:9.6,doorX:-1.2,doorWidth:1.5,floors:1,theme:'house',viridian:true},
  'viridian-gym':{id:'viridian-gym',label:'Viridian Gym',columns:20,rows:18,width:24,depth:21.6,doorX:8.4,doorWidth:1.7,floors:1,theme:'gym',viridian:true},
};
export const viridianRoomTile=(spec,x,y)=>[(x-(spec.columns-1)/2)*1.2,(y-(spec.rows-1)/2)*1.2];
// Decorative floor markings only in this environment pass. Directions and
// positions come from the original spinner movement table, not a guessed maze.
export const GYM_ARROWS=[[19,11,'up'],[19,1,'left'],[18,2,'down'],[11,2,'right'],[16,10,'down'],[4,6,'down'],[5,13,'right'],[4,14,'right'],[0,15,'up'],[1,15,'up'],[13,16,'left'],[13,17,'left']];
export const GYM_PLAN=[
  "####################",
  "#....#..............",
  "#....#..............",
  "#....##.##.#######..",
  "#.......#..#.....#..",
  "######.#.#.......#..",
  ".....#.#.######..#..",
  ".....#.#.........#..",
  "..##.#.#......##.#..",
  "..##.#.#.......#.#..",
  "..##.#.#.......#.#..",
  "..##...#.......#.#..",
  "..##.#########......",
  "..##................",
  "..##...........S..S.",
  "..############.S..S.",
  "....................",
  "...................."
];
export const GYM_STOPS=[[11, 1], [17, 2], [19, 2], [0, 7], [1, 9], [18, 11], [16, 12], [4, 13], [13, 13], [13, 14], [7, 16], [1, 17]];
