import * as THREE from 'three';
import {seededRandom} from './materials.js';

// One opaque surface covers all three areas. Paths are painted into its atlas,
// so adjoining tiles cannot overlap or flicker and their edges blend into turf.
export const GROUND_BOUNDS={x:-48,z:-176,width:96,depth:200};
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
export const groundUV=(x,z)=>[(x-GROUND_BOUNDS.x)/GROUND_BOUNDS.width,1-(z-GROUND_BOUNDS.z)/GROUND_BOUNDS.depth];

export function createGroundSurface(mats){
  const atlas=canvas(1024,2048),c=atlas.getContext('2d'),paths=canvas(1024,2048),p=paths.getContext('2d');
  const sx=atlas.width/GROUND_BOUNDS.width,sz=atlas.height/GROUND_BOUNDS.depth;
  const xy=(x,z)=>[(x-GROUND_BOUNDS.x)*sx,(z-GROUND_BOUNDS.z)*sz];
  const rand=seededRandom(6291);
  c.fillStyle='#85af5d';c.fillRect(0,0,atlas.width,atlas.height);
  // Broad, low-contrast colour variation reads as growing turf, not a repeating
  // noise tile. Keep the atlas perimeter quiet where distant ground clamps.
  for(let i=0;i<600;i++){
    const x=32+rand()*(atlas.width-64),y=32+rand()*(atlas.height-64),r=18+rand()*68;
    const shade=i%3?'64,115,58':'199,204,111';
    const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${shade},.22)`);g.addColorStop(1,`rgba(${shade},0)`);
    c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
  }
  const trace=(ctx,points)=>{ctx.beginPath();points.forEach(([x,z],i)=>{const [px,py]=xy(x,z);if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);});ctx.closePath();};
  const paint=(points,color='#bdbd86')=>{trace(p,points);p.fillStyle=color;p.fill();};
  const patch=(x,z,rx,rz,color='49,95,42',opacity=.17)=>{
    const [px,py]=xy(x,z);c.save();c.translate(px,py);c.scale(rx*sx,rz*sz);
    const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${color},${opacity})`);g.addColorStop(1,`rgba(${color},0)`);
    c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();
  };
  // A 512px detail tile adds small grass strokes and grains with a single extra
  // texture sample. Mipmaps filter it away naturally in the distance.
  const detail=canvas(512,512),d=detail.getContext('2d');d.fillStyle='#dedede';d.fillRect(0,0,512,512);
  for(let i=0;i<700;i++){
    const x=rand()*512,y=rand()*512,r=2+rand()*10;
    d.fillStyle=i%2?'rgba(80,80,80,.10)':'rgba(255,255,255,.15)';
    for(const ox of [0,...(x<r?[512]:[]),...(x>512-r?[-512]:[])])for(const oy of [0,...(y<r?[512]:[]),...(y>512-r?[-512]:[])]){
      d.beginPath();d.ellipse(x+ox,y+oy,r,r*.7,0,0,Math.PI*2);d.fill();
    }
  }
  for(let i=0;i<11000;i++){
    const x=rand()*512,y=rand()*512,h=1.1+rand()*4.8,w=.4+rand()*.8;
    d.strokeStyle=i%3?'rgba(72,72,72,.25)':'rgba(255,255,255,.45)';d.lineWidth=w;
    for(const ox of [0,...(x>510?[-512]:[])])for(const oy of [0,...(y<h?[512]:[])]){
      d.beginPath();d.moveTo(x+ox,y+oy);d.quadraticCurveTo(x+ox+1,y+oy-h*.55,x+ox+.7,y+oy-h);d.stroke();
    }
  }
  const texture=new THREE.CanvasTexture(atlas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const grain=new THREE.CanvasTexture(detail);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.anisotropy=4;
  const material=mats.grass.clone();material.name='continuous-painted-turf';material.color.set('#ffffff');material.map=texture;
  material.userData.groundDetail=grain;
  material.onBeforeCompile=shader=>{
    shader.uniforms.uGroundDetail={value:grain};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vGroundXZ;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGroundXZ=position.xz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uGroundDetail; varying vec2 vGroundXZ;').replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb *= .30 + .80 * texture2D(uGroundDetail,vGroundXZ*.25).r;');
  };
  material.customProgramCacheKey=()=> 'painted-turf-detail-v1';
  return {material,paint,patch,finish(){
    c.save();c.filter='blur(5px)';c.drawImage(paths,0,0);c.restore();
    texture.needsUpdate=true;
  }};
}

// Four bent, tapered blades instead of the old upright triangle spikes.
// Vertex colours keep roots close to the ground colour without extra materials.
export function makeMeadowClump(){
  const rand=seededRandom(406),positions=[],colors=[],indices=[];
  const root=new THREE.Color('#76994f'),tip=new THREE.Color('#a1bf6b');
  for(let i=0;i<4;i++){
    const a=i*Math.PI*.5+rand()*.6,dx=Math.cos(a),dz=Math.sin(a),w=.018+rand()*.012,h=.11+rand()*.085;
    const x=dx*.03,z=dz*.03,lean=.035+rand()*.035,k=positions.length/3;
    positions.push(x-dz*w,0,z+dx*w,x+dz*w,0,z-dx*w,x+dx*lean*.35-dz*w*.55,h*.55,z+dz*lean*.35+dx*w*.55,x+dx*lean*.35+dz*w*.55,h*.55,z+dz*lean*.35-dx*w*.55,x+dx*lean,h,z+dz*lean);
    for(const t of [0,0,.5,.5,1]){const color=root.clone().lerp(tip,t);colors.push(color.r,color.g,color.b);}
    indices.push(k,k+2,k+1,k+1,k+2,k+3,k+2,k+4,k+3);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function meadowMaterial(mats){const m=mats.blade.clone();m.name='soft-meadow-blades';m.color.set('#ffffff');m.vertexColors=true;return m;}
