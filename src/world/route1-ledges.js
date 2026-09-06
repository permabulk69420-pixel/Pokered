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
    const materials=obj.material?(Array.isArray(obj.material)?obj.material:[obj.material]):[];
    for(const m of materials){
      if(m.map?.userData?.route1LedgeTexture)m.map.dispose();
      if(m.bumpMap?.userData?.route1LedgeTexture)m.bumpMap.dispose();
      if(m.userData?.route1LedgeMaterial)m.dispose();
    }
  });
  root.removeFromParent();
}

function makeCanvasTexture(canvas){
  const tex=new THREE.CanvasTexture(canvas);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=8;
  tex.userData.route1LedgeTexture=true;
  return tex;
}

function makeEarthTextures(){
  const color=document.createElement('canvas'),bump=document.createElement('canvas');
  color.width=color.height=bump.width=bump.height=512;
  const c=color.getContext('2d'),b=bump.getContext('2d'),rand=seededRandom(8021);
  c.fillStyle='#b79a6d';c.fillRect(0,0,512,512);
  b.fillStyle='rgb(128,128,128)';b.fillRect(0,0,512,512);

  for(let i=0;i<190;i++){
    const x=rand()*512,y=rand()*512,rx=12+rand()*48,ry=7+rand()*30,a=.025+rand()*.07,light=rand()>.52;
    c.fillStyle=light?`rgba(231,211,164,${a})`:`rgba(102,82,57,${a})`;
    c.beginPath();c.ellipse(x,y,rx,ry,rand()*Math.PI,0,Math.PI*2);c.fill();
    b.fillStyle=light?`rgba(158,158,158,${a*.85})`:`rgba(94,94,94,${a*.85})`;
    b.beginPath();b.ellipse(x,y,rx*.75,ry*.75,rand()*Math.PI,0,Math.PI*2);b.fill();
  }
  for(let i=0;i<3600;i++){
    const x=rand()*512,y=rand()*512,r=.4+rand()*1.8,light=rand()>.58;
    c.fillStyle=light?`rgba(239,221,178,${.025+rand()*.075})`:`rgba(79,65,47,${.025+rand()*.075})`;
    c.beginPath();c.ellipse(x,y,r*(1+rand()*.9),r,rand()*Math.PI,0,Math.PI*2);c.fill();
    b.fillStyle=light?'rgba(155,155,155,.12)':'rgba(92,92,92,.12)';b.fillRect(x,y,1+rand()*2,1+rand()*2);
  }

  c.lineCap=b.lineCap='round';
  for(let i=0;i<35;i++){
    const x=rand()*450,y=25+rand()*455,len=20+rand()*72,dy=(rand()-.5)*14;
    c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+len*.48,y+dy*.4,x+len,y+dy);
    c.strokeStyle=rand()>.5?`rgba(77,60,42,${.075+rand()*.07})`:`rgba(226,199,146,${.06+rand()*.07})`;
    c.lineWidth=1+rand()*2.2;c.stroke();
    b.beginPath();b.moveTo(x,y);b.quadraticCurveTo(x+len*.48,y+dy*.4,x+len,y+dy);b.strokeStyle='rgba(88,88,88,.12)';b.lineWidth=1.3;b.stroke();
  }
  for(let i=0;i<18;i++){
    const x=rand()*512,y=rand()*320,len=18+rand()*58;
    c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+(rand()-.5)*12,y+len*.48,x+(rand()-.5)*19,y+len);
    c.strokeStyle=`rgba(69,58,40,${.08+rand()*.08})`;c.lineWidth=.7+rand()*1.1;c.stroke();
  }
  return {color:makeCanvasTexture(color),bump:makeCanvasTexture(bump)};
}

