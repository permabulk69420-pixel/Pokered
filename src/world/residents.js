import * as THREE from 'three';
import { Builder } from './geometry.js';

// The original two outdoor residents, kept as replaceable visual-only groups.
// No dialogue, schedules, quests or Oak interception script in this slice.
export function addResidents(scene,mats,colliders) {
  const skin=mats.plaster.clone();skin.color.set('#e9b58f');skin.name='resident-skin';
  const hair=mats.woodDark.clone();hair.color.set('#534038');hair.name='resident-hair';
  const eyes=new THREE.MeshBasicMaterial({color:'#313d3b'});eyes.name='resident-eyes';
  const palette={...mats,skin,hair,eyes};
  for(const [id,x,z,yaw,girl] of [['town-girl',-13,-1,-.5,true],['town-fisher',3.2,10.0,2.55,false]]) {
    const root=new THREE.Group();root.name=id;root.position.set(x,0,z);root.rotation.y=yaw;
    const b=new Builder(root,palette);const headY=girl?1.31:1.46;
    for(const side of [-1,1]) {
      const xx=side*.11;
      b.roundBox(.16,.10,.31,.045,xx,.065,.065,'woodDark');
      b.cylinder(.055,.049,girl?.46:.56,xx,girl?.32:.37,0,girl?'skin':'blue',10);
      if(girl)b.cylinder(.058,.056,.14,xx,.16,0,'trim',10);
    }
    if(girl) {
      b.cylinder(.16,.28,.37,0,.66,0,'blue',14);
      b.cylinder(.16,.17,.34,0,.98,0,'petalPink',14);
      b.box(.26,.038,.17,0,1.13,.055,'trim');
      b.sphere(.065,0,1.11,.15,'red',[.75,.5,.6],8);
    } else {
      b.cylinder(.21,.18,.49,0,1.01,0,'grassShade',14);
      b.box(.30,.038,.20,0,1.23,.02,'trim');
      b.box(.11,.10,.025,.085,1.12,.18,'grassLight');
    }
    b.cylinder(.065,.07,.16,0,headY-.22,0,'skin',10);
    b.sphere(.23,0,headY,0,'skin',[.85,1,.87],16);
    for(const side of [-1,1]) {
      b.sphere(.046,side*.193,headY-.015,0,'skin',[.55,1,.7],8);
      b.sphere(.018,side*.072,headY+.005,.19,'eyes',[.7,1.18,.35],8);
      b.sphere(.031,0,headY-.05,.203,'skin',[.8,.8,.8],8);
      b.beam([side*.17,headY-.27,0],[side*.255,headY-.49,.035],.066,girl?'petalPink':'grassShade',9);
      b.beam([side*.255,headY-.49,.035],[side*.235,headY-.64,.07],.047,'skin',9);
      b.sphere(.056,side*.235,headY-.65,.07,'skin',[.8,1.05,.75],9);
    }
    // Half-sphere hair cap, small fringe, and a tied-back ponytail or cloth hat.
    const cap=new THREE.SphereGeometry(.237,16,8,0,Math.PI*2,0,1.48);b.add(cap,'hair',[0,headY+.012,-.018],[0,0,0],[.9,1,.94]);cap.dispose();
    if(girl) {
      for(let i=0;i<4;i++)b.sphere(.071,-.12+i*.075,headY+.11,.13,'hair',[.72,1.2,.52],8);
      b.sphere(.13,.14,headY-.12,-.16,'hair',[.65,1.8,.75],10);
      b.sphere(.057,.14,headY+.02,-.15,'red',[1,.55,1],8);
    } else {
      b.sphere(.247,0,headY+.085,-.015,'grassShade',[.92,.62,.95],14);
      b.roundBox(.34,.045,.22,.035,0,headY+.08,.21,'grassShade');
    }
    b.finish();root.userData={id,kind:'resident',visualOnly:true};scene.add(root);
    colliders.push({kind:'circle',id,x,z,r:.24});
  }
}
