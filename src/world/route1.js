import * as THREE from 'three';
import { Builder, instanceSet } from './geometry.js';
import { seededRandom } from './materials.js';

export const ROUTE_1 = {
  id: 'route-1', width: 40, depth: 72, southZ: -18, northZ: -90,
  sign: {x:-1,z:-35},
};

const CELL=2, X0=-19, Z0=-89;
const cellPos=(c,r)=>[X0+c*CELL,Z0+r*CELL];

const PATH_MASK=[
  '..........PP........','..........PP........','..........PP........','..........PP........',
  '..........PPPPPPPP..','..............PPPP..','....................','....................',
  '....................','....................','............PPPPPP..','............PPPPPP..',
  '............PP......','....................','............PP......','............PP......',
  '......PPPPPPPP......','......PPPPPPPP......','......PP............','....................',
  '......PPPPPPPPPPPP..','......PPPPPPPPPPPP..','................PP..','....................',
  '................PP..','................PP..','....PPPPPPPPPPPPPP..','......PPP...........',
  '.........PP.........','.........PP.........','.........PP.........','.........PP.........',
  '.........PP.........','.........PP.........','.........PP.........','.........PP.........',
];

const GRASS_MASK=[
  '....................','....................','....................','....................',
  '....................','....................','..........GGGGGGGG..','..........GGGGGGGG..',
  '..........GGGGGGGG..','..........GGGGGGGG..','....................','....................',
  '..............GGGG..','..............GGGG..','..............GGGG..','..............GGGG..',
  '....................','....................','....................','....................',
  '....................','....................','............GGGG....','............GGGG....',
  '............GGGG....','............GGGG....','....................','....................',
  '......GGGG....GGGG..','......GGGG....GGGG..','....GGGG....GGGG....','....GGGG....GGGG....',
  '....................','....................','....................','....................',
];

const FLOWER_MASK=[
  '....................','....................','................FF..','................FF..',
  '....................','....................','....FFFF............','....FFFF............',
  '....................','....................','......FFFF..........','......FFFF..........',
  '....................','....................','........FFFF........','........FFFF........',
  '..............FFFF..','..............FFFF..','....................','....................',
  '....................','....................','....................','....................',
  '........FFFF........','........FFFF........','....................','....................',
  '....................','....................','........FF......FF..','........FF......FF..',
  '....................','....................','....................','....................',
];

const LEDGE_RUNS=[
  [5,4,8],[5,10,13],
  [9,4,8],
  [13,6,9],
  [19,4,4],[19,6,8],[19,10,17],
  [23,16,17],
  [27,4,5],[27,10,17],
];

function createRouteSign(mats){
  const group=new THREE.Group();group.name='route-1-sign';
  const b=new Builder(group,mats),w=2,h=.86;
  for(const x of [-.66,.66]){b.box(.10,1.42,.11,x,.71,0,'wood');b.box(.17,.06,.18,x,.04,0,'stoneDark');}
  b.roundBox(w+.14,h+.14,.18,.04,0,1.36,0,'woodDark');
  b.box(w,h,.09,0,1.36,.08,'trim');b.box(w+.24,.055,.25,0,1.36+h/2+.09,0,'woodLight');b.finish();
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const c=canvas.getContext('2d');c.fillStyle='#fff5d8';c.fillRect(0,0,1024,512);c.strokeStyle='#b9ad87';c.lineWidth=3;c.strokeRect(25,25,974,462);
  c.textAlign='center';c.textBaseline='middle';c.fillStyle='#30574d';c.font='700 82px sans-serif';c.fillText('ROUTE 1',512,135,900);
  c.fillStyle='#71836a';c.fillRect(325,215,374,3);c.fillStyle='#64725a';c.font='42px sans-serif';c.fillText('PALLET TOWN  –',512,293,920);c.fillText('VIRIDIAN CITY',512,365,920);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(w-.08,h-.035),new THREE.MeshBasicMaterial({map:tex}));label.position.set(0,1.36,.133);label.name='route-1-sign-lettering';group.add(label);
  return group;
}

