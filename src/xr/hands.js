import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

// Add GLBs under public/assets/hands/ and set their relative names in hands.json.
// Empty slots use subtle grip markers; no file picker, runtime upload or CDN models.
export async function setupHands(renderer,rig) {
  const grips=[renderer.xr.getControllerGrip(0),renderer.xr.getControllerGrip(1)];
  const slots=new Map();const loader=new GLTFLoader();
  const base=new URL('assets/hands/',document.baseURI);
  let config={left:null,right:null};
  try {const r=await fetch(new URL('hands.json',base));if(r.ok)config=await r.json();}catch(error){console.warn('Hand manifest unavailable; using grip markers.',error);}
  async function modelFor(hand) {
    const path=config[hand];if(!path)return null;
    if(!slots.has(hand)) slots.set(hand,loader.loadAsync(new URL(path,base).href).then(gltf=>gltf.scene));
    return clone(await slots.get(hand));
  }
  grips.forEach((grip,index)=> {
    grip.name=`controller-grip-${index}`;rig.add(grip);
    const marker=new THREE.Mesh(new THREE.CapsuleGeometry(.025,.065,3,8),new THREE.MeshStandardMaterial({color:'#fff4db',roughness:.7}));
    marker.rotation.x=Math.PI/2;marker.name='temporary-grip-marker';grip.add(marker);
    let generation=0;
    grip.addEventListener('connected',async event=> {
      const token=++generation;const source=event.data;marker.visible=!source.hand;
      if(source.hand)return;
      try {
        const model=await modelFor(source.handedness);if(!model||generation!==token)return;
        model.name=`custom-${source.handedness}-hand`;
        model.scale.setScalar(config.scale??1);
        model.rotation.set(...(config.rotation||[0,0,0]));
        model.position.set(...(config[`${source.handedness}Offset`]||[0,0,0]));
        grip.add(model);marker.visible=false;
      } catch(error) {console.warn(`Could not load ${source.handedness} hand model.`,error);}
    });
    grip.addEventListener('disconnected',()=> {
      generation++;marker.visible=false;
      for(const child of [...grip.children])if(child!==marker)grip.remove(child);
    });
  });
  return grips;
}
