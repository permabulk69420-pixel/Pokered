import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Builder } from '../geometry.js';
import { artwork } from './materials.js';

const starterPokeballLoader=new GLTFLoader();
let starterPokeballPromise=null;
function loadStarterPokeball(){
  if(!starterPokeballPromise){
    const url=new URL('assets/pokeball/pokeball_animated_open_no_blue.glb',document.baseURI);
    starterPokeballPromise=starterPokeballLoader.loadAsync(url.href);
  }
  return starterPokeballPromise;
}

export function prop(parent,mats,id,x,y,z,draw,yaw=0) {
  const root=new THREE.Group();root.name=id;root.position.set(x,y,z);root.rotation.y=yaw;
  root.userData={id,kind:'furnishing',visualOnly:true};parent.add(root);
  const b=new Builder(root,mats);draw(b,root);b.finish();return root;
}

export function picture(b,x,y,z,w,h,kind='landscape',frame='oak') {
  b.box(w+.12,h+.12,.075,x,y,z,frame);
  b.box(w+.025,h+.025,.015,x,y,z+.043,'paper');
  const g=new THREE.PlaneGeometry(w,h);b.add(g,artwork(kind),[x,y,z+.056]);g.dispose();
}

export function bookcase(b,w=2.15,h=2.18,d=.46,seed=0) {
  b.box(w,h,d,0,h/2,0,'oakDark');b.box(w-.14,h-.13,.065,0,h/2,-d/2-.007,'inside');
  for(const x of [-w/2+.07,w/2-.07])b.box(.14,h,d+.07,x,h/2,.035,'oak');
  b.box(w+.1,.11,d+.14,0,h+.035,0,'oakLight');b.box(w+.08,.13,d+.1,0,.085,0,'oak');
  // Dark shelf recesses, individual bindings and small, cream spine labels.
  const palette=['bookRed','bookBlue','bookGreen','bookGold','bookCream'];
  for(let row=0;row<3;row++) {
    const yy=.49+row*.51;b.box(w-.15,.065,d+.02,0,yy,0,'oakLight');
    b.box(w-.28,.43,.02,0,yy+.25,d/2+.045,'inside');
    const count=Math.floor((w-.33)/.15),start=-(count*.145)/2;
    for(let i=0;i<count;i++){
      const bh=.27+((i*7+row*3+seed)%5)*.026,xx=start+(i+.5)*.145;
      b.box(.115,bh,.25,xx,yy+.036+bh/2,d/2-.04,palette[(i+row*2+seed)%5]);
      b.box(.075,.024,.012,xx,yy+.1,d/2+.091,'paper');
      if(i%3===0)b.box(.09,.01,.014,xx,yy+bh,d/2+.092,'brass');
    }
  }
  b.box(w-.26,.28,.07,0,.28,d/2+.02,'oak');
  for(const x of [-w*.24,w*.24]){b.box(w*.41,.19,.021,x,.27,d/2+.063,'oakLight');b.sphere(.025,x,.29,d/2+.09,'brass',[1,.65,1],8);}
}

export function table(b,w=2.12,d=2.0,h=.79,lab=false) {
  const top=lab?'labBench':'oakLight',leg=lab?'metal':'oak';
  b.roundBox(w,.105,d,.045,0,h-.052,0,top);b.box(w-.16,.11,d-.15,0,h-.14,0,leg);
  for(const x of [-w/2+.15,w/2-.15])for(const z of [-d/2+.15,d/2-.15])b.box(.105,h-.15,.105,x,(h-.15)/2,z,leg);
  if(lab){b.box(w-.35,.10,d-.35,0,.22,0,'labBench');b.box(w-.48,.04,d-.45,0,.28,0,'paper');}
}

export function chair(b,blue=false) {
  for(const x of [-.21,.21])for(const z of [-.20,.20])b.box(.064,.46,.065,x,.23,z,'oak');
  b.roundBox(.55,.075,.54,.022,0,.465,0,'oak');b.roundBox(.47,.06,.44,.02,0,.532,.015,blue?'fabricBlue':'fabricCream');
  for(const x of [-.22,.22])b.box(.065,.67,.065,x,.76,-.215,'oak');
  b.roundBox(.49,.30,.072,.028,0,.927,-.215,'oakLight');
  b.box(.34,.075,.014,0,.94,-.171,blue?'fabricBlue':'fabricCream');
}

export function plant(b,size=1) {
  b.cylinder(.22*size,.15*size,.35*size,0,.175*size,0,'pot',14);
  b.cylinder(.235*size,.235*size,.064*size,0,.335*size,0,'ceramic',14);
  b.cylinder(.207*size,.207*size,.024*size,0,.367*size,0,'soil',14);
  b.beam([0,.35*size,0],[.02*size,.96*size,0],.025*size,'trunk');
  for(let i=0;i<11;i++){
    const a=i*2.4,r=(.22+(i%3)*.055)*size,yy=(.61+(i%4)*.125)*size;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    b.beam([0,.48*size,0],[x,yy,z],.014*size,'leafDark',6);
    b.sphere(.17*size,x,yy,z,i%3?'leaf':'leafLight',[1,.38,1.8],8);
  }
}

