import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const STARTER_GRAB_RADIUS=.30;
const STARTER_GRAB_ON=.45;
const STARTER_FALLBACK_CENTER_Y=1.012;

const TRAIL_DISTANCE=1.4;
const TRAIL_SAMPLE_DISTANCE=.14;
const TRAIL_MAX_POINTS=96;
const FOLLOW_STOP=.34;
const FOLLOW_WALK=1.35;
const FOLLOW_RUN=2.35;
const FOLLOW_RUN_DISTANCE=2.65;
const FOLLOW_SNAP=8;
const RECALL_RADIUS=1.35;

const RELEASE_TIME=.52;
const RECALL_TIME=.48;
const FX_PARTICLES=46;

const SPECIES=Object.freeze({
  charmander:Object.freeze({
    key:'charmander',id:4,name:'Charmander',height:.61,
    asset:'assets/pokemon/Charmander_Animated.glb',
    idle:['idle','stand','breath'],walk:['walk'],run:['run','sprint'],scratch:['scratch','attack','swipe'],
    animationSpeed:Object.freeze({run:.72}),
    forwardYaw:0,
  }),
  squirtle:Object.freeze({
    key:'squirtle',id:7,name:'Squirtle',height:.5,
    asset:'assets/pokemon/Squirtle_Animated.glb',
    idle:['idle'],walk:['walk'],run:['run'],tackle:['tackle'],tailWhip:['tailwhip','tail whip','tail_whip'],
    animationSpeed:Object.freeze({}),
    forwardYaw:0,
  }),
});

const STARTER_SLOT_KEYS=Object.freeze(['charmander','squirtle','bulbasaur']);
const ANIMATION_KEYS=Object.freeze(['idle','walk','run','scratch','tackle','tailWhip']);

function chooseClip(clips,aliases){
  for(const alias of aliases||[]){
    const exact=clips.find(clip=>clip.name.toLowerCase()===alias);if(exact)return exact;
    const partial=clips.find(clip=>clip.name.toLowerCase().includes(alias));if(partial)return partial;
  }
  return null;
}

