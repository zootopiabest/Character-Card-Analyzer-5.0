import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {importCardFile} from '../src/importer.js';
import {isolateGreetings} from '../src/greeting-context.js';
const crc32=bytes=>{let c=0xffffffff;for(const byte of bytes){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
function zip(files,{compressed=false,prefix=false,encrypted=false,oversized=false,corrupt=false}={}){
  const local=[],central=[];let offset=0;
  for(const [name,content] of files){
    const raw=Buffer.from(content),data=compressed?deflateRawSync(raw):raw,n=Buffer.from(name),crc=crc32(raw);
    const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(encrypted?1:0,6);header.writeUInt16LE(compressed?8:0,8);
    header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(raw.length,22);header.writeUInt16LE(n.length,26);
    local.push(header,n,data);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(encrypted?1:0,8);c.writeUInt16LE(compressed?8:0,10);
    c.writeUInt32LE(corrupt?(crc^1)>>>0:crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(oversized?16*1024*1024:raw.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);
    central.push(c,n);offset+=30+n.length+data.length;
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  const bytes=Buffer.concat([...(prefix?[Buffer.from([0xff,0xd8,0xff,0xd9])]:[]),...local,directory,end]);
  const file=new Blob([bytes]);file.name='card.charx';return file;
}
const card=JSON.stringify({spec:'chara_card_v3',data:{name:'Archive',description:'Profile with ## First Message inside prose.',first_mes:'FIRST',alternate_greetings:['','THIRD'],tags:['Non-romantic'],
  assets:[{type:'icon',name:'main',uri:'embeded://assets/icon/main.png',ext:'png'}],extensions:{wyvern:{greetings:[{scenario:'SCENE_1'},{scenario:'BLANK'},{scenario:'SCENE_3'}]}}}});
const icon=Buffer.from('89504e470d0a1a0a','hex');
for(const compressed of [false,true])for(const prefix of [false,true]){
  test(`CharX reads card and embedded icon (compressed=${compressed}, prefix=${prefix})`,async()=>{
    const result=await importCardFile(zip([['card.json',card],['assets/icon/main.png',icon]],{compressed,prefix}));
    assert.match(result.image,/^data:image\/png;base64,/);assert.match(result.text,/Non-romantic/);
    const isolated=isolateGreetings(result.text);assert.equal(isolated.greetings[1].originalIndex,2);assert.match(isolated.active(1),/SCENE_3/);
    assert.doesNotMatch(isolated.active(1),/SCENE_1|BLANK/);
  });
}
test('CharX rejects corrupt, encrypted, duplicate, missing and oversized card entries',async()=>{
  for(const opts of [{corrupt:true},{encrypted:true},{oversized:true}])await assert.rejects(importCardFile(zip([['card.json',card]],opts)),/corrupt|Encrypted|size limit/);
  await assert.rejects(importCardFile(zip([['elsewhere/card.json',card]])),/missing card.json/);
  await assert.rejects(importCardFile(zip([['card.json',card],['card.json',card]])),/Duplicate/);
  const invalid=new Blob(['not a zip']);invalid.name='bad.charx';await assert.rejects(importCardFile(invalid),/Invalid CharX/);
});
test('a missing optional CharX portrait preserves usable text and exposes a warning',async()=>{
  const result=await importCardFile(zip([['card.json',card]]));
  assert.equal(result.image,null);assert.match(result.card.warnings[0],/Portrait not imported/);assert.match(result.text,/Archive/);
});
