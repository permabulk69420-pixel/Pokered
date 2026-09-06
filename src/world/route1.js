import * as THREE from 'three';
import { Builder, instanceSet } from './geometry.js';
import { seededRandom } from './materials.js';

// Generation I Route 1. The source map is 10×18 blocks = 20×36 movement
// tiles. One movement tile is two metres in this VR remaster, so Route 1 keeps
// the original 40×72 m footprint and joins Pallet Town at its north opening.
export const ROUTE_1 = {
  id: 'route-1',
  width: 40,
  depth: 72,
  southZ: -18,
  northZ: -90,
  // Original sign object at movement tile (9,27).
  sign: {x:-1,z:-35},
};

// Exact clear-path coverage recovered from the rendered Gen I Route 1 map.
// [x,z,width,depth] in metres.
const PATH_RECTS = [
  [2,-86,4,8], [8,-80.5,16,3], [12,-78.5,8,1], [10,-68,12,4],
  [4.5,-64.5,1,1], [6,-60,4,4], [0,-56,16,4], [-6,-52.5,4,3],
  [4,-48,24,4], [14,-44.5,4,3], [14,-40,4,4], [2,-37,28,2],
  [8,-35.5,16,1], [-7,-35.5,10,1], [-5,-34.5,6,1], [2,-30,4,8],
];

// Exact encounter-grass coverage from the original map.
const GRASS_RECTS = [
  [8,-74,16,8], [12,-62,8,8], [8,-42,8,8],
  [12,-32,8,4], [-4,-32,8,4], [8,-28,8,4], [-8,-28,8,4],
  [2,-22,4,8],
];

// Thirteen individual ledge segments. Several sit side-by-side, which is why
// the original route reads visually as fewer long ledge rows.
const LEDGES = [
  [13.5,-85.5], [-10.5,-77.5], [-6.5,-77.5], [-6.5,-69.5],
  [-2.5,-69.5], [-2.5,-61.5], [1.5,-61.5], [9.5,-57.5],
  [13.5,-57.5], [-2.5,-41.5], [1.5,-41.5], [-2.5,-29.5],
  [13.5,-29.5],
];

// Canonical forest/obstacle silhouette traced from the full rendered R/B/Y map,
// not inferred from isolated tree sprites. Each character is one original
// movement tile (2 m here), north at row 0 and south at row 35. This preserves
// the characteristic horizontal forest bands and S-shaped Route 1 corridors.
const TREE_MASK = [
  '..##....##..##....##',
  '..########..########',
  '..##..............##',
  '..##............####',
  '..##....##........##',
  '..############....##',
  '..##....##........##',
  '..########........##',
  '..##....##........##',
  '..########........##',
  '..##..............##',
  '..##..####........##',
  '..####....####....##',
  '..############....##',
  '..##..............##',
  '..##....####......##',
  '..##..............##',
  '..##..........######',
  '..##..............##',
  '..##################',
  '..##..............##',
  '..##..............##',
  '..##########......##',
  '..##########....####',
  '..##..............##',
  '..##....####......##',
  '..##..............##',
  '..####....##########',
  '..##..............##',
  '..##..............##',
  '..##..............##',
  '..##....##......####',
  '..########..########',
  '..########..########',
  '..##....##..##....##',
  '..##....##..##....##',
];

