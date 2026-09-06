import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createInterior } from '../src/world/interiors/rooms.js';
import { INTERIORS, RED_STAIRS, STOREY, interiorArrival, exteriorArrival, exteriorDoorColliders, entranceAt, atInteriorExit } from '../src/world/interiors/layout.js';
import { PALLET_TOWN } from '../src/world/layout.js';
import { moveWithNavigation } from '../src/xr/navigation.js';
import { Locomotion } from '../src/xr/locomotion.js';
import { WorldSpaces, DoorwayTransition } from '../src/world/spaces.js';

// Geometry and navigation tests do not need a GPU. The native visual check uses
// real canvas textures; this adapter only supplies the drawing API for assembly.
const gradient=()=>({addColorStop(){}});
const context=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient},{get:(target,key)=>target[key]??(()=>{})});
globalThis.document={createElement:()=>({width:512,height:384,getContext:()=>context})};
const rooms=new Map(Object.keys(INTERIORS).map(id=>[id,createInterior(id)]));

test('every open exterior entrance and indoor exit can be walked through',()=>{
  for(const building of PALLET_TOWN.buildings){
    const p=exteriorArrival(building),outsideNav={colliders:exteriorDoorColliders(building)};
    const door=moveWithNavigation(p.x,p.z,0,0,-1.25,outsideNav);
    assert.equal(entranceAt(PALLET_TOWN.buildings,door.x,door.z),building.id,building.id);
    assert.equal(entranceAt(PALLET_TOWN.buildings,p.x,p.z),null,'arrival must not immediately re-enter');
    const room=rooms.get(building.id),start=interiorArrival(room.spec);
    const exit=moveWithNavigation(start.x,start.z,0,0,1.5,room.navigation);
    assert.equal(atInteriorExit(room.spec,exit.x,exit.z,exit.y),true,building.id);
    assert.equal(atInteriorExit(room.spec,start.x,start.z,0),false);
    assert.equal(atInteriorExit(room.spec,exit.x,exit.z,STOREY),false,'upstairs never triggers the front door');
  }
});

test('the furnished Red house connects its ground floor, landing and bedroom both ways',()=>{
  const nav=rooms.get('reds-house').navigation;
  let p={...interiorArrival(INTERIORS['reds-house'])};
  const travel=(x,z)=>{p=moveWithNavigation(p.x,p.z,p.y,x-p.x,z-p.z,nav);assert.ok(Math.hypot(p.x-x,p.z-z)<1e-7,`route stopped at ${p.x}, ${p.z}: ${p.blocked}`);};
  // Go around the southern chairs, climb the east stair, then turn left off
  // the north landing. These routes use the actual furniture colliders.
  travel(3.8,3.95);travel(3.8,-4.02);assert.equal(p.y,STOREY);
  travel(1.80,-4.02);travel(1.80,2.85);travel(-1.70,2.85);
  assert.equal(p.y,STOREY);
  travel(1.80,2.85);travel(1.80,-4.02);travel(3.80,-4.02);travel(3.80,3.95);
  assert.ok(Math.abs(p.y)<1e-10);travel(-1.20,3.95);
});

test('stair height is continuous and railings prevent sideways climbing or dropping',()=>{
  const nav=rooms.get('reds-house').navigation;
  let p={x:3.8,z:2.1,y:0},last=0;
  while(p.z>-4.0){
    p=moveWithNavigation(p.x,p.z,p.y,0,-.035,nav);
    assert.ok(p.y>=last-1e-10);assert.ok(p.y-last<.024,'a visible tread must not bump the camera');last=p.y;
  }
  assert.equal(p.y,STOREY);
  for(const height of [0,STOREY]){
    const edge=moveWithNavigation(2.4,0,height,2,0,nav);
    assert.ok(edge.x<RED_STAIRS.minX-.23);assert.equal(edge.y,height);
  }
  const bottom=moveWithNavigation(3.8,2.3,STOREY,0,-2,nav);
  assert.ok(bottom.z>RED_STAIRS.bottomZ+.23);assert.equal(bottom.y,STOREY);
});

