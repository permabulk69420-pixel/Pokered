import * as THREE from 'three';
import { Builder } from '../geometry.js';
import { INTERIORS } from './layout.js';

const EPS = 0.018;

function bounds(cx, cy, cz, w, h, d, pad = EPS) {
  return {
    minX: cx - w / 2 - pad, maxX: cx + w / 2 + pad,
    minY: cy - h / 2 - pad, maxY: cy + h / 2 + pad,
    minZ: cz - d / 2 - pad, maxZ: cz + d / 2 + pad,
  };
}

function pointInBox(attr, i, box) {
  const x = attr.getX(i), y = attr.getY(i), z = attr.getZ(i);
  return x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY && z >= box.minZ && z <= box.maxZ;
}

function triangleInAnyBox(attr, i, boxes) {
  return boxes.some(box => pointInBox(attr, i, box) && pointInBox(attr, i + 1, box) && pointInBox(attr, i + 2, box));
}

function removeTriangles(mesh, boxes) {
  if (!boxes.length || !mesh.geometry?.attributes?.position) return;
  const original = mesh.geometry;
  const source = original.index ? original.toNonIndexed() : original;
  const position = source.getAttribute('position');
  if (!position || position.count % 3) {
    if (source !== original) source.dispose();
    return;
  }
  const names = ['position', 'normal', 'uv'].filter(name => source.getAttribute(name));
  const kept = Object.fromEntries(names.map(name => [name, []]));
  let removed = 0;
  for (let i = 0; i < position.count; i += 3) {
    if (triangleInAnyBox(position, i, boxes)) {
      removed += 3;
      continue;
    }
    for (const name of names) {
      const attr = source.getAttribute(name), out = kept[name];
      for (let v = i; v < i + 3; v++) {
        for (let c = 0; c < attr.itemSize; c++) out.push(attr.array[v * attr.itemSize + c]);
      }
    }
  }
  if (!removed) {
    if (source !== original) source.dispose();
    return;
  }
  const geometry = new THREE.BufferGeometry();
  for (const name of names) {
    const attr = source.getAttribute(name);
    geometry.setAttribute(name, new THREE.Float32BufferAttribute(kept[name], attr.itemSize));
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  original.dispose();
  if (source !== original) source.dispose();
  mesh.geometry = geometry;
}

function xWallWithOpenings(b, span, height, thickness, z, baseY, material, openings) {
  const sorted = [...openings].sort((a, c) => a.x - c.x);
  const bottom = Math.min(...sorted.map(o => o.y - o.height / 2));
  const top = Math.max(...sorted.map(o => o.y + o.height / 2));
  if (bottom > 0) b.box(span, bottom, thickness, 0, baseY + bottom / 2, z, material);
  if (top < height) b.box(span, height - top, thickness, 0, baseY + (top + height) / 2, z, material);
  let cursor = -span / 2;
  for (const o of sorted) {
    const left = o.x - o.width / 2, right = o.x + o.width / 2;
    if (left > cursor) b.box(left - cursor, top - bottom, thickness, (cursor + left) / 2, baseY + (bottom + top) / 2, z, material);
    cursor = Math.max(cursor, right);
  }
  if (cursor < span / 2) b.box(span / 2 - cursor, top - bottom, thickness, (cursor + span / 2) / 2, baseY + (bottom + top) / 2, z, material);
}

function zWallWithOpenings(b, span, height, thickness, x, baseY, material, openings) {
  const sorted = [...openings].sort((a, c) => a.z - c.z);
  const bottom = Math.min(...sorted.map(o => o.y - o.height / 2));
  const top = Math.max(...sorted.map(o => o.y + o.height / 2));
  if (bottom > 0) b.box(thickness, bottom, span, x, baseY + bottom / 2, 0, material);
  if (top < height) b.box(thickness, height - top, span, x, baseY + (top + height) / 2, 0, material);
  let cursor = -span / 2;
  for (const o of sorted) {
    const near = o.z - o.width / 2, far = o.z + o.width / 2;
    if (near > cursor) b.box(thickness, top - bottom, near - cursor, x, baseY + (bottom + top) / 2, (cursor + near) / 2, material);
    cursor = Math.max(cursor, far);
  }
  if (cursor < span / 2) b.box(thickness, top - bottom, span / 2 - cursor, x, baseY + (bottom + top) / 2, (cursor + span / 2) / 2, material);
}

function materialSet(root) {
  const mats = {};
  root.traverse(o => {
    if (!o.isMesh || !o.material?.name) return;
    if (o.material.name.startsWith('indoor-')) mats[o.material.name.slice(7)] = o.material;
    else mats[o.material.name] = o.material;
  });
  const fallback = (name, color) => {
    if (!mats[name]) {
      mats[name] = new THREE.MeshToonMaterial({color});
      mats[name].name = name;
    }
  };
  fallback('oakLight','#bc9368'); fallback('paper','#fff4d5'); fallback('brass','#d8ac62');
  fallback('fabricBlue','#7395a5'); fallback('grass','#83b954'); fallback('trunk','#827353');
  fallback('leaf','#43854e'); fallback('leafLight','#55964d'); fallback('leafDark','#326e48');
  fallback('hedge','#4c8150'); fallback('woodLight','#c09562'); fallback('petalPink','#ea8ead');
  fallback('petalCream','#fff3c6'); fallback('stoneLight','#ccceb1');
  return mats;
}

function addWindowFrame(parent, mats, glass, x, y, z, width, height, yaw = 0, {curtains=true, curtainMaterial='fabricBlue'}={}) {
  const frame = new THREE.Group();
  frame.name = 'real-window';
  frame.position.set(x, y, z);
  frame.rotation.y = yaw;
  parent.add(frame);
  const b = new Builder(frame, mats), t = .105, depth = .16;
  b.box(width + t * 2, t, depth, 0, height / 2 + t / 2, 0, 'oakLight');
  b.box(width + t * 2, t, depth, 0, -height / 2 - t / 2, 0, 'oakLight');
  b.box(t, height, depth, -width / 2 - t / 2, 0, 0, 'oakLight');
  b.box(t, height, depth, width / 2 + t / 2, 0, 0, 'oakLight');
  b.box(.05, height - .04, .075, 0, 0, .05, 'paper');
  b.box(width - .04, .05, .075, 0, 0, .05, 'paper');
  b.box(width + .28, .10, .34, 0, -height / 2 - .13, .08, 'oakLight');
  if (curtains) {
    b.beam([-width / 2 - .32, height / 2 + .24, .08], [width / 2 + .32, height / 2 + .24, .08], .023, 'brass');
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const xx = side * (width / 2 + .11) + (i - 1.5) * .065;
      b.cylinder(.045, .054, height + .08, xx, -.03, .07, curtainMaterial, 8);
    }
  }
  const pane = new THREE.PlaneGeometry(width - .08, height - .08);
  b.add(pane, glass, [0, 0, .018]);
  pane.dispose();
  b.finish({shadows:false});
}