export function flowers(b) {
  b.cylinder(.105,.08,.23,0,.115,0,'ceramic',14);b.cylinder(.087,.087,.01,0,.235,0,'windowDark',12);
  for(let i=0;i<5;i++){
    const a=i*2.4,x=Math.sin(a)*.11,z=Math.cos(a)*.10,y=.39+(i%3)*.055;
    b.beam([0,.21,0],[x,y,z],.009,'leaf',6);
    b.sphere(.054,x,y,z,i%2?'petalCream':'petalPink',[1,1.35,1],8);
    b.sphere(.039,x*.65,.31,z*.65,'leaf',[1.1,.28,1.7],7);
  }
}

export function television(b,consoleTV=false) {
  b.box(1.3,.48,.60,0,.24,0,'oak');
  for(const x of [-.34,.34]){b.box(.55,.26,.03,x,.23,.319,'oakLight');b.sphere(.025,x,.25,.348,'brass',[1,.7,1],8);}
  b.roundBox(1.17,.81,.58,.075,0,.91,0,'oakDark');
  b.roundBox(.91,.64,.10,.05,-.075,.95,.307,'screenEdge');
  picture(b,-.075,.95,.36,.775,.515,'tv','screenEdge');
  for(const y of [1.14,.92])b.cylinder(.057,.057,.043,.474,y,.325,'console',12,[Math.PI/2,0,0]);
  for(let i=0;i<6;i++)b.box(.105,.015,.013,.468,.62+i*.024,.327,'inside');
  b.cylinder(.055,.065,.06,0,1.348,0,'metal',10);
  b.beam([0,1.38,0],[-.28,1.70,-.01],.01,'metal',6);b.beam([0,1.38,0],[.30,1.65,-.01],.01,'metal',6);
  if(consoleTV)b.box(.25,.025,.14,.30,1.337,0,'bookRed');
}

export function computer(b,lab=false) {
  table(b,1.16,.85,.77,lab);
  b.roundBox(.80,.075,.64,.015,0,.81,0,'screenCase');b.box(.67,.10,.11,0,.825,.305,'consoleDark');
  b.box(.75,.55,.45,0,1.15,-.08,'screenCase');
  b.roundBox(.64,.45,.06,.026,0,1.15,.155,'screenEdge');
  picture(b,0,1.16,.2,.55,.345,lab?'lab-pc':'pc','screenEdge');
  b.box(.23,.038,.012,.16,.89,.339,'inside');b.sphere(.012,-.27,.91,.34,'leafLight',[1,1,.5],6);
  b.roundBox(.78,.045,.22,.012,-.03,.83,.405,'console');
  for(let r=0;r<3;r++)for(let i=0;i<12;i++)b.box(.043,.012,.041,-.346+i*.056,.859,.335+r*.057,'paper');
  b.box(.24,.012,.029,0,.86,.496,'screenCase');
}

export function gameConsole(b) {
  b.roundBox(.60,.13,.42,.037,0,.095,0,'console');
  b.box(.42,.027,.19,0,.172,-.028,'screenCase');b.box(.28,.025,.025,0,.19,-.067,'inside');
  b.box(.105,.035,.055,-.20,.177,.10,'buttonPurple');b.box(.105,.035,.055,.20,.177,.10,'buttonPurple');
  b.box(.07,.055,.009,-.11,.093,.215,'inside');b.box(.07,.055,.009,.10,.093,.215,'inside');
  b.roundBox(.34,.057,.16,.075,.18,.048,.45,'console');
  b.box(.082,.018,.026,.08,.086,.45,'screenEdge');b.box(.026,.018,.082,.08,.086,.45,'screenEdge');
  for(const [x,z] of [[.252,.418],[.285,.45],[.25,.48],[.216,.45]])b.cylinder(.016,.016,.015,x,.087,z,'buttonPurple',8);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(.1,.07,.22),new THREE.Vector3(-.16,.032,.39),new THREE.Vector3(-.09,.032,.61),new THREE.Vector3(.18,.044,.49)]);
  const wire=new THREE.TubeGeometry(curve,18,.008,5,false);b.add(wire,'screenEdge');wire.dispose();
}

export function bed(b) {
  b.box(1.17,.19,2.22,0,.27,0,'oak');
  for(const x of [-.5,.5])for(const z of [-.95,.95])b.box(.09,.28,.09,x,.14,z,'oakDark');
  b.roundBox(1.11,.20,2.12,.065,0,.445,0,'fabricCream');
  b.roundBox(1.17,.14,1.54,.05,0,.57,.28,'fabricRed');
  b.box(1.178,.033,.20,0,.655,-.33,'fabricRedLight');
  for(let i=0;i<5;i++)b.box(.018,.012,1.43,-.45+i*.23,.646,.32,'fabricRedLight');
  b.roundBox(.87,.155,.45,.075,0,.606,-.73,'paper');
  b.roundBox(1.28,.57,.10,.035,0,.52,-1.12,'oak');b.roundBox(1.26,.23,.10,.035,0,.37,1.12,'oakLight');
}

