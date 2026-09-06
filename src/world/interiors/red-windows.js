import * as THREE from 'three';
import { Builder } from '../geometry.js';
import { INTERIORS, STOREY } from './layout.js';

const WALL_HEIGHT = 2.86;
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

function zWallWithOpening(b, span, height, thickness, x, baseY, material, opening) {
  const bottom = opening.y - opening.height / 2, top = opening.y + opening.height / 2;
  if (bottom > 0) b.box(thickness, bottom, span, x, baseY + bottom / 2, 0, material);
  if (top < height) b.box(thickness, height - top, span, x, baseY + (top + height) / 2, 0, material);
  const near = opening.z - opening.width / 2, far = opening.z + opening.width / 2;
  if (near > -span / 2) b.box(thickness, top - bottom, near + span / 2, x, baseY + (bottom + top) / 2, (-span / 2 + near) / 2, material);
  if (far < span / 2) b.box(thickness, top - bottom, span / 2 - far, x, baseY + (bottom + top) / 2, (far + span / 2) / 2, material);
}

function addWindowFrame(parent, mats, glass, x, y, z, width, height, yaw = 0) {
  const root = new THREE.Group();
  root.name = 'red-real-window';
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  parent.add(root);
  const b = new Builder(root, mats), t = 0.105, depth = 0.16;
  b.box(width + t * 2, t, depth, 0, height / 2 + t / 2, 0, 'oakLight');
  b.box(width + t * 2, t, depth, 0, -height / 2 - t / 2, 0, 'oakLight');
  b.box(t, height, depth, -width / 2 - t / 2, 0, 0, 'oakLight');
  b.box(t, height, depth, width / 2 + t / 2, 0, 0, 'oakLight');
  b.box(.05, height - .04, .075, 0, 0, .05, 'paper');
  b.box(width - .04, .05, .075, 0, 0, .05, 'paper');
  b.box(width + .28, .10, .34, 0, -height / 2 - .13, .08, 'oakLight');
  b.beam([-width / 2 - .32, height / 2 + .24, .08], [width / 2 + .32, height / 2 + .24, .08], .023, 'brass');
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const xx = side * (width / 2 + .11) + (i - 1.5) * .065;
      b.cylinder(.045, .054, height + .08, xx, -.03, .07, 'fabricCream', 8);
    }
  }
  const pane = new THREE.PlaneGeometry(width - .08, height - .08);
  b.add(pane, glass, [0, 0, .018]);
  pane.dispose();
  b.finish({shadows:false});
}

function addTree(b, x, z, scale = 1) {
  b.cylinder(.16 * scale, .22 * scale, 2.25 * scale, x, 1.125 * scale, z, 'trunk', 8);
  b.sphere(1.25 * scale, x, 2.55 * scale, z, 'leaf', [1.0, .88, .92], 10);
  b.sphere(.92 * scale, x - .72 * scale, 2.35 * scale, z + .10 * scale, 'leafLight', [1.0, .9, .9], 9);
  b.sphere(.88 * scale, x + .70 * scale, 2.42 * scale, z - .12 * scale, 'leafDark', [1.0, .92, .95], 9);
}

function addOutdoorVignette(root, mats) {
  const group = new THREE.Group();
  group.name = 'red-window-outdoor-vignette';
  root.add(group);
  const b = new Builder(group, mats);
  const sky = new THREE.MeshBasicMaterial({color:'#9dcfd4', side:THREE.DoubleSide, fog:false, toneMapped:false});
  sky.name = 'red-window-sky';

  // Separate strips keep the fake yard entirely outside the room footprint.
  b.box(17, .10, 7.0, 0, -.12, -8.25, 'grass');
  b.box(7.0, .10, 16, -8.25, -.12, 0, 'grass');
  b.box(16, .10, 6.0, 0, -.12, 8.0, 'grass');
  b.box(18, 8.5, .06, 0, 4.0, -11.75, sky);
  b.box(.06, 8.5, 18, -11.75, 4.0, 0, sky);
  b.box(18, 8.5, .06, 0, 4.0, 11.75, sky);

  // A few real 3D objects provide parallax without pretending this is Pallet Town itself.
  addTree(b, -2.7, -7.35, .95);
  addTree(b, 3.1, -8.15, .78);
  addTree(b, -7.45, -2.0, .92);
  addTree(b, 2.3, 8.0, .85);

  // Simple fence and hedge layers give the windows depth cues at standing height.
  for (const x of [-5.2, -2.6, 0, 2.6, 5.2]) b.box(.10, 1.05, .10, x, .50, -9.0, 'woodLight');
  for (const y of [.32, .76]) b.box(11.0, .10, .10, 0, y, -9.0, 'woodLight');
  for (const x of [-4.3, -1.7, .9, 3.5]) {
    b.sphere(.55, x, .48, -6.05, 'hedge', [1.35, .75, .82], 8);
    b.sphere(.08, x - .18, .83, -5.72, 'petalPink', [1, 1.1, 1], 7);
    b.sphere(.07, x + .21, .72, -5.78, 'petalCream', [1, 1.1, 1], 7);
  }
  b.finish({shadows:false});
}