function makeTurfTextures(){
  const color=document.createElement('canvas'),bump=document.createElement('canvas');
  color.width=color.height=bump.width=bump.height=384;
  const c=color.getContext('2d'),b=bump.getContext('2d'),rand=seededRandom(9917);
  c.fillStyle='#78ad50';c.fillRect(0,0,384,384);
  b.fillStyle='rgb(128,128,128)';b.fillRect(0,0,384,384);

  for(let i=0;i<150;i++){
    const x=rand()*384,y=rand()*384,rx=8+rand()*30,ry=7+rand()*24,light=rand()>.5;
    c.fillStyle=light?`rgba(174,207,100,${.04+rand()*.09})`:`rgba(48,105,51,${.035+rand()*.09})`;
    c.beginPath();c.ellipse(x,y,rx,ry,rand()*Math.PI,0,Math.PI*2);c.fill();
  }
  for(let i=0;i<2600;i++){
    const x=rand()*384,y=rand()*384,h=.8+rand()*3.4,w=.35+rand()*1.2,light=rand()>.52;
    c.fillStyle=light?`rgba(201,226,116,${.035+rand()*.10})`:`rgba(43,95,45,${.035+rand()*.10})`;
    c.beginPath();c.ellipse(x,y,w,h,rand()*Math.PI,0,Math.PI*2);c.fill();
    b.fillStyle=light?'rgba(154,154,154,.12)':'rgba(100,100,100,.12)';b.fillRect(x,y,1,1+rand()*2);
  }
  return {color:makeCanvasTexture(color),bump:makeCanvasTexture(bump)};
}

function pushQuadAsTris(pos,uv,a,b,c,d,ua,ub,uc,ud,flip=false){
  if(flip){
    pos.push(...a,...b,...d,...a,...d,...c);uv.push(...ua,...ub,...ud,...ua,...ud,...uc);
  }else{
    pos.push(...a,...b,...c,...b,...d,...c);uv.push(...ua,...ub,...uc,...ub,...ud,...uc);
  }
}

function mixPoint(a,b,t,zOffset=0){
  return [
    THREE.MathUtils.lerp(a[0],b[0],t),
    THREE.MathUtils.lerp(a[1],b[1],t),
    THREE.MathUtils.lerp(a[2],b[2],t)+zOffset,
  ];
}

