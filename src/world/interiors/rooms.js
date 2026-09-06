import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder, faceGeometry } from '../geometry.js';
import { INTERIORS, RED_STAIRS, STOREY } from './layout.js';
import { makeInteriorMaterials, artwork } from './materials.js';
import { prop, picture, bookcase, table, chair, plant, flowers, television, computer, gameConsole, bed, pokeball, pokedex, person } from './props.js';

function boxCollider(nav,id,x,z,w,d,level) {
  nav.colliders.push({kind:'box',id,minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,...(level===undefined?{}:{level})});
}

function contact(parent,mats,x,y,z,w,d) {
  const b=new Builder(parent,mats);
  for(let i=0;i<3;i++)b.box(w+i*.085,.002,d+i*.085,x,y+.004+i*.002,z,'contact');
  b.finish({shadows:false});
}

function furnishing(ctx,id,x,z,w,d,draw,{level=0,yaw=0,solid=true,y=0}={}) {
  const group=prop(ctx.root,ctx.mats,id,x,level*STOREY+y,z,draw,yaw);
  group.userData.level=level;
  if(solid)boxCollider(ctx.nav,id,x,z,w,d,level);
  if(y===0)contact(ctx.root,ctx.mats,x,level*STOREY,z,w*.88,d*.88);
  return group;
}

function floor(b,spec,y,upper=false) {
  const {width:w,depth:d}=spec,s=RED_STAIRS;
  const slab=(x,z,ww,dd)=>b.box(ww,.12,dd,x,y-.10,z,'floorSeam');
  if(upper){
    slab((-w/2+s.minX)/2,0,s.minX+w/2,d);
    slab((s.minX+w/2)/2,(-d/2+s.topZ)/2,w/2-s.minX,s.topZ+d/2);
    slab((s.minX+w/2)/2,(s.bottomZ+d/2)/2,w/2-s.minX,d/2-s.bottomZ);
  } else slab(0,0,w,d);
  // Staggered oak boards; the narrow gaps provide grain at standing height.
  if(spec.id!=='oaks-lab') {
    const plank=(x1,x2,z1,z2,row,col)=>{
      if(x2-x1<.008||z2-z1<.008)return;
      b.box(x2-x1-.009,.026,z2-z1-.008,(x1+x2)/2,y-.013,(z1+z2)/2,['floor','floorLight','floorDark'][(row*7+col*3)%11===0?2:(row+col)%5===0?1:0]);
    };
    for(let row=0;row<32;row++){
      const z1=-d/2+row*.3,z2=z1+.3;
      for(let col=-1;col<6;col++){
        const x1=Math.max(-w/2,-w/2+col*1.92+(row%3)*.64),x2=Math.min(w/2,-w/2+(col+1)*1.92+(row%3)*.64);
        if(upper&&z2>s.topZ&&z1<s.bottomZ){
          plank(x1,Math.min(x2,s.minX),z1,z2,row,col);
          if(z1<s.topZ)plank(Math.max(x1,s.minX),x2,z1,s.topZ,row,col);
          if(z2>s.bottomZ)plank(Math.max(x1,s.minX),x2,s.bottomZ,z2,row,col);
        }else plank(x1,x2,z1,z2,row,col);
      }
    }
  } else {
    for(let row=0;row<24;row++)for(let col=0;col<20;col++)b.box(.589,.026,.589,-w/2+(col+.5)*.6,y-.013,-d/2+(row+.5)*.6,(row+col)%5===0?'labTileAlt':'labTile');
    // The original lab has a two-tile-wide central aisle between book banks.
    for(const x of [-1.13,1.13])b.box(.035,.005,13.6,x,y+.004,0,'teal');
  }
}