function addTree(b, x, z, scale = 1) {
  b.cylinder(.16 * scale, .22 * scale, 2.25 * scale, x, 1.125 * scale, z, 'trunk', 8);
  b.sphere(1.22 * scale, x, 2.52 * scale, z, 'leaf', [1, .88, .92], 10);
  b.sphere(.90 * scale, x - .70 * scale, 2.32 * scale, z + .10 * scale, 'leafLight', [1, .9, .9], 9);
  b.sphere(.86 * scale, x + .68 * scale, 2.40 * scale, z - .12 * scale, 'leafDark', [1, .92, .95], 9);
}

function skyMaterial(name) {
  const material = new THREE.MeshBasicMaterial({color:'#9dcfd4', side:THREE.DoubleSide, fog:false, toneMapped:false});
  material.name = name;
  return material;
}

function addBlueVignette(root, mats) {
  const group = new THREE.Group();
  group.name = 'blue-window-outdoor-vignette';
  root.add(group);
  const b = new Builder(group, mats), sky = skyMaterial('blue-window-sky');
  b.box(17, .10, 7.0, 0, -.12, -8.25, 'grass');
  b.box(7.0, .10, 16, -8.25, -.12, 0, 'grass');
  b.box(18, 8.5, .06, 0, 4.0, -11.75, sky);
  b.box(.06, 8.5, 18, -11.75, 4.0, 0, sky);
  addTree(b, -2.8, -7.5, .90);
  addTree(b, 3.3, -8.2, .76);
  addTree(b, -7.5, 1.6, .82);
  for (const x of [-4.2, -1.6, 1.0, 3.6]) {
    b.sphere(.58, x, .50, -6.0, 'hedge', [1.35, .75, .82], 8);
    b.sphere(.075, x - .17, .82, -5.70, 'petalPink', [1, 1.1, 1], 7);
  }
  for (const z of [-4.5, -1.5, 1.5, 4.5]) b.box(.10, .95, .10, -8.7, .45, z, 'woodLight');
  for (const y of [.30, .70]) b.box(.10, .10, 10.0, -8.7, y, 0, 'woodLight');
  b.finish({shadows:false});
}

function addLabVignette(root, mats) {
  const group = new THREE.Group();
  group.name = 'lab-window-outdoor-vignette';
  root.add(group);
  const b = new Builder(group, mats), sky = skyMaterial('lab-window-sky');
  b.box(7.5, .10, 19, -9.6, -.12, 0, 'grass');
  b.box(7.5, .10, 19, 9.6, -.12, 0, 'grass');
  b.box(.06, 9.0, 20, -13.3, 4.2, 0, sky);
  b.box(.06, 9.0, 20, 13.3, 4.2, 0, sky);
  addTree(b, -9.2, -5.8, .90);
  addTree(b, -9.8, 5.4, .72);
  addTree(b, 9.5, -5.2, .78);
  addTree(b, 9.0, 5.7, .88);
  for (const side of [-1, 1]) {
    const x = side * 7.65;
    for (const z of [-5.3, -2.7, 0, 2.7, 5.3]) {
      b.sphere(.62, x, .52, z, 'hedge', [1.1, .72, 1.25], 8);
      if ((Math.round(z * 10) + side) % 2) b.sphere(.07, x - side * .28, .83, z + .15, 'petalCream', [1, 1.1, 1], 7);
    }
  }
  for (const side of [-1, 1]) {
    const x = side * 10.8;
    b.box(.12, .82, 12.5, x, .38, 0, 'stoneLight');
  }
  b.finish({shadows:false});
}