function addTreeCells(add){
  for(let r=0;r<36;r++){add(3,r);add(18,r);}
  for(let c=4;c<=9;c++)add(c,1);for(let c=12;c<=17;c++)add(c,1);add(9,0);add(12,0);
  for(let r=4;r<=9;r++)add(9,r);
  add(4,13);add(5,13);for(let c=10;c<=13;c++)add(c,13);
  for(let c=4;c<=11;c++)add(c,23);
  for(let c=4;c<=8;c++)add(c,32);
  for(let c=11;c<=17;c++)add(c,32);
  for(let r=33;r<=35;r++){add(8,r);add(11,r);}
}

function treeSet(root,mats,colliders){
  const rand=seededRandom(101),positions=[],seen=new Set();
  const add=(c,r)=>{const key=`${c}/${r}`;if(seen.has(key))return;seen.add(key);const [x,z]=cellPos(c,r);positions.push({x,z});};
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
  gr.addColorStop(0,'rgba(32,56,21,.26)');gr.addColorStop(.6,'rgba(32,56,21,.10)');gr.addColorStop(1,'rgba(32,56,21,0)');c.fillStyle=gr;c.fillRect(0,0,64,64);
  const sm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowTex),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  root.add(instanceSet(new THREE.PlaneGeometry(2,2),sm,shadows,'route-1-tree-contact-shadows',false));
}

function buildPath(root,mats){
  const trail=mats.path.clone();trail.name='route-1-path';trail.color.set('#b9be7e');
  const pathRoot=new THREE.Group();pathRoot.name='route-1-canonical-path';root.add(pathRoot);
  const b=new Builder(pathRoot,mats);
  for(let r=0;r<36;r++)for(let c=0;c<20;c++)if(PATH_MASK[r][c]==='P'){
    const [x,z]=cellPos(c,r);b.box(2.04,.018,2.04,x,.022,z,trail);
  }
  b.finish({shadows:false});
}

