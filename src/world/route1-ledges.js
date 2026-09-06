import * as THREE from 'three';
import { instanceSet } from './geometry.js';
import { seededRandom } from './materials.js';

const Z0=-89;
const LEDGE_RUNS=[
  [5,4,8],[5,10,13],
  [9,4,8],
  [13,6,9],
  [19,4,4],[19,6,8],[19,10,17],
  [23,16,17],
  [27,4,5],[27,10,17],
];

function disposeTree(root){
  root.traverse(obj=>{
    if(obj.geometry?.dispose)obj.geometry.dispose();
    if(obj.material){
      const materials=Array.isArray(obj.material)?obj.material:[obj.material];
      for(const m of materials){
        if(m.map?.userData?.route1LedgeTexture)m.map.dispose();
        if(m.userData?.route1LedgeMaterial)m.dispose();
      }
    }
  });
  root.removeFromParent();
}

function makeEarthTexture(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#b77f55';ctx.fillRect(0,0,512,256);
  const rand=seededRandom(2718);

  // Soft layered soil bands keep the face readable from several metres away.
  for(let y=18;y<250;y+=24){
    ctx.beginPath();ctx.moveTo(0,y+(rand()-.5)*8);
    for(let x=0;x<=512;x+=32)ctx.lineTo(x,y+(rand()-.5)*10);
    ctx.strokeStyle=rand()>.5?'rgba(105,65,42,.18)':'rgba(244,193,132,.13)';
    ctx.lineWidth=3+rand()*4;ctx.stroke();
  }

  // Fine mottling gives the bank surface texture without turning it into rocks.
  for(let i=0;i<1450;i++){
    const x=rand()*512,y=rand()*256,r=.5+rand()*2.2;
    ctx.fillStyle=rand()>.52?`rgba(83,55,38,${.035+rand()*.08})`:`rgba(244,207,158,${.03+rand()*.07})`;
    ctx.beginPath();ctx.ellipse(x,y,r*1.8,r,rand()*Math.PI,0,Math.PI*2);ctx.fill();
  }

  // Occasional short root traces add scale while staying subtle.
  ctx.lineCap='round';
  for(let i=0;i<34;i++){
    const x=rand()*512,y=rand()*130+18,len=12+rand()*28;
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+(rand()-.5)*12,y+len*.45,x+(rand()-.5)*18,y+len);
    ctx.strokeStyle=`rgba(90,61,37,${.10+rand()*.10})`;ctx.lineWidth=.8+rand()*1.5;ctx.stroke();
  }

  const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(1,1);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;tex.userData.route1LedgeTexture=true;
  return tex;
}

function makeTurfTexture(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#82b955';ctx.fillRect(0,0,256,256);
  const rand=seededRandom(31415);
  for(let i=0;i<900;i++){
    const x=rand()*256,y=rand()*256;
    ctx.fillStyle=rand()>.5?`rgba(52,112,55,${.035+rand()*.10})`:`rgba(190,220,110,${.035+rand()*.10})`;
    ctx.beginPath();ctx.ellipse(x,y,.45+rand()*1.4,.9+rand()*2.5,rand()*Math.PI,0,Math.PI*2);ctx.fill();
  }
  for(let i=0;i<140;i++){
    const x=rand()*256,y=rand()*256,h=3+rand()*8;
    ctx.strokeStyle=`rgba(48,103,50,${.08+rand()*.12})`;ctx.lineWidth=.7+rand();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rand()-.5)*2,y-h);ctx.stroke();
  }
  const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(1,1);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;tex.userData.route1LedgeTexture=true;
  return tex;
}

function pushTri(target,uvs,a,b,c,ua,ub,uc){
  target.push(...a,...b,...c);uvs.push(...ua,...ub,...uc);
}

