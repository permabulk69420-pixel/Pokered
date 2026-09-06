import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const DEFAULT_ROTATIONS=Object.freeze({
  left:Object.freeze([0,0,Math.PI/2]),
  right:Object.freeze([0,0,-Math.PI/2]),
});

function createAnimation(root,clips) {
  const mixer=new THREE.AnimationMixer(root),actions=new Map();
  for(const clip of clips||[]) {
    const action=mixer.clipAction(clip);action.play();action.paused=true;action.weight=0;actions.set(clip.name,action);
  }
  return {mixer,actions,current:null};
}

function setPose(animation,name,amount) {
  const action=animation?.actions.get(name);if(!action)return;
  if(animation.current&&animation.current!==action)animation.current.weight=0;
  animation.current=action;action.weight=1;action.time=THREE.MathUtils.clamp(amount,0,1);
}

// Uses the rigged hands from dumbgame. The GLBs are copied into public/assets/hands/
// by the Pages workflow if they are not already present in this repository.
export async function setupHands(renderer,rig) {
  const controllers=[renderer.xr.getController(0),renderer.xr.getController(1)];
  const grips=[renderer.xr.getControllerGrip(0),renderer.xr.getControllerGrip(1)];
  const loader=new GLTFLoader(),cache=new Map(),base=new URL('assets/hands/',document.baseURI);
  let config={left:'LeftHand.glb',right:'RightHand.glb',scale:1,leftOffset:[0,0,0],rightOffset:[0,0,0]};
  try {const response=await fetch(new URL('hands.json',base));if(response.ok)config={...config,...await response.json()};}
  catch(error){console.warn('Hand manifest unavailable; using default hand filenames.',error);}

  const loadHand=hand=> {
    if(!config[hand])return Promise.resolve(null);
    if(!cache.has(hand))cache.set(hand,loader.loadAsync(new URL(config[hand],base).href));
    return cache.get(hand);
  };

  const states=controllers.map((controller,index)=> {
    const grip=grips[index];controller.name=`controller-ray-${index}`;grip.name=`controller-grip-${index}`;
    rig.add(controller);rig.add(grip);
    const marker=new THREE.Mesh(
      new THREE.CapsuleGeometry(.025,.065,3,8),
      new THREE.MeshStandardMaterial({color:'#fff4db',roughness:.7})
    );
    marker.rotation.x=Math.PI/2;marker.name='temporary-grip-marker';marker.visible=false;grip.add(marker);
    return {controller,grip,marker,inputSource:null,handedness:'',anchor:null,root:null,animation:null,generation:0};
  });

  function detach(state) {
    state.generation++;
    if(state.anchor)state.grip.remove(state.anchor);
    state.anchor=null;state.root=null;state.animation=null;
    state.marker.visible=false;
  }

  async function attach(state,source) {
    detach(state);const token=state.generation;
    state.inputSource=source;state.handedness=source.handedness||'';
    // Native articulated hand tracking is a different input path; do not draw a
    // controller-grip hand on top of it.
    if(source.hand)return;
    if(state.handedness!=='left'&&state.handedness!=='right'){state.marker.visible=true;return;}
    try {
      const gltf=await loadHand(state.handedness);
      if(!gltf||token!==state.generation)return;
      const root=clone(gltf.scene),anchor=new THREE.Group();
      root.name=`${state.handedness}-vr-hand`;
      root.scale.setScalar(config.scale??1);
      root.traverse(object=>{if(object.isMesh){object.castShadow=false;object.receiveShadow=false;}});
      const rotation=config[`${state.handedness}Rotation`]||DEFAULT_ROTATIONS[state.handedness]||config.rotation||[0,0,0];
      const offset=config[`${state.handedness}Offset`]||[0,0,0];
      anchor.name=`${state.handedness}-hand-grip-offset`;anchor.position.fromArray(offset);anchor.rotation.set(...rotation);anchor.add(root);
      state.grip.add(anchor);state.anchor=anchor;state.root=root;state.animation=createAnimation(root,gltf.animations);
      setPose(state.animation,'Open',0);state.animation.mixer.update(0);state.marker.visible=false;
    } catch(error) {
      if(token!==state.generation)return;
      state.marker.visible=true;console.warn(`Could not load ${state.handedness} hand model.`,error);
    }
  }

  for(const state of states) {
    state.controller.addEventListener('connected',event=>attach(state,event.data));
    state.controller.addEventListener('disconnected',()=>{state.inputSource=null;state.handedness='';detach(state);});
  }

  function update(dt) {
    for(const state of states) {
      if(!state.animation)continue;
      const gamepad=state.inputSource?.gamepad,trigger=gamepad?.buttons?.[0]?.value??0,squeeze=gamepad?.buttons?.[1]?.value??0;
      if(squeeze>.08&&trigger>.08)setPose(state.animation,'Fist',Math.max(trigger,squeeze));
      else if(squeeze>.08)setPose(state.animation,'Grip',squeeze);
      else if(trigger>.08)setPose(state.animation,'Pinch',trigger);
      else setPose(state.animation,'Open',0);
      // These clips are intentionally paused and scrubbed; the mixer still has
      // to evaluate every XR frame for the bones to follow the analog controls.
      state.animation.mixer.update(dt);
    }
  }

  return {controllers,grips,states,update};
}
