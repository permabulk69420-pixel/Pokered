import * as THREE from 'three';
import { deadzone } from './collision.js';
import { floorAt, moveWithNavigation, onStairs } from './navigation.js';

export class Locomotion {
  constructor({renderer,camera,rig,colliders,navigation,canvas,onBoundary}) {
    Object.assign(this,{renderer,camera,rig,colliders,canvas,onBoundary});
    this.navigation=navigation||{colliders};this.floorHeight=0;
    this.keys=new Set();this.walking=false;this.pitch=0;this.yaw=0;this.touchMove={x:0,y:0};
    this.forward=new THREE.Vector3();this.right=new THREE.Vector3();this.head=new THREE.Vector3();this.pivot=new THREE.Vector3();
    this.up=new THREE.Vector3(0,1,0);this.motion=new THREE.Vector3();this.xrQuaternion=new THREE.Quaternion();this.headEuler=new THREE.Euler(0,0,0,'YXZ');
    this.keyboard();this.touch();
  }
  keyboard() {
    window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyQ','KeyE'].includes(e.code)){this.keys.add(e.code);if(this.walking)e.preventDefault();}});
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>this.clearInput());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clearInput();});
    window.addEventListener('mousemove',e=>{if(this.walking&&document.pointerLockElement===this.canvas&&!this.renderer.xr.isPresenting)this.look(e.movementX,e.movementY);});
    this.canvas.addEventListener('pointerdown',e=> {
      if(this.walking&&e.pointerType==='mouse'&&!this.renderer.xr.isPresenting)this.canvas.requestPointerLock?.()?.catch?.(()=>{});
    });
  }
  clearInput(){this.keys.clear();this.touchMove.x=this.touchMove.y=0;}
  look(dx,dy) {this.yaw-=dx*.0025;this.pitch=THREE.MathUtils.clamp(this.pitch-dy*.0025,-1.38,1.38);this.rig.rotation.y=this.yaw;this.camera.rotation.set(this.pitch,0,0,'YXZ');}
  touch() {
    const zone=document.querySelector('#joystick'),stick=document.querySelector('#stick');let moveId=null,lookId=null,lastX=0,lastY=0;
    const move=e=>{const r=zone.getBoundingClientRect(),dx=e.clientX-r.x-r.width/2,dy=e.clientY-r.y-r.height/2,len=Math.max(40,Math.hypot(dx,dy));this.touchMove.x=dx/len;this.touchMove.y=dy/len;stick.style.transform=`translate(${dx/len*34}px,${dy/len*34}px)`;};
    zone.addEventListener('pointerdown',e=>{moveId=e.pointerId;zone.setPointerCapture(moveId);move(e);e.preventDefault();});
    zone.addEventListener('pointermove',e=>{if(e.pointerId===moveId)move(e);});
    const release=e=>{if(e.pointerId===moveId){moveId=null;this.touchMove.x=this.touchMove.y=0;stick.style.transform='';}};
    zone.addEventListener('pointerup',release);zone.addEventListener('pointercancel',release);zone.addEventListener('lostpointercapture',release);
    this.canvas.addEventListener('pointerdown',e=>{if(!this.walking||e.pointerType==='mouse')return;lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;this.canvas.setPointerCapture(lookId);});
    this.canvas.addEventListener('pointermove',e=>{if(e.pointerId===lookId){this.look((e.clientX-lastX)*1.5,(e.clientY-lastY)*1.5);lastX=e.clientX;lastY=e.clientY;}});
    const releaseLook=e=>{if(e.pointerId===lookId)lookId=null;};this.canvas.addEventListener('pointerup',releaseLook);this.canvas.addEventListener('pointercancel',releaseLook);
  }
  spawn(spawn,xr=false) {
    this.floorHeight=spawn.y||0;this.yaw=spawn.yaw;this.pitch=0;this.rig.rotation.set(0,this.yaw,0);this.rig.position.set(spawn.x,this.floorHeight,spawn.z);
    this.camera.position.set(0,xr?0:1.65,0);this.camera.rotation.set(0,0,0);this.clearInput();
    this.needsXRSpawn=xr?spawn:null;
  }
  setNavigation(navigation){this.navigation=navigation;this.colliders=navigation.colliders;}
  relocate(arrival) {
    // Keep heading, pitch and the physical tracking offset through doorways.
    this.rig.updateMatrixWorld(true);this.camera.getWorldPosition(this.head);
    this.rig.position.x+=arrival.x-this.head.x;this.rig.position.z+=arrival.z-this.head.z;
    this.floorHeight=arrival.y||0;this.rig.position.y=this.floorHeight;
    this.rig.updateMatrixWorld(true);
  }
  // Turning rotates the rig about the user's actual head, including room-scale offset.
  rotateAroundHead(angle) {
    this.rig.updateMatrixWorld(true);
    this.camera.getWorldPosition(this.pivot);
    this.rig.position.sub(this.pivot).applyAxisAngle(this.up,angle).add(this.pivot);
    this.rig.rotation.y+=angle;this.yaw=this.rig.rotation.y;
  }
  update(dt) {
    if(!this.walking&&!this.renderer.xr.isPresenting)return;
    let x=0,z=0,turn=0,speed=2.5;
    const xr=this.renderer.xr.isPresenting;
    if(xr) {
      const session=this.renderer.xr.getSession();
      for(const input of session.inputSources) {
        if(!input.gamepad)continue;
        const a=input.gamepad.axes;
        const ax=a.length>=4?a[2]:(a[0]||0),ay=a.length>=4?a[3]:(a[1]||0);
        if(input.handedness==='left'){x=deadzone(ax);z=deadzone(ay);if(input.gamepad.buttons[3]?.pressed)speed=3.9;}
        if(input.handedness==='right')turn=-deadzone(ax)*1.45;
      }
      // Wait for the first tracked pose before aligning the physical play space.
      if(this.needsXRSpawn) {
        const p=this.needsXRSpawn;this.rig.updateMatrixWorld(true);this.camera.getWorldPosition(this.head);
        if(this.head.y-this.floorHeight>.2) {
          this.camera.getWorldQuaternion(this.xrQuaternion);this.headEuler.setFromQuaternion(this.xrQuaternion,'YXZ');
          this.rotateAroundHead(p.yaw-this.headEuler.y);
          this.camera.getWorldPosition(this.head);this.rig.position.x+=p.x-this.head.x;this.rig.position.z+=p.z-this.head.z;
          this.needsXRSpawn=null;
        }
      }
    } else {
      x=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0)+this.touchMove.x;
      z=(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)+this.touchMove.y;
      turn=((this.keys.has('KeyQ')||this.keys.has('ArrowLeft')?1:0)-(this.keys.has('KeyE')||this.keys.has('ArrowRight')?1:0))*1.45;
      if(this.keys.has('ShiftLeft')||this.keys.has('ShiftRight'))speed=4;
    }
    if(turn) this.rotateAroundHead(turn*dt);
    this.rig.updateMatrixWorld(true);this.camera.getWorldPosition(this.head);
    // Room-scale movement along the ramp also updates the virtual floor.
    const physicalFloor=floorAt(this.navigation,this.head.x,this.head.z,this.floorHeight);
    if(Math.abs(physicalFloor-this.floorHeight)<.18){this.floorHeight=physicalFloor;this.rig.position.y=physicalFloor;}
    if(!x&&!z)return;
    if(onStairs(this.navigation.stairs,this.head.x,this.head.z))speed=Math.min(speed,1.65);
    this.rig.updateMatrixWorld(true);this.camera.getWorldDirection(this.forward);this.forward.y=0;
    if(this.forward.lengthSq()<.001)this.forward.set(-Math.sin(this.rig.rotation.y),0,-Math.cos(this.rig.rotation.y));else this.forward.normalize();
    this.right.crossVectors(this.forward,this.up).normalize();
    this.motion.copy(this.right).multiplyScalar(x).addScaledVector(this.forward,-z);
    if(this.motion.lengthSq()>1)this.motion.normalize();this.motion.multiplyScalar(speed*dt);
    this.camera.getWorldPosition(this.head);
    const next=moveWithNavigation(this.head.x,this.head.z,this.floorHeight,this.motion.x,this.motion.z,this.navigation);
    this.rig.position.x+=next.x-this.head.x;this.rig.position.z+=next.z-this.head.z;
    this.floorHeight=next.y;this.rig.position.y=next.y;
    if(next.blocked)this.onBoundary?.(next.blocked);
  }
}
