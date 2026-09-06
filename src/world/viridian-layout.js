// Red/Blue: 40 × 36 movement tiles, 2 metres per tile. Route 1 connects
// with a ten-tile east offset; its north edge is exactly this map's south edge.
export const viridianTile = (x,y) => [-39+x*2,-161+y*2];
const building=(id,kind,tile,width,depth,cx,accent)=>{
  const [doorX,frontZ]=viridianTile(...tile);
  return {id,kind,tile,width,depth,x:viridianTile(cx,0)[0],z:frontZ-depth/2,doorX,accent};
};
export const VIRIDIAN_CITY={
  id:'viridian-city',size:[40,36],northZ:-162,southZ:-90,
  buildings:[
    building('viridian-pokecenter','center',[23,25],7.1,6.4,23.5,'red'),
    building('viridian-mart','mart',[29,19],7.1,6.4,29.5,'blue'),
    building('viridian-school','house',[21,15],7.1,5.8,21.5,'teal'),
    building('viridian-nickname-house','house',[21,9],7.1,5.8,21.5,'teal'),
    building('viridian-gym','gym',[32,7],11.1,7.1,30.5,'teal'),
  ],
  signs:[
    {id:'viridian-city-sign',tile:[17,17],title:'VIRIDIAN CITY',lines:['The Eternally','Green Paradise'],width:2.1},
    {id:'viridian-north-tips',tile:[19,1],title:'TRAINER TIPS',lines:['Catch POKÉMON!', 'Expand your collection!'],width:1.9},
    {id:'viridian-south-tips',tile:[21,29],title:'TRAINER TIPS',lines:['Weaken POKÉMON', 'before catching!'],width:1.9},
    {id:'viridian-mart-sign',tile:[30,19],title:'POKÉ MART',lines:['Supplies for your journey'],width:1.45},
    {id:'viridian-center-sign',tile:[24,25],title:'POKÉMON CENTER',lines:['Rest your POKÉMON'],width:1.55},
    {id:'viridian-gym-sign',tile:[27,7],title:'VIRIDIAN GYM',lines:['Leader: GIOVANNI', 'The Ground-type Master'],width:2.1},
  ],
  // Inclusive tile coordinates. Low fences and south-facing terrain ledges.
  fences:[[20,35,13],[20,23,17],[4,19,31],[22,35,31]],
  ledges:[[14,17,27],[20,21,27],[24,35,27]],
  flowers:[[20,23,18,19],[10,13,22,23],[18,19,22,23],[28,29,22,23],[32,33,24,25],[24,27,28,29],[30,33,28,29]],
  pond:{minX:-24,maxX:-12,minZ:-114,maxZ:-106},
  spawn:{x:2,z:-96,yaw:0},
};
