import * as THREE from 'three';
import { Builder, faceGeometry } from './geometry.js';

export function windowFront(b,x,y,z,w=1.22,h=1.18,accent='shutter',shutters=false) {
  b.box(w+.22,h+.23,.15,x,y,z,'trimShade');
  b.box(w,h,.13,x,y,z+.085,'windowDark');
  b.box(w-.13,h-.13,.05,x,y,z+.16,'glass');
  b.box(.055,h,.075,x,y,z+.2,'trim');
  b.box(w,.055,.075,x,y+.02,z+.2,'trim');
  b.box(w+.31,.11,.33,x,y-h/2-.08,z+.105,'trim');
  b.box(w+.22,.09,.17,x,y+h/2+.075,z+.07,'trim');
  // Small pale glass glints rather than environment maps or transparent windows.
  b.box(.12,h*.68,.012,x-w*.25,y+.06,z+.198,'reflection',[0,0,-.25]);
  b.box(.055,h*.49,.014,x+w*.27,y+.08,z+.199,'reflection',[0,0,-.25]);
  if(shutters) for(const s of [-1,1]) {
    b.box(.33,h+.07,.1,x+s*(w*.5+.27),y,z+.07,accent);
    for(let j=0;j<7;j++) b.box(.3,.035,.06,x+s*(w*.5+.27),y-h*.43+j*h*.14,z+.138,'trimShade');
  }
}

export function roof(b,{w,d,y,rise,lab=false}) {
  const colors = lab ? ['labRoof','labRoofLight','labRoofDark'] : ['roof','roofLight','roofDark'];
  const over=.43, half=d/2+over, rw=w+over*2;
  const angle=Math.atan2(rise,half), slope=Math.hypot(rise,half);
  // Both slopes, deep fascia and solid end gables. Roof remains closed from every side.
  b.box(rw,.18,slope,0,y+rise/2,half/2,colors[2],[angle,0,0]);
  b.box(rw,.18,slope,0,y+rise/2,-half/2,colors[2],[-angle,0,0]);
  for(const x of [-w/2,w/2]) {
    const pts = x<0 ? [[x,y,-d/2],[x,y,d/2],[x,y+rise,0]] : [[x,y,d/2],[x,y,-d/2],[x,y+rise,0]];
    const g=faceGeometry(pts);b.add(g,'plaster');g.dispose();
    b.beam([x,y,-half],[x,y+rise,0],.10,'trim');
    b.beam([x,y+rise,0],[x,y,half],.10,'trim');
  }
  const columns=Math.ceil(rw/.48), tw=rw/columns, rows=Math.ceil(slope/.57);
  // Rounded individual clay tiles catch light and give the roof a close-range silhouette.
  // These are merged once; tile count does not become draw-call count.
  for(const side of [-1,1]) for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
    const t=(row+.5)/rows;
    const z=side*half*(1-t), yy=y+rise*t+.11;
    const color=colors[(col*7+row*11)%13===0?1:0];
    b.roundBox(tw-.026,.095,slope/rows+.038,.042,-rw/2+tw*(col+.5),yy,z,color,[side*angle,0,0]);
  }
  b.box(rw+.07,.18,.2,0,y+.04,half,'trim');
  b.box(rw+.07,.18,.2,0,y+.04,-half,'trim');
  for(let col=0;col<columns;col++) b.cylinder(.12,.12,tw+.012,-rw/2+tw*(col+.5),y+rise+.145,0,colors[1],8,[0,0,Math.PI/2]);
  // Gutters and downpipes are kept visually narrow at human scale.
  for(const s of [-1,1]) b.cylinder(.063,.063,rw,0,y-.035,s*(half+.045),'woodDark',8,[0,0,Math.PI/2]);
  for(const x of [-w/2+.18,w/2-.18]) b.cylinder(.055,.055,y-.35,x,(y-.35)/2+.25,half-.16,'trimShade',8);
}