export function upgradeRedHouseWindows(room) {
  if (!room?.root || room.spec?.id !== 'reds-house') return room;
  const root = room.root, spec = INTERIORS['reds-house'];
  const w = spec.width, d = spec.depth;

  const wallBoxes = [];
  for (let level = 0; level < spec.floors; level++) {
    const y = level * STOREY;
    wallBoxes.push(bounds(0, y + WALL_HEIGHT / 2, -d / 2 - .09, w + .3, WALL_HEIGHT, .18));
    wallBoxes.push(bounds(-w / 2 - .09, y + WALL_HEIGHT / 2, 0, .18, WALL_HEIGHT, d));
    if (level === 1) wallBoxes.push(bounds(0, y + WALL_HEIGHT / 2, d / 2 + .09, w + .3, WALL_HEIGHT, .18));
  }

  const fakeWindowBoxes = [];
  for (let level = 0; level < spec.floors; level++) {
    const y = level * STOREY;
    for (const x of [-.6, 1.8]) fakeWindowBoxes.push(bounds(x, y + 1.91, -d / 2 + .04, 2.10, 1.95, .82));
    fakeWindowBoxes.push(bounds(-w / 2 + .04, y + 1.84, -.9, .82, 2.00, 2.30));
    if (level === 1) fakeWindowBoxes.push(bounds(.1, y + 1.84, d / 2 - .04, 2.30, 2.00, .82));
  }

  // Remove the original solid wall boxes and every part of the decorative painted-window props.
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const boxes = mesh.material?.name === 'indoor-wall' ? [...wallBoxes, ...fakeWindowBoxes] : fakeWindowBoxes;
    removeTriangles(mesh, boxes);
  });

  const rebuilt = new THREE.Group();
  rebuilt.name = 'red-window-cutout-walls';
  root.add(rebuilt);
  const wallMaterial = [...root.children].find(o => o.isMesh && o.material?.name === 'indoor-wall')?.material;
  if (!wallMaterial) return room;
  const b = new Builder(rebuilt, {});

  const northOpenings = [
    {x:-.6, y:1.91, width:1.30, height:1.17},
    {x:1.8, y:1.91, width:1.30, height:1.17},
  ];
  const westOpening = {z:-.9, y:1.84, width:1.55, height:1.32};
  for (let level = 0; level < spec.floors; level++) {
    const y = level * STOREY;
    xWallWithOpenings(b, w + .3, WALL_HEIGHT, .18, -d / 2 - .09, y, wallMaterial, northOpenings);
    zWallWithOpening(b, d, WALL_HEIGHT, .18, -w / 2 - .09, y, wallMaterial, westOpening);
    if (level === 1) xWallWithOpenings(b, w + .3, WALL_HEIGHT, .18, d / 2 + .09, y, wallMaterial, [{x:.1, y:1.84, width:1.60, height:1.32}]);
  }
  b.finish({shadows:false});

  // Reuse the interior material instances so the new frames match the room exactly.
  const mats = {};
  root.traverse(o => { if (o.isMesh && o.material?.name?.startsWith('indoor-')) mats[o.material.name.slice(7)] = o.material; });
  for (const name of ['grass','trunk','leaf','leafLight','leafDark','hedge','woodLight','petalPink','petalCream']) {
    if (!mats[name]) root.traverse(o => { if (o.isMesh && o.material?.name === name) mats[name] = o.material; });
  }
  // Base outdoor materials are not used elsewhere in Red's room, so borrow them from the interior material factory's retained references.
  // Fall back to compact local toon materials if batching removed every example of one.
  const fallback = (name, color) => { if (!mats[name]) { mats[name] = new THREE.MeshToonMaterial({color}); mats[name].name = name; } };
  fallback('grass','#83b954'); fallback('trunk','#827353'); fallback('leaf','#43854e'); fallback('leafLight','#55964d'); fallback('leafDark','#326e48');
  fallback('hedge','#4c8150'); fallback('woodLight','#c09562'); fallback('petalPink','#ea8ead'); fallback('petalCream','#fff3c6');
  for (const name of ['oakLight','paper','brass','fabricCream']) {
    if (!mats[name]) root.traverse(o => {
      if (o.isMesh && (o.material?.name === `indoor-${name}` || o.material?.name === name)) mats[name] = o.material;
    });
  }
  fallback('brass','#d8ac62');

  const glass = new THREE.MeshBasicMaterial({color:'#d8f1ed', transparent:true, opacity:.12, depthWrite:false, side:THREE.DoubleSide, toneMapped:false});
  glass.name = 'red-window-clear-glass';
  for (let level = 0; level < spec.floors; level++) {
    const y = level * STOREY;
    for (const x of [-.6, 1.8]) addWindowFrame(root, mats, glass, x, y + 1.91, -d / 2 + .012, 1.30, 1.17, 0);
    addWindowFrame(root, mats, glass, -w / 2 + .012, y + 1.84, -.9, 1.55, 1.32, Math.PI / 2);
    if (level === 1) addWindowFrame(root, mats, glass, .1, y + 1.84, d / 2 - .012, 1.60, 1.32, Math.PI);
  }
  addOutdoorVignette(root, mats);
  root.updateMatrixWorld(true);
  return room;
}