function indoorWindow(parent,mats,x,y,z,{width=1.45,height=1.32,yaw=0,blue=false,curtains=true}={}) {
  prop(parent,mats,'daylight-window',x,y,z,b=>{
    picture(b,0,0,0,width,height,'window','oakLight');
    b.box(.055,height,.10,0,0,.09,'paper');b.box(width,.052,.10,0,0,.09,'paper');
    b.box(width+.26,.095,.32,0,-height/2-.06,.11,'oakLight');
    if(curtains){
      b.beam([-width/2-.31,height/2+.20,.11],[width/2+.31,height/2+.20,.11],.023,'brass');
      for(const side of [-1,1])for(let i=0;i<4;i++){
        const xx=side*(width/2+.10)+(i-1.5)*.067;
        b.cylinder(.046,.055,height+.1,xx,-.05,.1,blue?'fabricBlue':'fabricCream',8);
      }
      for(const side of [-1,1])b.box(.29,.052,.12,side*(width/2+.11),-.29,.12,'bookGold');
    }
  },yaw);
}

function shell(ctx) {
  const {spec,root,mats,nav}=ctx,{width:w,depth:d,doorX:dx,doorWidth:dw}=spec;
  const lab=spec.id==='oaks-lab',blue=spec.id==='blues-house',height=lab?3.55:2.86;
  const walls=new THREE.Group();walls.name='room-shell';root.add(walls);const b=new Builder(walls,mats);
  const ceilings=new THREE.Group();ceilings.name='room-ceilings';root.add(ceilings);const cb=new Builder(ceilings,mats);
  for(let level=0;level<spec.floors;level++){
    const y=level*STOREY,wall=lab?'wallLab':blue?'wallBlue':'wall',panel=blue?'wainscotBlue':'wainscot';
    floor(b,spec,y,level===1);
    b.box(w+.3,height,.18,0,y+height/2,-d/2-.09,wall);
    for(const side of [-1,1])b.box(.18,height,d,side*(w/2+.09),y+height/2,0,wall);
    if(level===0){
      const left=dx-dw/2+w/2,right=w/2-(dx+dw/2);
      b.box(left,height,.18,-w/2+left/2,y+height/2,d/2+.09,wall);
      b.box(right,height,.18,dx+dw/2+right/2,y+height/2,d/2+.09,wall);
      b.box(dw,height-2.25,.18,dx,y+2.25+(height-2.25)/2,d/2+.09,wall);
    }else b.box(w+.3,height,.18,0,y+height/2,d/2+.09,wall);
    // Low painted panelling, skirting, and crown moulding give the quiet room
    // more depth without turning the original furniture plan into a new house.
    b.box(w,.72,.035,0,y+.38,-d/2+.018,panel);
    b.box(w,.06,.068,0,y+.77,-d/2+.035,'paper');b.box(w,.12,.06,0,y+.063,-d/2+.035,'oak');
    for(const side of [-1,1]){
      b.box(.035,.72,d,side*(w/2-.018),y+.38,0,panel);
      b.box(.068,.06,d,side*(w/2-.035),y+.77,0,'paper');
      b.box(.06,.12,d,side*(w/2-.035),y+.063,0,'oak');
    }
    for(const zz of [-d/2+.035,d/2-.035])b.box(w,.09,.09,0,y+height-.06,zz,'paper');
    for(const xx of [-w/2+.035,w/2-.035])b.box(.09,.09,d,xx,y+height-.06,0,'paper');
    // Red's lower ceiling has a real stairwell opening all the way to its
    // landing; there is no invisible slab through the player's head.
    if(level===0&&spec.stairs){
      const s=spec.stairs;
      cb.box(s.minX+w/2,.12,d,(-w/2+s.minX)/2,y+height+.06,0,'plasterLight');
      cb.box(w/2-s.minX,.12,d/2-s.bottomZ,(s.minX+w/2)/2,y+height+.06,(s.bottomZ+d/2)/2,'plasterLight');
    }else cb.box(w,.12,d,0,y+height+.06,0,'plasterLight');
  }
  // Open entrance, shallow vestibule and threshold. No door interaction needed.
  b.box(dw,.08,1.03,dx,-.04,d/2+.50,'oak');
  for(const side of [-1,1]){
    b.box(.12,2.32,.14,dx+side*(dw/2+.015),1.16,d/2+.01,'oakLight');
    b.box(.16,2.5,1.04,dx+side*(dw/2+.08),1.25,d/2+.52,'wall');
    boxCollider(nav,'entry-jamb',dx+side*(dw/2+.08),d/2+.50,.16,1.05,0);
  }
  b.box(dw+.22,.12,.14,dx,2.30,d/2+.01,'oakLight');
  b.box(dw,2.5,.10,dx,1.25,d/2+1.03,'wall');
  const outside=new THREE.PlaneGeometry(dw,2.28);b.add(outside,artwork('window'),[dx,1.14,d/2+.972],[0,Math.PI,0]);outside.dispose();
  b.box(dw,.10,1.03,dx,2.40,d/2+.50,'plasterLight');
  b.box(dw+.32,.017,.92,dx,.011,d/2-.52,blue?'fabricBlue':lab?'teal':'fabricRed');
  for(const zz of [d/2-.85,d/2-.20])b.box(dw+.16,.019,.036,dx,.014,zz,'fabricCream');
  b.finish({shadows:false});
  cb.finish({shadows:false});ceilings.traverse(o=>{if(o.isMesh)o.receiveShadow=false;});
  // Full-height boundary descriptions; only the south entry is an opening.
  boxCollider(nav,'north-wall',0,-d/2-.15,w+.6,.3);
  boxCollider(nav,'west-wall',-w/2-.15,0,.3,d+.6);
  boxCollider(nav,'east-wall',w/2+.15,0,.3,d+.6);
  const left=dx-dw/2+w/2,right=w/2-dx-dw/2;
  boxCollider(nav,'south-wall-left',-w/2+left/2,d/2+.15,left,.3);
  boxCollider(nav,'south-wall-right',dx+dw/2+right/2,d/2+.15,right,.3);
  boxCollider(nav,'vestibule-back',dx,d/2+1.03,dw+.3,.15,0);
  if(spec.floors===2)boxCollider(nav,'bedroom-south-wall',dx,d/2+.10,dw,.2,1);

  // Small daylight patterns are geometry, so there is no extra render pass.
  const patches=new THREE.Group();patches.name='window-light-on-floor';root.add(patches);const pb=new Builder(patches,mats);
  for(let l=0;l<spec.floors;l++)for(const x of [-2.6,1.55]){
    pb.box(1.25,.002,2.0,x,l*STOREY+.023,-2.0,'sunPatch',[0,-.23,0]);
    pb.box(1.4,.002,2.1,x,l*STOREY+.022,-2.0,'sunPatch',[0,-.23,0]);
  }
  pb.finish({shadows:false});
  for(let l=0;l<spec.floors;l++){
    const yy=l*STOREY;
    if(!lab){
      if(!blue)for(const x of [-.6,1.8])indoorWindow(root,mats,x,yy+1.91,-d/2+.04,{width:1.30,height:1.17});
      else indoorWindow(root,mats,1.8,1.89,-d/2+.04,{width:1.60,height:1.15,blue:true});
      indoorWindow(root,mats,-w/2+.04,yy+1.84,-.9,{width:1.55,yaw:Math.PI/2,blue});
      if(l===1)indoorWindow(root,mats,.1,yy+1.84,d/2-.04,{width:1.6,yaw:Math.PI});
    }else for(const zz of [-3.9,3.85])for(const side of [-1,1])indoorWindow(root,mats,side*(w/2-.04),2.14,zz,{width:1.95,height:1.4,yaw:-side*Math.PI/2,curtains:false});
    prop(root,mats,'ceiling-light',0,yy+height,lab?3.4:.8,b=>{
      b.cylinder(.12,.14,.055,0,-.035,0,'brass',12);
      b.cylinder(.016,.016,.20,0,-.14,0,'brass',8);
      b.cylinder(lab?.43:.15,lab?.43:.37,.18,0,-.33,0,lab?'paper':'fabricCream',20);
      b.cylinder(lab?.39:.32,lab?.39:.32,.025,0,-.43,0,'light',20);
    });
  }
}