function createRouteSign(mats) {
  const group=new THREE.Group();group.name='route-1-sign';
  const b=new Builder(group,mats),w=2.0,h=.86;
  for(const x of [-.66,.66]) {b.box(.10,1.42,.11,x,.71,0,'wood');b.box(.17,.06,.18,x,.04,0,'stoneDark');}
  b.roundBox(w+.14,h+.14,.18,.04,0,1.36,0,'woodDark');
  b.box(w,h,.09,0,1.36,.08,'trim');
  b.box(w+.24,.055,.25,0,1.36+h/2+.09,0,'woodLight');
  b.finish();
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const c=canvas.getContext('2d');c.fillStyle='#fff5d8';c.fillRect(0,0,1024,512);
  c.strokeStyle='#b9ad87';c.lineWidth=3;c.strokeRect(25,25,974,462);
  c.textAlign='center';c.textBaseline='middle';c.fillStyle='#30574d';
  c.font='700 82px sans-serif';c.fillText('ROUTE 1',512,135,900);
  c.fillStyle='#71836a';c.fillRect(325,215,374,3);c.fillStyle='#64725a';c.font='42px sans-serif';
  c.fillText('PALLET TOWN  –',512,293,920);c.fillText('VIRIDIAN CITY',512,365,920);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(w-.08,h-.035),new THREE.MeshBasicMaterial({map:tex}));
  label.position.set(0,1.36,.133);label.name='route-1-sign-lettering';group.add(label);
  return group;
}

function treeSet(root,mats,colliders) {
  const rand=seededRandom(101),positions=[],seen=new Set();
  const add=(x,z,collide=true)=>{
    const key=`${Math.round(x*10)}/${Math.round(z*10)}`;
    if(seen.has(key))return;
    seen.add(key);positions.push({x,z,collide});
  };

  // Convert the exact 20×36 forest silhouette into the same rounded tree style
  // already used around Pallet Town. Tile centres are 2 m apart.
  for(let row=0;row<TREE_MASK.length;row++) {
    const line=TREE_MASK[row];
    for(let col=0;col<line.length;col++) if(line[col]==='#') {
      const x=(col-9.5)*2;
      const z=-89+row*2;
      add(x,z,true);
    }
  }

  // Two non-colliding outer rows add forest depth without changing the route.
  for(let z=-91;z<=-18;z+=3.2) {
    add(-22.2+(rand()-.5)*.45,z+(rand()-.5)*.45,false);
    add(22.2+(rand()-.5)*.45,z+(rand()-.5)*.45,false);
  }
  for(let x=-18;x<=18;x+=3.1) if(x<-.2||x>4.2)
    add(x+(rand()-.5)*.35,-93+(rand()-.5)*.35,false);

  const trunk=[],lower=[],mid=[],top=[],tuft=[],shadows=[];
  for(const p of positions){
    const s=.92+rand()*.14,yy=rand()*.12,rot=rand()*Math.PI*2;
    trunk.push({position:[p.x,.85*s,p.z],scale:[s,s,s]});
    lower.push({position:[p.x,2.05*s+yy,p.z],scale:[1.13*s,1.05*s,1.01*s],rotation:[0,rot,0]});
    mid.push({position:[p.x+.05,2.78*s+yy,p.z+.02],scale:[.94*s,.96*s,.88*s],rotation:[0,rot+.8,0]});
    top.push({position:[p.x-.07,3.39*s+yy,p.z],scale:[.64*s,.72*s,.62*s],rotation:[0,rot,0]});
    tuft.push({position:[p.x-.54*s,2.62*s+yy,p.z+.65*s],scale:[.54*s,.51*s,.51*s],rotation:[0,rot,0]});
    if(p.collide)colliders.push({kind:'circle',id:'route-1-tree',x:p.x,z:p.z,r:.78});
    shadows.push({position:[p.x,.028,p.z],scale:[1.08*s,1.08*s,1],rotation:[-Math.PI/2,0,0]});
  }
  const crown=new THREE.IcosahedronGeometry(1,1);
  root.add(instanceSet(new THREE.CylinderGeometry(.14,.24,1.8,7),mats.trunk,trunk,'route-1-tree-trunks'));
  root.add(instanceSet(crown,mats.leafDark,lower,'route-1-tree-lower'));
  root.add(instanceSet(crown,mats.leaf,mid,'route-1-tree-middle'));
  root.add(instanceSet(crown,mats.leafLight,top,'route-1-tree-top'));
  root.add(instanceSet(crown,mats.leaf,tuft,'route-1-tree-lobes'));

  // Same cheap contact-shadow treatment as Pallet so the denser forest walls
  // still sit naturally on the meadow instead of looking like floating props.
  const shadowTex=document.createElement('canvas');shadowTex.width=shadowTex.height=64;
  const c=shadowTex.getContext('2d');const gr=c.createRadialGradient(32,32,4,32,32,32);
  gr.addColorStop(0,'rgba(32,56,21,.26)');gr.addColorStop(.6,'rgba(32,56,21,.10)');gr.addColorStop(1,'rgba(32,56,21,0)');
  c.fillStyle=gr;c.fillRect(0,0,64,64);
  const sm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowTex),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  root.add(instanceSet(new THREE.PlaneGeometry(2,2),sm,shadows,'route-1-tree-contact-shadows',false));
}

