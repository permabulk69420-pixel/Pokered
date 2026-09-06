import * as THREE from 'three';
import { createPalletTown } from './pallet-town.js';
import { createInterior } from './interiors/rooms.js';
import { INTERIORS, entranceAt, atInteriorExit, interiorArrival, exteriorArrival } from './interiors/layout.js';

// Spaces share the same metre-based coordinates and player rig. Only the active
// space and its lights render; entering a house does not draw the forest too.
export class WorldSpaces {
  constructor(scene,{onChange}={}) {
    this.scene=scene;this.onChange=onChange;this.active='pallet-town';
    const townRoot=new THREE.Group();townRoot.name='pallet-town';scene.add(townRoot);
    this.town=createPalletTown(townRoot);
    this.spaces=new Map([['pallet-town',{
      root:townRoot,navigation:{colliders:this.town.colliders},
      background:townRoot.background,fog:townRoot.fog,
    }]]);
    for(const id of Object.keys(INTERIORS)){
      const room=createInterior(id);room.root.visible=false;scene.add(room.root);this.spaces.set(id,room);
    }
    this.activate('pallet-town');
  }
  get current(){return this.spaces.get(this.active);}
  activate(id) {
    const next=this.spaces.get(id);if(!next)throw new Error(`Unknown space: ${id}`);
    for(const [key,space] of this.spaces)space.root.visible=key===id;
    this.active=id;this.scene.background=next.background;this.scene.fog=next.fog;
    this.onChange?.(id,next);return next;
  }
  doorway(x,z,height) {
    if(this.active==='pallet-town'){
      const id=entranceAt(this.town.layout.buildings,x,z);
      return id?{id,arrival:interiorArrival(INTERIORS[id])}:null;
    }
    if(atInteriorExit(this.current.spec,x,z,height)){
      const outside=this.town.layout.buildings.find(b=>b.id===this.active);
      return {id:'pallet-town',arrival:exteriorArrival(outside)};
    }
    return null;
  }
  update(time){if(this.active==='pallet-town')this.town.update(time);}
}

// A scene-space fade covers both XR eyes and desktop. A CSS overlay would only
// cover the monitor. Movement pauses during the short fade; head tracking does not.
export class DoorwayTransition {
  constructor(camera) {
    this.time=0;this.state='idle';this.pending=null;
    const material=new THREE.MeshBasicMaterial({color:'#172722',transparent:true,opacity:0,side:THREE.BackSide,depthTest:false,depthWrite:false,fog:false,toneMapped:false});
    this.mesh=new THREE.Mesh(new THREE.SphereGeometry(.45,16,12),material);
    this.mesh.name='doorway-fade';this.mesh.frustumCulled=false;this.mesh.renderOrder=10000;this.mesh.visible=false;camera.add(this.mesh);
  }
  get busy(){return this.state!=='idle';}
  begin(change){if(this.busy)return;this.pending=change;this.time=0;this.state='out';this.mesh.visible=true;}
  cancel(){this.pending=null;this.state='idle';this.time=0;this.mesh.visible=false;this.mesh.material.opacity=0;}
  update(dt) {
    if(!this.busy)return;
    this.time+=dt;
    if(this.state==='out'){
      this.mesh.material.opacity=Math.min(1,this.time/.13);
      if(this.time>=.13){this.state='covered';this.time=0;}
    }else if(this.state==='covered'){
      // Keep one completely covered rendered frame before moving either eye.
      const change=this.pending;this.pending=null;change?.();this.state='in';this.time=0;
    }else{
      this.mesh.material.opacity=Math.max(0,1-this.time/.20);
      if(this.time>=.20)this.cancel();
    }
  }
}