function stairs(ctx) {
  const {root,mats,nav}=ctx,s=RED_STAIRS,w=s.maxX-s.minX,x=(s.minX+s.maxX)/2,run=s.bottomZ-s.topZ,tread=run/s.steps;
  const group=new THREE.Group();group.name='reds-house-walkable-stairs';root.add(group);const b=new Builder(group,mats);
  for(let i=0;i<s.steps;i++){
    const h=(i+1)*s.rise/s.steps,z=s.bottomZ-(i+.5)*tread;
    b.box(w,h,tread+.004,x,h/2,z,'oak');
    b.roundBox(w+.025,.04,tread+.036,.012,x,h-.019,z+.01,'oakLight');
  }
  // Rail stays continuous into the north landing; the upper opening is guarded
  // along its west side and across its southern end. The bottom remains open.
  for(const side of [-1,1]){
    const xx=side<0?s.minX:s.maxX;
    b.beam([xx,.92,s.bottomZ],[xx,s.rise+.92,s.topZ],.039,'oakDark');
    for(let i=0;i<=9;i++){
      const t=i/9,z=s.bottomZ-run*t,y=s.rise*t;
      b.box(.045,.89,.045,xx,y+.445,z,'oakLight');
    }
  }
  for(const z of [s.bottomZ,s.topZ]){
    const y=z===s.topZ?s.rise:0;
    b.box(.11,1.01,.11,s.minX,y+.505,z,'oak');b.sphere(.072,s.minX,y+1.05,z,'oakLight',[1,1,1],9);
  }
  // A solid stringer closes the under-stair wedge, with a modest panel moulding.
  const face=faceGeometry([[s.minX-.055,0,s.bottomZ],[s.minX-.055,s.rise,s.topZ],[s.minX-.055,0,s.topZ]]);
  b.add(face,'oak');b.add(face,'oak',[.06,0,0]);face.dispose();
  for(let i=0;i<5;i++){
    const z=s.topZ+.35+i*.63,h=(s.bottomZ-z)/run*s.rise-.25;
    if(h>0)b.box(.018,h,.035,s.minX-.068,h/2+.10,z,'oakLight');
  }
  const guard=(a,c)=>{
    b.beam([a[0],s.rise+.94,a[1]],[c[0],s.rise+.94,c[1]],.04,'oakDark');
    const length=Math.hypot(c[0]-a[0],c[1]-a[1]),n=Math.ceil(length/.25);
    for(let i=0;i<=n;i++){const t=i/n;b.box(.046,.92,.046,a[0]+(c[0]-a[0])*t,s.rise+.46,a[1]+(c[1]-a[1])*t,'oakLight');}
  };
  guard([s.minX,s.topZ],[s.minX,s.bottomZ]);guard([s.minX,s.bottomZ],[4.8,s.bottomZ]);
  b.box(.13,.19,run+.05,s.minX-.03,s.rise-.095,(s.topZ+s.bottomZ)/2,'oak');
  b.finish();
  boxCollider(nav,'stair-west-rail',s.minX-.045,(s.topZ+s.bottomZ)/2,.09,run);
  boxCollider(nav,'stair-east-rail',s.maxX+.045,(s.topZ+s.bottomZ)/2,.09,run);
  boxCollider(nav,'stair-upper-end-rail',(s.minX+4.8)/2,s.bottomZ+.025,4.8-s.minX,.08,1);
  // No passage under the top landing into the ramp from the north on 1F.
  boxCollider(nav,'stair-ground-back',x,s.topZ-.03,w,.10,0);
}

