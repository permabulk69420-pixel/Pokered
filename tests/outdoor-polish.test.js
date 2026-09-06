import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPalletTown} from '../src/world/pallet-town.js';
import {chunkHeavyGrass} from '../src/world/performance.js';
import {instanceSet} from '../src/world/geometry.js';

const gradient=()=>({addColorStop(){}});
const context=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient},{get:(t,k)=>t[k]??(()=>{})});
globalThis.document={createElement:()=>({width:512,height:384,getContext:()=>context})};
const scene=new THREE.Scene(),town=createPalletTown(scene);

test('lighter tall grass retains 25 clumps in every original encounter tile',()=>{
  const cells=new Map(),matrix=new THREE.Matrix4();let triangles=0;
  town.route1.root.traverse(mesh=>{
    if(!mesh.isInstancedMesh||!mesh.name.startsWith('route-1-curved-grass-'))return;
    triangles+=mesh.geometry.index.count/3*mesh.count;
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);const x=matrix.elements[12],z=matrix.elements[14];
      const c=Math.round((x+19)/2),r=Math.round((z+89)/2),key=`${c}/${r}`;
      assert.equal(town.route1.grass[r]?.[c],'G');cells.set(key,(cells.get(key)||0)+1);
    }
  });
  for(let r=0;r<36;r++)for(let c=0;c<20;c++)if(town.route1.grass[r][c]==='G')assert.equal(cells.get(`${c}/${r}`),25);
  assert.ok(triangles<130000,`Tall-grass budget regressed to ${triangles} triangles`);
});

test('ledge batching preserves the authored geometry within 24 mesh submissions',()=>{
  let meshes=0,triangles=0;
  for(const root of [town.route1.root,town.viridian.root]){
    root.getObjectByName('route-1-ledges').traverse(mesh=>{
      if(!mesh.isMesh)return;meshes++;triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);
    });
  }
  assert.equal(triangles,13669);assert.equal(meshes,24);
});

test('grass chunk bounds include shader movement while preserving instance colours',()=>{
  const root=new THREE.Group(),geometry=new THREE.BoxGeometry(.2,1,.2),mat=new THREE.MeshBasicMaterial();
  const mesh=instanceSet(geometry,mat,[{position:[-14,0,0],color:'#88aa44'},{position:[14,0,0],color:'#99bb55'}],'route-1-curved-grass-test',false);
  mesh.userData.windBoundsPadding=.4;root.add(mesh);const callback=()=>{};mesh.onBeforeRender=callback;
  chunkHeavyGrass(root);
  assert.equal(root.children.length,2);
  for(const chunk of root.children){
    assert.equal(chunk.onBeforeRender,callback);assert.ok(chunk.instanceColor);assert.equal(chunk.count,1);
    const expanded=chunk.boundingSphere.radius;chunk.computeBoundingSphere();
    assert.ok(Math.abs(expanded-chunk.boundingSphere.radius-.4)<1e-6);
  }
});