function makeBankGeometry(width,seed){
  const rand=seededRandom(seed),steps=Math.max(8,Math.ceil(width/.48));
  const rows=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps,x=-width/2+t*width,ease=Math.sin(Math.PI*t);
    const wave=Math.sin(t*Math.PI*3+seed*.019)*.027;
    const h=.53+wave+(rand()-.5)*.035*ease;
    rows.push([
      [x,.018,-.48+(rand()-.5)*.025*ease],
      [x,h*.34,-.30+(rand()-.5)*.025*ease],
      [x,h*.83,-.16+(rand()-.5)*.022*ease],
      [x,h+.018,-.045+(rand()-.5)*.020*ease],
      [x,h*.95,.075+(rand()-.5)*.022*ease],
      [x,h*.58,.20+(rand()-.5)*.032*ease],
      [x,h*.22,.30+(rand()-.5)*.035*ease],
      [x,.018,.39+(rand()-.5)*.025*ease],
    ]);
  }

  const earthPos=[],earthUv=[],grassPos=[],grassUv=[];
  const earthSegments=[4,5,6];
  const grassSegments=[0,1,2,3];

  for(let i=0;i<steps;i++){
    const a=rows[i],b=rows[i+1],u0=(i/steps)*width/1.35,u1=((i+1)/steps)*width/1.35;
    for(const s of grassSegments){
      const p0=a[s],p1=a[s+1],p2=b[s],p3=b[s+1];
      const v0=s/4,v1=(s+1)/4;
      if((i+s)%2===0){
        pushTri(grassPos,grassUv,p0,p1,p2,[u0,v0],[u0,v1],[u1,v0]);
        pushTri(grassPos,grassUv,p1,p3,p2,[u0,v1],[u1,v1],[u1,v0]);
      }else{
        pushTri(grassPos,grassUv,p0,p1,p3,[u0,v0],[u0,v1],[u1,v1]);
        pushTri(grassPos,grassUv,p0,p3,p2,[u0,v0],[u1,v1],[u1,v0]);
      }
    }
    for(const s of earthSegments){
      const p0=a[s],p1=a[s+1],p2=b[s],p3=b[s+1];
      const v0=(s-4)/3,v1=(s-3)/3;
      if((i+s)%2===0){
        pushTri(earthPos,earthUv,p0,p1,p2,[u0,v0],[u0,v1],[u1,v0]);
        pushTri(earthPos,earthUv,p1,p3,p2,[u0,v1],[u1,v1],[u1,v0]);
      }else{
        pushTri(earthPos,earthUv,p0,p1,p3,[u0,v0],[u0,v1],[u1,v1]);
        pushTri(earthPos,earthUv,p0,p3,p2,[u0,v0],[u1,v1],[u1,v0]);
      }
    }
  }

  // Close each end so short ledges do not look hollow from the side.
  for(const row of [rows[0],rows[rows.length-1]]){
    const flip=row===rows[0];
    const center=[row[0][0],.18,0];
    for(let s=0;s<7;s++){
      const a=row[s],b=row[s+1];
      if(s<=3){
        if(flip)pushTri(grassPos,grassUv,center,b,a,[.5,.5],[1,s/7],[0,(s+1)/7]);
        else pushTri(grassPos,grassUv,center,a,b,[.5,.5],[0,s/7],[1,(s+1)/7]);
      }else{
        if(flip)pushTri(earthPos,earthUv,center,b,a,[.5,.5],[1,s/7],[0,(s+1)/7]);
        else pushTri(earthPos,earthUv,center,a,b,[.5,.5],[0,s/7],[1,(s+1)/7]);
      }
    }
  }

  const earth=new THREE.BufferGeometry();earth.setAttribute('position',new THREE.Float32BufferAttribute(earthPos,3));earth.setAttribute('uv',new THREE.Float32BufferAttribute(earthUv,2));earth.computeVertexNormals();
  const grass=new THREE.BufferGeometry();grass.setAttribute('position',new THREE.Float32BufferAttribute(grassPos,3));grass.setAttribute('uv',new THREE.Float32BufferAttribute(grassUv,2));grass.computeVertexNormals();
  return {earth,grass,rows};
}