function dining(ctx,z,blue=false) {
  furnishing(ctx,'dining-table',0,z,2.12,2.0,b=>{
    table(b);
    b.box(.40,.009,1.79,0,.801,0,blue?'fabricBlue':'fabricCream');
    if(!blue){const root=new THREE.Group();root.name='table-flowers';const fb=new Builder(root,ctx.mats);flowers(fb);fb.finish();root.position.set(.28,.796,-.13);ctx.root.getObjectByName('dining-table')?.add(root);}
    if(blue){
      const g=new THREE.PlaneGeometry(.90,.64);b.add(g,artwork('map'),[-.32,.813,-.30],[-Math.PI/2,0,-.05]);g.dispose();
      b.box(.055,.035,.025,-.67,.811,-.64,'brass');
    }
  });
  for(const side of [-1,1])for(const zz of [-.60,.60]){
    const x=side*1.67;
    furnishing(ctx,`dining-chair-${side}-${zz}`,x,z+zz,.56,.57,b=>chair(b,blue),{yaw:-side*Math.PI/2});
  }
  const px=blue?-1.67:1.67,pz=z-.60;
  furnishing(ctx,blue?'daisy':'mom',px,pz,.50,.58,b=>person(b,{kind:blue?'daisy':'mom',seated:true}),{yaw:blue?Math.PI/2:-Math.PI/2,solid:false});
}

