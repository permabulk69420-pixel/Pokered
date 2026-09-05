import * as THREE from 'three';
import './style.css';
import { createPalletTown } from './world/pallet-town.js';
import { Locomotion } from './xr/locomotion.js';
import { setupHands } from './xr/hands.js';

const BUILD='PALLET 01 · 2026.09.05';
const canvas=document.querySelector('#world'),intro=document.querySelector('#intro'),walkButton=document.querySelector('#walk-button'),vrButton=document.querySelector('#vr-button'),menuButton=document.querySelector('#menu-button');
const params=new URLSearchParams(location.search),touch=matchMedia('(pointer:coarse)').matches;
let renderer;
try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
} catch(error) {
  walkButton.textContent='3D graphics unavailable';walkButton.disabled=true;
  vrButton.hidden=true;
  document.querySelector('#controls-intro').textContent='This browser could not start WebGL. Open this address in Meta Quest Browser, or enable hardware acceleration on your computer.';
  document.querySelector('#toast').textContent='The browser could not start 3D graphics.';
  document.querySelector('#toast').classList.add('visible');
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFramebufferScaleFactor(1);renderer.xr.setFoveation(.7);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.06,450),rig=new THREE.Group();
rig.name='player-rig';camera.name='player-head';rig.add(camera);scene.add(rig);
const town=createPalletTown(scene);
const clock=new THREE.Clock();let elapsed=0,mode='overview',toastTimer,statsTime=0,lastBoundary=0,session=null,returnPose=null;
const overviewPosition=new THREE.Vector3(-30,24,34),overviewTarget=new THREE.Vector3(0,0,-1.5);
function toast(text) {const el=document.querySelector('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);}
const locomotion=new Locomotion({renderer,camera,rig,colliders:town.colliders,canvas,onBoundary:id=> {
  if(elapsed-lastBoundary<5)return;
  if(id==='route-1-boundary'){toast('Route 1 comes later. For now, enjoy Pallet Town.');lastBoundary=elapsed;}
  if(id==='water'){toast('The water’s edge — Route 21 comes later.');lastBoundary=elapsed;}
}});

function overview() {
  mode='overview';locomotion.walking=false;locomotion.clearInput();rig.position.set(0,0,0);rig.rotation.set(0,0,0);
  const portrait=innerHeight>innerWidth;
  camera.fov=portrait?64:54;camera.position.copy(overviewPosition);if(portrait)camera.position.set(-32,31,43);
  camera.lookAt(overviewTarget);camera.updateProjectionMatrix();
  document.body.classList.remove('walking');intro.hidden=false;menuButton.hidden=true;
  document.querySelector('#walk-hud').hidden=true;document.querySelector('#touch-controls').hidden=true;
}
function walk(lock=true) {
  mode='walk';locomotion.walking=true;
  camera.fov=72;camera.updateProjectionMatrix();locomotion.spawn(town.layout.spawns.start);
  document.body.classList.add('walking');intro.hidden=true;menuButton.hidden=false;
  document.querySelector('#walk-hud').hidden=false;document.querySelector('#touch-controls').hidden=!touch;
  if(lock&&!touch&&canvas.requestPointerLock)canvas.requestPointerLock()?.catch?.(()=>toast('Click the scene to look around.'));
}
walkButton.addEventListener('click',()=>walk());
menuButton.addEventListener('click',()=>{document.exitPointerLock?.();overview();});
document.addEventListener('pointerlockchange',()=> {
  if(!document.pointerLockElement&&mode==='walk'&&!touch&&!renderer.xr.isPresenting){locomotion.clearInput();toast('Click to keep looking · Menu to return to town view');}
});
window.addEventListener('keydown',e=>{if(e.code==='Escape'&&mode==='walk'&&!document.pointerLockElement&&!renderer.xr.isPresenting)overview();});

async function checkVR() {
  if(!window.isSecureContext){vrButton.disabled=false;vrButton.textContent='VR needs HTTPS';vrButton.addEventListener('click',()=>toast('Open the published HTTPS address in Quest Browser to enter VR.'));return;}
  let available=false;try {available=!!navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr');}catch(error){console.warn('VR support check:',error);}
  vrButton.disabled=false;vrButton.textContent=available?'Enter VR':'Play on Quest';
  if(!available) {vrButton.addEventListener('click',()=>toast('Open this same address in Meta Quest Browser, then select Enter VR.'));return;}
  vrButton.addEventListener('click',async()=> {
    vrButton.disabled=true;
    try {
      returnPose={position:rig.position.clone(),yaw:locomotion.yaw,pitch:locomotion.pitch,mode};
      const xrSession=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});
      session=xrSession;
      await renderer.xr.setSession(xrSession);
      locomotion.spawn(town.layout.spawns.start,true);locomotion.walking=true;
      renderer.xr.setFoveation(.7);
      const rates=xrSession.supportedFrameRates;if(rates&&[...rates].includes(72))try{await xrSession.updateTargetFrameRate(72);}catch{}
    } catch(error) {
      console.error('Could not start VR:',error);toast(`Could not enter VR: ${error.message||'try again in Quest Browser'}`);
      session=null;vrButton.disabled=false;
    }
  });
}
renderer.xr.addEventListener('sessionstart',()=> {
  document.exitPointerLock?.();document.body.classList.add('xr');locomotion.clearInput();
});
renderer.xr.addEventListener('sessionend',()=> {
  session=null;document.body.classList.remove('xr');vrButton.disabled=false;locomotion.needsXRSpawn=null;
  // Restore a clean desktop camera; XR's final tracked height must not leak out.
  if(returnPose?.mode==='walk'){
    walk(false);rig.position.copy(returnPose.position);locomotion.yaw=returnPose.yaw;locomotion.pitch=returnPose.pitch;rig.rotation.y=locomotion.yaw;camera.rotation.x=locomotion.pitch;
  }else overview();
});
setupHands(renderer,rig).catch(error=>console.warn('Hands setup:',error));

window.addEventListener('resize',()=> {
  if(renderer.xr.isPresenting)return;
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
  if(mode==='overview')overview();
});
document.querySelector('#build-label').textContent=BUILD;
if(touch)document.querySelector('#controls-intro').textContent='Touch to explore · Left stick to move · Right stick for smooth turn in VR';
const debug=params.has('debug');document.querySelector('#debug').hidden=!debug;
overview();
if(params.get('view')==='walk')walk(false);
if(params.get('view')==='lab'){walk(false);locomotion.spawn({x:1.0,z:9.0,yaw:-.69});}
if(params.get('view')==='home'){walk(false);locomotion.spawn({x:-12.8,z:-2.0,yaw:-.60});}
if(params.get('view')==='shore'){walk(false);locomotion.spawn({x:-8,z:8.7,yaw:Math.PI});}
if(params.get('view')==='map') {
  camera.position.set(0,62,.01);camera.lookAt(0,0,0);camera.fov=40;camera.updateProjectionMatrix();
}
if(params.has('clean')) {
  for(const selector of ['#intro','#topbar','#footer','#vignette','#walk-hud','#touch-controls'])document.querySelector(selector).hidden=true;
}

// Read-only diagnostic snapshot is useful when checking a Quest build remotely.
// There is no gameplay state or saved progression in this visual slice.
const diagnostic={build:BUILD,ready:false,mode,renderer:'WebGL2',staticShadows:true};
Object.defineProperty(window,'PALLET_DIAGNOSTICS',{get:()=>Object.freeze({...diagnostic,mode,xr:renderer.xr.isPresenting,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,player:rig.position.toArray(),yaw:rig.rotation.y})});
renderer.setAnimationLoop(()=> {
  const dt=Math.min(clock.getDelta(),.045);elapsed+=dt;
  locomotion.update(dt);town.update(elapsed);
  renderer.render(scene,camera);
  // Architecture and lighting are static. Keep the shadow atlas rather than
  // re-rendering every tree and tile for every frame or every eye.
  if(renderer.shadowMap.autoUpdate)renderer.shadowMap.autoUpdate=false;
  if(!diagnostic.ready){diagnostic.ready=true;walkButton.disabled=false;walkButton.textContent='Walk around';document.body.dataset.ready='true';}
  if(debug&&elapsed-statsTime>.5){statsTime=elapsed;document.querySelector('#stats').textContent=`${BUILD}\n${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles.toLocaleString()} triangles\n${renderer.info.memory.geometries} geometries · ${renderer.info.memory.textures} textures\n${renderer.xr.isPresenting?'Immersive VR':'Desktop preview'} · static shadows`;}
});
checkVR();
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);toast('The graphics session was interrupted. Reload the page to resume.');});
window.addEventListener('error',e=>{if(!diagnostic.ready){walkButton.textContent='Reload to retry';walkButton.disabled=false;walkButton.onclick=()=>location.reload();toast('The town could not finish loading. Please reload.');}console.error(e.error||e.message);});
