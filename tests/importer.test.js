import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { importCardFile } from "../src/importer.js";

// Browser file-reading shim; metadata decoding still uses the production importer.
const previousReader = globalThis.FileReader;
test.before(() => {
  globalThis.FileReader = class {
    async readAsDataURL(file) {
      this.result = "data:image/png;base64," + Buffer.from(await file.arrayBuffer()).toString("base64");
      this.onload();
    }
  };
});
test.after(() => { globalThis.FileReader = previousReader; });
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let i=0;i<8;i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, checksum]);
}
function metadata(keyword, value, type="tEXt", compressed=false) {
  const text = Buffer.from(value);
  const payload = type === "zTXt" ? Buffer.concat([Buffer.from([0]), deflateSync(text)])
    : type === "iTXt" ? Buffer.concat([Buffer.from([compressed ? 1 : 0,0,0,0]), compressed ? deflateSync(text) : text])
    : text;
  return chunk(type, Buffer.concat([Buffer.from(keyword + "\0"), payload]));
}
function png(...chunks) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1,0); ihdr.writeUInt32BE(1,4); ihdr[8]=8; ihdr[9]=6;
  const file = new Blob([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR",ihdr), ...chunks,
    chunk("IDAT",deflateSync(Buffer.from([0,0,0,0,255]))), chunk("IEND",Buffer.alloc(0))], {type:"image/png"});
  file.name = "card.png"; return file;
}
const card = (name) => JSON.stringify({spec:"chara_card_v3", data:{name,description:"Adult archivist; dry wit.",first_mes:"Rain again.",alternate_greetings:["A quiet library."]}});
const encoded = (name) => Buffer.from(card(name)).toString("base64");
for (const keyword of ["chara","ccv3"]) {
  for (const [type, compressed] of [["tEXt",false],["zTXt",true],["iTXt",false],["iTXt",true]]) {
    test(`${keyword} ${type} compressed=${compressed} decodes UTF-8 JSON and preserves greetings`, async () => {
      const result = await importCardFile(png(metadata(keyword,encoded("Zoë 雨"),type,compressed)));
      assert.match(result.text,/Zoë 雨/);
      assert.match(result.text,/Alternate Greeting 2/);
      assert.match(result.image,/^data:image\/png;base64,/);
    });
  }
}
test("V3 wins over V2 in either metadata order", async () => {
  const v2=metadata("chara",encoded("Legacy")),v3=metadata("ccv3",encoded("Current"));
  for(const chunks of [[v2,v3],[v3,v2]]) {
    const {text}=await importCardFile(png(...chunks));
    assert.match(text,/Current/);assert.doesNotMatch(text,/Legacy/);
  }
});
test("legacy raw JSON and character keyword remain supported", async () => {
  for(const keyword of ["chara","ccv3","character"]) {
    const {text}=await importCardFile(png(metadata(keyword,card("Legacy JSON"))));
    assert.match(text,/Legacy JSON/);
  }
});
test("corrupt metadata never becomes card text and may fall back to a valid chunk", async () => {
  const invalid=metadata("ccv3","not valid base64!");
  await assert.rejects(importCardFile(png(invalid)),/Invalid character-card PNG metadata/);
  const {text}=await importCardFile(png(invalid,metadata("chara",encoded("Fallback"))));
  assert.match(text,/Fallback/);
});
test("empty metadata advances to the next chunk without hanging", async () => {
  const data=Buffer.from(await png(metadata("ccv3",""),metadata("chara",encoded("After empty"))).arrayBuffer()).toString("base64");
  // Isolate this regression: the old parser loops synchronously, blocking ordinary test timeouts.
  const code=`import {importCardFile} from ${JSON.stringify(new URL("../src/importer.js",import.meta.url).href)};
    globalThis.FileReader=class{readAsDataURL(){this.result='data:image/png;base64,AA==';this.onload();}};
    const file=new Blob([Buffer.from(${JSON.stringify(data)},'base64')]);file.name='card.png';
    console.log((await importCardFile(file)).text);`;
  assert.match(execFileSync(process.execPath,["--input-type=module","-e",code],{timeout:3000,encoding:"utf8"}),/After empty/);
});
