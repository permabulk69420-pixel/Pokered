import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const STARTER_GRAB_RADIUS=.30;
const STARTER_GRAB_ON=.45;
const STARTER_FALLBACK_CENTER_Y=1.012;
const FOLLOW_STOP=.92;
const FOLLOW_WALK=1.45;
const FOLLOW_RUN=2.85;
const FOLLOW_SNAP=8;
const RECALL_RADIUS=1.35;

const SPECIES=Object.freeze({
  charmander:Object.freeze({
    key:'charmander',id:4,name:'Charmander',height:.61,
    asset:'assets/pokemon/Charmander_Animated.glb',
    idle:['idle','stand','breath'],walk:['walk'],run:['run','sprint'],scratch:['scratch','attack','swipe'],
    forwardYaw:0,
  }),
});

const STARTER_SLOT_KEYS=Object.freeze(['charmander','squirtle','bulbasaur']);

function chooseClip(clips,aliases){
  for(const alias of aliases){
    const exact=clips.find(clip=>clip.name.toLowerCase()===alias);if(exact)return exact;
    const partial=clips.find(clip=>clip.name.toLowerCase().includes(alias));if(partial)return partial;
  }
  return null;
}

function makeAnimator(model,clips,species){
  if(!clips?.length)return {update(){},play(){},names:[]};
  const mixer=new THREE.AnimationMixer(model),actions=new Map();
  const selected={idle:chooseClip(clips,species.idle),walk:chooseClip(clips,species.walk),run:chooseClip(clips,species.run),scratch:chooseClip(clips,species.scratch)};
  for(const [key,clip] of Object.entries(selected))if(clip){
    const action=mixer.clipAction(clip);action.enabled=true;action.setLoop(THREE.LoopRepeat,Infinity);actions.set(key,action);
  }
  let current=null;
  function play(key){
    const next=actions.get(key)||actions.get('idle')||actions.values().next().value;if(!next||next===current)return;
    next.reset().fadeIn(.16).play();if(current)current.fadeOut(.16);current=next;
  }
  play('idle');
  return {update:dt=>mixer.update(dt),play,names:clips.map(clip=>clip.name)};
}

function normalizeModel(model,height){
  model.updateMatrixWorld(true);
  let bounds=new THREE.Box3().setFromObject(model),size=new THREE.Vector3();bounds.getSize(size);
  if(size.y>.0001)model.scale.multiplyScalar(height/size.y);
  model.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(model);model.position.y-=bounds.min.y;model.updateMatrixWorld(true);
}

function findStarterSlots(scene){
  const lab=scene.getObjectByName('interior-oaks-lab');if(!lab)return [];
  const mounts=[];lab.traverse(object=>{if(object.name==='starter-pokeball')mounts.push(object);});
  mounts.sort((a,b)=>a.position.x-b.position.x);
  return mounts.map((mount,index)=>({mount,key:STARTER_SLOT_KEYS[index]||null,index}));
}

function starterGrabPoint(slot,out){
  const visual=slot.mount.getObjectByName('starter-pokeball-model');
  if(visual){
    visual.updateWorldMatrix(true,true);
    const bounds=new THREE.Box3().setFromObject(visual);
    if(!bounds.isEmpty())return bounds.getCenter(out);
  }
  slot.mount.updateWorldMatrix(true,false);
  out.set(0,STARTER_FALLBACK_CENTER_Y,0);
  return slot.mount.localToWorld(out);
}