function makeAnimator(model,clips,species){
  if(!clips?.length)return {update(){},play(){},names:[],selected:{}};
  const mixer=new THREE.AnimationMixer(model),actions=new Map(),selected={};
  for(const key of ANIMATION_KEYS){
    const clip=chooseClip(clips,species[key]);
    if(clip)selected[key]=clip;
  }
  for(const [key,clip] of Object.entries(selected)){
    const action=mixer.clipAction(clip);
    action.enabled=true;
    action.setLoop(THREE.LoopRepeat,Infinity);
    action.setEffectiveTimeScale(species.animationSpeed?.[key]??1);
    actions.set(key,action);
  }
  let current=null,currentKey=null;
  function play(key){
    const next=actions.get(key)||actions.get('idle')||actions.values().next().value;
    if(!next||next===current)return;
    next.reset();
    next.setEffectiveTimeScale(species.animationSpeed?.[key]??1);
    next.fadeIn(.18).play();
    if(current)current.fadeOut(.18);
    current=next;currentKey=key;
  }
  play('idle');
  return {
    update:dt=>mixer.update(dt),play,names:clips.map(clip=>clip.name),
    selected:Object.fromEntries(Object.entries(selected).map(([key,clip])=>[key,clip.name])),
    get current(){return currentKey;},
  };
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

function glowTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(255,255,255,1)');
  gradient.addColorStop(.18,'rgba(210,250,255,.98)');
  gradient.addColorStop(.48,'rgba(75,220,255,.48)');
  gradient.addColorStop(1,'rgba(40,150,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

function ringTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,128,128);
  const gradient=ctx.createRadialGradient(64,64,39,64,64,59);
  gradient.addColorStop(0,'rgba(80,220,255,0)');
  gradient.addColorStop(.34,'rgba(125,235,255,.35)');
  gradient.addColorStop(.52,'rgba(245,255,255,1)');
  gradient.addColorStop(.7,'rgba(85,210,255,.42)');
  gradient.addColorStop(1,'rgba(50,150,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

function createPokemonFx(scene){
  const root=new THREE.Group();root.name='pokemon-energy-fx';root.visible=false;scene.add(root);
  const glow=glowTexture(),ring=ringTexture();
  const additive={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,fog:false};

  const flash=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xd9fbff,...additive}));
  const flashWarm=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xffe6a0,...additive}));
  const ringA=new THREE.Sprite(new THREE.SpriteMaterial({map:ring,color:0x8deaff,...additive}));
  const ringB=new THREE.Sprite(new THREE.SpriteMaterial({map:ring,color:0xffffff,...additive}));
  root.add(flash,flashWarm,ringA,ringB);

  const beam=new THREE.Mesh(
    new THREE.CylinderGeometry(1,1,1,12,1,true),
    new THREE.MeshBasicMaterial({color:0xb9f6ff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,fog:false,side:THREE.DoubleSide})
  );
  root.add(beam);

  const positions=new Float32Array(FX_PARTICLES*3),seeds=[];
  for(let i=0;i<FX_PARTICLES;i++){
    const angle=(i/FX_PARTICLES)*Math.PI*2+(i%7)*.41;
    const radius=.08+(i%9)/9*.32;
    const lift=.05+(i%11)/11*.62;
    seeds.push({angle,radius,lift,spin:(i%2?1:-1)*(.9+(i%5)*.13)});
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const points=new THREE.Points(geometry,new THREE.PointsMaterial({map:glow,color:0xbdf5ff,size:.075,sizeAttenuation:true,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,fog:false,alphaTest:.02}));
  root.add(points);

  const start=new THREE.Vector3(),end=new THREE.Vector3(),dir=new THREE.Vector3(),mid=new THREE.Vector3();
  let state=null;

  function placeBeam(a,b,radius=.035){
    start.copy(a);end.copy(b);dir.copy(end).sub(start);const length=Math.max(.001,dir.length());
    mid.copy(start).add(end).multiplyScalar(.5);beam.position.copy(mid);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
    beam.scale.set(radius,length,radius);
  }

  function begin(type,ballPos,pokemonPos){
    state={type,t:0,ball:ballPos.clone(),pokemon:pokemonPos.clone()};
    root.visible=true;
    flash.position.copy(ballPos);flashWarm.position.copy(ballPos);
    ringA.position.copy(type==='release'?ballPos:pokemonPos);
    ringB.position.copy(type==='release'?pokemonPos:ballPos);
    points.material.opacity=1;beam.material.opacity=.85;
    if(type==='release')placeBeam(ballPos,pokemonPos,.038);else placeBeam(pokemonPos,ballPos,.045);
  }

  function release(ballPos,pokemonPos){begin('release',ballPos,pokemonPos);}
  function recall(ballPos,pokemonPos){begin('recall',ballPos,pokemonPos);}

  function update(dt){
    if(!state)return false;
    state.t+=dt;
    const duration=state.type==='release'?RELEASE_TIME:RECALL_TIME;
    const u=THREE.MathUtils.clamp(state.t/duration,0,1);
    const easeOut=1-Math.pow(1-u,3),easeIn=u*u;

    if(state.type==='release'){
      flash.position.copy(state.ball);flash.scale.setScalar(.16+easeOut*1.05);flash.material.opacity=(1-u)*.95;
      flashWarm.position.copy(state.ball);flashWarm.scale.setScalar(.1+easeOut*.5);flashWarm.material.opacity=Math.max(0,(1-u*1.7))*.8;
      ringA.position.copy(state.ball);ringA.scale.setScalar(.18+easeOut*1.55);ringA.material.opacity=(1-u)*.9;
      ringB.position.copy(state.pokemon);ringB.scale.setScalar(.12+easeOut*1.15);ringB.material.opacity=Math.max(0,(1-u*1.25))*.75;
      beam.material.opacity=Math.max(0,(1-u*1.15))*.82;
      beam.scale.x=beam.scale.z=.028+(1-u)*.038;
      for(let i=0;i<FX_PARTICLES;i++){
        const s=seeds[i],travel=easeOut;
        positions[i*3]=state.ball.x+Math.cos(s.angle+s.spin*u)*s.radius*travel;
        positions[i*3+1]=state.ball.y+s.lift*travel+.1*Math.sin(u*Math.PI);
        positions[i*3+2]=state.ball.z+Math.sin(s.angle+s.spin*u)*s.radius*travel;
      }
      points.material.opacity=(1-u)*.95;points.material.size=.055+(1-u)*.055;
    }else{
      flash.position.copy(state.ball);flash.scale.setScalar(.18+easeIn*.78);flash.material.opacity=.25+easeIn*.75;
      flashWarm.position.copy(state.ball);flashWarm.scale.setScalar(.1+easeIn*.38);flashWarm.material.opacity=easeIn*.7;
      ringA.position.copy(state.pokemon);ringA.scale.setScalar(1.05-(easeIn*.72));ringA.material.opacity=(1-u)*.82;
      ringB.position.copy(state.ball);ringB.scale.setScalar(.22+easeIn*.78);ringB.material.opacity=.35+easeIn*.55;
      beam.material.opacity=(1-u*.55)*.9;beam.scale.x=beam.scale.z=.055-(u*.027);
      for(let i=0;i<FX_PARTICLES;i++){
        const s=seeds[i],startX=state.pokemon.x+Math.cos(s.angle)*s.radius,startY=state.pokemon.y+s.lift,startZ=state.pokemon.z+Math.sin(s.angle)*s.radius;
        const swirl=(1-u)*.15;
        positions[i*3]=THREE.MathUtils.lerp(startX,state.ball.x,easeIn)+Math.cos(s.angle+s.spin*u*5)*swirl;
        positions[i*3+1]=THREE.MathUtils.lerp(startY,state.ball.y,easeIn)+Math.sin(u*Math.PI)*.08;
        positions[i*3+2]=THREE.MathUtils.lerp(startZ,state.ball.z,easeIn)+Math.sin(s.angle+s.spin*u*5)*swirl;
      }
      points.material.opacity=(1-u)*.95;points.material.size=.065+(1-u)*.045;
    }
    geometry.attributes.position.needsUpdate=true;

    if(u>=1){
      state=null;root.visible=false;beam.material.opacity=0;points.material.opacity=0;
      flash.material.opacity=flashWarm.material.opacity=ringA.material.opacity=ringB.material.opacity=0;
      return true;
    }
    return false;
  }

  return {release,recall,update,get active(){return !!state;},get type(){return state?.type||null;}};
}