function makeGrassClumpGeometry(seed,bladeCount=12){
  const rand=seededRandom(seed),positions=[],colors=[],indices=[];
  const rootColor=new THREE.Color('#376f38'),midColor=new THREE.Color('#639f46'),tipColor=new THREE.Color('#9bcb62');
  const segments=6;
  for(let blade=0;blade<bladeCount;blade++){
    const yaw=rand()*Math.PI*2,forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),side=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
    const radius=Math.sqrt(rand())*.23,rootYaw=rand()*Math.PI*2,rootX=Math.cos(rootYaw)*radius,rootZ=Math.sin(rootYaw)*radius;
    const height=.62+rand()*.58,baseWidth=.075+rand()*.065,lean=.10+rand()*.28,curl=(rand()-.5)*.15,bladeTone=(rand()-.5)*.10,start=positions.length/3;
    for(let i=0;i<=segments;i++){
      const t=i/segments,curve=t*t,sideways=Math.sin(t*Math.PI)*curl,cx=rootX+forward.x*lean*curve+side.x*sideways,cz=rootZ+forward.z*lean*curve+side.z*sideways,cy=height*t,halfWidth=baseWidth*.5*Math.pow(1-t,.72)+.003;
      positions.push(cx-side.x*halfWidth,cy,cz-side.z*halfWidth,cx+side.x*halfWidth,cy,cz+side.z*halfWidth);
      const col=new THREE.Color();if(t<.52)col.copy(rootColor).lerp(midColor,t/.52);else col.copy(midColor).lerp(tipColor,(t-.52)/.48);col.offsetHSL(bladeTone*.08,0,bladeTone);colors.push(col.r,col.g,col.b,col.r,col.g,col.b);
    }
    for(let i=0;i<segments;i++){const a=start+i*2,b=a+2;indices.push(a,b,a+1,a+1,b,b+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}

function makeGrassMaterial(mats){
  const material=mats.blade.clone();material.name='route-1-curved-grass';material.color.set('#ffffff');material.vertexColors=true;material.side=THREE.DoubleSide;
  material.onBeforeCompile=(shader)=>{
    shader.uniforms.uGrassTime={value:0};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uGrassTime;').replace('#include <begin_vertex>',`#include <begin_vertex>
      float grassT=clamp(position.y/1.18,0.0,1.0);vec2 grassOrigin=vec2(0.0);
      #ifdef USE_INSTANCING
        grassOrigin=instanceMatrix[3].xz;
      #endif
      float broad=sin(grassOrigin.x*.18+grassOrigin.y*.13+uGrassTime*1.15);float gust=sin(grassOrigin.x*.47-grassOrigin.y*.31+uGrassTime*1.85)*.42;float flutter=sin(grassOrigin.x*1.7+grassOrigin.y*1.2+uGrassTime*3.8+position.y*5.0)*.11;float wind=(broad+gust+flutter)*grassT*grassT;transformed.x+=wind*.105;transformed.z+=wind*.16;
    `);material.userData.shader=shader;
  };
  material.customProgramCacheKey=()=> 'route-1-curved-grass-v2';return material;
}

function tallGrass(root,mats){
  const grassRoot=new THREE.Group();grassRoot.name='route-1-premium-tall-grass';root.add(grassRoot);
  const material=makeGrassMaterial(mats),variants=[makeGrassClumpGeometry(3401,11),makeGrassClumpGeometry(3402,13),makeGrassClumpGeometry(3403,12)],transforms=[[],[],[]],rand=seededRandom(52),tints=['#f2fff0','#e9f7df','#fff7d7','#e0f1d7'];
  for(let r=0;r<36;r++)for(let c=0;c<20;c++)if(GRASS_MASK[r][c]==='G'){
    const [cx,cz]=cellPos(c,r);for(let gz=0;gz<5;gz++)for(let gx=0;gx<5;gx++){
      const x=cx-.76+gx*.38+(rand()-.5)*.18,z=cz-.76+gz*.38+(rand()-.5)*.18,variant=Math.floor(rand()*variants.length),heightScale=.82+rand()*.42,widthScale=.88+rand()*.28;
      transforms[variant].push({position:[x,.025,z],rotation:[(rand()-.5)*.055,rand()*Math.PI*2,(rand()-.5)*.055],scale:[widthScale,heightScale,widthScale],color:tints[Math.floor(rand()*tints.length)]});
    }
  }
  variants.forEach((geometry,i)=>{const mesh=instanceSet(geometry,material,transforms[i],`route-1-curved-grass-${i}`,false);if(mesh.boundingSphere)mesh.boundingSphere.radius+=1.6;mesh.onBeforeRender=()=>{const shader=material.userData.shader;if(shader)shader.uniforms.uGrassTime.value=performance.now()*.001;};grassRoot.add(mesh);});
}

function flowers(root,mats){
  const rand=seededRandom(77),stems=[],petals=[],centres=[];
  for(let r=0;r<36;r++)for(let c=0;c<20;c++)if(FLOWER_MASK[r][c]==='F'){
    const [cx,cz]=cellPos(c,r);for(let i=0;i<3;i++){const x=cx+(rand()-.5)*1.25,z=cz+(rand()-.5)*1.25,h=.16+rand()*.08;stems.push({position:[x,h/2,z],scale:[1,h/.20,1]});petals.push({position:[x,h+.025,z],scale:[.9+rand()*.25,.9+rand()*.25,.9+rand()*.25]});centres.push({position:[x,h+.04,z],scale:[1,1,1]});}
  }
  root.add(instanceSet(new THREE.CylinderGeometry(.012,.016,.20,5),mats.grassShade,stems,'route-1-flower-stems',false));root.add(instanceSet(new THREE.IcosahedronGeometry(.065,0),mats.petalCream,petals,'route-1-flower-petals',false));root.add(instanceSet(new THREE.IcosahedronGeometry(.025,0),mats.flowerCenter,centres,'route-1-flower-centres',false));
}

function colorTriangles(geometry,palette,seed){
  const rand=seededRandom(seed),count=geometry.getAttribute('position').count,colors=[];
  for(let i=0;i<count;i+=3){const col=new THREE.Color(palette[Math.floor(rand()*palette.length)]);for(let v=0;v<3;v++)colors.push(col.r,col.g,col.b);}
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
}

function makeAnimeLedgeGeometry(width,seed){
  const rand=seededRandom(seed),steps=Math.max(6,Math.ceil(width/.46));
  const earthPos=[],earthIdx=[],grassPos=[],grassIdx=[];

  for(let i=0;i<=steps;i++){
    const t=i/steps,x=-width/2+t*width,ease=Math.sin(Math.PI*t);
    const h=.40+Math.sin(t*Math.PI*2+seed*.013)*.035+(rand()-.5)*.034*ease;
    const ridgeZ=.005+(rand()-.5)*.038*ease,lipZ=ridgeZ+.045;
    const midZ=.15+(rand()-.5)*.05*ease,toeZ=.355+(rand()-.5)*.03*ease,midY=h*(.46+(rand()-.5)*.12);
    const rearZ=-.39+(rand()-.5)*.022*ease,shoulderZ=-.225+(rand()-.5)*.022*ease,crownZ=-.078+(rand()-.5)*.02*ease;

    // Dirt begins below the sod edge, so there is no separate grass pad.
    earthPos.push(x,h-.075,lipZ, x,midY,midZ, x,.018,toeZ);
    // One continuous grassy terrain surface, finishing in a narrow front-facing sod edge.
    grassPos.push(
      x,.022,rearZ,
      x,h*.56,shoulderZ,
      x,h*.91,crownZ,
      x,h+.012,ridgeZ,
      x,h-.075,lipZ,
    );
  }

  for(let i=0;i<steps;i++){
    const a=i*3,b=(i+1)*3;
    if(i%2===0)earthIdx.push(a,a+1,b, a+1,b+1,b, a+1,a+2,b+1, a+2,b+2,b+1);
    else earthIdx.push(a,b+1,b, a,a+1,b+1, a+1,b+2,b+1, a+1,a+2,b+2);
  }
  earthIdx.push(0,1,2);const ee=steps*3;earthIdx.push(ee,ee+2,ee+1);

  for(let i=0;i<steps;i++){
    const a=i*5,b=(i+1)*5;
    for(let p=0;p<4;p++)grassIdx.push(a+p,a+p+1,b+p, a+p+1,b+p+1,b+p);
  }

  let earth=new THREE.BufferGeometry();earth.setAttribute('position',new THREE.Float32BufferAttribute(earthPos,3));earth.setIndex(earthIdx);earth=earth.toNonIndexed();earth.computeVertexNormals();
  colorTriangles(earth,['#b88961','#bc8e64','#b3835c','#c09268','#b6875f'],seed+901);
  let grass=new THREE.BufferGeometry();grass.setAttribute('position',new THREE.Float32BufferAttribute(grassPos,3));grass.setIndex(grassIdx);grass=grass.toNonIndexed();grass.computeVertexNormals();
  return {earth,grass};
}

function ledges(root,mats){
  const group=new THREE.Group();group.name='route-1-ledges';root.add(group);
  const earth=mats.dirt.clone();earth.name='route-1-ledge-earth';earth.color.set('#ffffff');earth.vertexColors=true;
  const turf=mats.grass.clone();turf.name='route-1-ledge-grass';turf.color.set('#82b953');

  LEDGE_RUNS.forEach(([r,c0,c1],index)=>{
    const width=(c1-c0+1)*2,left=-20+c0*2,right=-20+(c1+1)*2,x=(left+right)/2,z=Z0+r*2+.10;
    const geo=makeAnimeLedgeGeometry(width,7600+r*43+c0*29+index);
    const earthMesh=new THREE.Mesh(geo.earth,earth);earthMesh.name='route-1-anime-ledge-earth';earthMesh.position.set(x,0,z);earthMesh.castShadow=true;earthMesh.receiveShadow=true;group.add(earthMesh);
    const grassMesh=new THREE.Mesh(geo.grass,turf);grassMesh.name='route-1-anime-ledge-grass';grassMesh.position.set(x,0,z);grassMesh.receiveShadow=true;group.add(grassMesh);
  });
}

export function makeRoute1(scene,mats,colliders){
  const root=new THREE.Group();root.name='route-1';scene.add(root);
  if(scene.fog?.isFog){scene.fog.near=95;scene.fog.far=240;}
  buildPath(root,mats);tallGrass(root,mats);flowers(root,mats);treeSet(root,mats,colliders);ledges(root,mats);
  const sign=createRouteSign(mats);sign.position.set(ROUTE_1.sign.x,0,ROUTE_1.sign.z);root.add(sign);
  colliders.push({kind:'box',id:'route-1-sign',minX:-2.05,maxX:.05,minZ:-35.18,maxZ:-34.82});
  colliders.push({kind:'box',id:'route-1-west-boundary',minX:-100,maxX:-14.0,minZ:-90,maxZ:-18});
  colliders.push({kind:'box',id:'route-1-east-boundary',minX:18.0,maxX:100,minZ:-90,maxZ:-18});
  return {root,layout:ROUTE_1,grass:GRASS_MASK,ledges:LEDGE_RUNS};
}