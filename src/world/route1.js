import * as THREE from 'three';
import { Builder, instanceSet } from './geometry.js';
import { seededRandom } from './materials.js';

export const ROUTE_1 = {
  id: 'route-1',
  width: 40,
  depth: 72,
  southZ: -18,
  northZ: -90,
  sign: {x:-1,z:-35},
};

const CELL = 2;
const X0 = -19;
const Z0 = -89;
const cellPos = (c,r) => [X0 + c*CELL, Z0 + r*CELL];

const PATH_MASK = [
  '..........PP........',
  '..........PP........',
  '..........PP........',
  '..........PP........',
  '..........PPPPPPPP..',
  '..............PPPP..',
  '....................',
  '....................',
  '....................',
  '....................',
  '............PPPPPP..',
  '............PPPPPP..',
  '............PP......',
  '....................',
  '............PP......',
  '............PP......',
  '......PPPPPPPP......',
  '......PPPPPPPP......',
  '......PP............',
  '....................',
  '......PPPPPPPPPPPP..',
  '......PPPPPPPPPPPP..',
  '................PP..',
  '....................',
  '................PP..',
  '................PP..',
  '....PPPPPPPPPPPPPP..',
  '......PPP...........',
  '..........PP........',
  '..........PP........',
  '..........PP........',
  '..........PP........',
  '....................',
  '....................',
  '....................',
  '....................',
];

const GRASS_MASK = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '..........GGGGGGGG..',
  '..........GGGGGGGG..',
  '..........GGGGGGGG..',
  '..........GGGGGGGG..',
  '....................',
  '....................',
  '..............GGGG..',
  '..............GGGG..',
  '..............GGGG..',
  '..............GGGG..',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '............GGGG....',
  '............GGGG....',
  '............GGGG....',
  '............GGGG....',
  '....................',
  '....................',
  '......GGGG....GGGG..',
  '......GGGG....GGGG..',
  '....GGGG....GGGG....',
  '....GGGG....GGGG....',
  '..........GG........',
  '..........GG........',
  '..........GG........',
  '..........GG........',
];

const FLOWER_MASK = [
  '....................',
  '....................',
  '................FF..',
  '................FF..',
  '....................',
  '....................',
  '....FFFF............',
  '....FFFF............',
  '....................',
  '....................',
  '......FFFF..........',
  '......FFFF..........',
  '....................',
  '....................',
  '........FFFF........',
  '........FFFF........',
  '..............FFFF..',
  '..............FFFF..',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '........FFFF........',
  '........FFFF........',
  '....................',
  '....................',
  '....................',
  '....................',
  '........FF......FF..',
  '........FF......FF..',
  '....................',
  '....................',
  '....................',
  '....................',
];

const LEDGE_RUNS = [
  [5,4,8], [5,10,13],
  [9,4,8],
  [13,6,9],
  [19,4,17],
  [23,16,17],
  [27,4,5], [27,10,17],
];

function createRouteSign(mats) {
  const group=new THREE.Group();group.name='route-1-sign';
  const b=new Builder(group,mats),w=2.0,h=.86;
  for(const x of [-.66,.66]) {
    b.box(.10,1.42,.11,x,.71,0,'wood');
    b.box(.17,.06,.18,x,.04,0,'stoneDark');
  }
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

function addTreeCells(add) {
  for(let r=0;r<36;r++) { add(3,r); add(18,r); }

  for(let c=4;c<=9;c++) add(c,1);
  for(let c=12;c<=17;c++) add(c,1);
  add(9,0); add(12,0);

  for(let r=4;r<=9;r++) add(9,r);

  add(4,13); add(5,13);
  for(let c=10;c<=13;c++) add(c,13);

  for(let c=4;c<=11;c++) add(c,23);

  for(let c=4;c<=9;c++) add(c,32);
  for(let c=12;c<=17;c++) add(c,32);
  for(let r=33;r<=35;r++) { add(9,r); add(12,r); }
}

function treeSet(root,mats,colliders) {
  const rand=seededRandom(101),positions=[],seen=new Set();
  const add=(c,r)=>{
    const key=`${c}/${r}`;if(seen.has(key))return;seen.add(key);
    const [x,z]=cellPos(c,r);positions.push({x,z});
  };
  addTreeCells(add);

  const trunk=[],lower=[],mid=[],top=[],tuft=[],shadows=[];
  for(const p of positions){
    const s=.92+rand()*.12,yy=rand()*.10,rot=rand()*Math.PI*2;
    trunk.push({position:[p.x,.85*s,p.z],scale:[s,s,s]});
    lower.push({position:[p.x,2.05*s+yy,p.z],scale:[1.13*s,1.05*s,1.01*s],rotation:[0,rot,0]});
    mid.push({position:[p.x+.05,2.78*s+yy,p.z+.02],scale:[.94*s,.96*s,.88*s],rotation:[0,rot+.8,0]});
    top.push({position:[p.x-.07,3.39*s+yy,p.z],scale:[.64*s,.72*s,.62*s],rotation:[0,rot,0]});
    tuft.push({position:[p.x-.54*s,2.62*s+yy,p.z+.65*s],scale:[.54*s,.51*s,.51*s],rotation:[0,rot,0]});
    shadows.push({position:[p.x,.028,p.z],scale:[1.08*s,1.08*s,1],rotation:[-Math.PI/2,0,0]});
    colliders.push({kind:'circle',id:'route-1-tree',x:p.x,z:p.z,r:.90});
  }
  const crown=new THREE.IcosahedronGeometry(1,1);
  root.add(instanceSet(new THREE.CylinderGeometry(.14,.24,1.8,7),mats.trunk,trunk,'route-1-tree-trunks'));
  root.add(instanceSet(crown,mats.leafDark,lower,'route-1-tree-lower'));
  root.add(instanceSet(crown,mats.leaf,mid,'route-1-tree-middle'));
  root.add(instanceSet(crown,mats.leafLight,top,'route-1-tree-top'));
  root.add(instanceSet(crown,mats.leaf,tuft,'route-1-tree-lobes'));

  const shadowTex=document.createElement('canvas');shadowTex.width=shadowTex.height=64;
  const c=shadowTex.getContext('2d');const gr=c.createRadialGradient(32,32,4,32,32,32);
  gr.addColorStop(0,'rgba(32,56,21,.26)');gr.addColorStop(.6,'rgba(32,56,21,.10)');gr.addColorStop(1,'rgba(32,56,21,0)');
  c.fillStyle=gr;c.fillRect(0,0,64,64);
  const sm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowTex),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  root.add(instanceSet(new THREE.PlaneGeometry(2,2),sm,shadows,'route-1-tree-contact-shadows',false));
}

