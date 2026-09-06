import { moveWithCollisions, overlaps } from './collision.js';

export function onStairs(stairs, x, z) {
  return !!stairs && x>=stairs.minX && x<=stairs.maxX && z>=stairs.topZ && z<=stairs.bottomZ;
}

// The visible treads sit over a continuous walking ramp. Floor height belongs
// to the player rig, never the tracked head: crouching and real height survive.
export function floorAt(navigation, x, z, previousHeight=0) {
  const s=navigation.stairs;
  if(!s)return 0;
  if(onStairs(s,x,z))return (s.bottomZ-z)/(s.bottomZ-s.topZ)*s.rise;
  return previousHeight>s.rise/2?s.rise:0;
}

export function moveWithNavigation(x,z,y,dx,dz,navigation,radius=.23) {
  if(!navigation.stairs) return {...moveWithCollisions(x,z,dx,dz,navigation.colliders,radius),y:0};
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.06));
  const sx=dx/count,sz=dz/count;let blocked=null;
  const tryStep=(nx,nz)=> {
    const ny=floorAt(navigation,nx,nz,y);
    // Also guard the stair opening itself. You cannot enter half-way up from
    // the side or fall from the bedroom into the ground-floor stair entrance.
    if(Math.abs(ny-y)>.12){blocked='stair-edge';return;}
    const level=ny>navigation.stairs.rise/2?1:0;
    const hit=navigation.colliders.find(c=>(c.level===undefined||c.level===level)&&overlaps(nx,nz,radius,c));
    if(hit){blocked=hit.id;return;}
    x=nx;z=nz;y=ny;
  };
  for(let i=0;i<count;i++){if(sx)tryStep(x+sx,z);if(sz)tryStep(x,z+sz);}
  return {x,z,y,blocked};
}