export function upgradeBlueHouseWindows(room) {
  if (!room?.root || room.spec?.id !== 'blues-house') return room;
  const root = room.root, spec = INTERIORS['blues-house'], w = spec.width, d = spec.depth, height = 2.86;
  const wallBoxes = [
    bounds(0, height / 2, -d / 2 - .09, w + .3, height, .18),
    bounds(-w / 2 - .09, height / 2, 0, .18, height, d),
  ];
  const fakeWindowBoxes = [
    bounds(1.8, 1.89, -d / 2 + .04, 2.40, 2.0, .82),
    bounds(-w / 2 + .04, 1.84, -.9, .82, 2.0, 2.35),
  ];
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const boxes = mesh.material?.name === 'indoor-wallBlue' ? [...wallBoxes, ...fakeWindowBoxes] : fakeWindowBoxes;
    removeTriangles(mesh, boxes);
  });
  const wallMaterial = [...root.children].find(o => o.isMesh && o.material?.name === 'indoor-wallBlue')?.material;
  if (!wallMaterial) return room;
  const rebuilt = new THREE.Group(); rebuilt.name = 'blue-window-cutout-walls'; root.add(rebuilt);
  const b = new Builder(rebuilt, {});
  xWallWithOpenings(b, w + .3, height, .18, -d / 2 - .09, 0, wallMaterial, [{x:1.8, y:1.89, width:1.60, height:1.15}]);
  zWallWithOpenings(b, d, height, .18, -w / 2 - .09, 0, wallMaterial, [{z:-.9, y:1.84, width:1.55, height:1.32}]);
  b.finish({shadows:false});
  const mats = materialSet(root);
  const glass = new THREE.MeshBasicMaterial({color:'#d8f1ed', transparent:true, opacity:.12, depthWrite:false, side:THREE.DoubleSide, toneMapped:false});
  glass.name = 'blue-window-clear-glass';
  addWindowFrame(root, mats, glass, 1.8, 1.89, -d / 2 + .012, 1.60, 1.15, 0, {curtains:true, curtainMaterial:'fabricBlue'});
  addWindowFrame(root, mats, glass, -w / 2 + .012, 1.84, -.9, 1.55, 1.32, Math.PI / 2, {curtains:true, curtainMaterial:'fabricBlue'});
  addBlueVignette(root, mats);
  root.updateMatrixWorld(true);
  return room;
}

export function upgradeOakLabWindows(room) {
  if (!room?.root || room.spec?.id !== 'oaks-lab') return room;
  const root = room.root, spec = INTERIORS['oaks-lab'], w = spec.width, d = spec.depth, height = 3.55;
  const wallBoxes = [
    bounds(-w / 2 - .09, height / 2, 0, .18, height, d),
    bounds(w / 2 + .09, height / 2, 0, .18, height, d),
  ];
  const fakeWindowBoxes = [];
  for (const z of [-3.9, 3.85]) for (const side of [-1, 1]) {
    fakeWindowBoxes.push(bounds(side * (w / 2 - .04), 2.14, z, .90, 2.15, 2.85));
  }
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const boxes = mesh.material?.name === 'indoor-wallLab' ? [...wallBoxes, ...fakeWindowBoxes] : fakeWindowBoxes;
    removeTriangles(mesh, boxes);
  });
  const wallMaterial = [...root.children].find(o => o.isMesh && o.material?.name === 'indoor-wallLab')?.material;
  if (!wallMaterial) return room;
  const rebuilt = new THREE.Group(); rebuilt.name = 'lab-window-cutout-walls'; root.add(rebuilt);
  const b = new Builder(rebuilt, {});
  const openings = [
    {z:-3.9, y:2.14, width:1.95, height:1.40},
    {z:3.85, y:2.14, width:1.95, height:1.40},
  ];
  zWallWithOpenings(b, d, height, .18, -w / 2 - .09, 0, wallMaterial, openings);
  zWallWithOpenings(b, d, height, .18, w / 2 + .09, 0, wallMaterial, openings);
  b.finish({shadows:false});
  const mats = materialSet(root);
  const glass = new THREE.MeshBasicMaterial({color:'#d8f1ed', transparent:true, opacity:.10, depthWrite:false, side:THREE.DoubleSide, toneMapped:false});
  glass.name = 'lab-window-clear-glass';
  for (const z of [-3.9, 3.85]) for (const side of [-1, 1]) {
    addWindowFrame(root, mats, glass, side * (w / 2 - .012), 2.14, z, 1.95, 1.40, -side * Math.PI / 2, {curtains:false});
  }
  addLabVignette(root, mats);
  root.updateMatrixWorld(true);
  return room;
}
