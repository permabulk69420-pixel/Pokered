import * as THREE from 'three';
import {Builder} from './geometry.js';
import {createBuilding,roof,windowFront} from './buildings.js';

function lettering(root,text,x,y,z,width,height,mats){
  const b=new Builder(root,mats);
  b.box(width+.22,height+.18,.18,x,y,z,'trimShade');
  b.box(width+.10,height+.06,.20,x,y,z+.01,'trim');b.finish();
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const c=canvas.getContext('2d');c.fillStyle='#fff5d8';c.fillRect(0,0,1024,256);
  c.fillStyle='#30574d';c.font='bold 100px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,512,137,940);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture}));
  label.position.set(x,y,z+.12);label.name=text;root.add(label);
}

export function createViridianBuilding(spec,mats){
  if(spec.kind==='house')return createBuilding({...spec,exteriorOnly:true},mats);
  const root=new THREE.Group();root.name=spec.id;root.position.set(spec.x,0,spec.z);
  const b=new Builder(root,mats),w=spec.width,d=spec.depth,h=spec.kind==='gym'?4.5:4.3,front=d/2;
  const palette={...mats};
  if(spec.kind==='mart'){
    palette.roof=mats.labRoof;palette.roofLight=mats.labRoofLight;palette.roofDark=mats.labRoofDark;
  }else if(spec.kind==='gym'){
    palette.roof=mats.teal;palette.roofLight=mats.teal.clone();palette.roofLight.color.set('#6a9e93');palette.roofDark=mats.labRoofDark;
  }
  b.box(w,h,d,0,h/2,0,'plaster');
  b.box(w+.1,.30,d+.1,0,.15,0,'foundation');
  for(let y=.48;y<h;y+=.39){
    b.box(w,.035,.035,0,y,front+.02,'plasterShadow');
    b.box(w,.035,.035,0,y,-front-.02,'plasterShadow');
    for(const side of [-1,1])b.box(.035,.035,d,side*(w/2+.02),y,0,'plasterShadow');
  }
  for(const x of [-w/2,w/2])for(const z of [-front,front])b.box(.2,h,.2,x,h/2,z,'trim');
  b.box(w+.25,.16,d+.25,0,2.82,0,spec.accent);
  const dx=spec.doorX-spec.x;
  for(const side of [-1,1])b.box(.14,2.36,.2,dx+side*.75,1.18,front+.09,'trim');
  b.box(1.64,.15,.22,dx,2.38,front+.10,'trim');
  b.box(1.36,2.22,.12,dx,1.15,front+.08,'windowDark');
  for(const side of [-1,1]){
    b.box(.64,2.15,.07,dx+side*.34,1.15,front+.16,spec.accent);
    b.box(.48,1.08,.035,dx+side*.34,1.59,front+.21,'glass');
    b.box(.04,.38,.06,dx+side*.10,1.10,front+.26,'brass');
    b.box(.47,.055,.045,dx+side*.34,1.09,front+.24,'trim');
  }
  // Flat accessible aprons; these doors have no trigger until interiors exist.
  b.roundBox(2.05,.06,1.02,.04,dx,.025,front+.49,'stoneLight');
  for(let x=-w/2+.85;x<w/2-.6;x+=1.45){
    if(Math.abs(x-dx)>1.45)windowFront(b,x,1.65,front+.035,.95,1.25,spec.accent);
    windowFront(b,x,3.55,front+.025,.9,.69,spec.accent);
  }
  for(const side of [-1,1]){
    const group=new THREE.Group();group.name='side-windows';group.position.x=side*w/2;group.rotation.y=side*Math.PI/2;
    const sb=new Builder(group,mats);
    for(let x=-d/2+1.25;x<d/2-.7;x+=2.0)windowFront(sb,x,1.85,.025,1.1,1.5,spec.accent);
    sb.finish();root.add(group);
  }
  const rear=new THREE.Group();rear.name='rear-windows';rear.position.z=-front;rear.rotation.y=Math.PI;
  const rb=new Builder(rear,mats);for(const x of [-w/2+1.3,w/2-1.3])windowFront(rb,x,1.85,.025,1.25,1.45,spec.accent);rb.finish();root.add(rear);
  b.finish();
  const roofBuilder=new Builder(root,palette);roof(roofBuilder,{w,d,y:h,rise:spec.kind==='gym'?1.9:1.45});roofBuilder.finish();
  lettering(root,spec.kind==='gym'?'VIRIDIAN GYM':spec.kind==='mart'?'POKÉ MART':'POKÉMON CENTER',0,2.97,front+.24,spec.kind==='gym'?6.2:5.1,.48,mats);
  root.userData={id:spec.id,kind:spec.kind,exteriorOnly:true,implemented:false};
  return root;
}