function redHouse(ctx) {
  furnishing(ctx,'living-room-books',-3.59,-4.22,2.16,.55,b=>bookcase(b,2.16));
  furnishing(ctx,'living-room-tv',-.60,-3.55,1.32,.65,b=>television(b));
  dining(ctx,1.20);stairs(ctx);
  furnishing(ctx,'bedroom-pc',-4.03,-3.94,1.18,1.06,b=>computer(b),{level:1});
  furnishing(ctx,'bedroom-writing-desk',-2.35,-4.06,2.16,.94,b=>{
    table(b,2.16,.94,.77);b.box(.35,.09,.44,.57,.823,-.09,'bookBlue');
    const page=new THREE.PlaneGeometry(.51,.36);b.add(page,artwork('notes'),[-.15,.83,.06],[-Math.PI/2,0,-.08]);page.dispose();
    b.cylinder(.009,.009,.26,.28,.82,.15,'brass',6,[0,0,Math.PI/2]);
    b.cylinder(.10,.10,.012,-.78,.786,-.19,'oakDark',12);
    b.beam([-.78,.80,-.19],[-.78,1.24,-.19],.023,'brass');b.cylinder(.13,.21,.22,-.78,1.29,-.19,'fabricCream',16);
  },{level:1});
  furnishing(ctx,'bedroom-desk-chair',-2.48,-2.97,.57,.57,b=>chair(b),{level:1,yaw:Math.PI});
  furnishing(ctx,'bedroom-tv',-.60,.45,1.32,.66,b=>television(b,true),{level:1});
  furnishing(ctx,'bedroom-console',-.60,1.59,.91,.95,b=>{
    table(b,.91,.95,.30);const mini=new THREE.Group();mini.name='snes-and-wired-controller';const gb=new Builder(mini,ctx.mats);gameConsole(gb);gb.finish();mini.position.set(0,.30,-.12);ctx.root.getObjectByName('bedroom-console')?.add(mini);
  },{level:1});
  furnishing(ctx,'reds-bed',-3.95,3.42,1.3,2.35,b=>bed(b),{level:1});
  furnishing(ctx,'bedroom-plant',3.02,3.76,.58,.58,b=>plant(b,1.12),{level:1});
}

function blueHouse(ctx) {
  furnishing(ctx,'blue-northwest-books',-3.59,-4.22,2.16,.55,b=>bookcase(b,2.16,2.18,.46,2));
  furnishing(ctx,'blue-northeast-books',4.03,-4.22,1.20,.55,b=>bookcase(b,1.20,2.18,.46,5));
  prop(ctx.root,ctx.mats,'blue-landscape-picture',-.6,1.94,-4.72,b=>picture(b,0,0,0,1.34,.98,'landscape','oakDark'));
  for(const x of [-3.98,3.98])furnishing(ctx,`blue-plant-${x}`,x,3.83,.59,.59,b=>plant(b,1.25));
  dining(ctx,0,true);
}

