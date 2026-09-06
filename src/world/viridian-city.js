import { exteriorDoorColliders } from './interiors/layout.js';
import * as THREE from 'three';
import {Builder,groundPolygon,instanceSet} from './geometry.js';
import {seededRandom} from './materials.js';
import {VIRIDIAN_CITY as CITY,viridianTile as tile} from './viridian-layout.js';
import {createViridianBuilding} from './viridian-buildings.js';
import {createSign,collapseBuilding} from './pallet-town.js';
import {buildLedges} from './route1-ledges.js';

// Hand-authored landscape interpretation of the original Red/Blue block map.
// No source graphics are shipped: every tree, fence, flower and bank is geometry.
const FOREST=[
  [6,15,0,3],
  [20,23,0,3],[24,39,0,1],[36,39,2,31],
  [8,15,6,15],[4,7,6,15],[4,7,4,5],[8,13,4,5],
];
const PATHS=[
  [16,19,0,19],[18,21,3,5],[20,35,10,12],[20,35,14,16],
  [20,27,18,21],[28,35,20,21],[0,19,18,19],[4,19,20,21],
  [16,21,22,26],[20,35,26,26],[20,21,27,35],
];
const boxCollider=(id,minX,maxX,minZ,maxZ)=>({id,kind:'box',minX,maxX,minZ,maxZ});
function rect(root,mat,x0,x1,y0,y1,height=.019){
  const [x,z]=tile(x0,y0),[xx,zz]=tile(x1,y1);
  root.add(groundPolygon([[x-1,z-1],[xx+1,z-1],[xx+1,zz+1],[x-1,zz+1]],mat,height));
}
function forest(root,mats,colliders){
  const rand=seededRandom(2026),points=new Map();
  const add=(x,z,solid=true)=>points.set(`${x}/${z}`,{x,z,solid});
  for(const [x0,x1,y0,y1] of FOREST)for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)add(...tile(x,y));
  // Small original tree run beside the western pond clearing.
  for(const x of [4,5,6,7])add(...tile(x,21));
  add(...tile(8,22));add(...tile(8,23));
  // Forest depth outside the playable map; clear north and west route mouths.
  for(let z=-174;z<-98;z+=3.4)for(const x of [42,46,50])add(x,z,false);
  for(let z=-174;z<-163;z+=3.4)for(let x=-29;x<48;x+=3.4)if(x<-8||x>3)add(x,z,false);
  const chunks=new Map();
  for(const p of points.values()){
    const key=`${Math.floor(p.x/16)}/${Math.floor(p.z/16)}`;
    if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(p);
    if(p.solid)colliders.push({kind:'circle',id:'viridian-tree',x:p.x,z:p.z,r:.85});
  }
  const crown=new THREE.IcosahedronGeometry(1,1),trunk=new THREE.CylinderGeometry(.14,.24,1.8,7);
  for(const [key,trees] of chunks){
    const layers=[[],[],[],[]];
    for(const {x,z} of trees){
      const s=.91+rand()*.15,rot=rand()*6.28;
      layers[0].push({position:[x,.85*s,z],scale:[s,s,s]});
      layers[1].push({position:[x,2.05*s,z],scale:[1.13*s,1.05*s,1.01*s],rotation:[0,rot,0]});
      layers[2].push({position:[x+.05,2.78*s,z],scale:[.94*s,.96*s,.88*s],rotation:[0,rot+.8,0]});
      layers[3].push({position:[x-.07,3.39*s,z],scale:[.64*s,.72*s,.62*s],rotation:[0,rot,0]});
    }
    [mats.trunk,mats.leafDark,mats.leaf,mats.leafLight].forEach((mat,i)=>root.add(instanceSet(i?crown:trunk,mat,layers[i],`viridian-trees-${key}-${i}`)));
  }
}
function fences(root,mats,colliders){
  const b=new Builder(root,mats);
  for(const [start,end,row] of CITY.fences){
    const [x,z]=tile(start,row),[xx]=tile(end,row),width=xx-x+1.8;
    for(let p=x-.9;p<=xx+.9;p+=.65){b.box(.12,.72,.14,p,.36,z,'woodLight');b.sphere(.08,p,.76,z,'trim',[1,.7,1],6);}
    b.box(width,.07,.08,(x+xx)/2,.52,z,'woodLight');b.box(width,.07,.08,(x+xx)/2,.23,z,'woodLight');
    colliders.push(boxCollider('viridian-fence',x-.95,xx+.95,z-.1,z+.1));
  }
  // The four south approach posts recall the original city entrance.
  for(const col of [13,19,22,25])for(let row=32;row<=35;row++){
    const [x,z]=tile(col,row);b.cylinder(.16,.19,.72,x,.36,z,'stone',8);b.sphere(.19,x,.75,z,'stoneLight',[1,.55,1],8);
    colliders.push({kind:'circle',id:'viridian-approach-post',x,z,r:.2});
  }
  b.finish();
}
function terrain(root,mats,colliders){
  const b=new Builder(root,mats),rand=seededRandom(771);
  const trail=mats.path.clone();trail.name='viridian-worn-path';trail.color.set('#b9be7e');
  // Merge adjacent path rectangles as one Shape union is unnecessary: same flat
  // height, non-overlapping rectangles keep the grass trail quiet at eye level.
  PATHS.forEach((p,i)=>rect(root,trail,...p,.018+i*.00004));
  // Original gym yard is a gravel clearing, framed by its north/east trees.
  rect(root,mats.dirt,24,35,2,8,.014);
  // Tall western escarpment, with the Route 22 mouth cut through at rows 16–19.
  for(const [y0,y1] of [[0,15],[20,27]]){
    const [x,z]=tile(0,y0),[,zz]=tile(0,y1),length=zz-z+2;
    // An irregular layered rock face, continuous with the high ground to the
    // west. Broad facets avoid a stack of repeated boulders or a slab edge.
    const edge=[];
    for(let i=0;i<=Math.ceil(length/1.3);i++){
      const t=i/Math.ceil(length/1.3),pz=z-1+t*length;
      edge.push({z:pz,x:-30.9+(rand()-.5)*.28,h:3.25+(rand()-.5)*.20});
    }
    const rockVertices=[],sodVertices=[];
    for(let i=0;i<edge.length-1;i++){
      const a=edge[i],c=edge[i+1];
      const av=[a.x,a.h,a.z],cv=[c.x,c.h,c.z];
      const am=[a.x+.20,1.43,a.z],cm=[c.x+.23,1.51,c.z];
      const ab=[a.x+.10,0,a.z],cb=[c.x+.15,0,c.z];
      rockVertices.push(...av,...am,...cv,...am,...cm,...cv,...am,...ab,...cm,...ab,...cb,...cm);
      sodVertices.push(-85,a.h,a.z,...av,-85,c.h,c.z,...av,...cv,-85,c.h,c.z);
    }
    for(const [verts,mat,name] of [[rockVertices,mats.stone,'cliff-face'],[sodVertices,mats.grassShade,'cliff-upland']]){
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geometry.computeVertexNormals();
      const material=mat.clone();material.side=THREE.DoubleSide;
      const mesh=new THREE.Mesh(geometry,material);mesh.name=`viridian-${name}`;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
    }
    for(const e of [edge[0],edge.at(-1)]){
      b.box(54,.2,.18,-58,e.h-.1,e.z,'grassShade');
      b.box(54,e.h,.14,-58,e.h/2,e.z,'stone');
    }
    colliders.push(boxCollider('viridian-west-cliff',-45,-30.25,z-1,zz+1));
  }
  for(const [start,end,row] of CITY.ledges){
    const [x,z]=tile(start,row),[xx]=tile(end,row),w=xx-x+2;
    colliders.push(boxCollider('viridian-ledge',x-1,xx+1,z-.4,z+.38));
  }
  buildLedges(root,mats,{runs:CITY.ledges.map(([a,b,r])=>[r,a,b]),x0:-40,z0:-161});
  // Pond surface is opaque and sits just above the shared ground plane. A low
  // cut bank hides its edge; no reflection pass or transparent water overdraw.
  const p=CITY.pond;
  const waterMat=new THREE.MeshToonMaterial({color:'#59b6b0'});waterMat.name='viridian-pond-water';
  const bank=[[-24,-113],[-23.1,-114],[-13,-114],[-12,-113.1],[-12,-107],[-13,-106],[-23,-106],[-24,-107]];
  root.add(groundPolygon(bank,waterMat,.024));
  for(let i=0;i<bank.length;i++){
    const [ax,az]=bank[i],[bx,bz]=bank[(i+1)%bank.length],len=Math.hypot(bx-ax,bz-az),angle=Math.atan2(bx-ax,bz-az);
    b.box(.21,.20,len+.08,(ax+bx)/2,.07,(az+bz)/2,'soil',[0,angle,0]);
    b.roundBox(.40,.075,len+.13,.035,(ax+bx)/2,.20,(az+bz)/2,'edge',[0,angle,0]);
  }
  for(let i=0;i<30;i++)b.box(.22+rand()*.8,.008,.025,-23.0+rand()*10,.035,-113+rand()*6,'reflection',[0,rand()*.2,0]);
  for(let i=0;i<24;i++)b.sphere(.11+rand()*.12,-24.28+rand()*.3,.10,-113+rand()*6,'stoneLight',[1,.65,.8],7);
  colliders.push(boxCollider('viridian-pond',p.minX-.3,p.maxX+.3,p.minZ-.3,p.maxZ+.3));
  b.finish();
}
function plants(root,mats){
  const rand=seededRandom(149),stems=[],leaves=[],pink=[],cream=[],centers=[];
  for(const [x0,x1,y0,y1] of CITY.flowers){
    const [left,top]=tile(x0,y0),[right,bottom]=tile(x1,y1);
    for(let x=left-.5;x<right+.6;x+=.72)for(let z=top-.5;z<bottom+.6;z+=.75){
      const xx=x+(rand()-.5)*.15,zz=z+(rand()-.5)*.15,h=.19+rand()*.16;
      stems.push({position:[xx,h/2,zz],scale:[1,h/.3,1]});
      leaves.push({position:[xx+.06,h*.48,zz],scale:[.13,.04,.07],rotation:[0,rand()*6,-.4]});
      const arr=rand()<.7?cream:pink;
      for(let j=0;j<5;j++){const a=j*Math.PI*.4;arr.push({position:[xx+Math.cos(a)*.065,h,zz+Math.sin(a)*.065],scale:[.065,.028,.052],rotation:[0,-a,0]});}
      centers.push({position:[xx,h+.02,zz],scale:[.035,.03,.035]});
    }
  }
  const petal=new THREE.IcosahedronGeometry(1,0);
  root.add(instanceSet(new THREE.CylinderGeometry(.011,.013,.3,4),mats.leafDark,stems,'viridian-flower-stems',false));
  for(const [arr,mat,name] of [[leaves,mats.leaf,'leaves'],[pink,mats.petalPink,'pink'],[cream,mats.petalCream,'cream'],[centers,mats.flowerCenter,'centers']])root.add(instanceSet(petal,mat,arr,`viridian-flowers-${name}`,false));
  const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.05,0,0,.05,0,0,.02,.22,0,0,0,-.05,0,0,.05,0,.27,.02],3));blade.computeVertexNormals();
  const tufts=[];
  const blocked=(x,z)=>CITY.buildings.some(s=>Math.abs(x-s.x)<s.width/2+1&&Math.abs(z-s.z)<s.depth/2+1)||PATHS.some(([a,b,c,d])=>{const [l,t]=tile(a,c),[r,bt]=tile(b,d);return x>l-1.2&&x<r+1.2&&z>t-1.2&&z<bt+1.2;});
  for(let i=0;i<2600;i++){
    const x=-28+rand()*59,z=-151+rand()*54;
    if(blocked(x,z)||x< -11&&z> -116&&z< -105||z< -143&&x>7)continue;
    tufts.push({position:[x,.022,z],scale:[1,.6+rand()*.6,1],rotation:[0,rand()*6.28,0]});
  }
  root.add(instanceSet(blade,mats.blade,tufts,'viridian-meadow-grass',false));
}
export function createViridianCity(scene,mats,colliders){
  const root=new THREE.Group();root.name=CITY.id;scene.add(root);
  terrain(root,mats,colliders);forest(root,mats,colliders);fences(root,mats,colliders);plants(root,mats);
  const buildings=new Map();
  for(const spec of CITY.buildings){
    const building=createViridianBuilding(spec,mats);collapseBuilding(building);root.add(building);buildings.set(spec.id,building);
    colliders.push(...exteriorDoorColliders(spec));
  }
  for(const spec of CITY.signs){
    const sign=createSign(spec,mats),[x,z]=tile(...spec.tile);sign.position.set(x,0,z+.45);root.add(sign);
    colliders.push(boxCollider(spec.id,x-spec.width/2,x+spec.width/2,z+.30,z+.60));
  }
  // Continuous Route 1 opening. North and west connections are short visible
  // route stubs, with their far ends deliberately bounded for this city pass.
  colliders.push(boxCollider('route-2-boundary',-100,100,-200,-165));
  colliders.push(boxCollider('route-22-boundary',-100,-41,-165,-90));
  colliders.push(boxCollider('viridian-east-boundary',37,100,-165,-90));
  colliders.push(boxCollider('viridian-south-west',-100,-.25,-90,-89.8));
  colliders.push(boxCollider('viridian-south-east',4.25,100,-90,-89.8));
  return {root,layout:CITY,buildings};
}