export async function createPokemonSystem({renderer,scene,rig,states,onClaimBall}){
  const loader=new GLTFLoader();
  const playerCamera=rig.children.find(child=>child.isCamera);
  const companion=new THREE.Group();companion.name='active-pokemon';companion.visible=false;scene.add(companion);
  const temp=new THREE.Vector3(),head=new THREE.Vector3(),forward=new THREE.Vector3(),desired=new THREE.Vector3(),delta=new THREE.Vector3();
  const handWorld=new THREE.Vector3(),slotWorld=new THREE.Vector3();
  const starterSlots=findStarterSlots(scene);
  const state={flags:{starterSelectionUnlocked:true,starterChosen:false},starter:null,party:[]};
  let activeKey=null,model=null,animator=null,lastSpaceVisible=false;

  async function loadSpecies(key){
    const species=SPECIES[key];if(!species)throw new Error(`No Pokémon asset configured for ${key}.`);
    const gltf=await loader.loadAsync(new URL(species.asset,document.baseURI).href);
    const root=gltf.scene;root.name=`${key}-model`;normalizeModel(root,species.height);
    root.traverse(object=>{if(object.isMesh){object.castShadow=false;object.receiveShadow=true;object.frustumCulled=true;}});
    return {species,root,animation:makeAnimator(root,gltf.animations,species)};
  }

  let charmanderAsset=null;
  try{charmanderAsset=await loadSpecies('charmander');}catch(error){console.warn('Charmander asset could not be loaded.',error);}

  function stateSnapshot(){return {starter:state.starter,party:state.party.map(p=>({...p})),flags:{...state.flags},active:activeKey};}
  function emit(type,detail={}){try{window.dispatchEvent(new CustomEvent('kanto:pokemon',{detail:{type,...detail,state:stateSnapshot()}}));}catch{}}

  function claimStarter(key,inputState,mount){
    if(state.flags.starterChosen||!state.flags.starterSelectionUnlocked)return false;
    const species=SPECIES[key];if(!species||!charmanderAsset)return false;
    state.flags.starterChosen=true;state.starter=key;
    state.party.push({species:key,id:species.id,name:species.name,level:5,ball:'pokeball'});
    mount.visible=false;onClaimBall?.(key,inputState);
    emit('starter-chosen',{pokemon:{species:key,id:species.id,name:species.name,level:5}});return true;
  }

  function checkStarterPickup(){
    if(!renderer.xr.isPresenting||state.flags.starterChosen||!state.flags.starterSelectionUnlocked)return;
    const lab=scene.getObjectByName('interior-oaks-lab');if(!lab?.visible)return;
    const slot=starterSlots.find(entry=>entry.key==='charmander'&&entry.mount.visible);if(!slot)return;
    starterGrabPoint(slot,slotWorld);
    for(const inputState of states){
      if(!inputState.inputSource||inputState.inputSource.hand)continue;
      const squeeze=inputState.inputSource.gamepad?.buttons?.[1]?.value??0;if(squeeze<STARTER_GRAB_ON)continue;
      inputState.grip.getWorldPosition(handWorld);
      if(handWorld.distanceTo(slotWorld)<=STARTER_GRAB_RADIUS){claimStarter('charmander',inputState,slot.mount);break;}
    }
  }

  function ensureCompanion(){if(!model&&charmanderAsset){model=charmanderAsset.root;animator=charmanderAsset.animation;companion.add(model);}}
  function release(key,position){
    if(!state.party.some(p=>p.species===key)||activeKey===key||key!=='charmander'||!charmanderAsset)return false;
    ensureCompanion();activeKey=key;companion.visible=renderer.xr.isPresenting;companion.position.set(position.x,rig.position.y,position.z);
    companion.rotation.set(0,SPECIES[key].forwardYaw,0);animator?.play('idle');emit('released',{species:key});return true;
  }
  function recall(key){if(activeKey!==key)return false;activeKey=null;companion.visible=false;animator?.play('idle');emit('recalled',{species:key});return true;}
  function ballOpened(key,position){
    if(!key||!state.party.some(p=>p.species===key))return;
    if(activeKey!==key){release(key,position);return;}
    companion.getWorldPosition(temp);if(temp.distanceTo(position)<=RECALL_RADIUS)recall(key);
  }

  function updateFollower(dt){
    if(!activeKey||!model||!playerCamera)return;
    companion.visible=renderer.xr.isPresenting;if(!renderer.xr.isPresenting)return;
    playerCamera.getWorldPosition(head);playerCamera.getWorldDirection(forward);forward.y=0;
    if(forward.lengthSq()<.001)forward.set(0,0,-1);else forward.normalize();
    desired.copy(head).addScaledVector(forward,-1.12);desired.x+=forward.z*.42;desired.z-=forward.x*.42;desired.y=rig.position.y;
    delta.copy(desired).sub(companion.position);delta.y=0;const distance=delta.length();
    if(distance>FOLLOW_SNAP){companion.position.copy(desired);animator?.play('idle');}
    else if(distance>FOLLOW_STOP){
      const speed=distance>3?FOLLOW_RUN:FOLLOW_WALK,step=Math.min(distance-FOLLOW_STOP,speed*dt);delta.normalize();companion.position.addScaledVector(delta,step);
      const targetYaw=Math.atan2(delta.x,delta.z)+SPECIES[activeKey].forwardYaw;
      const turn=THREE.MathUtils.euclideanModulo(targetYaw-companion.rotation.y+Math.PI,Math.PI*2)-Math.PI;companion.rotation.y+=turn*Math.min(1,dt*7);
      animator?.play(distance>3?'run':'walk');
    }else animator?.play('idle');
    companion.position.y=THREE.MathUtils.lerp(companion.position.y,rig.position.y,Math.min(1,dt*8));animator?.update(dt);
  }

  function update(dt){
    const xr=renderer.xr.isPresenting;checkStarterPickup();updateFollower(dt);if(!xr&&companion.visible)companion.visible=false;
    const lab=scene.getObjectByName('interior-oaks-lab'),visible=!!lab?.visible;
    if(visible!==lastSpaceVisible){lastSpaceVisible=visible;if(activeKey&&xr&&companion.position.distanceTo(rig.position)>FOLLOW_SNAP)companion.position.copy(rig.position);}
  }
  function resetSession(){if(activeKey){companion.visible=false;companion.position.copy(rig.position);}}
  function setStarterSelectionUnlocked(value){state.flags.starterSelectionUnlocked=!!value;emit('starter-lock',{unlocked:state.flags.starterSelectionUnlocked});}

  return {update,ballOpened,release,recall,resetSession,setStarterSelectionUnlocked,
    get starter(){return state.starter;},get party(){return state.party.map(p=>({...p}));},get active(){return activeKey;},
    get animations(){return animator?.names||charmanderAsset?.animation?.names||[];},get state(){return stateSnapshot();}};
}