test('the lab central aisle reaches the research tables and the house table can be circled',()=>{
  for(const [id,waypoints] of [
    ['oaks-lab',[[0,3],[0,-1.35],[3.15,-1.35]]],
    ['blues-house',[[-3.0,3.9],[-3.0,-2.2],[2.9,-2.2],[2.9,3.9],[-1.2,3.9]]],
  ]){
    const room=rooms.get(id);let p=interiorArrival(room.spec);
    for(const [x,z] of waypoints){p=moveWithNavigation(p.x,p.z,p.y,x-p.x,z-p.z,room.navigation);assert.ok(Math.hypot(p.x-x,p.z-z)<1e-7,`${id}: ${p.blocked}`);}
  }
});

test('door relocation preserves tracked height, room-scale offset and facing',()=>{
  const rig=new THREE.Group(),camera=new THREE.PerspectiveCamera();rig.add(camera);
  rig.position.set(2,STOREY,4);rig.rotation.y=.7;camera.position.set(.8,1.71,-.5);camera.rotation.set(.12,.4,0);
  const subject={rig,camera,head:new THREE.Vector3(),floorHeight:STOREY};
  const before=camera.getWorldQuaternion(new THREE.Quaternion());
  Locomotion.prototype.relocate.call(subject,{x:7,z:6,y:0});
  const head=camera.getWorldPosition(new THREE.Vector3());
  assert.ok(head.distanceTo(new THREE.Vector3(7,1.71,6))<1e-9);
  assert.ok(before.angleTo(camera.getWorldQuaternion(new THREE.Quaternion()))<1e-7);
  assert.deepEqual(camera.position.toArray(),[.8,1.71,-.5]);assert.equal(subject.floorHeight,0);
});

test('Quest-style movement climbs while retaining the physical eye height',()=>{
  const rig=new THREE.Group(),camera=new THREE.PerspectiveCamera();rig.add(camera);
  rig.position.set(3.6,0,2.3);camera.position.set(.2,1.71,.1);
  const subject={rig,camera,navigation:rooms.get('reds-house').navigation,floorHeight:0,
    renderer:{xr:{isPresenting:true,getSession:()=>({inputSources:[{handedness:'left',gamepad:{axes:[0,0,0,-1],buttons:[]}}]})}},
    forward:new THREE.Vector3(),right:new THREE.Vector3(),head:new THREE.Vector3(),motion:new THREE.Vector3(),up:new THREE.Vector3(0,1,0)};
  for(let i=0;i<280;i++)Locomotion.prototype.update.call(subject,1/72);
  assert.equal(subject.floorHeight,STOREY);
  assert.ok(Math.abs(camera.getWorldPosition(new THREE.Vector3()).y-(STOREY+1.71))<1e-9);
  assert.deepEqual(camera.position.toArray(),[.2,1.71,.1]);
});

test('only one space and its lights are visible, including after returning to town',()=>{
  const scene=new THREE.Scene(),world=new WorldSpaces(scene);
  for(const id of ['reds-house','blues-house','oaks-lab','pallet-town']){
    world.activate(id);
    assert.deepEqual([...world.spaces].filter(([,space])=>space.root.visible).map(([key])=>key),[id]);
    assert.equal(scene.fog,id==='pallet-town'?world.current.fog:null);
  }
});

test('doorway transfer happens only at full cover and cancelled transitions cannot fire',()=>{
  const camera=new THREE.PerspectiveCamera(),fade=new DoorwayTransition(camera);let moves=0;
  fade.begin(()=>moves++);fade.update(.10);assert.equal(moves,0);
  fade.update(.035);assert.equal(fade.mesh.material.opacity,1);assert.equal(moves,0);
  fade.update(.014);assert.equal(moves,1);assert.equal(fade.mesh.material.opacity,1);
  fade.update(.21);assert.equal(fade.busy,false);assert.equal(fade.mesh.visible,false);
  fade.begin(()=>moves++);fade.cancel();fade.update(1);assert.equal(moves,1);
});
