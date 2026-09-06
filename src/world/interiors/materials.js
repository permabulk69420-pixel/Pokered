import * as THREE from 'three';
import { makeMaterials } from '../materials.js';

export function makeInteriorMaterials() {
  const m=makeMaterials();
  const colors={
    wall:'#f3e8ce',wallBlue:'#e1e7dc',wallLab:'#e7eddf',wainscot:'#bdd0b2',wainscotBlue:'#b2c9c7',
    floor:'#b5956d',floorLight:'#bd9f78',floorDark:'#a98962',floorSeam:'#8b7659',
    oak:'#9c7353',oakLight:'#bc9368',oakDark:'#6e503e',inside:'#534d3d',
    fabricRed:'#bd6253',fabricRedLight:'#d87c64',fabricBlue:'#7395a5',fabricCream:'#f5e4c1',
    bookRed:'#b75c4e',bookBlue:'#668c9b',bookGreen:'#769278',bookGold:'#ceae6c',bookCream:'#ded6b9',
    paper:'#fff4d5',ink:'#3b625d',ceramic:'#e9dbc1',pot:'#b77d54',metal:'#617875',
    screenCase:'#d5cdb5',screenEdge:'#3e5757',console:'#c9c8b9',consoleDark:'#7e8890',buttonPurple:'#81719e',
    labTile:'#d3dacb',labTileAlt:'#c9d5c6',labGrout:'#a3b8ad',labBench:'#b9cec6',
    skin:'#e9b58f',hairBrown:'#715041',hairBlonde:'#c9a065',hairGrey:'#c3c4b7',trousers:'#75694f',
  };
  for(const [name,color] of Object.entries(colors)){m[name]=m.plaster.clone();m[name].color.set(color);m[name].name=`indoor-${name}`;}
  m.eye=new THREE.MeshBasicMaterial({color:'#344743'});m.eye.name='indoor-eye';
  m.light=new THREE.MeshBasicMaterial({color:'#fff1c6'});m.light.name='indoor-light';
  m.sunPatch=new THREE.MeshBasicMaterial({color:'#ffe6ae',transparent:true,opacity:.14,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});m.sunPatch.name='indoor-sun-patch';
  m.contact=new THREE.MeshBasicMaterial({color:'#6c654b',transparent:true,opacity:.12,depthWrite:false});m.contact.name='indoor-contact';
  return m;
}

