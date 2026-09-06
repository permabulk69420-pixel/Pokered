import * as THREE from 'three';

// Pallet originally rendered three decorative forest-depth rows beyond its
// north exit because Route 1 did not exist yet. Once Route 1 is present those
// instances occupy real route space, so compact them out of the instanced tree
// meshes and remove their matching navigation circles.
export function prunePalletRouteBackdrop(scene,colliders) {
  const root=scene.getObjectByName('tree-border');
  if(root){
    const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
    root.traverse(obj=>{
      if(!obj.isInstancedMesh)return;
      let write=0;
      for(let read=0;read<obj.count;read++){
        obj.getMatrixAt(read,matrix);position.setFromMatrixPosition(matrix);
        const obsolete=position.z<-17.4&&position.z>-33.6&&position.x>-16.5&&position.x<18.5;
        if(obsolete)continue;
        if(write!==read)obj.setMatrixAt(write,matrix);
        write++;
      }
      if(write!==obj.count){obj.count=write;obj.instanceMatrix.needsUpdate=true;obj.computeBoundingSphere();}
    });
  }
  for(let i=colliders.length-1;i>=0;i--){
    const c=colliders[i];
    if(c.kind==='circle'&&c.z<-17.4&&c.z>-33.6&&c.x>-16.5&&c.x<18.5)colliders.splice(i,1);
  }
}
