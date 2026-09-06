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
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d'),rand=seededRandom(2718);
  ctx.fillStyle='#b67d53';ctx.fillRect(0,0,512,512);

  // Broad mottling first: this reads as soil rather than wood grain.
  for(let i=0;i<260;i++){
    const x=rand()*512,y=rand()*512,rx=10+rand()*42,ry=6+rand()*24;
    ctx.fillStyle=rand()>.52?`rgba(83,55,39,${.025+rand()*.055})`:`rgba(245,198,141,${.022+rand()*.05})`;
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,rand()*Math.PI,0,Math.PI*2);ctx.fill();
  }

  // Fine soil grain and compacted flecks.
  for(let i=0;i<2800;i++){
    const x=rand()*512,y=rand()*512,r=.35+rand()*1.7;
    ctx.fillStyle=rand()>.55?`rgba(74,50,36,${.025+rand()*.075})`:`rgba(255,220,172,${.02+rand()*.06})`;
    ctx.beginPath();ctx.ellipse(x,y,r*(1+rand()*1.2),r,rand()*Math.PI,0,Math.PI*2);ctx.fill();
  }

  // Only a few broken strata marks; never continuous horizontal stripes.
  ctx.lineCap='round';
  for(let i=0;i<28;i++){
    const x=rand()*470,y=25+rand()*450,len=18+rand()*55;
    ctx.beginPath();ctx.moveTo(x,y);
    ctx.quadraticCurveTo(x+len*.45,y+(rand()-.5)*10,x+len,y+(rand()-.5)*8);
    ctx.strokeStyle=rand()>.5?`rgba(94,58,39,${.07+rand()*.08})`:`rgba(238,183,124,${.06+rand()*.07})`;
    ctx.lineWidth=1+rand()*2.5;ctx.stroke();
  }

  // Fine root traces are sparse and mostly vertical/diagonal.
  for(let i=0;i<22;i++){
    const x=rand()*512,y=rand()*330,len=16+rand()*55;
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+(rand()-.5)*15,y+len*.45,x+(rand()-.5)*22,y+len);
    ctx.strokeStyle=`rgba(78,55,35,${.09+rand()*.09})`;ctx.lineWidth=.7+rand()*1.3;ctx.stroke();
  }

  const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;tex.userData.route1LedgeTexture=true;
  return tex;
}

function makeTurfTexture(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d'),rand=seededRandom(31415);
  ctx.fillStyle='#82b955';ctx.fillRect(0,0,256,256);
  for(let i=0;i<1050;i++){
    const x=rand()*256,y=rand()*256;
    ctx.fillStyle=rand()>.52?`rgba(45,104,48,${.035+rand()*.09})`:`rgba(194,224,112,${.03+rand()*.09})`;
    ctx.beginPath();ctx.ellipse(x,y,.4+rand()*1.4,.7+rand()*2.4,rand()*Math.PI,0,Math.PI*2);ctx.fill();
  }
  const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;tex.userData.route1LedgeTexture=true;
  return tex;
}

function pushTri(target,uvs,a,b,c,ua,ub,uc){target.push(...a,...b,...c);uvs.push(...ua,...ub,...uc);}