export function pokeball(b,x,y,z) {
  const mount=new THREE.Group();
  mount.name='starter-pokeball';
  mount.position.set(x,0,z);
  b.group.add(mount);

  loadStarterPokeball().then(gltf=>{
    const ball=gltf.scene.clone(true);
    ball.name='starter-pokeball-model';
    // The authored model has its red/white split vertical. Rotate it so red is
    // on top, white is on the bottom, while the button still faces +Z.
    ball.rotation.z=Math.PI/2;
    ball.updateMatrixWorld(true);

    // The old 22.4 cm procedural ball was centred at y with a .112 m radius.
    // Preserve its exact support height, but seat this much smaller real model
    // using the model's measured lower bound so it neither floats nor sinks.
    const supportY=y-.112;
    const bounds=new THREE.Box3().setFromObject(ball);
    ball.position.y+=supportY-bounds.min.y;
    ball.traverse(object=>{
      if(object.isMesh){object.castShadow=false;object.receiveShadow=true;object.frustumCulled=true;}
    });
    mount.add(ball);
  }).catch(error=>console.warn('Could not load Oak Lab starter Poké Ball.',error));
}

export function pokedex(b,x,z) {
  b.roundBox(.30,.05,.40,.018,x,.82,z,'bookRed');b.box(.26,.009,.34,x,.852,z,'fabricRed');
  b.cylinder(.024,.024,.006,x-.07,.86,z-.11,'glass',10);
  b.box(.12,.012,.17,x+.019,.86,z+.016,'oakDark');b.box(.08,.012,.08,x+.017,.868,z-.014,'bookCream');
}

export function person(b,{kind='aide',seated=false}={}) {
  const mom=kind==='mom',daisy=kind==='daisy',oak=kind==='oak',blue=kind==='blue',girl=mom||daisy||kind==='girl';
  const hair=oak?'hairGrey':daisy?'hairBlonde':'hairBrown';
  const shirt=oak||kind==='aide'?'plasterLight':mom?'fabricRed':daisy?'fabricBlue':blue?'bookBlue':'bookGreen';
  const pelvis=seated?.67:.85,head=pelvis+.64;
  if(seated){
    for(const x of [-.10,.10]){
      b.beam([x,pelvis,0],[x,.49,.31],.074,girl?'skin':'trousers',10);
      b.beam([x,.49,.31],[x,.14,.35],.048,'skin',10);
      b.roundBox(.145,.085,.27,.04,x,.085,.41,'oakDark');
    }
  }else for(const x of [-.10,.10]){
    b.cylinder(.074,.056,.69,x,.43,0,girl?'skin':'trousers',10);
    b.roundBox(.17,.11,.30,.045,x,.072,.055,'oakDark');
  }
  if(girl)b.cylinder(.175,.27,seated?.23:.40,0,pelvis-.17,seated?.065:0,shirt,14);
  b.cylinder(.195,.165,.43,0,pelvis+.20,0,shirt,14);
  if(oak||kind==='aide'){
    b.box(.12,.36,.07,0,pelvis+.23,.147,'fabricBlue');
    b.box(.095,.10,.016,.12,pelvis+.32,.178,'trimShade');
    for(const side of [-1,1])b.box(.055,.28,.045,side*.089,pelvis+.26,.19,'paper',[0,0,-side*.18]);
  }else b.box(.27,.038,.18,0,pelvis+.395,.015,'fabricCream');
  b.cylinder(.058,.065,.13,0,head-.24,0,'skin',10);
  b.sphere(.228,0,head,0,'skin',[.87,1,.89],16);
  const cap=new THREE.SphereGeometry(.234,16,9,0,Math.PI*2,0,1.52);b.add(cap,hair,[0,head+.014,-.02],[0,0,0],[.91,1,.96]);cap.dispose();
  for(const side of [-1,1]){
    b.sphere(.04,side*.197,head-.015,0,'skin',[.55,1,.7],8);
    b.sphere(.017,side*.075,head+.005,.19,'eye',[.7,1.15,.4],8);
    if(oak)b.box(.074,.024,.025,side*.074,head+.055,.19,hair,[0,0,side*.16]);
    b.beam([side*.175,pelvis+.35,0],[side*.245,pelvis+.13,.045],.063,shirt,9);
    b.beam([side*.245,pelvis+.13,.045],[side*.22,pelvis+.015,seated?.25:.075],.044,'skin',9);
    b.sphere(.05,side*.22,pelvis+.005,seated?.26:.083,'skin',[.8,1.1,.8],9);
  }
  b.sphere(.03,0,head-.05,.202,'skin',[.8,.8,.8],8);
  if(girl){b.sphere(.12,.11,head-.13,-.16,hair,[.8,1.65,.72],10);b.sphere(.066,.13,head-.01,-.16,daisy?'fabricCream':'fabricRed',[1,.6,1],9);}
  else if(blue)for(let i=0;i<5;i++)b.sphere(.08,-.14+i*.072,head+.15,.048,hair,[.65,1.5,1],8);
}