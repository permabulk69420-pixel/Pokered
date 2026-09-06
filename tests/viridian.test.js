import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPalletTown} from '../src/world/pallet-town.js';
import {VIRIDIAN_CITY,viridianTile} from '../src/world/viridian-layout.js';
import {overlaps,moveWithCollisions} from '../src/xr/collision.js';
const gradient=()=>({addColorStop(){}});
const context=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient},{get:(t,k)=>t[k]??(()=>{})});
globalThis.document={createElement:()=>({width:512,height:384,getContext:()=>context})};
const town=createPalletTown(new THREE.Scene()),colliders=town.colliders;
// Flood fill uses the real assembled world collision data, including old Pallet
// and Route 1 boundaries. It catches a city that exists but cannot be reached.
const step=.5,minX=-42,maxX=40,minZ=-166,maxZ=-82,width=(maxX-minX)/step+1;
const key=(x,z)=>Math.round((z-minZ)/step)*width+Math.round((x-minX)/step);
const visited=new Set(),queue=[[2,-84]];visited.add(key(2,-84));
for(let i=0;i<queue.length;i++){
 const [x,z]=queue[i];
 for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){
  const nx=x+dx,nz=z+dz,k=key(nx,nz);
  if(nx<minX||nx>maxX||nz<minZ||nz>maxZ||visited.has(k)||colliders.some(c=>overlaps(nx,nz,.24,c)))continue;
  visited.add(k);queue.push([nx,nz]);
 }
}
test('Route 1 connects continuously to every Viridian exterior entrance',()=>{
 const p=moveWithCollisions(2,-86,0,-9,colliders);assert.ok(Math.abs(p.z+95)<1e-6,JSON.stringify(p));
 for(const b of VIRIDIAN_CITY.buildings){
  const z=Math.ceil((b.z+b.depth/2+1.5)*2)/2;
  assert.ok(visited.has(key(b.doorX,z)),`${b.id} entrance unreachable`);
 }
});
test('city pond, gym yard and both future route mouths are reachable',()=>{
 for(const p of [[-25,-110],[25,-144],[-38,-124],[-3,-163],[2,-94]])assert.ok(visited.has(key(...p)),`Unreachable ${p}`);
 const pond=moveWithCollisions(-26,-110,8,0,colliders);assert.ok(pond.x< -24.3);assert.equal(pond.blocked,'viridian-pond');
});
test('all five canonical doors keep the original Red/Blue coordinate mapping',()=>{
 assert.equal(VIRIDIAN_CITY.buildings.length,5);
 for(const b of VIRIDIAN_CITY.buildings){const [x,z]=viridianTile(...b.tile);assert.equal(x,b.doorX);assert.ok(Math.abs(z-b.z-b.depth/2)<1e-8);}
 assert.equal(VIRIDIAN_CITY.southZ,town.route1.layout.northZ);
 assert.equal(town.viridian.root.parent.name,'');
});
