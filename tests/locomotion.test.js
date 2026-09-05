import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { moveWithCollisions, overlaps, deadzone } from '../src/xr/collision.js';
import { Locomotion } from '../src/xr/locomotion.js';
import { tileToWorld } from '../src/world/layout.js';

test('a long movement cannot tunnel through a thin fence',()=>{
  const fence={kind:'box',minX:-4,maxX:4,minZ:0,maxZ:.1};
  const p=moveWithCollisions(0,-2,0,10,[fence]);
  assert.ok(p.z<-.23);assert.ok(p.z>-.33);assert.equal(overlaps(p.x,p.z,.23,fence),false);
});

test('diagonal movement slides alongside a wall without entering it',()=>{
  const wall={kind:'box',minX:0,maxX:4,minZ:-4,maxZ:4};
  const p=moveWithCollisions(-1,-2,3,3,[wall]);
  assert.ok(p.x<=-.23);assert.ok(p.z>.95);assert.equal(overlaps(p.x,p.z,.23,wall),false);
});

test('shoreline collision keeps the player on land',()=>{
  const water={kind:'box',id:'water',minX:-12.3,maxX:-3.7,minZ:9.95,maxZ:100};
  const p=moveWithCollisions(-8,9,0,3,[water]);
  assert.ok(p.z<9.73);assert.equal(p.blocked,'water');
});

test('open space retains the requested distance and diagonal direction',()=>{
  const p=moveWithCollisions(2,-1,-2,3,[]);
  assert.ok(Math.abs(p.x)<1e-12);assert.ok(Math.abs(p.z-2)<1e-12);
});

test('small Quest stick noise does not move or turn the player',()=>{
  assert.equal(deadzone(.12),0);assert.equal(deadzone(-.1),0);
  assert.equal(deadzone(1),1);assert.equal(deadzone(-1),-1);
  assert.ok(Math.abs(deadzone(.58)-.5)<1e-9);
});

test('smooth turn stays centred on an offset tracked head',()=>{
  const rig=new THREE.Group(),camera=new THREE.PerspectiveCamera();
  rig.add(camera);rig.position.set(7,0,-3);rig.rotation.y=.7;camera.position.set(.8,1.7,-.5);
  rig.updateMatrixWorld(true);const before=camera.getWorldPosition(new THREE.Vector3());
  const subject={rig,camera,pivot:new THREE.Vector3(),up:new THREE.Vector3(0,1,0)};
  for(let i=0;i<100;i++)Locomotion.prototype.rotateAroundHead.call(subject,.016);
  rig.updateMatrixWorld(true);const after=camera.getWorldPosition(new THREE.Vector3());
  assert.ok(before.distanceTo(after)<1e-9);
  assert.ok(Math.abs(rig.rotation.y-2.3)<1e-9);
});

test('north, east, and original door tiles use the documented world axes',()=>{
  assert.deepEqual(tileToWorld(5,5),[-9,-7]);
  assert.deepEqual(tileToWorld(13,5),[7,-7]);
  assert.deepEqual(tileToWorld(12,11),[5,5]);
  assert.ok(tileToWorld(10,0)[1]<tileToWorld(10,17)[1]);
});