function addTriangleColors(geometry,palette,seed){
  const rand=seededRandom(seed),count=geometry.attributes.position.count,colors=[];
  for(let i=0;i<count;i+=3){
    const col=new THREE.Color(palette[Math.floor(rand()*palette.length)]);
    for(let v=0;v<3;v++)colors.push(col.r,col.g,col.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
}

function pushCapFan(pos,uv,points,reverse=false){
  const pts=reverse?[...points].reverse():points;
  const centre=pts.reduce((out,p)=>[out[0]+p[0],out[1]+p[1],out[2]+p[2]],[0,0,0]).map(v=>v/pts.length);
  const uvFor=p=>[(p[2]+.72)/1.44,p[1]/.72];
  const cuv=uvFor(centre);
  for(let i=0;i<pts.length;i++){
    const a=pts[i],b=pts[(i+1)%pts.length];
    pos.push(...centre,...a,...b);uv.push(...cuv,...uvFor(a),...uvFor(b));
  }
}

function makeLedgeGeometry(width,seed){
  const rand=seededRandom(seed),steps=Math.max(12,Math.ceil(width/.36)),rows=[];

  for(let i=0;i<=steps;i++){
    const t=i/steps,x=-width/2+t*width,end=Math.min(1,t*5,(1-t)*5);
    const wave=Math.sin(t*Math.PI*3.15+seed*.014)*.045;
    const h=(.60+wave+(rand()-.5)*.045*end)*(.48+.52*end);
    const edgeNoise=(rand()-.5)*.06*end,frontNoise=(rand()-.5)*.075*end;
    rows.push([
      [x,.018,-.61+(rand()-.5)*.025*end],
      [x,.08+(.04*end),-.48+(rand()-.5)*.025*end],
      [x,h*.47,-.33+(rand()-.5)*.035*end],
      [x,h*.84,-.20+(rand()-.5)*.035*end],
      [x,h+.018,-.055+edgeNoise],
      [x,h*.91,.075+edgeNoise*.7],
      [x,h*.72,.15+frontNoise*.35],
      [x,h*.47,.27+frontNoise],
      [x,h*.20,.40+frontNoise*.75],
      [x,.018,.50+frontNoise*.45],
    ]);
  }

  const turfPos=[],turfUv=[],earthPos=[],earthUv=[],shadowPos=[],creepPos=[],creepUv=[],turfEndPos=[],turfEndUv=[],earthEndPos=[],earthEndUv=[];
  const edgeRand=seededRandom(seed+3401);

  for(let i=0;i<steps;i++){
    const a=rows[i],d=rows[i+1],u0=i/3.2,u1=(i+1)/3.2;

    for(let s=0;s<6;s++){
      pushQuadAsTris(turfPos,turfUv,a[s],a[s+1],d[s],d[s+1],[u0,s/6],[u0,(s+1)/6],[u1,s/6],[u1,(s+1)/6],((i+s)&1)!==0);
    }
    for(let s=6;s<9;s++){
      pushQuadAsTris(earthPos,earthUv,a[s],a[s+1],d[s],d[s+1],[u0,(s-6)/3],[u0,(s-5)/3],[u1,(s-6)/3],[u1,(s-5)/3],((i+s)&1)!==0);
    }

    const p0=a[6],p1=d[6];
    shadowPos.push(
      ...p0, p0[0],p0[1]-.075,p0[2]+.012, ...p1,
      p0[0],p0[1]-.075,p0[2]+.012, p1[0],p1[1]-.075,p1[2]+.012, ...p1,
    );

    const style=edgeRand();
    if(style>.16){
      const top0=[p0[0],p0[1]+.004,p0[2]+.010],top1=[p1[0],p1[1]+.004,p1[2]+.010];
      if(style<.72){
        const drop0=.18+edgeRand()*.52,drop1=.18+edgeRand()*.52;
        const target0=edgeRand()>.84?a[8]:a[7],target1=edgeRand()>.84?d[8]:d[7];
        const bot0=mixPoint(p0,target0,drop0,.012),bot1=mixPoint(p1,target1,drop1,.012);
        pushQuadAsTris(creepPos,creepUv,top0,bot0,top1,bot1,[u0,0],[u0,1],[u1,0],[u1,1],(i&1)!==0);
      }else{
        const left=.18+edgeRand()*.16,right=.72+edgeRand()*.14;
        const ta=mixPoint(top0,top1,left),tb=mixPoint(top0,top1,right);
        const midTop=mixPoint(p0,p1,(left+right)*.5),midLow=mixPoint(a[7],d[7],(left+right)*.5);
        const tip=mixPoint(midTop,midLow,.48+edgeRand()*.40,.014);
        creepPos.push(...ta,...tb,...tip);creepUv.push(u0+(u1-u0)*left,0,u0+(u1-u0)*right,0,u0+(u1-u0)*(left+right)*.5,1);
      }
    }
  }

  for(const [row,reverse] of [[rows[0],false],[rows[rows.length-1],true]]){
    const base=[row[0][0],.018,row[6][2]];
    pushCapFan(turfEndPos,turfEndUv,[row[0],row[1],row[2],row[3],row[4],row[5],row[6],base],reverse);
    pushCapFan(earthEndPos,earthEndUv,[base,row[6],row[7],row[8],row[9]],reverse);
  }

  const turf=new THREE.BufferGeometry();turf.setAttribute('position',new THREE.Float32BufferAttribute(turfPos,3));turf.setAttribute('uv',new THREE.Float32BufferAttribute(turfUv,2));turf.computeVertexNormals();
  addTriangleColors(turf,['#ffffff','#f6fbef','#edf7e4','#f8fff1'],seed+1103);

  const earth=new THREE.BufferGeometry();earth.setAttribute('position',new THREE.Float32BufferAttribute(earthPos,3));earth.setAttribute('uv',new THREE.Float32BufferAttribute(earthUv,2));earth.computeVertexNormals();
  addTriangleColors(earth,['#ffffff','#f3eee5','#eae3d7','#f8f3ea','#eee6da'],seed+1307);

  const shadow=new THREE.BufferGeometry();shadow.setAttribute('position',new THREE.Float32BufferAttribute(shadowPos,3));shadow.computeVertexNormals();

  const creep=new THREE.BufferGeometry();creep.setAttribute('position',new THREE.Float32BufferAttribute(creepPos,3));creep.setAttribute('uv',new THREE.Float32BufferAttribute(creepUv,2));creep.computeVertexNormals();
  addTriangleColors(creep,['#ffffff','#eff8e6','#e2f0d6','#f6fce9'],seed+1501);

  const turfEnds=new THREE.BufferGeometry();turfEnds.setAttribute('position',new THREE.Float32BufferAttribute(turfEndPos,3));turfEnds.setAttribute('uv',new THREE.Float32BufferAttribute(turfEndUv,2));turfEnds.computeVertexNormals();
  addTriangleColors(turfEnds,['#ffffff','#f1fae9','#e8f5dc'],seed+1701);

  const earthEnds=new THREE.BufferGeometry();earthEnds.setAttribute('position',new THREE.Float32BufferAttribute(earthEndPos,3));earthEnds.setAttribute('uv',new THREE.Float32BufferAttribute(earthEndUv,2));earthEnds.computeVertexNormals();
  addTriangleColors(earthEnds,['#ffffff','#eee7dc','#e5dccf'],seed+1901);

  return {turf,earth,shadow,creep,turfEnds,earthEnds,rows};
}

function sampleTurfSurface(rows,localX,shoulder){
  const minX=rows[0][0][0],maxX=rows[rows.length-1][0][0];
  const along=THREE.MathUtils.clamp((localX-minX)/(maxX-minX),0,1)*(rows.length-1);
  const i0=Math.floor(along),i1=Math.min(rows.length-1,i0+1),f=along-i0;
  const crest=mixPoint(rows[i0][4],rows[i1][4],f);
  const rear=mixPoint(rows[i0][3],rows[i1][3],f);
  return mixPoint(crest,rear,shoulder);
}

function makeTuftGeometry(seed){
  const rand=seededRandom(seed),positions=[],indices=[];let base=0;
  for(let blade=0;blade<7;blade++){
    const a=(blade/7)*Math.PI*2+(rand()-.5)*.35,r=.035+rand()*.055;
    const x=Math.cos(a)*r,z=Math.sin(a)*r,h=.14+rand()*.18,w=.028+rand()*.030;
    const leanX=Math.cos(a)*(.035+rand()*.07),leanZ=Math.sin(a)*(.035+rand()*.07);
    positions.push(
      x-w,0,z,
      x+w,0,z,
      x-w*.65,h*.55,z+leanZ*.45,
      x+w*.65,h*.55,z+leanZ*.45,
      x+leanX,h,z+leanZ,
    );
    indices.push(base,base+1,base+2,base+1,base+3,base+2,base+2,base+3,base+4);base+=5;
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function buildLedges(root,mats,{runs=LEDGE_RUNS,x0=-20,z0=Z0}={}){
  const group=new THREE.Group();group.name='route-1-ledges';root.add(group);
  const earthTex=makeEarthTextures(),turfTex=makeTurfTextures();

  const earth=mats.dirt.clone();
  earth.name='route-1-ledge-earth';earth.map=earthTex.color;earth.bumpMap=earthTex.bump;earth.bumpScale=.045;earth.color.set('#ffffff');earth.vertexColors=true;earth.flatShading=true;earth.userData.route1LedgeMaterial=true;earth.needsUpdate=true;

  const turf=mats.grass.clone();
  turf.name='route-1-ledge-turf';turf.map=turfTex.color;turf.bumpMap=turfTex.bump;turf.bumpScale=.025;turf.color.set('#ffffff');turf.vertexColors=true;turf.flatShading=true;turf.userData.route1LedgeMaterial=true;turf.needsUpdate=true;

  const endEarth=earth.clone();endEarth.name='route-1-ledge-earth-ends';endEarth.side=THREE.DoubleSide;endEarth.userData.route1LedgeMaterial=true;
  const endTurf=turf.clone();endTurf.name='route-1-ledge-turf-ends';endTurf.side=THREE.DoubleSide;endTurf.userData.route1LedgeMaterial=true;
  const creepMat=turf.clone();creepMat.name='route-1-ledge-creeping-turf';creepMat.side=THREE.DoubleSide;creepMat.polygonOffset=true;creepMat.polygonOffsetFactor=-1;creepMat.polygonOffsetUnits=-1;creepMat.userData.route1LedgeMaterial=true;

  const undercut=mats.soil.clone();undercut.name='route-1-ledge-undercut';undercut.color.set('#6f6044');undercut.userData.route1LedgeMaterial=true;
  const tuftMat=mats.blade.clone();tuftMat.name='route-1-ledge-tufts';tuftMat.color.set('#699d46');tuftMat.side=THREE.DoubleSide;tuftMat.userData.route1LedgeMaterial=true;
  const tuftLight=mats.bladeLight.clone();tuftLight.name='route-1-ledge-tufts-light';tuftLight.color.set('#91bf58');tuftLight.side=THREE.DoubleSide;tuftLight.userData.route1LedgeMaterial=true;
  const tuftGeos=[makeTuftGeometry(1601),makeTuftGeometry(1602),makeTuftGeometry(1603)];

  runs.forEach(([r,c0,c1],index)=>{
    const width=(c1-c0+1)*2,left=x0+c0*2,right=x0+(c1+1)*2,x=(left+right)/2,z=z0+r*2+.10;
    const seed=11000+r*53+c0*37+index,geo=makeLedgeGeometry(width,seed);

    const soil=new THREE.Mesh(geo.earth,earth);soil.name='route-1-ledged-soil';soil.position.set(x,0,z);soil.castShadow=true;soil.receiveShadow=true;group.add(soil);
    const grass=new THREE.Mesh(geo.turf,turf);grass.name='route-1-ledged-turf';grass.position.set(x,0,z);grass.receiveShadow=true;group.add(grass);
    const creep=new THREE.Mesh(geo.creep,creepMat);creep.name='route-1-ledged-grass-creep';creep.position.set(x,0,z);creep.receiveShadow=true;group.add(creep);
    const eEnds=new THREE.Mesh(geo.earthEnds,endEarth);eEnds.name='route-1-ledged-soil-ends';eEnds.position.set(x,0,z);eEnds.castShadow=true;eEnds.receiveShadow=true;group.add(eEnds);
    const tEnds=new THREE.Mesh(geo.turfEnds,endTurf);tEnds.name='route-1-ledged-turf-ends';tEnds.position.set(x,0,z);tEnds.receiveShadow=true;group.add(tEnds);
    const shadow=new THREE.Mesh(geo.shadow,undercut);shadow.name='route-1-ledged-undercut';shadow.position.set(x,0,z);group.add(shadow);

    const rand=seededRandom(seed+701),sets=[[],[],[]],lightSets=[[],[],[]];
    const count=Math.max(5,Math.floor(width/.42));
    for(let i=0;i<count;i++){
      const t=(i+.35+rand()*.30)/count,localX=-width/2+t*width+(rand()-.5)*.12;
      const anchor=sampleTurfSurface(geo.rows,localX,.10+rand()*.24);
      const target=rand()>.72?lightSets:sets,variant=Math.floor(rand()*3);
      target[variant].push({
        position:[x+anchor[0],anchor[1]-.025,z+anchor[2]],
        rotation:[0,rand()*Math.PI*2,0],
        scale:[.82+rand()*.28,.78+rand()*.38,.82+rand()*.28],
      });
    }
    tuftGeos.forEach((g,i)=>{
      if(sets[i].length)group.add(instanceSet(g,tuftMat,sets[i],`route-1-ledge-tufts-${index}-${i}`,false));
      if(lightSets[i].length)group.add(instanceSet(g,tuftLight,lightSets[i],`route-1-ledge-tufts-light-${index}-${i}`,false));
    });
  });
}

export function upgradeRoute1Ledges(routeRoot,mats){
  if(!routeRoot)return;
  const old=routeRoot.getObjectByName('route-1-ledges');
  if(old)disposeTree(old);
  buildLedges(routeRoot,mats);
}
