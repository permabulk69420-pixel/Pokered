import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const GRAB_RADIUS=.25;
const GRAB_ON=.45;
const GRAB_OFF=.22;
const HELD_GRIP_AMOUNT=.30;
const HELD_GRIP_TARGET=Object.freeze([0,-.035,-.115]);
const SCREEN_ASPECT=320/256;
const HOME_ITEMS=Object.freeze(['DEX','CAMERA','SETTINGS']);
const CAMERA_FOV_VALUES=Object.freeze([45,55,65]);
const CAMERA_FPS_VALUES=Object.freeze([12,18,24]);

function getAxes(gamepad){
  const a=gamepad?.axes||[];
  return {x:a.length>=4?(a[2]||0):(a[0]||0),y:a.length>=4?(a[3]||0):(a[1]||0)};
}

export async function setupPokedex({renderer,rig,states}) {
  const scene=rig.parent;
  const playerCamera=rig.children.find(child=>child.isCamera);
  if(!scene||!playerCamera)throw new Error('Pokédex needs the player scene and camera.');

  const loader=new GLTFLoader();
  const url=new URL('assets/pokedex/pokedex.glb',document.baseURI);
  const gltf=await loader.loadAsync(url.href);
  const device=gltf.scene;
  device.name='player-pokedex';
  device.traverse(object=>{
    if(object.isMesh){object.castShadow=false;object.receiveShadow=true;object.frustumCulled=true;}
  });

  const screen=device.getObjectByName('Screen');
  const lens=device.getObjectByName('CameraLens');
  const gripMarker=device.getObjectByName('LeftHandGrip');
  if(!screen||!screen.isMesh)throw new Error('Pokédex GLB is missing the Screen mesh.');
  if(!lens)throw new Error('Pokédex GLB is missing the CameraLens mesh.');

  const uiCanvas=document.createElement('canvas');uiCanvas.width=512;uiCanvas.height=400;
  const ctx=uiCanvas.getContext('2d');
  const uiTexture=new THREE.CanvasTexture(uiCanvas);
  uiTexture.colorSpace=THREE.SRGBColorSpace;uiTexture.minFilter=THREE.LinearFilter;uiTexture.magFilter=THREE.LinearFilter;uiTexture.generateMipmaps=false;
  const screenMaterial=new THREE.MeshBasicMaterial({map:uiTexture,toneMapped:false});
  screenMaterial.name='PokedexDynamicScreen';screen.material=screenMaterial;

  const previewTarget=new THREE.WebGLRenderTarget(320,256,{depthBuffer:true});
  const photoTarget=new THREE.WebGLRenderTarget(320,256,{depthBuffer:true});
  for(const target of [previewTarget,photoTarget]){
    target.texture.colorSpace=THREE.SRGBColorSpace;target.texture.minFilter=THREE.LinearFilter;target.texture.magFilter=THREE.LinearFilter;target.texture.generateMipmaps=false;
  }
  const cameraView=new THREE.PerspectiveCamera(55,SCREEN_ASPECT,.03,80);
  cameraView.name='pokedex-camera';

  const holster=new THREE.Group();holster.name='left-hip-pokedex-holster';rig.add(holster);
  const tmp=new THREE.Vector3(),deviceWorld=new THREE.Vector3(),handWorld=new THREE.Vector3(),rayOrigin=new THREE.Vector3(),rayDirection=new THREE.Vector3(),targetGrip=new THREE.Vector3(...HELD_GRIP_TARGET);
  const worldQuaternion=new THREE.Quaternion();
  const raycaster=new THREE.Raycaster();raycaster.near=.02;raycaster.far=.75;

  const controlNames=['CameraButton','SettingsButton','MenuButton','ConfirmButton','BackButton','DPad_Up','DPad_Down','DPad_Left','DPad_Right'];
  const controls=new Map();const baseScales=new Map();
  for(const name of controlNames){const object=device.getObjectByName(name);if(object){controls.set(name,object);baseScales.set(object,object.scale.clone());}}

  const dex=new Map();
  let carry='holstered',heldState=null,screenMode='home',homeIndex=0,dexIndex=0,settingsRow=0;
  let cameraFov=55,previewFps=18,previewAccumulator=1,photoHold=0,photoCount=0;
  let lastPrimary=false,lastStickClick=false,lastRightTrigger=false,stickLatchX=0,stickLatchY=0,hovered=null;

  function getState(hand){return states.find(state=>state.handedness===hand&&state.inputSource)||null;}
  function setScreenMap(texture){if(screenMaterial.map===texture)return;screenMaterial.map=texture;screenMaterial.needsUpdate=true;}

  function title(text){
    ctx.fillStyle='#07110d';ctx.fillRect(0,0,512,400);
    ctx.fillStyle='#9ff4ba';ctx.font='700 35px monospace';ctx.fillText(text,28,47);
    ctx.fillStyle='#347d54';ctx.fillRect(28,61,456,3);
  }
  function footer(text='STICK MOVE · TRIGGER OK · CLICK BACK'){
    ctx.fillStyle='#8ca99a';ctx.font='17px monospace';ctx.fillText(text,28,378);
  }
  function drawHome(){
    title('POKÉDEX');
    ctx.fillStyle='#b8d8c5';ctx.font='19px monospace';ctx.fillText(`${[...dex.values()].filter(v=>v.seen).length.toString().padStart(3,'0')} SEEN   ${[...dex.values()].filter(v=>v.caught).length.toString().padStart(3,'0')} CAUGHT   ${photoCount.toString().padStart(2,'0')} PHOTOS`,28,91);
    HOME_ITEMS.forEach((item,index)=>{
      const y=143+index*62;ctx.fillStyle=index===homeIndex?'#9ff4ba':'#b7c5bc';ctx.font=index===homeIndex?'700 29px monospace':'25px monospace';ctx.fillText(`${index===homeIndex?'>':' '} ${item}`,42,y);
    });
    footer();uiTexture.needsUpdate=true;setScreenMap(uiTexture);
  }
  function sortedDex(){return [...dex.values()].sort((a,b)=>a.id-b.id);}
  function drawDex(){
    title('DEX');const entries=sortedDex();
    if(!entries.length){
      ctx.fillStyle='#b7c5bc';ctx.font='24px monospace';ctx.fillText('NO SPECIES DATA YET',42,145);ctx.font='18px monospace';ctx.fillText('Pokémon you discover will appear here.',42,181);
    }else{
      dexIndex=THREE.MathUtils.clamp(dexIndex,0,entries.length-1);
      const start=Math.max(0,Math.min(entries.length-5,dexIndex-2));
      for(let i=start;i<Math.min(entries.length,start+5);i++){
        const entry=entries[i],selected=i===dexIndex,y=113+(i-start)*45;
        ctx.fillStyle=selected?'#9ff4ba':'#b7c5bc';ctx.font=selected?'700 22px monospace':'20px monospace';
        const number=String(entry.id).padStart(3,'0'),state=entry.caught?'●':entry.seen?'○':'?';
        ctx.fillText(`${selected?'>':' '} ${number} ${state} ${entry.seen?entry.name.toUpperCase():'--------'}`,34,y);
      }
    }
    footer('STICK SCROLL · CLICK BACK');uiTexture.needsUpdate=true;setScreenMap(uiTexture);
  }
  function drawSettings(){
    title('SETTINGS');
    const rows=[`CAMERA FOV     ${cameraFov}°`,`CAMERA PREVIEW ${previewFps} FPS`];
    rows.forEach((row,index)=>{ctx.fillStyle=index===settingsRow?'#9ff4ba':'#b7c5bc';ctx.font=index===settingsRow?'700 23px monospace':'21px monospace';ctx.fillText(`${index===settingsRow?'>':' '} ${row}`,35,135+index*61);});
    ctx.fillStyle='#82988b';ctx.font='17px monospace';ctx.fillText('Camera rendering only runs while Camera mode is open.',35,290);
    footer('UP/DOWN SELECT · LEFT/RIGHT CHANGE · CLICK BACK');uiTexture.needsUpdate=true;setScreenMap(uiTexture);
  }
  function drawUI(){if(screenMode==='home')drawHome();else if(screenMode==='dex')drawDex();else if(screenMode==='settings')drawSettings();}

  function setMode(next){
    screenMode=next;stickLatchX=0;stickLatchY=0;
    if(next==='camera'){previewAccumulator=1;photoHold=0;setScreenMap(previewTarget.texture);}else drawUI();
  }

  function updateHolster(){
    playerCamera.getWorldPosition(tmp);rig.worldToLocal(tmp);
    holster.position.set(tmp.x-.285,Math.max(.69,tmp.y-.72),tmp.z+.055);
    holster.rotation.set(0,Math.PI,0);
  }
  function clearHeldPose(){if(heldState)heldState.poseOverride=null;}
  function holsterDevice(){
    clearHeldPose();carry='holstered';heldState=null;setMode('home');
    holster.attach(device);device.position.set(0,0,0);device.rotation.set(0,0,0);device.scale.setScalar(1);
  }
  function holdDevice(state){
    clearHeldPose();carry='held';heldState=state;state.poseOverride={name:'Grip',amount:HELD_GRIP_AMOUNT};
    const handSpace=state.anchor||state.grip;handSpace.attach(device);
    device.position.set(0,0,0);device.rotation.set(0,0,0);device.scale.setScalar(1);device.updateMatrixWorld(true);
    if(gripMarker){
      gripMarker.getWorldPosition(tmp);handSpace.worldToLocal(tmp);device.position.add(targetGrip.clone().sub(tmp));
    }else device.position.set(.065,-.025,-.11);
    setMode('home');
  }
  function canGrab(state){
    if(!state||state.inputSource?.hand)return false;
    state.grip.getWorldPosition(handWorld);(gripMarker||device).getWorldPosition(deviceWorld);
    return handWorld.distanceTo(deviceWorld)<=GRAB_RADIUS;
  }

  function renderThroughLens(target){
    device.updateMatrixWorld(true);lens.getWorldPosition(cameraView.position);lens.getWorldQuaternion(cameraView.quaternion);
    cameraView.translateZ(-.008);cameraView.fov=cameraFov;cameraView.updateProjectionMatrix();cameraView.updateMatrixWorld(true);
    const oldTarget=renderer.getRenderTarget(),oldXr=renderer.xr.enabled,wasVisible=device.visible;
    try{
      device.visible=false;renderer.xr.enabled=false;renderer.setRenderTarget(target);renderer.clear(true,true,true);renderer.render(scene,cameraView);
    }finally{
      renderer.setRenderTarget(oldTarget);renderer.xr.enabled=oldXr;device.visible=wasVisible;
    }
  }
  function capturePhoto(){
    if(screenMode!=='camera')return;
    renderThroughLens(photoTarget);photoCount++;photoHold=.7;setScreenMap(photoTarget.texture);
  }

  function registerSpecies({id,name,seen=false,caught=false}){
    if(!Number.isFinite(id)||!name)return;
    const current=dex.get(id)||{id,name,seen:false,caught:false};
    dex.set(id,{...current,name,seen:current.seen||seen,caught:current.caught||caught});
    if(screenMode==='home'||screenMode==='dex')drawUI();
  }
  function markSeen(id,name){const current=dex.get(id);registerSpecies({id,name:name||current?.name||`Species ${id}`,seen:true,caught:current?.caught||false});}
  function markCaught(id,name){const current=dex.get(id);registerSpecies({id,name:name||current?.name||`Species ${id}`,seen:true,caught:true});}

  function moveSelection(delta){
    if(screenMode==='home'){homeIndex=(homeIndex+delta+HOME_ITEMS.length)%HOME_ITEMS.length;drawHome();}
    else if(screenMode==='dex'){const count=dex.size;if(count){dexIndex=(dexIndex+delta+count)%count;drawDex();}}
    else if(screenMode==='settings'){settingsRow=(settingsRow+delta+2)%2;drawSettings();}
  }
  function adjustSetting(delta){
    if(screenMode!=='settings')return;
    if(settingsRow===0){let i=CAMERA_FOV_VALUES.indexOf(cameraFov);i=(i+delta+CAMERA_FOV_VALUES.length)%CAMERA_FOV_VALUES.length;cameraFov=CAMERA_FOV_VALUES[i];}
    else {let i=CAMERA_FPS_VALUES.indexOf(previewFps);i=(i+delta+CAMERA_FPS_VALUES.length)%CAMERA_FPS_VALUES.length;previewFps=CAMERA_FPS_VALUES[i];}
    drawSettings();
  }
  function confirm(){
    if(screenMode==='home')setMode(homeIndex===0?'dex':homeIndex===1?'camera':'settings');
    else if(screenMode==='camera')capturePhoto();
  }
  function pressControl(name){
    if(name==='CameraButton'){setMode('camera');return;}
    if(name==='SettingsButton'){setMode('settings');return;}
    if(name==='MenuButton'||name==='BackButton'){setMode('home');return;}
    if(name==='ConfirmButton'){confirm();return;}
    if(name==='DPad_Up'){moveSelection(-1);return;}
    if(name==='DPad_Down'){moveSelection(1);return;}
    if(name==='DPad_Left'){adjustSetting(-1);return;}
    if(name==='DPad_Right')adjustSetting(1);
  }

  function updateLeftInput(){
    const gamepad=heldState?.inputSource?.gamepad;if(!gamepad)return;
    const trigger=(gamepad.buttons?.[0]?.value??0)>.55,stickClick=!!gamepad.buttons?.[2]?.pressed,{x,y}=getAxes(gamepad);
    if(trigger&&!lastPrimary)confirm();if(stickClick&&!lastStickClick&&screenMode!=='home')setMode('home');
    lastPrimary=trigger;lastStickClick=stickClick;

    if(Math.abs(y)<.35)stickLatchY=0;else if(!stickLatchY&&Math.abs(y)>.68){moveSelection(y>0?1:-1);stickLatchY=y>0?1:-1;}
    if(Math.abs(x)<.35)stickLatchX=0;else if(!stickLatchX&&Math.abs(x)>.68){adjustSetting(x>0?1:-1);stickLatchX=x>0?1:-1;}
  }
  function updateRightRay(){
    for(const [object,scale] of baseScales)object.scale.copy(scale);
    hovered=null;const right=getState('right');if(!right?.inputSource||right.inputSource.hand){lastRightTrigger=false;return;}
    right.controller.getWorldPosition(rayOrigin);right.controller.getWorldQuaternion(worldQuaternion);rayDirection.set(0,0,-1).applyQuaternion(worldQuaternion).normalize();raycaster.set(rayOrigin,rayDirection);
    const hits=raycaster.intersectObjects([...controls.values()],true);
    if(hits.length){let object=hits[0].object;while(object&&!controls.has(object.name))object=object.parent;if(object&&controls.has(object.name)){hovered=object;object.scale.copy(baseScales.get(object)).multiplyScalar(1.10);}}
    const pressed=(right.inputSource.gamepad?.buttons?.[0]?.value??0)>.55;
    if(pressed&&!lastRightTrigger&&hovered)pressControl(hovered.name);lastRightTrigger=pressed;
  }

  function updateCamera(dt){
    if(screenMode!=='camera')return;
    if(photoHold>0){photoHold-=dt;if(photoHold<=0)setScreenMap(previewTarget.texture);return;}
    previewAccumulator+=dt;
    if(previewAccumulator>=1/previewFps){previewAccumulator=0;renderThroughLens(previewTarget);setScreenMap(previewTarget.texture);}
  }
  function resetInput(){lastPrimary=false;lastStickClick=false;lastRightTrigger=false;stickLatchX=0;stickLatchY=0;}
  function reset(){resetInput();holsterDevice();}

  function update(dt){
    const xr=renderer.xr.isPresenting;device.visible=xr;holster.visible=xr;if(!xr)return;
    updateHolster();rig.updateMatrixWorld(true);
    const left=getState('left'),squeeze=left?.inputSource?.gamepad?.buttons?.[1]?.value??0;
    if(carry==='held'&&(!heldState?.inputSource||heldState!==left)){holsterDevice();resetInput();}
    if(carry==='holstered'&&left&&squeeze>=GRAB_ON&&canGrab(left)){holdDevice(left);resetInput();}
    else if(carry==='held'&&heldState===left&&squeeze<=GRAB_OFF){holsterDevice();resetInput();}
    if(carry==='held'){updateLeftInput();updateRightRay();updateCamera(dt);}else{if(hovered){const scale=baseScales.get(hovered);if(scale)hovered.scale.copy(scale);}hovered=null;}
  }

  holster.add(device);holsterDevice();drawHome();device.visible=false;holster.visible=false;
  renderer.xr.addEventListener('sessionstart',resetInput);
  renderer.xr.addEventListener('sessionend',()=>{reset();device.visible=false;holster.visible=false;});

  return {
    root:device,holster,update,reset,registerSpecies,markSeen,markCaught,capturePhoto,
    get isHeld(){return carry==='held';},
    get screenMode(){return screenMode;},
    get photoCount(){return photoCount;},
    get mode(){return `${carry}:${screenMode}`;},
  };
}
