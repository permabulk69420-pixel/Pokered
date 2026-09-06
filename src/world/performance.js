import * as THREE from 'three';

const DEFAULT_CHUNK_SIZE=12;
const TARGETS=[
  name=>name.startsWith('route-1-curved-grass-'),
  name=>name==='viridian-meadow-grass',
];

function shouldChunk(mesh){
  return mesh?.isInstancedMesh&&mesh.count>0&&TARGETS.some(match=>match(mesh.name||''));
}

function copyRenderState(source,target){
  target.position.copy(source.position);
  target.quaternion.copy(source.quaternion);
  target.scale.copy(source.scale);
  target.visible=source.visible;
  target.castShadow=source.castShadow;
  target.receiveShadow=source.receiveShadow;
  target.frustumCulled=source.frustumCulled;
  target.renderOrder=source.renderOrder;
  target.layers.mask=source.layers.mask;
  target.userData={...source.userData};
  target.onBeforeRender=source.onBeforeRender;
  target.onAfterRender=source.onAfterRender;
  target.customDepthMaterial=source.customDepthMaterial;
  target.customDistanceMaterial=source.customDistanceMaterial;
}

function chunkInstancedMesh(mesh,chunkSize){
  const parent=mesh.parent;if(!parent)return 0;
  const matrix=new THREE.Matrix4(),color=new THREE.Color(),buckets=new Map();
  for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);
    const e=matrix.elements,key=`${Math.floor(e[12]/chunkSize)}/${Math.floor(e[14]/chunkSize)}`;
    if(!buckets.has(key))buckets.set(key,[]);
    const item={matrix:matrix.clone()};
    if(mesh.instanceColor){mesh.getColorAt(i,color);item.color=color.clone();}
    buckets.get(key).push(item);
  }
  // A single bucket gains nothing and would only rename the mesh.
  if(buckets.size<=1)return 0;

  for(const [key,items] of buckets){
    const chunk=new THREE.InstancedMesh(mesh.geometry,mesh.material,items.length);
    chunk.name=`${mesh.name}:chunk-${key}`;
    copyRenderState(mesh,chunk);
    items.forEach((item,index)=>{
      chunk.setMatrixAt(index,item.matrix);
      if(item.color)chunk.setColorAt(index,item.color);
    });
    chunk.instanceMatrix.needsUpdate=true;
    if(chunk.instanceColor)chunk.instanceColor.needsUpdate=true;
    chunk.computeBoundingSphere();
    parent.add(chunk);
  }
  parent.remove(mesh);
  return buckets.size;
}

// Route 1 originally grouped every animated grass clump into three route-wide
// InstancedMeshes. Viridian did the same with its meadow. Three.js frustum-culls
// an InstancedMesh as one object, so a visible corner could submit the entire
// batch. Splitting by position keeps identical geometry, materials, animation,
// density and placement while giving each small area its own culling bounds.
export function chunkHeavyGrass(root,{chunkSize=DEFAULT_CHUNK_SIZE}={}){
  const candidates=[];root?.traverse(obj=>{if(shouldChunk(obj))candidates.push(obj);});
  let sourceMeshes=0,chunkMeshes=0;
  for(const mesh of candidates){
    const chunks=chunkInstancedMesh(mesh,chunkSize);
    if(chunks>0){sourceMeshes++;chunkMeshes+=chunks;}
  }
  return {sourceMeshes,chunkMeshes,chunkSize};
}