function door(group,b,{x,z,accent,mats,lab=false}) {
  const width=lab?1.35:1.02, height=2.18;
  for(const side of [-1,1])b.box(.13,height+.2,.20,x+side*(width/2+.065),height/2+.1,z,'trim');
  b.box(width+.27,.15,.20,x,height+.18,z,'trim');
  // Open, recessed threshold. The separate interior begins as you walk in.
  b.box(width,.035,1.22,x,.012,z-.54,'woodLight');
  b.box(width,2.30,.065,x,1.15,z-1.19,'woodDark');
  b.box(width-.08,2.10,.015,x,1.08,z-1.15,'woodLight');
  const pivot=new THREE.Group();pivot.name='door-hinge';pivot.position.set(x-width/2,.12,z+.14);
  const db=new Builder(pivot,mats);
  db.box(width,height,.105,width/2,height/2,0,accent);
  db.box(width-.24,.76,.055,width/2,height-.58,.065,'glass');
  db.box(width-.21,.045,.07,width/2,height-.19,.072,'trimShade');
  db.box(width-.21,.045,.07,width/2,height-.97,.072,'trimShade');
  db.box(.045,.83,.07,.10,height-.58,.072,'trimShade');
  db.box(.045,.83,.07,width-.10,height-.58,.072,'trimShade');
  db.box(width-.25,.65,.05,width/2,.48,.068,accent);
  db.sphere(.055,width-.15,1.05,.11,'brass',[1,1,.65],8);
  db.finish();pivot.rotation.y=-Math.PI*.54;group.add(pivot);
  b.roundBox(width+1.0,.13,.68,.045,x,.065,z+.3,'stoneLight');
  b.roundBox(width+1.5,.06,.98,.025,x,.025,z+.43,'stone');
  return pivot;
}

function wallDetail(b,w,d,h,doorX,doorWidth) {
  const split=(width,height,depth,y,z,mat)=>{
    const left=doorX-doorWidth/2+width/2,right=width/2-doorX-doorWidth/2;
    b.box(left,height,depth,-width/2+left/2,y,z,mat);
    b.box(right,height,depth,doorX+doorWidth/2+right/2,y,z,mat);
  };
  // Split the front foundation and siding around the usable opening.
  split(w+.10,.32,d+.10,.17,0,'foundation');
  split(w+.08,.10,d+.08,.36,0,'trimShade');
  b.box(doorWidth,.32,d-1.15,doorX,.17,-.625,'foundation');
  b.box(doorWidth,.10,d-1.17,doorX,.36,-.625,'trimShade');
  for(let y=.7;y<h;y+=.39) {
    if(y<2.35)split(w,.035,.032,y,d/2+.015,'plasterShadow');
    else b.box(w,.035,.032,0,y,d/2+.015,'plasterShadow');
    b.box(w,.035,.032,0,y,-d/2-.015,'plasterShadow');
    for(const side of [-1,1]) b.box(.032,.035,d,side*(w/2+.015),y,0,'plasterShadow');
  }
  for(const x of [-w/2,w/2]) for(const z of [-d/2,d/2]) b.box(.16,h-.27,.16,x,h/2+.14,z,'trim');
}