function addTriangleColors(geometry,palette,seed){
  const rand=seededRandom(seed),count=geometry.attributes.position.count,colors=[];
  for(let i=0;i<count;i+=3){
    const col=new THREE.Color(palette[Math.floor(rand()*palette.length)]);
    for(let v=0;v<3;v++)colors.push(col.r,col.g,col.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
}

function makeBankGeometry(width,seed){
  const rand=seededRandom(seed),steps=Math.max(10,Math.ceil(width/.42)),rows=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps,x=-width/2+t*width;
    const endFade=Math.min(1,t*4,(1-t)*4);
    const longWave=Math.sin(t*Math.PI*3.2+seed*.017)*.045;
    const h=(.59+longWave+(rand()-.5)*.055)*(.62+.38*endFade);
    const depthWave=Math.sin(t*Math.PI*4.6+seed*.031)*.055;
    const frontNoise=(rand()-.5)*.10*endFade,rearNoise=(rand()-.5)*.06*endFade;
    rows.push([
      [x,.018,-.58+rearNoise],
      [x,h*.25,-.37+rearNoise*.6],
      [x,h*.67,-.22+(rand()-.5)*.045*endFade],
      [x,h*.94,-.105+(rand()-.5)*.04*endFade],
      [x,h+.018,.015+depthWave+(rand()-.5)*.035*endFade],
      [x,h*.82,.14+depthWave*.7+frontNoise*.35],
      [x,h*.48,.29+frontNoise],
      [x,h*.18,.41+frontNoise*.75],
      [x,.018,.49+frontNoise*.45],
    ]);
  }

  const earthPos=[],earthUv=[],grassPos=[],grassUv=[];
  for(let i=0;i<steps;i++){
    const a=rows[i],b=rows[i+1],u0=(i/steps)*width/1.15,u1=((i+1)/steps)*width/1.15;
    // Turf is a continuous sloped shoulder up to the crest — not a flat green lid.
    for(let s=0;s<4;s++){
      const p0=a[s],p1=a[s+1],p2=b[s],p3=b[s+1],v0=s/4,v1=(s+1)/4;
      if((i+s)&1){pushTri(grassPos,grassUv,p0,p1,p3,[u0,v0],[u0,v1],[u1,v1]);pushTri(grassPos,grassUv,p0,p3,p2,[u0,v0],[u1,v1],[u1,v0]);}
      else{pushTri(grassPos,grassUv,p0,p1,p2,[u0,v0],[u0,v1],[u1,v0]);pushTri(grassPos,grassUv,p1,p3,p2,[u0,v1],[u1,v1],[u1,v0]);}
    }
    // The exposed face is triangulated and genuinely non-planar.
    for(let s=4;s<8;s++){
      const p0=a[s],p1=a[s+1],p2=b[s],p3=b[s+1],v0=(s-4)/4,v1=(s-3)/4;
      if((i+s)&1){pushTri(earthPos,earthUv,p0,p1,p3,[u0,v0],[u0,v1],[u1,v1]);pushTri(earthPos,earthUv,p0,p3,p2,[u0,v0],[u1,v1],[u1,v0]);}
      else{pushTri(earthPos,earthUv,p0,p1,p2,[u0,v0],[u0,v1],[u1,v0]);pushTri(earthPos,earthUv,p1,p3,p2,[u0,v1],[u1,v1],[u1,v0]);}
    }
  }

  // Ends feather down instead of terminating in rectangular end caps.
  const earth=new THREE.BufferGeometry();earth.setAttribute('position',new THREE.Float32BufferAttribute(earthPos,3));earth.setAttribute('uv',new THREE.Float32BufferAttribute(earthUv,2));earth.computeVertexNormals();
  addTriangleColors(earth,['#f4eee8','#eee5dc','#f8f2ec','#e8ded4','#f1e9e0'],seed+1701);
  const grass=new THREE.BufferGeometry();grass.setAttribute('position',new THREE.Float32BufferAttribute(grassPos,3));grass.setAttribute('uv',new THREE.Float32BufferAttribute(grassUv,2));grass.computeVertexNormals();
  addTriangleColors(grass,['#ffffff','#f4faed','#eef7e6','#f8fff3'],seed+1901);
  return {earth,grass,rows};
}

function makeFringeGeometry(seed){
  const rand=seededRandom(seed),positions=[],indices=[];let base=0;
  for(let blade=0;blade<9;blade++){
    const x=(rand()-.5)*.38,z=(rand()-.5)*.075,h=.11+rand()*.20,w=.016+rand()*.020,lean=(rand()-.5)*.09;
    const pts=[[x-w,0,z],[x+w,0,z],[x-w*.72,h*.46,z+lean*.35],[x+w*.72,h*.46,z+lean*.35],[x,h,z+lean]];
    positions.push(...pts.flat());indices.push(base,base+1,base+2,base+1,base+3,base+2,base+2,base+3,base+4);base+=5;
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

function makeLipShadowGeometry(rows){
  const p=[];
  for(let i=0;i<rows.length-1;i++){
    const a=rows[i][5],b=rows[i+1][5],a2=[a[0],a[1]-.055,a[2]+.012],b2=[b[0],b[1]-.055,b[2]+.012];
    p.push(...a,...a2,...b,...a2,...b2,...b);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
}

function buildLedges(root,mats){
  const group=new THREE.Group();group.name='route-1-ledges';root.add(group);
  const earthTex=makeEarthTexture(),turfTex=makeTurfTexture();
  const earth=mats.dirt.clone();earth.name='route-1-ledge-earth-finished';earth.map=earthTex;earth.color.set('#b97f58');earth.vertexColors=true;earth.flatShading=true;earth.userData.route1LedgeMaterial=true;earth.needsUpdate=true;
  const turf=mats.grass.clone();turf.name='route-1-ledge-turf-finished';turf.map=turfTex;turf.color.set('#83b954');turf.vertexColors=true;turf.flatShading=true;turf.userData.route1LedgeMaterial=true;turf.needsUpdate=true;
  const lip=mats.soil.clone();lip.name='route-1-ledge-lip-shadow';lip.color.set('#6f573b');lip.userData.route1LedgeMaterial=true;
  const fringeMat=mats.blade.clone();fringeMat.name='route-1-ledge-fringe';fringeMat.color.set('#6fa849');fringeMat.side=THREE.DoubleSide;fringeMat.userData.route1LedgeMaterial=true;
  const fringeGeos=[makeFringeGeometry(811),makeFringeGeometry(812),makeFringeGeometry(813)];

  LEDGE_RUNS.forEach(([r,c0,c1],index)=>{
    const width=(c1-c0+1)*2,left=-20+c0*2,right=-20+(c1+1)*2,x=(left+right)/2,z=Z0+r*2+.10;
    const seed=9300+r*47+c0*31+index,geo=makeBankGeometry(width,seed);
    const earthMesh=new THREE.Mesh(geo.earth,earth);earthMesh.name='route-1-finished-ledge-earth';earthMesh.position.set(x,0,z);earthMesh.castShadow=true;earthMesh.receiveShadow=true;group.add(earthMesh);
    const turfMesh=new THREE.Mesh(geo.grass,turf);turfMesh.name='route-1-finished-ledge-turf';turfMesh.position.set(x,0,z);turfMesh.receiveShadow=true;group.add(turfMesh);
    const lipMesh=new THREE.Mesh(makeLipShadowGeometry(geo.rows),lip);lipMesh.name='route-1-ledge-lip-shadow';lipMesh.position.set(x,0,z);group.add(lipMesh);

    // Real blade clusters break up the crest; they are intermittent, not a green strip.
    const rand=seededRandom(seed+401),sets=[[],[],[]],count=Math.max(2,Math.floor(width/.72));
    for(let i=0;i<count;i++){
      if(rand()<.22)continue;
      const t=(i+.5)/count,rx=-width/2+t*width+(rand()-.5)*.22;
      const rowIndex=Math.min(geo.rows.length-1,Math.max(0,Math.round(t*(geo.rows.length-1)))),crown=geo.rows[rowIndex][4],variant=Math.floor(rand()*3);
      sets[variant].push({position:[x+rx,crown[1]-.012,z+crown[2]-.015],rotation:[0,rand()*Math.PI*2,0],scale:[.78+rand()*.40,.78+rand()*.48,.78+rand()*.40]});
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
