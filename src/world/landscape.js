import * as THREE from 'three';
import { Builder, groundPolygon, instanceSet } from './geometry.js';
import { seededRandom } from './materials.js';
import {groundUV,makeMeadowClump,meadowMaterial} from './ground.js';

export function makeLandscape(scene,mats,layout,ground) {
  const root=new THREE.Group();root.name='landscape';scene.add(root);
  const rand=seededRandom(1996);
  // Preserve the established shoreline/pebble scatter: the old grain texture
  // consumed these random values before placing the landscape meshes.
  for(let i=0;i<6200*5;i++)rand();
  const meadow=groundPolygon([[-180,-180],[180,-180],[180,180],[-4,180],[-4,12],[-4.6,10.4],[-5.8,9.9],[-10.2,9.9],[-11.5,10.4],[-12,12],[-12,180],[-180,180]],ground.material,0);
  // World-projected UVs keep grain consistent across the irregular coastline.
  const pos=meadow.geometry.attributes.position,uv=meadow.geometry.attributes.uv;
  for(let i=0;i<pos.count;i++) uv.setXY(i,...groundUV(pos.getX(i),pos.getZ(i)));
  meadow.name='continuous-meadow-with-southern-inlet';root.add(meadow);
  const b=new Builder(root,mats);
  // The original has a mostly grassy commons: keep these trails soft and narrow.
  const trails=[
    [[-1.7,-20],[1.8,-20],[1.65,-5.5],[.9,-2],[-1.5,-2.4],[-1.65,-6]],
    [[-10.0,-6.15],[-8,-6.15],[-7.6,-3.7],[7.8,-3.7],[8,-6.15],[6.2,-6.15],[6.05,-4.5],[-8.5,-4.5]],
    [[-.7,-3.7],[1.1,-3.7],[1.4,5.9],[5.9,6.1],[5.9,5.2],[4.15,5.2],[4.15,5],[-.2,4.7]],
    [[-.35,4.5],[1.25,5.9],[-3.1,8.1],[-7.6,9.7],[-8.9,9.8],[-8.9,8.7],[-4.15,6.8]],
  ];
  trails.forEach(points=>ground.paint(points));
  // Little inset stepping stones at each doorstep, flush with the meadow.
  for(const s of layout.buildings) for(let j=0;j<3;j++) {
    const z=s.z+s.depth/2+.88+j*.45;
    b.roundBox(1.16+(j%2)*.18,.04,.33,.04,s.doorX+(j%2)*.04,.035,z,'stoneLight',[0,(j-1)*.025,0]);
  }
  // Cut banks around the inlet, then a sandy transition into shallow water.
  const bankPoints=[[-12,17],[-12,12],[-11.5,10.4],[-10.2,9.9],[-5.8,9.9],[-4.6,10.4],[-4,12],[-4,17]];
  for(let i=0;i<bankPoints.length-1;i++) {
    const [ax,az]=bankPoints[i],[bx,bz]=bankPoints[i+1];
    const len=Math.hypot(bx-ax,bz-az), angle=Math.atan2(bx-ax,bz-az);
    b.box(.29,.43,len+.06,(ax+bx)/2,-.21,(az+bz)/2,'soil',[0,angle,0]);
    b.roundBox(.43,.08,len+.12,.035,(ax+bx)/2,.012,(az+bz)/2,'edge',[0,angle,0]);
  }
  const sand=groundPolygon([[-12.45,11.8],[-11.8,10.15],[-10.2,9.45],[-5.8,9.45],[-4.2,10.15],[-3.6,11.8],[-3.6,25],[-12.45,25]],mats.dirt,-.45);root.add(sand);
  // Rounded shoreline stones are small enough to read as individual rocks in VR.
  for(let i=0;i<38;i++) {
    const side=i%2?-1:1, x=side<0?-11.85:-4.15,z=11+rand()*7;
    b.sphere(.14+rand()*.17,x+rand()*.28,-.15+rand()*.12,z,i%3?'stone':'stoneLight',[1.2,.6,.85],7);
  }
  // A few pebble clusters rather than visual clutter across the whole clearing.
  for(const [cx,cz] of [[-13,6],[15,-3],[11,8],[-1,9],[-14,-5]]) for(let i=0;i<7;i++)
    b.sphere(.035+rand()*.055,cx+(rand()-.5)*1.5,.025,cz+(rand()-.5)*.6,'stoneLight',[1,.4,.8],6);
  b.finish({shadows:false});
  const water=makeWater();root.add(water);
  const ripple=new Builder(root,mats);
  const foam=new THREE.MeshBasicMaterial({color:'#ddf4df',transparent:true,opacity:.65,depthWrite:false});foam.name='shore-foam';
  for(let i=0;i<26;i++) {
    const x=-11.55+rand()*7.1,z=10.6+rand()*7.8;
    ripple.box(.25+rand()*.6,.008,.018+rand()*.025,x,-.287,z,foam,[0,(rand()-.5)*.3,0]);
  }
  ripple.finish({shadows:false});
  return {root,water,update:(time)=>{water.material.uniforms.time.value=time;}};
}

