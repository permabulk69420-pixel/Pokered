import * as THREE from 'three';

export function makeMaterials() {
  const gradient = new THREE.DataTexture(new Uint8Array([95, 166, 215, 255]), 4, 1, THREE.RedFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...extra });
  const m = {
    plaster: toon('#f8efd6'), plasterLight: toon('#fff8df'), plasterShadow: toon('#d6d7bc'),
    trim: toon('#fffae5'), trimShade: toon('#e0d5b7'), foundation: toon('#989c87'), mortar: toon('#b8baa4'),
    roof: toon('#c74e43'), roofLight: toon('#e06b54'), roofDark: toon('#a43c3b'), roofSeam: toon('#973c38'),
    labRoof: toon('#607c86'), labRoofLight: toon('#7c9b9e'), labRoofDark: toon('#496471'),
    wood: toon('#946c48'), woodLight: toon('#c09562'), woodDark: toon('#5f5946'),
    red: toon('#ad443f'), blue: toon('#5c8b9c'), teal: toon('#4b847e'), brass: toon('#d8ac62'),
    glass: new THREE.MeshStandardMaterial({ color: '#4c859a', roughness: .25, metalness: .05 }),
    reflection: new THREE.MeshBasicMaterial({ color: '#cce8db', transparent: true, opacity: .42, depthWrite: false }),
    windowDark: toon('#254e5b'), shutter: toon('#66969d'),
    grass: toon('#83b954'), grassLight: toon('#a4cc68'), grassShade: toon('#69964c'),
    blade: toon('#6fa849', { side: THREE.DoubleSide }), bladeLight: toon('#a2c95c', { side: THREE.DoubleSide }),
    dirt: toon('#d7c392'), path: toon('#c9c691'), soil: toon('#837a4e'), edge: toon('#bbbd89'),
    leaf: toon('#43854e'), leafLight: toon('#55964d'), leafDark: toon('#326e48'), leafTop: toon('#6a9f54'),
    trunk: toon('#827353'), trunkDark: toon('#665b43'), hedge: toon('#4c8150'),
    stone: toon('#b0b49d'), stoneLight: toon('#ccceb1'), stoneDark: toon('#858e7b'),
    petalPink: toon('#ea8ead', {side:THREE.DoubleSide}), petalRose: toon('#d05b8e', {side:THREE.DoubleSide}),
    petalCream: toon('#fff3c6', {side:THREE.DoubleSide}), flowerCenter: toon('#edc866'),
    cloud: new THREE.MeshBasicMaterial({ color: '#fff8df', fog: true }),
    mountain: new THREE.MeshBasicMaterial({ color: '#8ebdb1', fog: true }),
  };
  Object.entries(m).forEach(([name, material]) => material.name = name);
  return m;
}

export function seededRandom(seed = 151) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