function oakLab(ctx) {
  // The Gen I lab uses the gym tileset: north-west PC / Pokédex desk,
  // north-east book bank, east starter table, and two southern book banks.
  furnishing(ctx,'lab-computer',-5.26,-5.45,1.20,1.07,b=>computer(b,true));
  furnishing(ctx,'research-instrument',-4.15,-5.52,.9,.97,b=>{
    table(b,.90,.97,.77,true);b.box(.65,.06,.65,0,.81,0,'metal');
    b.box(.43,.63,.37,0,1.145,-.08,'screenCase');
    b.cylinder(.11,.11,.075,0,1.28,.15,'metal',16,[Math.PI/2,0,0]);
    b.box(.29,.19,.025,0,1.035,.12,'glass');b.box(.15,.02,.013,0,1.045,.14,'leafLight');
    b.cylinder(.045,.045,.02,.27,.91,.27,'red',12);
  });
  furnishing(ctx,'pokedex-desk',-2.40,-5.53,2.10,1.00,b=>{table(b,2.10,1.00,.79,true);pokedex(b,-.52,-.04);pokedex(b,.53,-.04);});
  furnishing(ctx,'lab-north-books',3.60,-6.63,4.52,.55,b=>bookcase(b,4.52,2.22,.49,3));
  for(const side of [-1,1]){
    furnishing(ctx,`lab-book-bank-${side}`,side*3.60,1.17,4.47,.77,b=>{
      bookcase(b,4.47,1.92,.66,side+3);
      // Back panels make these free-standing cabinets readable from the
      // research side too; the original central two-tile aisle stays clear.
      b.box(4.48,1.84,.065,0,.98,-.37,'oak');
      for(const x of [-1.66,-.55,.55,1.66])b.box(.96,1.55,.025,x,.97,-.41,'oakLight');
      b.box(4.62,.08,.86,0,1.94,0,'oakLight');
    });
  }
  furnishing(ctx,'starter-pokemon-table',3.03,-3.02,3.16,1.12,b=>{
    table(b,3.16,1.12,.91,true);
    for(let i=0;i<3;i++){
      const x=-1.02+i*1.02;
      b.cylinder(.18,.21,.032,x,.929,-.08,'metal',20);
      b.cylinder(.151,.151,.013,x,.95,-.08,'fabricCream',20);
      pokeball(b,x,1.074,-.08);
      b.box(.25,.008,.16,x,.97,.30,'paper');
      const mark=i===0?'red':i===1?'blue':'leaf';b.box(.052,.012,.052,x,.98,.30,mark);
    }
  });
  for(const [id,x,z,kind,yaw] of [
    ['professor-oak',.60,-4.2,'oak',0],['blue-at-lab',-.65,-3.0,'blue',.30],
    ['lab-girl-aide',-4.20,4.20,'girl',.7],['lab-west-aide',-3.0,5.4,'aide',-.50],['lab-east-aide',4.20,5.4,'aide',-.8],
  ]){
    furnishing(ctx,id,x,z,.48,.42,b=>person(b,{kind}),{yaw,solid:false});
    ctx.nav.colliders.push({kind:'circle',id,x,z,r:.24});
  }
  for(const x of [-.60,.60])prop(ctx.root,ctx.mats,'research-notice',x,2.0,-7.12,b=>picture(b,0,0,0,.64,.85,'notes','oakLight'));
}

// Merge static meshes by material AND shadow behavior. Named empty prop groups
// retain transforms as future interaction anchors, independent of render batches.
function batchRoom(root) {
  root.updateMatrixWorld(true);const buckets=new Map(),remove=[];
  root.traverse(o=>{
    if(!o.isMesh)return;
    const key=`${o.material.uuid}/${o.castShadow}/${o.receiveShadow}`;
    if(!buckets.has(key))buckets.set(key,{material:o.material,casts:o.castShadow,receives:o.receiveShadow,geos:[]});
    buckets.get(key).geos.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);
  });
  for(const o of remove){o.removeFromParent();o.geometry.dispose();}
  for(const {material,casts,receives,geos} of buckets.values()){
    const geo=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());
    const mesh=new THREE.Mesh(geo,material);mesh.name=`${root.name}:${material.name}`;mesh.castShadow=casts;mesh.receiveShadow=receives;root.add(mesh);
  }
}

export function createInterior(id) {
  const spec=INTERIORS[id];if(!spec)throw new Error(`Unknown interior: ${id}`);
  const root=new THREE.Group();root.name=`interior-${id}`;
  const mats=makeInteriorMaterials(),nav={colliders:[],stairs:spec.stairs};
  const ctx={root,mats,nav,spec};shell(ctx);
  if(id==='reds-house')redHouse(ctx);else if(id==='blues-house')blueHouse(ctx);else oakLab(ctx);
  batchRoom(root);
  const fill=new THREE.HemisphereLight('#eef3e6','#9a947e',1.1);fill.name='indoor-bounce';root.add(fill);
  const sun=new THREE.DirectionalLight('#fff0d4',1.4);sun.name='indoor-daylight';sun.position.set(-5,11,6);sun.target.position.set(0,1,0);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.022;sun.shadow.bias=-.00015;
  Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.2,far:32});root.add(sun,sun.target);
  return {root,spec,navigation:nav,background:new THREE.Color('#e6e1cd'),fog:null,sun};
}