function makeFringeGeometry(seed){
  const rand=seededRandom(seed),positions=[],indices=[];let base=0;
  for(let blade=0;blade<7;blade++){
    const x=(rand()-.5)*.34,z=(rand()-.5)*.10,h=.10+rand()*.16,w=.018+rand()*.018,lean=(rand()-.5)*.07;
    const pts=[[x-w,0,z],[x+w,0,z],[x-w*.7,h*.48,z+lean*.4],[x+w*.7,h*.48,z+lean*.4],[x,h,z+lean]];
    positions.push(...pts.flat());indices.push(base,base+1,base+2,base+1,base+3,base+2,base+2,base+3,base+4);base+=5;
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

function buildLedges(root,mats){
  const group=new THREE.Group();group.name='route-1-ledges';root.add(group);
  const earthTex=makeEarthTexture(),turfTex=makeTurfTexture();
  const earth=mats.dirt.clone();earth.name='route-1-ledge-earth-finished';earth.map=earthTex;earth.color.set('#ffffff');earth.flatShading=true;earth.userData.route1LedgeMaterial=true;earth.needsUpdate=true;
  const turf=mats.grass.clone();turf.name='route-1-ledge-turf-finished';turf.map=turfTex;turf.color.set('#ffffff');turf.flatShading=true;turf.userData.route1LedgeMaterial=true;turf.needsUpdate=true;
  const fringeMat=mats.blade.clone();fringeMat.name='route-1-ledge-fringe';fringeMat.color.set('#6fa849');fringeMat.side=THREE.DoubleSide;fringeMat.userData.route1LedgeMaterial=true;
  const fringeGeos=[makeFringeGeometry(811),makeFringeGeometry(812),makeFringeGeometry(813)];

  LEDGE_RUNS.forEach(([r,c0,c1],index)=>{
    const width=(c1-c0+1)*2,left=-20+c0*2,right=-20+(c1+1)*2,x=(left+right)/2,z=Z0+r*2+.10;
    const seed=9300+r*47+c0*31+index,geo=makeBankGeometry(width,seed);
    const earthMesh=new THREE.Mesh(geo.earth,earth);earthMesh.name='route-1-finished-ledge-earth';earthMesh.position.set(x,0,z);earthMesh.castShadow=true;earthMesh.receiveShadow=true;group.add(earthMesh);
    const turfMesh=new THREE.Mesh(geo.grass,turf);turfMesh.name='route-1-finished-ledge-turf';turfMesh.position.set(x,0,z);turfMesh.receiveShadow=true;group.add(turfMesh);

    const rand=seededRandom(seed+401),sets=[[],[],[]],count=Math.max(2,Math.floor(width/.48));
    for(let i=0;i<count;i++){
      const t=(i+.5)/count,rx=-width/2+t*width+(rand()-.5)*.16;
      const rowIndex=Math.min(geo.rows.length-1,Math.max(0,Math.round(t*(geo.rows.length-1))));
      const crown=geo.rows[rowIndex][4];
      const variant=Math.floor(rand()*3);
      sets[variant].push({position:[x+rx,crown[1]-.015,z+crown[2]-.018],rotation:[0,rand()*Math.PI*2,0],scale:[.82+rand()*.38,.8+rand()*.42,.82+rand()*.38]});
    }
    fringeGeos.forEach((g,i)=>{if(sets[i].length)group.add(instanceSet(g,fringeMat,sets[i],`route-1-ledge-fringe-${index}-${i}`,false));});
  });
}

export function upgradeRoute1Ledges(routeRoot,mats){
  if(!routeRoot)return;
  const old=routeRoot.getObjectByName('route-1-ledges');
  if(old)disposeTree(old);
  buildLedges(routeRoot,mats);
}
