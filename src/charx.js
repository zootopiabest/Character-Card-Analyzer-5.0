import {parseCard} from "./card-context.js?v=5.2.0";

const MiB=1024*1024;
const decoder=new TextDecoder('utf-8',{fatal:true});
const crcTable=Uint32Array.from({length:256},(_,n)=>{
  for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;
  return n>>>0;
});
const crc32=bytes=>{
  let crc=0xffffffff;
  for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
};
async function unpack(bytes,entry,limit) {
  if(entry.size>limit)throw new Error('CharX '+entry.name+' exceeds its size limit.');
  let output;
  if(entry.method===0)output=bytes;
  else if(entry.method===8){
    if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot decompress CharX archives. Try a JSON export.');
    let decompressor;
    try{decompressor=new DecompressionStream('deflate-raw');}
    catch{throw new Error('This browser cannot decompress CharX archives. Try a JSON export.');}
    const reader=new Blob([bytes]).stream().pipeThrough(decompressor).getReader();
    const chunks=[];let size=0;
    try{
      for(;;){
        const {value,done}=await reader.read();if(done)break;
        size+=value.length;
        if(size>limit||size>entry.size)throw new Error('CharX entry expands beyond its declared size.');
        chunks.push(value);
      }
    }catch(error){await reader.cancel().catch(()=>{});throw error;}
    output=new Uint8Array(size);let pos=0;
    for(const chunk of chunks){output.set(chunk,pos);pos+=chunk.length;}
  }else throw new Error('Unsupported CharX compression. Export a standard ZIP or JSON card.');
  if(output.length!==entry.size||crc32(output)!==entry.crc)throw new Error('CharX entry is corrupt: '+entry.name);
  return output;
}
export async function readCharx(file) {
  if(file.size>64*MiB)throw new Error('CharX archive exceeds 64 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);
  const u16=p=>view.getUint16(p,true),u32=p=>view.getUint32(p,true);
  let end=-1;
  for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){
    if(u32(p)===0x06054b50&&p+22+u16(p+20)===bytes.length){end=p;break;}
  }
  if(end<0)throw new Error('Invalid CharX ZIP archive.');
  if(u16(end+4)||u16(end+6)||u16(end+8)!==u16(end+10))throw new Error('Multi-disk CharX archives are unsupported.');
  const count=u16(end+10),centralSize=u32(end+12),offset=u32(end+16);
  if(count===65535||centralSize===0xffffffff||offset===0xffffffff)throw new Error('ZIP64 CharX archives are unsupported.');
  // Account for a self-extracting/JPEG prefix without writing archive paths to disk.
  const base=end-centralSize-offset,start=base+offset;
  if(base<0||start<0||start>end)throw new Error('Invalid CharX archive offsets.');
  const entries=new Map();let p=start;
  for(let i=0;i<count;i++){
    if(p+46>end||u32(p)!==0x02014b50)throw new Error('Invalid CharX directory.');
    const nameLen=u16(p+28),extraLen=u16(p+30),commentLen=u16(p+32),next=p+46+nameLen+extraLen+commentLen;
    if(next>end)throw new Error('Incomplete CharX directory.');
    const name=decoder.decode(bytes.subarray(p+46,p+46+nameLen));
    if(entries.has(name))throw new Error('Duplicate CharX archive path: '+name);
    entries.set(name,{name,flags:u16(p+8),method:u16(p+10),crc:u32(p+16),packed:u32(p+20),size:u32(p+24),local:base+u32(p+42)});
    p=next;
  }
  if(p!==end)throw new Error('Invalid CharX directory size.');
  async function read(name,limit){
    const entry=entries.get(name);
    if(!entry)throw new Error('CharX is missing '+name+'.');
    if(entry.flags&1)throw new Error('Encrypted CharX archives are unsupported.');
    const q=entry.local;
    if(q<base||q+30>start||u32(q)!==0x04034b50)throw new Error('Invalid CharX entry offset.');
    const dataStart=q+30+u16(q+26)+u16(q+28),dataEnd=dataStart+entry.packed;
    if(dataStart>start||dataEnd>start||u16(q+8)!==entry.method||u16(q+6)!==entry.flags)throw new Error('Invalid CharX entry header.');
    if(decoder.decode(bytes.subarray(q+30,q+30+u16(q+26)))!==name)throw new Error('CharX entry names disagree.');
    return unpack(bytes.subarray(dataStart,dataEnd),entry,limit);
  }
  let parsed;
  try{parsed=JSON.parse(decoder.decode(await read('card.json',15*MiB)));}
  catch(error){throw new Error('Cannot read CharX card.json: '+error.message);}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('CharX card.json must contain a card object.');
  const card=parseCard(parsed),assets=parsed.data?.assets||parsed.assets;
  const icons=Array.isArray(assets)?assets.filter(a=>a?.type==='icon'&&typeof a.uri==='string'&&/^embeded:\/\//.test(a.uri)):[];
  icons.sort((a,b)=>Number(b.name==='main')-Number(a.name==='main'));
  let image=null;
  if(icons.length){
    const icon=icons[0],path=icon.uri.slice('embeded://'.length);
    const ext=(path.split('.').pop()||icon.ext||'').toLowerCase(),mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',avif:'image/avif'}[ext];
    if(mime){
      try{
        const data=await read(path,8*MiB);let binary='';
        for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));
        image='data:'+mime+';base64,'+btoa(binary);
      }catch(error){card.warnings.push('Portrait not imported: '+error.message);}
    }else card.warnings.push('The embedded icon format is unsupported; the card text was imported.');
  }
  return {card,image};
}
