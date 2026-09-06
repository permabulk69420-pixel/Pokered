import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldSpaces,DoorwayTransition} from '../src/world/spaces.js';
import {interiorArrival,exteriorArrival} from '../src/world/interiors/layout.js';
import {VIRIDIAN_INTERIORS,viridianRoomTile,GYM_PLAN} from '../src/world/interiors/viridian-layout.js';
import {moveWithNavigation} from '../src/xr/navigation.js';
import {overlaps} from '../src/xr/collision.js';
const gradient=()=>({addColorStop(){}});
const context=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient},{get:(t,k)=>t[k]??(()=>{})});
globalThis.document={createElement:()=>({width:512,height:384,getContext:()=>context})};
const world=new WorldSpaces(new THREE.Scene());

test('every Viridian door completes a real outdoor → room → outdoor trip',()=>{
 for(const b of world.town.viridian.layout.buildings){
  world.activate('pallet-town');const start=exteriorArrival(b);
  const p=moveWithNavigation(start.x,start.z,0,0,-1.25,world.current.navigation);
  const enter=world.doorway(p.x,p.z,0);assert.equal(enter?.id,b.id,`${b.id}: blocked exterior`);
  assert.equal(world.doorway(start.x,start.z,0),null,`${b.id}: arrival re-entry loop`);
  world.activate(enter.id);assert.equal(world.doorway(enter.arrival.x,enter.arrival.z,0),null);
  const inside=moveWithNavigation(enter.arrival.x,enter.arrival.z,0,0,-1,world.current.navigation);
  assert.ok(inside.z<enter.arrival.z-.99,`${b.id}: blocked room arrival`);
  const exitPose=moveWithNavigation(enter.arrival.x,enter.arrival.z,0,0,1.5,world.current.navigation);
  const exit=world.doorway(exitPose.x,exitPose.z,0);assert.equal(exit?.id,'pallet-town');
  assert.deepEqual(exit.arrival,start);world.activate(exit.id);
  assert.equal(world.doorway(exit.arrival.x,exit.arrival.z,0),null);
 }
});

test('exterior entrances are real openings at head and knee height',()=>{
 world.activate('pallet-town');world.scene.updateMatrixWorld(true);
 for(const spec of world.town.viridian.layout.buildings){
  const b=world.town.viridian.buildings.get(spec.id),edge=spec.z+spec.depth/2;
  for(const height of [.45,1.65]){
   const ray=new THREE.Raycaster(new THREE.Vector3(spec.doorX,height,edge+.8),new THREE.Vector3(0,0,-1),0,1.65);
   const hits=ray.intersectObject(b,true);
   assert.equal(hits.length,0,`${spec.id} aperture obstructed at ${height}: ${hits.map(h=>h.object.name)}`);
  }
 }
});

function reachable(room){
 const spacing=.3,w=room.spec.width,d=room.spec.depth,minX=-w/2,minZ=-d/2;
 const cols=Math.round(w/spacing)+1,rows=Math.round(d/spacing)+1;
 const node=(x,z)=>[Math.round((x-minX)/spacing),Math.round((z-minZ)/spacing)];
 const pos=(x,z)=>[minX+x*spacing,minZ+z*spacing];
 const start=interiorArrival(room.spec),[ix,iz]=node(start.x,start.z),queue=[[ix,iz]],seen=new Set([iz*cols+ix]);
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,nz=z+dz,k=nz*cols+nx;if(nx<0||nz<0||nx>=cols||nz>=rows||seen.has(k))continue;
   const [px,pz]=pos(nx,nz);if(room.navigation.colliders.some(c=>overlaps(px,pz,.23,c)))continue;
   seen.add(k);queue.push([nx,nz]);
  }
 }
 return (x,z)=>{const [xx,zz]=node(x,z);return seen.has(zz*cols+xx);};
}
test('canonical service areas and furniture can be approached from each entry',()=>{
 const goals={
  'viridian-pokecenter':[[3,3.2],[8,3.2],[12,3.5],[10,5]],
  'viridian-mart':[[2.2,5],[4,4.4],[2.6,1.4]],
  'viridian-school':[[3,5.9],[1.6,3.5],[5.6,3.5],[3.5,1.7]],
  'viridian-nickname-house':[[3.5,5.2],[1.2,3.5],[5.8,3.5],[3.5,1.8]],
  'viridian-gym':[[2,1],[19,1],[19,11],[4,6],[5,13],[10,7]],
 };
 for(const [id,tiles] of Object.entries(goals)){
  const room=world.spaces.get(id),canReach=reachable(room);
  for(const t of tiles){const [x,z]=viridianRoomTile(room.spec,...t);assert.ok(canReach(x,z),`${id} cannot reach ${t}`);}
 }
});
test('every original walkable Gym tile remains reachable, with no maze-wall shortcut',()=>{
 const room=world.spaces.get('viridian-gym'),canReach=reachable(room);
 for(let y=0;y<18;y++)for(let x=0;x<20;x++){
  const [px,pz]=viridianRoomTile(room.spec,x,y);
  if(GYM_PLAN[y][x]==='.')assert.ok(canReach(px,pz),`Gym tile ${x},${y} cut off`);
  if(GYM_PLAN[y][x]==='#')assert.ok(room.navigation.colliders.some(c=>overlaps(px,pz,.23,c)),`missing maze wall ${x},${y}`);
 }
});
test('new room switching keeps only the active room visible and preserves rig accessories',()=>{
 const rig=new THREE.Group(),hand=new THREE.Group(),pokedex=new THREE.Group();rig.add(hand,pokedex);world.scene.add(rig);
 const camera=new THREE.PerspectiveCamera();rig.add(camera);const fade=new DoorwayTransition(camera);
 for(const id of Object.keys(VIRIDIAN_INTERIORS)){
  fade.begin(()=>world.activate(id));fade.update(.14);assert.equal(fade.state,'covered');fade.update(.01);fade.update(.21);
  assert.equal(world.active,id);assert.equal(fade.busy,false);
  for(const [key,room] of world.spaces)assert.equal(room.root.visible,key===id);
  assert.equal(hand.parent,rig);assert.equal(pokedex.parent,rig);
 }
});