export async function createPokemonSystem({renderer,scene,rig,states,onClaimBall}){
  const loader=new GLTFLoader();
  const playerCamera=rig.children.find(child=>child.isCamera);
  const companion=new THREE.Group();companion.name='active-pokemon';companion.visible=false;scene.add(companion);
  const fx=createPokemonFx(scene);
  const temp=new THREE.Vector3(),head=new THREE.Vector3(),forward=new THREE.Vector3(),desired=new THREE.Vector3(),delta=new THREE.Vector3();
  const handWorld=new THREE.Vector3(),slotWorld=new THREE.Vector3(),pokemonFxPoint=new THREE.Vector3();
  const trail=[];
  const state={flags:{starterSelectionUnlocked:true,starterChosen:false},starter:null,party:[]};
  const starterSlots=findStarterSlots(scene);
  const assets=new Map();
  let activeKey=null,model=null,animator=null,lastSpaceVisible=false,transition=null;

  async function loadSpecies(key){
    if(assets.has(key))return assets.get(key);
    const species=SPECIES[key];if(!species)throw new Error(`No Pokémon asset configured for ${key}.`);
    const gltf=await loader.loadAsync(new URL(species.asset,document.baseURI).href);
    const root=gltf.scene;root.name=`${key}-model`;normalizeModel(root,species.height);
    root.traverse(object=>{if(object.isMesh){object.castShadow=false;object.receiveShadow=true;object.frustumCulled=true;}});
    const asset={species,root,animation:makeAnimator(root,gltf.animations,species)};
    assets.set(key,asset);return asset;
  }

  const preloadResults=await Promise.allSettled(['charmander','squirtle'].map(loadSpecies));
  preloadResults.forEach((result,index)=>{
    if(result.status==='rejected')console.warn(`${index===0?'Charmander':'Squirtle'} asset could not be loaded.`,result.reason);
  });

  function stateSnapshot(){return {starter:state.starter,party:state.party.map(p=>({...p})),flags:{...state.flags},active:activeKey};}
  function emit(type,detail={}){try{window.dispatchEvent(new CustomEvent('kanto:pokemon',{detail:{type,...detail,state:stateSnapshot()}}));}catch{}}

  function claimStarter(key,inputState,mount){
    if(state.flags.starterChosen||!state.flags.starterSelectionUnlocked)return false;
    const species=SPECIES[key];if(!species||!assets.has(key))return false;
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

  function ensureCompanion(key){
    const asset=assets.get(key);if(!asset)return false;
    if(model!==asset.root){
      if(model?.parent===companion)companion.remove(model);
      model=asset.root;animator=asset.animation;companion.add(model);
    }
    return true;
  }

  function resetTrail(){
    trail.length=0;if(!playerCamera)return;
    playerCamera.getWorldPosition(head);head.y=rig.position.y;trail.push(head.clone());
  }

  function fallbackBehind(out){
    playerCamera.getWorldPosition(head);playerCamera.getWorldDirection(forward);forward.y=0;
    if(forward.lengthSq()<.001)forward.set(0,0,-1);else forward.normalize();
    return out.copy(head).addScaledVector(forward,-TRAIL_DISTANCE).setY(rig.position.y);
  }

  function sampleTrail(){
    playerCamera.getWorldPosition(head);head.y=rig.position.y;
    if(!trail.length){trail.push(head.clone());return;}
    const latest=trail[trail.length-1],dx=head.x-latest.x,dz=head.z-latest.z;
    if(dx*dx+dz*dz>=TRAIL_SAMPLE_DISTANCE*TRAIL_SAMPLE_DISTANCE){trail.push(head.clone());if(trail.length>TRAIL_MAX_POINTS)trail.splice(0,trail.length-TRAIL_MAX_POINTS);}
  }

  function trailTarget(out){
    if(!trail.length)return fallbackBehind(out);
    let remaining=TRAIL_DISTANCE,newer=head;
    for(let i=trail.length-1;i>=0;i--){
      const older=trail[i],dx=newer.x-older.x,dz=newer.z-older.z,segment=Math.hypot(dx,dz);
      if(segment>=remaining&&segment>.0001){
        const t=remaining/segment;out.set(newer.x+(older.x-newer.x)*t,rig.position.y,newer.z+(older.z-newer.z)*t);return out;
      }
      remaining-=segment;newer=older;
    }
    return out.copy(trail[0]).setY(rig.position.y);
  }

  function release(key,position){
    const species=SPECIES[key];
    if(transition||!species||!state.party.some(p=>p.species===key)||activeKey===key||!ensureCompanion(key))return false;
    activeKey=key;companion.visible=renderer.xr.isPresenting;
    companion.position.set(position.x,rig.position.y,position.z);companion.rotation.set(0,species.forwardYaw,0);
    companion.scale.setScalar(.045);animator?.play('idle');resetTrail();
    pokemonFxPoint.set(position.x,rig.position.y+species.height*.48,position.z);
    fx.release(position,pokemonFxPoint);
    transition={type:'release',t:0,key};
    emit('released',{species:key});return true;
  }

  function recall(key,ballPosition=null){
    if(transition||activeKey!==key)return false;
    const species=SPECIES[key];if(!species)return false;
    companion.getWorldPosition(temp);pokemonFxPoint.copy(temp);pokemonFxPoint.y+=species.height*.48;
    const target=ballPosition?.clone?.()||pokemonFxPoint.clone();
    fx.recall(target,pokemonFxPoint);
    transition={type:'recall',t:0,key,ball:target,start:companion.position.clone()};
    animator?.play('idle');return true;
  }

  function finishRecall(key){
    activeKey=null;companion.visible=false;companion.scale.setScalar(1);trail.length=0;transition=null;
    emit('recalled',{species:key});
  }

  function updateTransition(dt){
    if(!transition){fx.update(dt);return;}
    transition.t+=dt;
    if(transition.type==='release'){
      const u=THREE.MathUtils.clamp(transition.t/RELEASE_TIME,0,1),ease=1-Math.pow(1-u,3);
      companion.scale.setScalar(.045+(1-.045)*ease);
      fx.update(dt);
      if(u>=1){companion.scale.setScalar(1);transition=null;animator?.play('idle');}
      return;
    }
    const u=THREE.MathUtils.clamp(transition.t/RECALL_TIME,0,1),ease=u*u;
    companion.scale.setScalar(Math.max(.035,1-ease*.965));
    companion.position.lerpVectors(transition.start,transition.ball,ease*.82);companion.position.y=THREE.MathUtils.lerp(transition.start.y,rig.position.y,ease);
    const done=fx.update(dt);
    if(u>=1||done)finishRecall(transition.key);
  }

  function ballOpened(key,position){
    if(!key||!state.party.some(p=>p.species===key)||transition)return;
    if(activeKey!==key){release(key,position);return;}
    companion.getWorldPosition(temp);if(temp.distanceTo(position)<=RECALL_RADIUS)recall(key,position);
  }

  function updateFollower(dt){
    if(!activeKey||!model||!playerCamera||transition)return;
    companion.visible=renderer.xr.isPresenting;if(!renderer.xr.isPresenting)return;
    playerCamera.getWorldPosition(head);head.y=rig.position.y;sampleTrail();trailTarget(desired);
    delta.copy(desired).sub(companion.position);delta.y=0;const distance=delta.length();
    if(distance>FOLLOW_SNAP){companion.position.copy(desired);animator?.play('idle');}
    else if(distance>FOLLOW_STOP){
      const running=distance>FOLLOW_RUN_DISTANCE,speed=running?FOLLOW_RUN:FOLLOW_WALK,step=Math.min(distance-FOLLOW_STOP,speed*dt);
      delta.normalize();companion.position.addScaledVector(delta,step);
      const targetYaw=Math.atan2(delta.x,delta.z)+(SPECIES[activeKey]?.forwardYaw||0);
      const turn=THREE.MathUtils.euclideanModulo(targetYaw-companion.rotation.y+Math.PI,Math.PI*2)-Math.PI;companion.rotation.y+=turn*Math.min(1,dt*7);
      animator?.play(running?'run':'walk');
    }else animator?.play('idle');
    companion.position.y=THREE.MathUtils.lerp(companion.position.y,rig.position.y,Math.min(1,dt*8));animator?.update(dt);
  }

  function update(dt){
    const xr=renderer.xr.isPresenting;checkStarterPickup();updateTransition(dt);updateFollower(dt);if(!xr&&companion.visible)companion.visible=false;
    if(activeKey&&animator&&transition)animator.update(dt);
    const lab=scene.getObjectByName('interior-oaks-lab'),visible=!!lab?.visible;
    if(visible!==lastSpaceVisible){lastSpaceVisible=visible;if(activeKey&&xr&&!transition){resetTrail();fallbackBehind(desired);if(companion.position.distanceTo(rig.position)>FOLLOW_SNAP)companion.position.copy(desired);}}
  }

  function resetSession(){
    transition=null;fx.update(99);companion.scale.setScalar(1);
    if(activeKey){companion.visible=false;resetTrail();fallbackBehind(desired);companion.position.copy(desired);}
  }
  function setStarterSelectionUnlocked(value){state.flags.starterSelectionUnlocked=!!value;emit('starter-lock',{unlocked:state.flags.starterSelectionUnlocked});}
  function animationInfo(key){
    const asset=assets.get(key);return asset?{names:[...asset.animation.names],selected:{...asset.animation.selected}}:null;
  }

  return {update,ballOpened,release,recall,resetSession,setStarterSelectionUnlocked,animationInfo,
    get starter(){return state.starter;},get party(){return state.party.map(p=>({...p}));},get active(){return activeKey;},
    get animations(){return animator?.names||assets.get('charmander')?.animation?.names||[];},
    get animationsBySpecies(){return Object.fromEntries([...assets].map(([key,asset])=>[key,{names:[...asset.animation.names],selected:{...asset.animation.selected}}]));},
    get state(){return stateSnapshot();}};
}