function buildPath(root,mats) {
  const trail=mats.path.clone();trail.name='route-1-path';trail.color.set('#b9be7e');
  const pathRoot=new THREE.Group();pathRoot.name='route-1-canonical-path';root.add(pathRoot);
  const b=new Builder(pathRoot,mats);
  for(let r=0;r<36;r++) for(let c=0;c<20;c++) if(PATH_MASK[r][c]==='P') {
    const [x,z]=cellPos(c,r);b.box(2.04,.018,2.04,x,.022,z,trail);
  }
  b.finish({shadows:false});
}

function tallGrass(root,mats) {
  const geom=new THREE.BufferGeometry(),v=[];
  for(let k=0;k<3;k++){
    const a=k*Math.PI/3,dx=Math.cos(a)*.055,dz=Math.sin(a)*.055;
    v.push(-dx,0,-dz,dx,0,dz,dx*.5,.24+(.03*k),dz*.5);
  }
  geom.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geom.computeVertexNormals();
  const rand=seededRandom(52),dark=[],light=[];
  for(let r=0;r<36;r++) for(let c=0;c<20;c++) if(GRASS_MASK[r][c]==='G') {
    const [cx,cz]=cellPos(c,r);
    for(let z=cz-.78;z<=cz+.78;z+=.43) for(let x=cx-.78;x<=cx+.78;x+=.43) {
      const target=rand()>.78?light:dark,s=.82+rand()*.55;
      target.push({position:[x+(rand()-.5)*.14,.026,z+(rand()-.5)*.14],scale:[s,s*1.45,s],rotation:[0,rand()*6.28,0]});
    }
  }
  root.add(instanceSet(geom,mats.blade,dark,'route-1-tall-grass',false));
  root.add(instanceSet(geom,mats.bladeLight,light,'route-1-sunlit-tall-grass',false));
}

function flowers(root,mats) {
  const rand=seededRandom(77),stems=[],petals=[],centres=[];
  for(let r=0;r<36;r++) for(let c=0;c<20;c++) if(FLOWER_MASK[r][c]==='F') {
    const [cx,cz]=cellPos(c,r);
    for(let i=0;i<3;i++) {
      const x=cx+(rand()-.5)*1.25,z=cz+(rand()-.5)*1.25,h=.16+rand()*.08;
      stems.push({position:[x,h/2,z],scale:[1,h/.20,1]});
      petals.push({position:[x,h+.025,z],scale:[.9+rand()*.25,.9+rand()*.25,.9+rand()*.25]});
      centres.push({position:[x,h+.04,z],scale:[1,1,1]});
    }
  }
  root.add(instanceSet(new THREE.CylinderGeometry(.012,.016,.20,5),mats.grassShade,stems,'route-1-flower-stems',false));
  root.add(instanceSet(new THREE.IcosahedronGeometry(.065,0),mats.petalCream,petals,'route-1-flower-petals',false));
  root.add(instanceSet(new THREE.IcosahedronGeometry(.025,0),mats.flowerCenter,centres,'route-1-flower-centres',false));
}

function ledges(root,mats) {
  const group=new THREE.Group();group.name='route-1-ledges';root.add(group);
  const b=new Builder(group,mats);
  for(const [r,c0,c1] of LEDGE_RUNS) {
    const width=(c1-c0+1)*2;
    const left=-20+c0*2,right=-20+(c1+1)*2,x=(left+right)/2;
    const z=Z0+r*2+.70;
    b.roundBox(width,.22,.52,.06,x,.11,z,'soil');
    b.roundBox(width+.10,.075,.62,.035,x,.255,z-.015,'edge');
    for(let dx=-width/2+.34;dx<width/2-.10;dx+=.58) b.box(.035,.13,.035,x+dx,.31,z-.02,'grassShade');
  }
  b.finish({shadows:false});
}

export function makeRoute1(scene,mats,colliders) {
  const root=new THREE.Group();root.name='route-1';scene.add(root);

  buildPath(root,mats);
  tallGrass(root,mats);
  flowers(root,mats);
  treeSet(root,mats,colliders);
  ledges(root,mats);

  const sign=createRouteSign(mats);sign.position.set(ROUTE_1.sign.x,0,ROUTE_1.sign.z);root.add(sign);
  colliders.push({kind:'box',id:'route-1-sign',minX:-2.05,maxX:.05,minZ:-35.18,maxZ:-34.82});

  colliders.push({kind:'box',id:'route-1-west-boundary',minX:-100,maxX:-14.0,minZ:-90,maxZ:-18});
  colliders.push({kind:'box',id:'route-1-east-boundary',minX:18.0,maxX:100,minZ:-90,maxZ:-18});

  return {root,layout:ROUTE_1,grass:GRASS_MASK,ledges:LEDGE_RUNS};
}
