import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BALL_RADIUS=.05;
const GRAB_RADIUS=.22;
const HOLSTER_RELEASE_RADIUS=.24;
const GRAB_ON=.45;
const GRAB_OFF=.22;

export async function setupPokeball({renderer,rig,states}) {
  const scene=rig.parent;
  const camera=rig.children.find(child=>child.isCamera);
  if(!scene||!camera)throw new Error('Poké Ball needs the player scene and camera.');

  const loader=new GLTFLoader();
  const url=new URL('assets/pokeball/pokeball_animated_open_no_blue.glb',document.baseURI);
  const gltf=await loader.loadAsync(url.href);
  const ball=gltf.scene;
  ball.name='player-pokeball';
  ball.traverse(object=>{
    if(object.isMesh){
      object.castShadow=false;
      object.receiveShadow=true;
      object.frustumCulled=true;
    }
  });

  const mixer=new THREE.AnimationMixer(ball);
  const openClip=THREE.AnimationClip.findByName(gltf.animations,'Open');
  const openAction=openClip?mixer.clipAction(openClip):null;
  if(openAction){openAction.setLoop(THREE.LoopOnce,1);openAction.clampWhenFinished=true;}

  const holster=new THREE.Group();
  holster.name='right-waist-pokeball-holster';
  rig.add(holster);

  const tmp=new THREE.Vector3(),ballWorld=new THREE.Vector3(),gripWorld=new THREE.Vector3();
  const velocity=new THREE.Vector3(),spin=new THREE.Vector3();
  const samples=states.map(()=>({last:new THREE.Vector3(),velocity:new THREE.Vector3(),ready:false}));
  let mode='holstered',heldState=null,groundY=BALL_RADIUS,opened=false;

  function closeBall(){
    opened=false;
    if(!openAction)return;
    openAction.reset().play();
    openAction.paused=true;
    openAction.time=0;
    mixer.update(0);
  }

  function openBall(){
    if(opened||!openAction)return;
    opened=true;
    openAction.paused=false;
    openAction.reset();
    openAction.setLoop(THREE.LoopOnce,1);
    openAction.clampWhenFinished=true;
    openAction.play();
  }

  function updateHolster(){
    camera.getWorldPosition(tmp);
    rig.worldToLocal(tmp);
    // Right hip, slightly forward so the hand can reach it comfortably in VR.
    holster.position.set(tmp.x+.29,Math.max(.68,tmp.y-.73),tmp.z+.035);
    holster.rotation.set(0,0,0);
  }

  function holsterBall(){
    mode='holstered';heldState=null;velocity.set(0,0,0);spin.set(0,0,0);
    closeBall();
    holster.attach(ball);
    ball.position.set(0,0,0);
    ball.rotation.set(0,Math.PI/2,0);
    ball.scale.setScalar(1);
  }

  function holdBall(state){
    mode='held';heldState=state;velocity.set(0,0,0);spin.set(0,0,0);
    closeBall();
    state.grip.attach(ball);
    // Nestle the 10 cm ball into the palm rather than at the controller origin.
    ball.position.set(0,-.018,-.052);
    ball.rotation.set(0,0,0);
    ball.scale.setScalar(1);
  }

  function releaseBall(sample){
    scene.attach(ball);
    ball.updateMatrixWorld(true);
    holster.getWorldPosition(tmp);
    ball.getWorldPosition(ballWorld);
    if(ballWorld.distanceTo(tmp)<=HOLSTER_RELEASE_RADIUS){
      holsterBall();
      return;
    }
    mode='thrown';heldState=null;
    // This game currently has flat outdoor/interior floors for loose-object physics.
    groundY=rig.position.y+BALL_RADIUS;
    velocity.copy(sample.velocity);
    if(velocity.length()>12)velocity.setLength(12);
    spin.set(velocity.z*2.8,-velocity.x*2.8,(velocity.x-velocity.z)*1.2);
  }

  function canGrab(state){
    if(!state.inputSource||state.inputSource.hand)return false;
    state.grip.getWorldPosition(gripWorld);
    ball.getWorldPosition(ballWorld);
    return gripWorld.distanceTo(ballWorld)<=GRAB_RADIUS;
  }

  function sampleHands(dt){
    if(mode==='held'&&heldState&&!heldState.inputSource){
      holsterBall();
      return;
    }

    states.forEach((state,index)=>{
      const sample=samples[index],squeeze=state.inputSource?.gamepad?.buttons?.[1]?.value??0;
      state.grip.getWorldPosition(gripWorld);
      if(sample.ready&&dt>0){
        tmp.copy(gripWorld).sub(sample.last).multiplyScalar(1/dt);
        sample.velocity.lerp(tmp,.42);
      }else{
        sample.velocity.set(0,0,0);sample.ready=true;
      }
      sample.last.copy(gripWorld);

      if(mode!=='held'&&squeeze>=GRAB_ON&&canGrab(state)){
        holdBall(state);
        return;
      }
      if(mode==='held'&&heldState===state&&squeeze<=GRAB_OFF)releaseBall(sample);
    });
  }

  function updatePhysics(dt){
    if(mode!=='thrown')return;
    velocity.y-=9.81*dt;
    ball.position.addScaledVector(velocity,dt);
    ball.rotation.x+=spin.x*dt;ball.rotation.y+=spin.y*dt;ball.rotation.z+=spin.z*dt;
    spin.multiplyScalar(Math.pow(.35,dt));

    if(ball.position.y<=groundY){
      const impact=Math.abs(velocity.y);
      ball.position.y=groundY;
      if(impact>1.15)openBall();
      velocity.y=Math.abs(velocity.y)*.34;
      velocity.x*=.76;velocity.z*=.76;
      spin.multiplyScalar(.66);
      if(velocity.y<.35&&Math.hypot(velocity.x,velocity.z)<.22){
        mode='ground';velocity.set(0,0,0);spin.set(0,0,0);
      }
    }
    if(ball.position.y<rig.position.y-12)holsterBall();
  }

  function resetSamples(){
    for(const sample of samples){sample.ready=false;sample.velocity.set(0,0,0);}
  }

  function reset(){
    resetSamples();
    holsterBall();
  }

  function update(dt){
    const xr=renderer.xr.isPresenting;
    ball.visible=xr;
    holster.visible=xr;
    if(!xr)return;
    updateHolster();
    rig.updateMatrixWorld(true);
    sampleHands(dt);
    updatePhysics(dt);
    mixer.update(dt);
  }

  holster.add(ball);
  holsterBall();
  ball.visible=false;
  holster.visible=false;

  renderer.xr.addEventListener('sessionstart',resetSamples);
  renderer.xr.addEventListener('sessionend',()=>{reset();ball.visible=false;holster.visible=false;});

  return {
    root:ball,
    holster,
    update,
    reset,
    get mode(){return mode;},
  };
}
