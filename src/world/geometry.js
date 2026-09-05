import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Static architecture is merged by material. Buildings keep stable parent groups;
// doors remain individual pivoted meshes for the later mechanics pass.
export class Builder {
  constructor(group, materials) { this.group = group; this.materials = materials; this.parts = new Map(); }
  add(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.applyMatrix4(matrix);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(key)) g.deleteAttribute(key);
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material).push(g);
    return this;
  }
  box(w,h,d,x,y,z,material,rotation=[0,0,0]) {
    const g = new THREE.BoxGeometry(w,h,d); this.add(g,material,[x,y,z],rotation); g.dispose(); return this;
  }
  roundBox(w,h,d,r,x,y,z,material,rotation=[0,0,0]) {
    const g = new RoundedBoxGeometry(w,h,d,1,r); this.add(g,material,[x,y,z],rotation);g.dispose();return this;
  }
  cylinder(rt,rb,h,x,y,z,material,segments=10,rotation=[0,0,0]) {
    const g = new THREE.CylinderGeometry(rt,rb,h,segments);this.add(g,material,[x,y,z],rotation);g.dispose();return this;
  }
  sphere(r,x,y,z,material,scale=[1,1,1],segments=10) {
    const g = new THREE.SphereGeometry(r,segments,7);this.add(g,material,[x,y,z],[0,0,0],scale);g.dispose();return this;
  }
  beam(a,b,r,material,segments=8) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), dir = bv.clone().sub(av);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    return this.cylinder(r,r,dir.length(),...(av.add(bv).multiplyScalar(.5).toArray()),material,segments,[e.x,e.y,e.z]);
  }
  finish({ shadows = true } = {}) {
    for (const [key, geos] of this.parts) {
      const merged = mergeGeometries(geos, false); geos.forEach(g=>g.dispose());
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, typeof key === 'string' ? this.materials[key] : key);
      mesh.name = `${this.group.name}:${typeof key === 'string' ? key : key.name || 'surface'}`;
      mesh.castShadow = shadows; mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    this.parts.clear(); return this.group;
  }
}

export function faceGeometry(points) {
  const g = new THREE.BufferGeometry();
  const verts = [];
  for(let i=1;i<points.length-1;i++) verts.push(...points[0],...points[i],...points[i+1]);
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.computeVertexNormals();
  return g;
}

export function groundPolygon(points, material, y = .015) {
  const shape = new THREE.Shape();
  points.forEach(([x,z],i)=>i===0?shape.moveTo(x,-z):shape.lineTo(x,-z));shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);
  const mesh = new THREE.Mesh(geometry,material);mesh.position.y=y;mesh.receiveShadow=true;return mesh;
}

export function instanceSet(geometry,material,transforms,name,shadows=true) {
  const mesh = new THREE.InstancedMesh(geometry,material,transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((p,i)=>{
    dummy.position.set(...p.position);dummy.rotation.set(...(p.rotation || [0,0,0]));dummy.scale.set(...(p.scale || [1,1,1]));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    if(p.color) mesh.setColorAt(i,new THREE.Color(p.color));
  });
  mesh.name=name;mesh.castShadow=shadows;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;
  mesh.computeBoundingSphere();return mesh;
}
