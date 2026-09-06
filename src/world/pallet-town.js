import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder } from './geometry.js';
import { makeMaterials } from './materials.js';
import { PALLET_TOWN, tileToWorld } from './layout.js';
import { createBuilding } from './buildings.js';
import { makeLandscape, makeTrees, makeGardensAndGrass, makeSky } from './landscape.js';
import { createViridianCity } from './viridian-city.js';
import { makeRoute1 } from './route1.js';
import {createGroundSurface} from './ground.js';
import { prunePalletRouteBackdrop } from './route1-prune.js';
import { addResidents } from './residents.js';
import { exteriorDoorColliders } from './interiors/layout.js';
import { chunkHeavyGrass } from './performance.js';

export function createPalletTown(scene) {
  const mats=makeMaterials(),colliders=[];
  scene.background=new THREE.Color('#bfdece');
  // Pallet's original town-scale fog began at 46 m. The connected Route 1 world
  // now extends ~90 m north, so keep the haze atmospheric rather than using it
  // as the old town boundary.
  scene.fog=new THREE.Fog('#bfdece',95,240);
  const ambient=new THREE.HemisphereLight('#e9f5ec','#688143',1.1);ambient.name='sky-fill';scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff0cf',2.65);sun.name='afternoon-sun';sun.position.set(-25,42,26);sun.target.position.set(0,0,-30);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-46,right:46,top:80,bottom:-52,near:1,far:130});
  sun.shadow.normalBias=.04;sun.shadow.bias=-.00012;sun.shadow.radius=2;
  scene.add(sun,sun.target);
  const ground=createGroundSurface(mats);
  const landscape=makeLandscape(scene,mats,PALLET_TOWN,ground);
  makeTrees(scene,mats,colliders);makeGardensAndGrass(scene,mats,PALLET_TOWN,ground);
  const sky=makeSky(scene,mats);
  extendDistantHorizon(sky);
  prunePalletRouteBackdrop(scene,colliders);
  const route1=makeRoute1(scene,mats,colliders,ground);
  chunkHeavyGrass(route1.root);
  const viridian=createViridianCity(scene,mats,colliders,ground);
  for(const c of colliders)if(c.kind==='circle'&&c.r>=.8&&c.r<=.9)ground.patch(c.x,c.z,1.55,1.55,'49,92,42',.20);
  ground.finish();
  chunkHeavyGrass(viridian.root);
  const buildings=new Map();
  for(const spec of PALLET_TOWN.buildings) {
    const group=createBuilding(spec,mats);collapseBuilding(group);scene.add(group);buildings.set(spec.id,group);
    colliders.push(...exteriorDoorColliders(spec));
  }
  const signs=new THREE.Group();signs.name='original-map-signs';scene.add(signs);
  for(const spec of PALLET_TOWN.signs) {
    const [x,z]=tileToWorld(...spec.tile);const sign=createSign(spec,mats);sign.position.set(x,0,z);signs.add(sign);
    colliders.push({kind:'box',id:spec.id,minX:x-spec.width/2,maxX:x+spec.width/2,minZ:z-.13,maxZ:z+.13});
  }
  for(const g of PALLET_TOWN.gardens) {
    const z=g.z-g.depth/2-.72;
    colliders.push({kind:'box',id:'garden-fence',minX:g.x-g.width/2-.06,maxX:g.x+g.width/2+.06,minZ:z-.1,maxZ:z+.1});
  }
  addResidents(scene,mats,colliders);
  // Walkable town bounds: use the visible tree line and water bank as the limits.
  colliders.push({kind:'box',id:'western-border',minX:-100,maxX:-18.25,minZ:-17.2,maxZ:100});
  colliders.push({kind:'box',id:'eastern-border',minX:18.25,maxX:100,minZ:-17.15,maxZ:100});
  colliders.push({kind:'box',id:'southern-border',minX:-100,maxX:100,minZ:16.05,maxZ:100});
  // Once north of the Pallet tree line Route 1 takes over the world bounds. These
  // short slabs only keep players from walking through the town's border trees.
  colliders.push({kind:'box',id:'northern-border-west',minX:-100,maxX:-2.0,minZ:-17.2,maxZ:-15.35});
  colliders.push({kind:'box',id:'northern-border-east',minX:2.0,maxX:100,minZ:-17.2,maxZ:-15.35});
  colliders.push({kind:'box',id:'water',minX:-12.3,maxX:-3.7,minZ:9.95,maxZ:100});
  return {layout:PALLET_TOWN,colliders,buildings,route1,viridian,sun,materials:mats,update:landscape.update,lightRegion:'pallet'};
}

// The original Pallet-only scene placed its fake mountain horizon just 70–95 m
// from the origin. Route 1 now physically occupies that same distance. Uniformly
// moving the merged horizon farther out preserves its apparent size from town
// while stopping the playable route from running into opaque backdrop geometry.
function extendDistantHorizon(root) {
  const hills=root?.getObjectByName('sky-and-distant-hills:mountain');
  if(!hills)return;
  hills.scale.setScalar(4.2);
  hills.renderOrder=-5;
  hills.material=hills.material.clone();
  hills.material.depthWrite=false;
}

export function createSign(spec,mats) {
  const group=new THREE.Group();group.name=spec.id;const b=new Builder(group,mats);
  const w=spec.width,h=.70;
  for(const x of [-w*.32,w*.32]) {b.box(.10,1.30,.11,x,.65,0,'wood');b.box(.16,.06,.17,x,.04,0,'stoneDark');}
  b.roundBox(w+.12,h+.12,.18,.04,0,1.25,0,'woodDark');
  b.box(w,h,.09,0,1.25,.08,'trim');
  b.box(w+.21,.055,.25,0,1.25+h/2+.09,0,'woodLight');
  for(const x of [-w/2+.07,w/2-.07]) for(const y of [1.25-h/2+.08,1.25+h/2-.08])b.sphere(.016,x,y,.139,'brass',[1,1,.4],6);
  b.finish();
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const c=canvas.getContext('2d');
  c.fillStyle='#fff5d8';c.fillRect(0,0,1024,512);
  c.strokeStyle='#b9ad87';c.lineWidth=3;c.strokeRect(25,25,974,462);
  c.textAlign='center';c.textBaseline='middle';c.fillStyle='#30574d';
  c.font=`700 ${spec.title.length>15?66:75}px sans-serif`;c.fillText(spec.title,512,spec.lines.length===2?155:188,900);
  c.fillStyle='#71836a';c.fillRect(350,260,324,3);c.fillStyle='#64725a';c.font='42px sans-serif';
  spec.lines.forEach((line,i)=>c.fillText(line,512,326+i*59,920));
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(w-.08,h-.035),new THREE.MeshBasicMaterial({map:tex}));
  label.position.set(0,1.25,.133);label.name='sign-lettering';group.add(label);
  return group;
}

export function collapseBuilding(root) {
  root.updateMatrixWorld(true);
  const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(),buckets=new Map(),remove=[];
  root.traverse(obj=> {
    if(!obj.isMesh)return;
    let p=obj;while(p!==root){if(p.name==='door-hinge')return;p=p.parent;}
    const g=obj.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,obj.matrixWorld));
    if(!buckets.has(obj.material))buckets.set(obj.material,[]);buckets.get(obj.material).push(g);remove.push(obj);
  });
  remove.forEach(obj=>{obj.removeFromParent();obj.geometry.dispose();});
  for(const [material,geos] of buckets){const g=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());const mesh=new THREE.Mesh(g,material);mesh.name=`${root.name}:${material.name}`;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
}
