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
  if(spec.kind==='house')return createBuilding({...spec,exteriorOnly:false},mats);
  const root=new THREE.Group();root.name=spec.id;root.position.set(spec.x,0,spec.z);
  const b=new Builder(root,mats),w=spec.width,d=spec.depth,h=spec.kind==='gym'?4.5:4.3,front=d/2;
  const palette={...mats};
  if(spec.kind==='mart'){
    palette.roof=mats.labRoof;palette.roofLight=mats.labRoofLight;palette.roofDark=mats.labRoofDark;
  }else if(spec.kind==='gym'){
    palette.roof=mats.teal;palette.roofLight=mats.teal.clone();palette.roofLight.color.set('#6a9e93');palette.roofDark=mats.labRoofDark;
  }
  const dx=spec.doorX-spec.x,dw=1.44,left=dx-dw/2+w/2,right=w/2-dx-dw/2;
  b.box(left,h,d,-w/2+left/2,h/2,0,'plaster');b.box(right,h,d,dx+dw/2+right/2,h/2,0,'plaster');
  b.box(dw,h-2.35,d,dx,2.35+(h-2.35)/2,0,'plaster');b.box(dw,2.35,d-1.25,dx,1.175,-.625,'plaster');
  for(const [width,x] of [[left,-w/2+left/2],[right,dx+dw/2+right/2]])b.box(width,.30,d+.1,x,.15,0,'foundation');
  b.box(dw,.30,d-1.25,dx,.15,-.675,'foundation');
  for(let y=.48;y<h;y+=.39){
    if(y<2.35){b.box(left,.035,.035,-w/2+left/2,y,front+.02,'plasterShadow');b.box(right,.035,.035,dx+dw/2+right/2,y,front+.02,'plasterShadow');}
    else b.box(w,.035,.035,0,y,front+.02,'plasterShadow');
    b.box(w,.035,.035,0,y,-front-.02,'plasterShadow');
    for(const side of [-1,1])b.box(.035,.035,d,side*(w/2+.02),y,0,'plasterShadow');
  }
  for(const x of [-w/2,w/2])for(const z of [-front,front])b.box(.2,h,.2,x,h/2,z,'trim');
  b.box(w+.25,.16,d+.25,0,2.82,0,spec.accent);
  for(const side of [-1,1])b.box(.14,2.36,.2,dx+side*.75,1.18,front+.09,'trim');
  b.box(1.64,.15,.22,dx,2.38,front+.10,'trim');
  b.box(dw,.025,1.25,dx,.01,front-.60,'woodLight');b.box(dw,2.3,.04,dx,1.15,front-1.20,'woodDark');
  for(const side of [-1,1]){
    const hinge=new THREE.Group();hinge.name='door-hinge';hinge.position.set(dx+side*.68,.075,front+.16);hinge.rotation.y=side*Math.PI*.54;root.add(hinge);
    const db=new Builder(hinge,mats),cx=-side*.34;
    db.box(.64,2.15,.07,cx,1.075,0,spec.accent);db.box(.48,1.08,.035,cx,1.515,.05,'glass');
    db.box(.04,.38,.06,-side*.58,1.025,.10,'brass');db.box(.47,.055,.045,cx,1.015,.08,'trim');db.finish();
  }
  // Flat accessible aprons and open leaves, matching Pallet’s walk-through entrances.
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
  root.userData={id:spec.id,kind:spec.kind,exteriorOnly:false,interior:spec.id,open:true,implemented:true};
  return root;
}