export function createBuilding(spec,mats) {
  const root=new THREE.Group();root.name=spec.id;root.position.set(spec.x,0,spec.z);
  const b=new Builder(root,mats), lab=spec.kind==='lab';
  const w=spec.width,d=spec.depth,h=lab?4.3:4.55;
  const dx=spec.doorX-spec.x,dw=lab?1.35:1.02,left=dx-dw/2+w/2,right=w/2-dx-dw/2;
  b.box(left,h,d,-w/2+left/2,h/2,0,'plaster');
  b.box(right,h,d,dx+dw/2+right/2,h/2,0,'plaster');
  b.box(dw,h-2.35,d,dx,2.35+(h-2.35)/2,0,'plaster');
  b.box(dw,2.35,d-1.25,dx,1.175,-.625,'plaster');
  wallDetail(b,w,d,h,dx,dw);
  // The low front awning and upper window row recall the original Game Boy sprite.
  b.box(w+.25,.16,d+.2,0,2.78,0,'trim');
  if(!lab) {
    b.box(w+.32,.11,.70,0,2.92,d/2+.18,'roofDark',[.13,0,0]);
    b.box(w+.35,.10,.12,0,2.86,d/2+.53,'trim');
    windowFront(b,1.28,1.69,d/2+.022,2.0,1.20,spec.accent,true);
    windowFront(b,-2.46,1.72,d/2+.022,.8,1.15,spec.accent,false);
    for(const x of [-2.36,.32,1.67]) windowFront(b,x,3.6,d/2+.018,.83,.95,spec.accent,false);
    // Side and rear details make walking around the house worthwhile.
    for(const side of [-1,1]) {
      const sideGroup=new THREE.Group();sideGroup.name='side-windows';sideGroup.position.x=side*w/2;sideGroup.rotation.y=side*Math.PI/2;
      const sb=new Builder(sideGroup,mats);
      windowFront(sb,0,1.65,.015,1.45,1.3,spec.accent,true);
      windowFront(sb,0,3.64,.015,.95,.95,spec.accent,false);sb.finish();root.add(sideGroup);
    }
    const back=new THREE.Group();back.name='rear-windows';back.position.z=-d/2;back.rotation.y=Math.PI;
    const bb=new Builder(back,mats);windowFront(bb,-1.6,1.7,.02,1.25,1.2,spec.accent,true);windowFront(bb,1.6,3.6,.02,1.2,1.0,spec.accent,false);bb.finish();root.add(back);
    // Window box, dark soil, and readable small leaves beneath the front window.
    b.box(2.12,.25,.48,1.28,.91,d/2+.24,'woodLight');
    b.box(1.97,.04,.35,1.28,1.05,d/2+.25,'soil');
    for(let i=0;i<10;i++) {b.sphere(.14,.40+i*.19,1.14,d/2+.25,'leaf',[1,1,.8],7);b.sphere(.09,.4+i*.19,1.26,d/2+.28,i%3?'petalPink':'petalCream',[1,.55,1],7);}
    // Brick chimney and slightly overhanging stone cap.
    b.box(.68,1.28,.72,-2.1,h+1.16,-.9,'roofDark');
    for(let y=h+.63;y<h+1.77;y+=.19) b.box(.7,.022,.74,-2.1,y,-.9,'trimShade');
    b.box(.85,.14,.88,-2.1,h+1.84,-.9,'stoneLight');
    b.box(.47,.035,.50,-2.1,h+1.92,-.9,'woodDark');
  } else {
    // Larger research building: slate roof, brick pilasters, wide banks of windows.
    for(const x of [-4.05,-2.65,1.22,2.62,4.02]) windowFront(b,x,1.69,d/2+.035,1.14,1.06,'teal',false);
    for(const x of [-3.74,-2.44,-1.14,1.56,2.86,4.16]) windowFront(b,x,3.47,d/2+.018,1.04,.83,'teal',false);
    for(const x of [-.25,w/2-.38,-w/2+.38]) {
      b.box(.52,h-.24,.14,x,h/2+.13,d/2+.058,'stoneLight');
      for(let y=.58;y<h;y+=.27) b.box(.54,.021,.15,x,y,d/2+.06,'mortar');
    }
    const side=new THREE.Group();side.name='lab-east-windows';side.position.x=w/2;side.rotation.y=Math.PI/2;
    const sb=new Builder(side,mats);for(const x of [-2,0,2]) windowFront(sb,x,1.85,.03,1.35,1.55,'teal',false);sb.finish();root.add(side);
    const west=new THREE.Group();west.name='lab-west-windows';west.position.x=-w/2;west.rotation.y=-Math.PI/2;
    const wb=new Builder(west,mats);
    for(const x of [-1.95,1.4]) {windowFront(wb,x,1.85,.03,1.75,1.5,'teal',false);windowFront(wb,x,3.5,.03,1.25,.72,'teal',false);}
    wb.finish();root.add(west);
    const back=new THREE.Group();back.name='lab-rear';back.position.z=-d/2;back.rotation.y=Math.PI;const bb=new Builder(back,mats);
    for(const x of [-3.6,0,3.6]) windowFront(bb,x,2,.02,1.7,1.4,'teal');bb.finish();root.add(back);
    // Modest observatory hardware: one roof vent, no invented tower or extra building.
    b.box(1.20,.52,.76,3.6,h+1.27,-1.04,'labRoofDark');
    for(let i=0;i<5;i++) b.box(1.22,.035,.08,3.6,h+1.05+i*.085,-.65,'trimShade');
  }
  roof(b,{w,d,y:h,rise:lab?1.7:1.75,lab});
  const pivot=door(root,b,{x:spec.doorX-spec.x,z:d/2+.04,accent:spec.accent,mats,lab});
  if(lab) {
    // Small three-dimensional Poké Ball seal above the entrance.
    const x=spec.doorX-spec.x;
    b.cylinder(.27,.27,.045,x,2.98,d/2+.22,'trim',24,[Math.PI/2,0,0]);
    b.box(.48,.038,.027,x,2.98,d/2+.254,'teal');
    b.cylinder(.075,.075,.03,x,2.98,d/2+.28,'teal',16,[Math.PI/2,0,0]);
    b.cylinder(.036,.036,.035,x,2.98,d/2+.30,'trim',12,[Math.PI/2,0,0]);
  }
  b.finish();
  if(spec.exteriorOnly)pivot.rotation.y=0;
  root.userData={id:spec.id,kind:spec.kind,doorNode:pivot.name,interaction:'door',open:true,interior:spec.id,implemented:false};
  return root;
}
