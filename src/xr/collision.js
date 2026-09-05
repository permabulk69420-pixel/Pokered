// Horizontal swept substeps prevent tunnelling. Resolve X and Z independently so
// the player slides along walls. All values are metres in world space.
export function overlaps(x,z,r,collider) {
  if(collider.kind==='circle') return Math.hypot(x-collider.x,z-collider.z)<r+collider.r;
  const qx=Math.max(collider.minX,Math.min(x,collider.maxX));
  const qz=Math.max(collider.minZ,Math.min(z,collider.maxZ));
  return (x-qx)**2+(z-qz)**2<r*r;
}

export function moveWithCollisions(x,z,dx,dz,colliders,radius=.23) {
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.09));
  const sx=dx/steps,sz=dz/steps;
  let blocked=null;
  for(let i=0;i<steps;i++) {
    const hitX=colliders.find(c=>overlaps(x+sx,z,radius,c));
    if(!hitX)x+=sx;else blocked=hitX.id||'obstacle';
    const hitZ=colliders.find(c=>overlaps(x,z+sz,radius,c));
    if(!hitZ)z+=sz;else blocked=hitZ.id||'obstacle';
  }
  return {x,z,blocked};
}

export function deadzone(value,threshold=.16) {
  return Math.abs(value)<threshold?0:Math.sign(value)*(Math.abs(value)-threshold)/(1-threshold);
}