function makeWater() {
  const mat=new THREE.ShaderMaterial({
    name:'simple-stylized-water',uniforms:{time:{value:0},nearColor:{value:new THREE.Color('#6ac2bc')},farColor:{value:new THREE.Color('#328997')}},
    vertexShader:`varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.0);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`uniform float time;uniform vec3 nearColor;uniform vec3 farColor;varying vec3 vWorld;
    void main(){vec2 p=vWorld.xz;float deep=smoothstep(11.,34.,p.y);vec3 c=mix(nearColor,farColor,deep);
      float wave=sin(p.x*2.2+p.y*1.5+time*.8)+sin(p.x*3.7-p.y*2.1+time*.45);
      float light=smoothstep(1.54,1.83,wave)*.17; c+=vec3(light*.65,light,light*.82);
      c+=sin(p.y*1.6+sin(p.x*1.8+time*.5)*.35-time*.65)*.015;
      gl_FragColor=vec4(c,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const water=new THREE.Mesh(new THREE.PlaneGeometry(8.25,200),mat);water.rotation.x=-Math.PI/2;water.position.set(-8,-.30,110);water.name='route-21-water';return water;
}

export function makeTrees(scene,mats,colliders) {
  const root=new THREE.Group();root.name='tree-border';scene.add(root);
  const rand=seededRandom(151),trees=[];
  // Original boundary at tile row 1, column 0/19; the Route 1 opening stays centered.
  for(let x=-19;x<=19;x+=2) if(x<-2||x>2) trees.push([x,-15.6,1]);
  for(let z=-13;z<=15.2;z+=2.05) {trees.push([-19,z,1]);trees.push([19,z,1]);}
  for(let x=-17;x<=19;x+=2.02) if(x<-12.5||x>-3.6) trees.push([x,17,1]);
  // Layers beyond the boundary give depth at standing eye height.
  for(let row=0;row<3;row++) {
    for(let x=-34;x<=34;x+=3.0) if(x<-3.3||x>3.3) trees.push([x+(rand()-.5),-20.5-row*4.3,1.12+rand()*.34]);
    for(let z=-18;z<29;z+=3.5) {trees.push([-24-row*4.4+(rand()-.5),z+(rand()-.5),1.2+rand()*.30]);trees.push([24+row*4.4,z+(rand()-.5),1.2+rand()*.30]);}
  }
  // Behind southern trees: forest shoulders, never a floating diorama edge.
  for(let z=22;z<35;z+=4) for(let x=-27;x<29;x+=3.3) if(x<-13.7||x>-2.7) trees.push([x,z,1.1+rand()*.3]);
  const trunk=[], lower=[], mid=[], top=[], tuft=[];
  trees.forEach(([x,z,s],i)=> {
    const scale=s*(.9+rand()*.15), yy=rand()*.17, rot=rand()*Math.PI*2;
    trunk.push({position:[x,.85*scale,z],scale:[scale,scale,scale]});
    // Layered, slightly lobed canopies preserve the familiar rounded Gen I tree shape.
    lower.push({position:[x,2.05*scale+yy,z],scale:[1.13*scale,1.05*scale,1.01*scale],rotation:[0,rot,0]});
    mid.push({position:[x+.05,2.78*scale+yy,z+.02],scale:[.94*scale,.96*scale,.88*scale],rotation:[0,rot+.8,0]});
    top.push({position:[x-.07,3.39*scale+yy,z],scale:[.64*scale,.72*scale,.62*scale],rotation:[0,rot,0]});
    if(i<90) {
      tuft.push({position:[x-.54*scale,2.62*scale+yy,z+.65*scale],scale:[.54*scale,.51*scale,.51*scale],rotation:[0,rot,0]});
      if((x< -17||x>17||z< -15||z>16)) colliders.push({kind:'circle',x,z,r:.83});
    }
  });
  const crown=new THREE.IcosahedronGeometry(1,1);
  root.add(instanceSet(new THREE.CylinderGeometry(.14,.24,1.8,7),mats.trunk,trunk,'tree-trunks'));
  root.add(instanceSet(crown,mats.leafDark,lower,'tree-lower-canopies'));
  root.add(instanceSet(crown,mats.leaf,mid,'tree-middle-canopies'));
  root.add(instanceSet(crown,mats.leafLight,top,'tree-top-canopies'));
  root.add(instanceSet(crown,mats.leaf,tuft,'tree-canopy-lobes'));
  // Local ambient occlusion anchors canopies and trunks to the grass.
  const shadows=[];
  for(const [x,z,s] of trees.slice(0,90))shadows.push({position:[x,.028,z],scale:[1.1*s,1.1*s,1],rotation:[-Math.PI/2,0,0]});
  const shadowTex=document.createElement('canvas');shadowTex.width=shadowTex.height=64;const c=shadowTex.getContext('2d');
  const gr=c.createRadialGradient(32,32,4,32,32,32);gr.addColorStop(0,'rgba(32,56,21,.30)');gr.addColorStop(.6,'rgba(32,56,21,.12)');gr.addColorStop(1,'rgba(32,56,21,0)');c.fillStyle=gr;c.fillRect(0,0,64,64);
  const sm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowTex),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  root.add(instanceSet(new THREE.PlaneGeometry(2,2),sm,shadows,'tree-contact-shadows',false));
  return root;
}

export function makeGardensAndGrass(scene,mats,layout,ground) {
  const root=new THREE.Group();root.name='flowers-and-meadow';scene.add(root);
  const b=new Builder(root,mats),rand=seededRandom(124),stems=[],leaves=[],pink=[],rose=[],cream=[],centres=[];
  for(const garden of layout.gardens) {
    const {x,z,width,depth}=garden;
    ground.patch(x,z,width*.7,depth*.9,'53,103,43',.25);
    // Neatly planted rectangles are deliberate: this is a remaster of the original map.
    for(let gx=-width/2+.32;gx<width/2-.1;gx+=.44) for(let gz=-depth/2+.3;gz<depth/2-.1;gz+=.50) {
      const xx=x+gx+(rand()-.5)*.1,zz=z+gz+(rand()-.5)*.12,h=.27+rand()*.16;
      stems.push({position:[xx,h/2+.025,zz],scale:[1,h/.35,1]});
      leaves.push({position:[xx-.09,h*.55,zz],rotation:[0,rand()*6,.55],scale:[.16,.055,.075]});
      leaves.push({position:[xx+.085,h*.36,zz+.025],rotation:[0,rand()*6,-.5],scale:[.16,.055,.075]});
      const arr=rand()>.28?pink:rose;
      for(let i=0;i<5;i++) {const a=i/5*Math.PI*2;arr.push({position:[xx+Math.cos(a)*.09,h+.017,zz+Math.sin(a)*.09],scale:[.083,.035,.071],rotation:[0,-a,0]});}
      centres.push({position:[xx,h+.04,zz],scale:[.055,.04,.055]});
    }
    // Original short fences at the north edge of both flower beds.
    const fenceZ=z-depth/2-.72;
    for(let xx=x-width/2;xx<=x+width/2;xx+=.53) {
      b.box(.11,.7,.12,xx,.35,fenceZ,'woodLight');
      b.sphere(.077,xx,.73,fenceZ,'trim',[1,.85,.9],7);
    }
    b.box(width,.065,.07,x,.49,fenceZ+.025,'woodLight');
    b.box(width,.065,.07,x,.22,fenceZ+.025,'woodLight');
  }
  // Tiny meadow daisies placed away from the paths and building footprints.
  const clear=(x,z)=>{
    if(layout.buildings.some(s=>Math.abs(x-s.x)<s.width/2+1.3&&Math.abs(z-s.z)<s.depth/2+1.0))return false;
    if(layout.gardens.some(s=>Math.abs(x-s.x)<s.width/2+.4&&Math.abs(z-s.z)<s.depth/2+1.3))return false;
    if(z>9&&x> -12.8&&x< -3.4)return false;
    if(Math.abs(x)<2.3||Math.abs(z+4.1)<1.3)return false;
    if(z>5&&z<10&&x> -10&&x<3)return false;
    return true;
  };
  for(let i=0;i<170;i++) {
    const x=-17+rand()*34,z=-14+rand()*30;if(!clear(x,z))continue;
    for(let j=0;j<3;j++) {
      const xx=x+(rand()-.5)*.8,zz=z+(rand()-.5)*.8,h=.10+rand()*.1;
      stems.push({position:[xx,h/2,zz],scale:[.7,h/.35,.7]});
      for(let p=0;p<5;p++){const a=p/5*Math.PI*2;cream.push({position:[xx+Math.cos(a)*.035,h,zz+Math.sin(a)*.035],scale:[.045,.016,.031],rotation:[0,-a,0]});}
      centres.push({position:[xx,h+.01,zz],scale:[.021,.019,.021]});
    }
  }
  const petal=new THREE.IcosahedronGeometry(1,0);
  root.add(instanceSet(new THREE.CylinderGeometry(.012,.013,.35,4),mats.leafDark,stems,'flower-stems',false));
  root.add(instanceSet(petal,mats.leaf,leaves,'flower-leaves',false));
  for(const [arr,mat,name] of [[pink,mats.petalPink,'pink-flowers'],[rose,mats.petalRose,'rose-flowers'],[cream,mats.petalCream,'daisies'],[centres,mats.flowerCenter,'flower-centres']])root.add(instanceSet(petal,mat,arr,name,false));
  const geom=makeMeadowClump(),grassMat=meadowMaterial(mats);
  const tufts=[],lightTufts=[];
  for(let i=0;i<1900;i++) {
    const x=-17.8+rand()*35.6,z=-15+rand()*31;if(!clear(x,z))continue;
    const s=.55+rand()*.65;
    (i%4?tufts:lightTufts).push({position:[x,.025,z],scale:[s,s,s],rotation:[0,rand()*6.28,0]});
  }
  root.add(instanceSet(geom,grassMat,tufts,'meadow-grass',false));root.add(instanceSet(geom,grassMat,lightTufts,'sunlit-grass',false));
  b.finish();return root;
}

export function makeSky(scene,mats) {
  const root=new THREE.Group();root.name='sky-and-distant-hills';scene.add(root);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(400,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:new THREE.Color('#75b8d2')},bottom:{value:new THREE.Color('#dcf0d7')}},
    vertexShader:`varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 top;uniform vec3 bottom;varying vec3 v;void main(){float h=max(normalize(v).y,0.);gl_FragColor=vec4(mix(bottom,top,pow(h,.55)),1.);#include <colorspace_fragment>}`.replace(';#include',';\n#include'),
  }));sky.name='gradient-sky';sky.renderOrder=-10;root.add(sky);
  const b=new Builder(root,mats),rand=seededRandom(18);
  for(let i=0;i<20;i++){
    const a=i/20*Math.PI*2,dist=70+rand()*25;
    b.sphere(1,Math.cos(a)*dist,-5,Math.sin(a)*dist,'mountain',[14+rand()*20,15+rand()*12,13+rand()*14],10);
  }
  for(let i=0;i<19;i++) {
    const a=i/19*Math.PI*2,dist=65+rand()*60,cx=Math.cos(a)*dist,cz=Math.sin(a)*dist,cy=25+rand()*12;
    for(let j=0;j<4;j++) b.sphere(1,cx+j*3.1,cy+(j===1?1.3:0),cz,'cloud',[3.8+rand()*2.7,1.2+rand()*1.5,2.3+rand()],10);
  }
  b.finish({shadows:false});return root;
}
