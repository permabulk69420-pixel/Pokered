import * as THREE from 'three';
import {Builder} from '../geometry.js';
import {prop,table,chair,bookcase,plant,picture} from './props.js';
import {viridianRoomTile as tile,GYM_PLAN,GYM_ARROWS,GYM_STOPS} from './viridian-layout.js';

const obstacle=(ctx,id,x,z,w,d)=>ctx.nav.colliders.push({kind:'box',id,minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
function item(ctx,id,tx,ty,w,d,draw,yaw=0){
  const [x,z]=tile(ctx.spec,tx,ty);const group=prop(ctx.root,ctx.mats,id,x,0,z,draw,yaw);
  if(w&&d)obstacle(ctx,id,x,z,w,d);return group;
}
function label(ctx,text,x,y,z,w,h,{yaw=0,background='#fff0d2',color='#365e57',font=62}={}){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*h/w);const c=canvas.getContext('2d');
  const lines=text.split('\n');let size=Math.min(canvas.height*.68,canvas.height/(lines.length+.6)*(font/62));
  c.fillStyle=background;c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font=`bold ${size}px sans-serif`;
  const measured=Math.max(...lines.map(line=>c.measureText(line)?.width||0));
  if(measured>920){size*=920/measured;c.font=`bold ${size}px sans-serif`;}
  lines.forEach((line,i)=>c.fillText(line,512,canvas.height/2+(i-(lines.length-1)/2)*size*1.2,920));
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const mat=new THREE.MeshBasicMaterial({map:tex});mat.name='viridian-lettering';
  const group=prop(ctx.root,ctx.mats,'room-lettering',x,y,z,b=>{
    b.box(w+.1,h+.1,.075,0,0,0,'oakLight');const g=new THREE.PlaneGeometry(w,h);b.add(g,mat,[0,0,.041]);g.dispose();
  },yaw);return group;
}
function openWindow(ctx,x,y,z,yaw,width=1.6){
  const {root,mats}=ctx;
  prop(root,mats,'clear-daylight-window',x,y,z,b=>{
    for(const s of [-1,1]){b.box(.095,1.48,.16,s*width/2,0,0,'paper');b.box(width+.10,.08,.16,0,s*.72,0,'paper');}
    b.box(.052,1.40,.11,0,0,.015,'paper');b.box(width,.045,.11,0,0,.015,'paper');
    b.box(width+.28,.09,.34,0,-.77,.09,'oakLight');
    const glass=new THREE.MeshBasicMaterial({color:'#d8f1ed',transparent:true,opacity:.08,depthWrite:false,side:THREE.DoubleSide});glass.name='viridian-clear-glass';
    b.box(width-.06,1.38,.008,0,0,0,glass);
  },yaw);
  // Like the upgraded Pallet windows: actual openings, clear glazing, and a
  // modest 3D outdoor vignette. No flat painted scenery filling the frame.
  const view=new THREE.Group();view.name='window-garden-view';view.position.set(x,y,z);view.rotation.y=yaw;root.add(view);
  const b=new Builder(view,mats);
  b.box(width+4,.08,5,0,-y-.05,-2.7,'grass');
  for(const [xx,zz,scale] of [[-1.4,-3,1],[1.9,-4,.85]]){
    b.cylinder(.10,.15,1.5,xx,-y+.75,zz,'trunk',7);
    b.sphere(1,xx,-y+2.2,zz,'leafDark',[.9*scale,1.1*scale,.85*scale],9);
    b.sphere(.7,xx,-y+2.95,zz,'leaf',[scale,scale,scale],9);
  }
  b.finish({shadows:false});
}
function shell(ctx){
  const {spec:s,root,mats}=ctx,w=s.width,d=s.depth,gym=s.theme==='gym',house=s.theme==='house'||s.theme==='school',height=gym?4.2:3.15;
  const shell=new THREE.Group();shell.name='viridian-room-shell';root.add(shell);const b=new Builder(shell,mats);
  // Use the existing Pallet colours with subtle tile/plank variation.
  b.box(w,.13,d,0,-.09,0,house?'floorSeam':'labGrout');
  if(house){
    for(let r=0;r<32;r++)for(let c=-1;c<6;c++){
      const a=Math.max(-w/2,-w/2+c*1.92+(r%3)*.64),bb=Math.min(w/2,-w/2+(c+1)*1.92+(r%3)*.64);
      if(bb>a)b.box(bb-a-.008,.025,.292,(a+bb)/2,-.013,-d/2+(r+.5)*.3,(r+c)%5?'floor':'floorLight');
    }
  }else for(let r=0;r<s.rows*2;r++)for(let c=0;c<s.columns*2;c++){
    const mat=gym?(r%2?'labTile':'labTileAlt'):(r+c)%2?'labTile':'paper';
    b.box(.589,.025,.589,-w/2+(c+.5)*.6,-.013,-d/2+(r+.5)*.6,mat);
  }
  const wall=gym?'wallLab':s.theme==='mart'?'wallBlue':'wall';
  // Only the domestic rooms have the original north-wall window. Split the
  // wall itself around it, then add clear glass and geometry beyond the hole.
  const windowX=s.theme==='house'?1.8:-3.0;
  if(house){
    const ww=1.6,wy=1.95,wh=1.45,lo=windowX-ww/2,hi=windowX+ww/2;
    b.box(w,wy-wh/2,.18,0,(wy-wh/2)/2,-d/2-.09,wall);
    b.box(w,height-wy-wh/2,.18,0,(height+wy+wh/2)/2,-d/2-.09,wall);
    b.box(lo+w/2,wh,.18,(-w/2+lo)/2,wy,-d/2-.09,wall);
    b.box(w/2-hi,wh,.18,(hi+w/2)/2,wy,-d/2-.09,wall);
    openWindow(ctx,windowX,wy,-d/2+.012,0,ww);
  }else b.box(w+.2,height,.18,0,height/2,-d/2-.09,wall);
  for(const sign of [-1,1]){
    b.box(.18,height,d,sign*(w/2+.09),height/2,0,wall);
    b.box(.045,.70,d,sign*(w/2-.015),.38,0,gym?'stone':s.theme==='mart'?'wainscotBlue':'wainscot');
    b.box(.07,.07,d,sign*(w/2-.025),.76,0,'paper');
    b.box(.065,.10,d,sign*(w/2-.025),.055,0,'oak');
  }
  const dx=s.doorX,dw=s.doorWidth,left=dx-dw/2+w/2,right=w/2-dx-dw/2;
  b.box(left,height,.18,-w/2+left/2,height/2,d/2+.09,wall);
  b.box(right,height,.18,dx+dw/2+right/2,height/2,d/2+.09,wall);
  b.box(dw,height-2.3,.18,dx,2.3+(height-2.3)/2,d/2+.09,wall);
  for(const zz of [-d/2+.018,d/2-.018])b.box(w,.08,.08,0,height-.065,zz,'paper');
  for(const xx of [-w/2+.018,w/2-.018])b.box(.08,.08,d,xx,height-.065,0,'paper');
  b.box(w,.69,.04,0,.38,-d/2+.018,gym?'stone':'wainscot');b.box(w,.08,.065,0,.76,-d/2+.025,'paper');
  b.box(dw,.07,1.05,dx,-.035,d/2+.52,'oak');
  for(const sign of [-1,1]){
    b.box(.12,2.36,.18,dx+sign*(dw/2+.02),1.18,d/2+.015,'oakLight');
    b.box(.16,2.55,1.05,dx+sign*(dw/2+.08),1.275,d/2+.53,wall);
    obstacle(ctx,'entry-jamb',dx+sign*(dw/2+.08),d/2+.53,.16,1.05);
  }
  b.box(dw+.24,.13,.18,dx,2.35,d/2+.015,'oakLight');
  b.box(dw,.1,1.10,dx,2.5,d/2+.55,'paper');
  b.box(dw,2.5,.12,dx,1.25,d/2+1.1,'wallBlue');
  b.box(dw+.25,.014,.95,dx,.008,d/2-.54,s.theme==='center'?'fabricRed':'fabricBlue');
  for(const zz of [d/2-.91,d/2-.18])b.box(dw+.08,.016,.032,dx,.012,zz,'fabricCream');
  b.finish({shadows:false});
  const ceiling=new THREE.Group();ceiling.name='room-ceilings';root.add(ceiling);const cb=new Builder(ceiling,mats);
  cb.box(w,.12,d,0,height+.06,0,'plasterLight');cb.finish({shadows:false});ceiling.traverse(o=>{if(o.isMesh)o.receiveShadow=false;});
  obstacle(ctx,'north-wall',0,-d/2-.15,w+.6,.3);obstacle(ctx,'west-wall',-w/2-.15,0,.3,d+.6);obstacle(ctx,'east-wall',w/2+.15,0,.3,d+.6);
  obstacle(ctx,'south-wall-left',-w/2+left/2,d/2+.15,left,.3);obstacle(ctx,'south-wall-right',dx+dw/2+right/2,d/2+.15,right,.3);obstacle(ctx,'vestibule-back',dx,d/2+1.1,dw+.3,.15);
  for(const x of gym?[-7,0,7]:s.theme==='center'?[-4.8,3.6]:[0])for(const z of gym?[-6,3]:[0]){
    prop(root,mats,'ceiling-light',x,height,z,b=>{
      b.cylinder(.11,.13,.08,0,-.04,0,'metal',12);
      b.cylinder(.015,.015,.18,0,-.16,0,'metal',6);
      b.cylinder(.18,.38,.20,0,-.34,0,house?'fabricCream':'paper',16);
      b.cylinder(.32,.32,.02,0,-.45,0,'light',16);
    });
  }
}
function counter(b,w,d=1.0,accent='fabricRed'){
  b.box(w,.91,d,0,.455,0,'screenCase');b.box(w-.07,.52,.04,0,.47,d/2+.02,accent);
  b.box(w,.10,.07,0,.15,d/2+.03,'paper');b.roundBox(w+.12,.11,d+.12,.04,0,.945,0,'paper');
  for(let x=-w/2+.5;x<w/2;x+=1)b.box(.02,.47,.025,x,.47,d/2+.045,'trimShade');
}
function terminal(b,{desk=true}={}){
  if(desk)table(b,1.10,.92,.75,true);
  const y=desk?.75:0;
  b.box(.88,.12,.67,0,y+.06,0,'screenCase');b.roundBox(.79,.64,.49,.045,0,y+.43,-.05,'screenCase');
  b.box(.66,.48,.055,0,y+.45,.22,'screenEdge');b.box(.56,.36,.015,0,y+.46,.253,'glass');
  b.box(.42,.02,.012,0,y+.5,.265,'leafLight');b.box(.32,.016,.012,-.05,y+.42,.265,'leafLight');
  b.roundBox(.80,.04,.22,.01,0,y+.14,.40,'console');
  for(let r=0;r<3;r++)for(let c=0;c<10;c++)b.box(.05,.011,.04,-.30+c*.066,y+.166,.33+r*.052,'paper');
}
function center(ctx){
  item(ctx,'healing-counter',2.5,2,4.7,1.05,b=>counter(b,4.7));
  item(ctx,'link-counter-left',8,2,5.85,1.05,b=>counter(b,5.85,1,'fabricBlue'));
  item(ctx,'link-counter-right',12.75,2,1.6,1.05,b=>counter(b,1.6,1,'fabricBlue'));
  for(const x of [0,5])item(ctx,`center-divider-${x}`,x,1,.56,3.4,b=>{
    b.box(.56,2.8,3.4,0,1.4,0,'wallLab');b.box(.65,.12,3.5,0,2.75,0,'paper');
  });
  item(ctx,'healing-console',1.3,.48,1.3,.75,b=>terminal(b));
  item(ctx,'healing-machine',3.65,.40,1.25,.80,b=>{
    b.roundBox(1.15,1.44,.73,.09,0,.72,0,'screenCase');b.box(1.07,.12,.79,0,1.38,0,'fabricRed');
    b.box(.87,.31,.035,0,1.07,.385,'screenEdge');b.box(.73,.20,.045,0,1.09,.41,'glass');
    for(let i=0;i<6;i++)b.cylinder(.10,.11,.035,-.34+(i%3)*.34,1.473,-.18+Math.floor(i/3)*.34,'metal',12);
    b.cylinder(.10,.10,.05,0,1.12,.43,'paper',16,[Math.PI/2,0,0]);b.box(.10,.026,.06,0,1.12,.47,'fabricRed');
  });
  item(ctx,'link-terminal',6.3,.48,1.20,.8,b=>terminal(b));
  for(const x of [10,12])item(ctx,`link-room-door-${x}`,x,0,0,0,b=>{
    b.box(.9,2.25,.07,0,1.125,-.48,'fabricBlue');b.box(.96,.08,.10,0,2.29,-.43,'paper');
    b.box(.63,.50,.04,0,1.65,-.425,'glass');b.sphere(.035,.30,1.06,-.40,'brass',[1,1,1],8);
  });
  item(ctx,'public-pc',13,3.5,1.12,1.0,b=>terminal(b),-Math.PI/2);
  item(ctx,'waiting-bench',0,4.4,.75,1.7,b=>{
    b.roundBox(1.7,.16,.65,.06,0,.52,0,'fabricRed');b.roundBox(1.7,.48,.14,.045,0,.89,-.29,'fabricRed');
    for(const x of [-.65,.65])b.box(.08,.45,.48,x,.225,0,'metal');
  },Math.PI/2);
  for(const x of [0,1,6,7,12,13])item(ctx,`center-plant-${x}`,x,6.75,.52,.52,b=>plant(b,.95));
  label(ctx,'POKÉMON CENTER',-4.25,2.35,-4.69,3.7,.47);
  label(ctx,'CABLE CLUB',3.25,2.4,-4.69,2.4,.4,{background:'#d7e4df'});
}
function stockShelf(b,w,h=1.65,seed=0){
  seed=Math.floor(seed);
  b.box(w,h,.58,0,h/2,0,'oakDark');
  b.box(w+.08,.08,.65,0,h,0,'oakLight');
  for(const x of [-w/2,w/2])b.box(.07,h,.69,x,h/2,0,'oakLight');
  const rows=h>2?4:3,spacing=(h-.49)/(rows-1);
  for(let r=0;r<rows;r++){
    const y=.10+r*spacing;b.box(w+.08,.07,.65,0,y,0,'paper');
    for(let i=0;i<Math.floor(w/.28);i++){
      const x=-w/2+.17+i*.28,mat=['bookRed','bookBlue','bookGreen','bookGold'][(i+r+seed)%4];
      if((i+r)%2){b.cylinder(.065,.076,.22,x,y+.145,.23,mat,10);b.cylinder(.04,.04,.06,x,y+.28,.23,'paper',8);}
      else {b.box(.18,.28,.21,x,y+.175,.23,mat);b.box(.13,.09,.015,x,y+.19,.344,'paper');}
    }
  }
}
function mart(ctx){
  for(const [x,w] of [[.5,2.22],[3.5,4.55],[6.5,2.22]])item(ctx,`mart-back-stock-${x}`,x,.1,w,.65,b=>stockShelf(b,w,2.35,x));
  item(ctx,'mart-middle-stock',5.5,3,4.6,1.04,b=>{
    stockShelf(b,4.6,1.48);b.box(4.6,1.38,.13,0,.71,-.4,'oakLight');b.box(4.7,.09,1.06,0,1.56,0,'paper');
  });
  item(ctx,'mart-counter-head',.5,3,2.14,1.0,b=>counter(b,2.14,1,'fabricBlue'));
  item(ctx,'mart-clerk-counter',1.0,5,1.0,2.5,b=>{
    counter(b,2.5,1,'fabricBlue');b.box(.34,.25,.32,0,1.13,.04,'screenCase');b.box(.25,.12,.035,0,1.18,.22,'screenEdge');
    for(let x=0;x<3;x++)for(let z=0;z<3;z++)b.box(.045,.014,.035,-.08+x*.07,1.02,.28+z*.045,'paper');
  },-Math.PI/2);
  item(ctx,'mart-counter-base',.35,6,1.75,.6,b=>counter(b,1.75,.6,'fabricBlue'));
  label(ctx,'POKÉ MART',0,2.75,-4.69,2.7,.42);
  for(const x of [-3.6,3.6])label(ctx,'SALE',x,2.15,-4.42,1.0,.3,{background:'#f1ddab'});
}
function school(ctx){
  item(ctx,'school-books',7,.1,1.08,.58,b=>bookcase(b,1.08,2.16,.49,4));
  label(ctx,'POKÉMON STATUS\nPOISON   BURN   FREEZE\nPARALYSIS   SLEEP',.6,1.9,-4.67,2.45,1.35,{background:'#305950',color:'#f7ebc9',font:57});
  prop(ctx.root,ctx.mats,'blackboard-chalk-tray',.6,1.15,-4.59,b=>{b.box(2.55,.075,.21,0,0,0,'oak');b.cylinder(.015,.015,.12,-.76,.055,.05,'paper',6,[0,0,Math.PI/2]);b.box(.17,.045,.06,.62,.055,.05,'inside');});
  item(ctx,'school-study-desk',3.5,3.5,2.12,2.05,b=>{
    table(b,2.12,2.05,.79);b.box(.57,.035,.46,-.40,.82,.27,'bookBlue');
    b.box(.26,.012,.40,-.54,.845,.27,'paper');b.box(.26,.012,.40,-.26,.845,.27,'paper');
    for(let r=0;r<5;r++){b.box(.18,.003,.012,-.54,.853,.14+r*.05,'ink');b.box(.18,.003,.012,-.26,.853,.14+r*.05,'ink');}
    b.cylinder(.009,.009,.22,.13,.82,.26,'brass',6,[0,0,Math.PI/2]);
  });
  item(ctx,'school-student-chair',3,5.1,.57,.60,b=>chair(b),Math.PI);
  for(const x of [0,7])item(ctx,`school-plant-${x}`,x,6.8,.58,.58,b=>plant(b,1.12));
}
function nicknameHouse(ctx){
  item(ctx,'nickname-books',.5,.1,2.15,.55,b=>bookcase(b,2.15,2.18,.46,2));
  item(ctx,'nickname-east-books',7,.1,1.08,.55,b=>bookcase(b,1.08,2.18,.46,5));
  prop(ctx.root,ctx.mats,'nickname-picture',-.6,1.99,-4.68,b=>picture(b,0,0,0,1.05,.85,'landscape','oakDark'));
  label(ctx,'SPEARY',.6,2.18,-4.67,.65,.46,{font:110});
  item(ctx,'nickname-table',3.5,3.5,2.12,2.0,b=>table(b));
  for(const x of [2,5])for(const y of [3,4])item(ctx,`nickname-chair-${x}-${y}`,x,y,.58,.58,b=>chair(b),x===2?Math.PI/2:-Math.PI/2);
  for(const x of [0,7])item(ctx,`nickname-plant-${x}`,x,6.8,.58,.58,b=>plant(b,1.12));
}
function statue(b){
  b.box(.79,.12,.79,0,.06,0,'stoneDark');b.box(.60,.67,.60,0,.44,0,'stone');b.box(.79,.11,.79,0,.83,0,'stoneLight');
  b.box(.34,.20,.03,0,.49,.32,'metal');
  b.sphere(.30,0,1.15,0,'stone',[1,1.05,.7],10);b.sphere(.24,0,1.53,.04,'stoneLight',[1.15,.85,.9],10);
  b.sphere(.16,0,1.44,.23,'stone',[1.1,.65,1],9);b.cylinder(0,.10,.26,0,1.59,.25,'stoneLight',8,[-.5,0,0]);
  for(const side of [-1,1]){b.sphere(.12,side*.24,1.19,.1,'stone',[.8,1.5,.8],8);b.sphere(.15,side*.16,.97,.15,'stoneDark',[1,.5,1.25],8);b.cylinder(0,.10,.22,side*.19,1.72,-.015,'stone',7);}
}
function gym(ctx){
  // Coalesce solid source tiles into row runs. Human-height partitions preserve
  // the maze silhouette while keeping the narrow original corridors walkable.
  for(let y=0;y<18;y++)for(let x=0;x<20;){
    if(GYM_PLAN[y][x]!=='#'){x++;continue;}const start=x;while(x<20&&GYM_PLAN[y][x]==='#')x++;
    const count=x-start,[cx,cz]=tile(ctx.spec,start+(count-1)/2,y),w=count*1.2;
    prop(ctx.root,ctx.mats,`gym-maze-${start}-${y}`,cx,0,cz,b=>{
      b.box(w,1.85,1.2,0,.925,0,'stone');b.box(w+.015,.11,1.215,0,1.89,0,'stoneLight');
      b.box(w+.02,.12,1.22,0,.12,0,'stoneDark');
      for(let i=0;i<count;i++)for(const side of [-1,1]){const xx=-w/2+(i+.5)*1.2;b.box(1.08,1.42,.025,xx,.98,side*.615,'wallLab');}
    });
    obstacle(ctx,`gym-maze-${start}-${y}`,cx,cz,w,1.2);
  }
  for(const [x,y,dir] of GYM_ARROWS){
    const [cx,cz]=tile(ctx.spec,x,y);prop(ctx.root,ctx.mats,`gym-arrow-${x}-${y}`,cx,.012,cz,b=>{
      b.box(1.10,.018,1.10,0,0,0,'paper');
      const points=[[-.10,0,.36],[.10,0,.36],[.10,0,-.03],[.31,0,-.03],[0,0,-.38],[-.31,0,-.03],[-.10,0,-.03]];
      const shape=new THREE.Shape();points.forEach(([xx,,zz],i)=>i?shape.lineTo(xx,-zz):shape.moveTo(xx,-zz));shape.closePath();const geo=new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);b.add(geo,'teal',[0,.011,0]);geo.dispose();
    },{up:0,right:-Math.PI/2,down:Math.PI,left:Math.PI/2}[dir]);
  }
  for(const [x,y] of GYM_STOPS){const [cx,cz]=tile(ctx.spec,x,y);prop(ctx.root,ctx.mats,`gym-stop-${x}-${y}`,cx,.012,cz,b=>{
    b.box(1.08,.018,1.08,0,0,0,'stoneDark');for(const a of [-.25,.25])for(const d of [-.25,.25]){b.box(.38,.019,.38,a,.008,d,'paper');b.box(.25,.020,.25,a,.012,d,'teal');}
  });}
  for(const x of [15,18])item(ctx,`gym-entrance-statue-${x}`,x,15,.80,.80,b=>statue(b));
}
export function buildViridianRoom(ctx){
  shell(ctx);
  const builders={center,mart,school,house:nicknameHouse,gym};builders[ctx.spec.theme](ctx);
}