const textures=new Map();
export function artwork(kind) {
  if(textures.has(kind))return textures.get(kind);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;
  const c=canvas.getContext('2d');
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  if(kind==='window'||kind==='landscape') {
    const sky=c.createLinearGradient(0,0,0,384);sky.addColorStop(0,'#9dcecf');sky.addColorStop(1,'#e3ebc0');c.fillStyle=sky;c.fillRect(0,0,512,384);
    for(const [x,y,r,color] of [[65,262,175,'#86b18a'],[320,303,235,'#7fa984'],[490,285,190,'#6a9d7e']]){c.fillStyle=color;c.beginPath();c.ellipse(x,y,r,r*.44,0,0,Math.PI*2);c.fill();}
    rect(0,297,512,87,'#a9c47b');
    for(const [x,y,r] of [[35,192,74],[466,158,100],[415,230,56]]){
      rect(x-6,y,12,155,'#81785a');
      for(const [dx,dy,s,col] of [[0,0,1,'#548858'],[-.44,.12,.64,'#60925b'],[.36,.17,.74,'#528557'],[-.12,-.29,.7,'#79a467']]){c.fillStyle=col;c.beginPath();c.arc(x+dx*r,y+dy*r,r*s,0,Math.PI*2);c.fill();}
    }
    c.fillStyle='#edf0d5';for(const [x,y] of [[130,66],[287,104]]){c.beginPath();c.ellipse(x,y,55,13,0,0,Math.PI*2);c.fill();}
    if(kind==='landscape'){
      rect(0,0,512,384,'#bdd0c5');c.fillStyle='#f2ddb1';c.beginPath();c.arc(384,94,39,0,Math.PI*2);c.fill();
      c.fillStyle='#809f94';c.beginPath();c.moveTo(0,290);c.lineTo(132,148);c.lineTo(226,250);c.lineTo(355,109);c.lineTo(512,294);c.closePath();c.fill();
      c.fillStyle='#5b8075';c.beginPath();c.moveTo(58,340);c.lineTo(255,106);c.lineTo(461,340);c.closePath();c.fill();
      c.fillStyle='#eee5c9';c.beginPath();c.moveTo(211,159);c.lineTo(255,106);c.lineTo(310,169);c.lineTo(268,151);c.lineTo(249,169);c.lineTo(235,153);c.closePath();c.fill();
      rect(0,318,512,66,'#a9b7a0');rect(0,348,512,36,'#749c96');
    }
  } else if(kind==='map') {
    rect(0,0,512,384,'#e9dab2');rect(17,17,478,350,'#9bc4c0');
    c.fillStyle='#c6d4a0';c.beginPath();[[37,40],[470,40],[470,296],[385,318],[254,289],[201,344],[120,321],[92,180],[37,153]].forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
    c.strokeStyle='#e8bd78';c.lineWidth=13;c.lineJoin='round';
    for(const p of [[[145,280],[145,215],[119,135],[140,70],[300,70],[300,168],[423,168]],[[145,215],[227,215],[300,215],[300,168]],[[227,215],[227,300],[365,300],[365,215],[300,215]],[[145,280],[145,335],[365,335],[365,300]]]){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
    for(const [x,y] of [[145,280],[145,215],[119,135],[140,70],[300,70],[300,168],[423,168],[227,215],[300,215],[227,300],[365,300],[365,215],[145,335]]){rect(x-8,y-8,16,16,'#6b8273');rect(x-5,y-5,10,10,'#f4e7c5');}
    rect(139,274,12,12,'#bd6253');
    c.fillStyle='#476762';c.font='bold 24px serif';c.fillText('KANTO',350,62);c.font='13px sans-serif';c.fillText('PALLET',160,283);
    c.strokeStyle='#fdf2d2';c.lineWidth=2;c.beginPath();c.moveTo(256,16);c.lineTo(256,368);c.stroke();
  } else if(kind==='tv') {
    rect(0,0,512,384,'#496d69');rect(0,166,512,218,'#769176');
    c.fillStyle='#a6bca1';c.beginPath();c.moveTo(170,384);c.lineTo(235,159);c.lineTo(276,159);c.lineTo(346,384);c.fill();
    c.strokeStyle='#3d625c';c.lineWidth=7;for(const x of [195,321]){c.beginPath();c.moveTo(x,384);c.lineTo(256+(x-256)*.23,163);c.stroke();}
    for(let y=202;y<384;y+=30){rect(214-(y-202)*.14,y,81+(y-202)*.3,6,'#506e5e');}
    for(let i=0;i<4;i++){const x=179+i*50,y=175+(i%2)*13;rect(x,y,18,40,'#344f4b');rect(x+4,y-17,12,17,'#cfbc8f');rect(x,y+38,5,25,'#344f4b');rect(x+13,y+38,5,25,'#344f4b');}
  } else if(kind==='pc'||kind==='lab-pc') {
    rect(0,0,512,384,'#274e4a');rect(20,23,472,39,'#789c81');c.fillStyle='#d9e6b4';c.font='bold 22px monospace';c.fillText(kind==='pc'?'RED / PERSONAL COMPUTER':'OAK / FIELD RESEARCH',32,51);
    c.font='19px monospace';c.fillText(kind==='pc'?'Good morning, RED.':'SPECIMEN RECORDS',35,111);
    if(kind==='pc'){c.fillText('STORAGE',35,177);c.fillText('MAIL',35,221);c.fillText('LOG OFF',35,265);rect(35,317,12,5,'#d9e6b4');}
    else{for(let i=0;i<5;i++){rect(35,148+i*33,100+i*25,8,'#7da387');rect(310,148+i*33,115-i*12,8,'#acc495');}c.fillText('001  004  007',35,341);}
  } else if(kind==='notes') {
    rect(0,0,512,384,'#f5e9c8');c.fillStyle='#53716a';c.font='bold 24px serif';c.fillText('FIELD NOTES',38,55);
    for(let i=0;i<7;i++)rect(38,95+i*31,270-(i%3)*27,3,'#96a18a');
    c.strokeStyle='#799478';c.lineWidth=5;c.beginPath();c.ellipse(394,202,54,72,-.4,0,Math.PI*2);c.stroke();
    c.beginPath();c.moveTo(361,259);c.lineTo(430,143);c.stroke();
  }
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const material=new THREE.MeshBasicMaterial({map:tex,color:'#ffffff'});material.name=`indoor-art-${kind}`;
  textures.set(kind,material);return material;
}