function tallGrass(root,mats) {
  const geom=new THREE.BufferGeometry(),v=[];
  for(let k=0;k<3;k++){
    const a=k*Math.PI/3,dx=Math.cos(a)*.055,dz=Math.sin(a)*.055;
    v.push(-dx,0,-dz,dx,0,dz,dx*.5,.24+(.03*k),dz*.5);
  }
  geom.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geom.computeVertexNormals();
  const rand=seededRandom(52),dark=[],light=[];
  for(const [cx,cz,w,d] of GRASS_RECTS){
    const minX=cx-w/2,minZ=cz-d/2;
    for(let z=minZ+.22;z<minZ+d-.08;z+=.46)for(let x=minX+.22;x<minX+w-.08;x+=.46){
      const target=rand()>.78?light:dark,s=.82+rand()*.55;
      target.push({position:[x+(rand()-.5)*.16,.026,z+(rand()-.5)*.16],scale:[s,s*1.45,s],rotation:[0,rand()*6.28,0]});
    }
  }
  root.add(instanceSet(geom,mats.blade,dark,'route-1-tall-grass',false));
  root.add(instanceSet(geom,mats.bladeLight,light,'route-1-sunlit-tall-grass',false));
}

export function makeRoute1(scene,mats,colliders) {
  const root=new THREE.Group();root.name='route-1';scene.add(root);

  // Lay the original clear route footprint over the continuous Pallet meadow.
  const trail=mats.path.clone();trail.name='route-1-path';trail.color.set('#b9be7e');
  const pathRoot=new THREE.Group();pathRoot.name='route-1-original-path';root.add(pathRoot);
  const pb=new Builder(pathRoot,mats);
  for(const [x,z,w,d] of PATH_RECTS)pb.box(w,.018,d,x,.022,z,trail);
  pb.finish({shadows:false});

  tallGrass(root,mats);
  treeSet(root,mats,colliders);

  const ledges=new THREE.Group();ledges.name='route-1-ledges';root.add(ledges);const lb=new Builder(ledges,mats);
  for(const [x,z] of LEDGES){
    lb.roundBox(3.05,.22,.46,.05,x,.11,z,'soil');
    lb.roundBox(3.18,.075,.56,.035,x,.255,z-.015,'edge');
    for(const dx of [-1.18,-.58,0,.58,1.18])lb.box(.035,.13,.035,x+dx,.31,z-.02,'grassShade');
  }
  lb.finish({shadows:false});

  const sign=createRouteSign(mats);sign.position.set(ROUTE_1.sign.x,0,ROUTE_1.sign.z);root.add(sign);
  colliders.push({kind:'box',id:'route-1-sign',minX:-2.05,maxX:.05,minZ:-35.18,maxZ:-34.82});

  // Hard outer bounds only. Internal route shape is now defined by the exact
  // forest-mask tree colliders rather than guessed invisible walls.
  colliders.push({kind:'box',id:'route-1-west-boundary',minX:-100,maxX:-19.65,minZ:-94,maxZ:-17.15});
  colliders.push({kind:'box',id:'route-1-east-boundary',minX:19.65,maxX:100,minZ:-94,maxZ:-17.15});
  colliders.push({kind:'box',id:'route-1-viridian-limit',minX:-20,maxX:20,minZ:-100,maxZ:-91.6});

  return {root,layout:ROUTE_1,grass:GRASS_RECTS,ledges:LEDGES};
}
