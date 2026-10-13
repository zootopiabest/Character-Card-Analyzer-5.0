import test from "node:test";
import assert from "node:assert/strict";
import { toBrowserModels, filterAndSortModels, catalogAuthors, formatPrice, selectLatestDeepSeekPro } from "../src/openrouter-models.js";
import { complete } from "../src/providers.js";

const raw=[
  {id:"zeta/large",name:"Large Vision",created:2,context_length:128000,pricing:{prompt:"0.000002",completion:"0"},architecture:{input_modalities:["text","image"]}},
  {id:"alpha/small",name:"Small Chat",created:3,context_length:8000,pricing:{prompt:"-1"}},
  {id:"~alpha/latest",name:"Latest",created:1},
  {id:"zeta/large:batch",created:4}, null, {id:123}
];
test("catalog normalizes prices, vision and aliases while excluding batch variants",()=>{
  const models=toBrowserModels(raw);
  assert.equal(models.length,3);assert.equal(models[0].inputPrice,2);
  assert.equal(models[0].outputPrice,0);assert.equal(models[0].vision,true);
  assert.equal(models[1].inputPrice,null);assert.equal(models[1].outputPrice,null);
  assert.equal(models[2].author,"alpha");
  assert.equal(formatPrice(0),"Free");assert.equal(formatPrice(null),"—");
  assert.deepEqual(catalogAuthors(models),["alpha","zeta"]);
});
test("search combines terms with provider filtering and sorts both directions",()=>{
  const models=toBrowserModels(raw);
  assert.deepEqual(filterAndSortModels(models,{query:"ZETA vision",author:"zeta"}).map(m=>m.id),["zeta/large"]);
  assert.equal(filterAndSortModels(models,{sort:"context"})[0].id,"zeta/large");
  assert.equal(filterAndSortModels(models,{sort:"newest"})[0].id,"alpha/small");
  assert.equal(filterAndSortModels(models,{sort:"name"})[0].name,"Large Vision");
  assert.equal(filterAndSortModels(models,{sort:"name",descending:false})[0].name,"Small Chat");
  assert.equal(models[0].id,"zeta/large");
});
test("DeepSeek latest uses version order and excludes batch, free and unrelated families",()=>{
  const catalog=[{id:"deepseek/deepseek-v4-pro",created:99},{id:"deepseek/deepseek-v10-pro",created:1},
    {id:"deepseek/deepseek-v11-pro:batch"},{id:"deepseek/deepseek-v11-pro:free"},{id:"deepseek/deepseek-v12-flash"}];
  assert.equal(selectLatestDeepSeekPro(catalog).id,"deepseek/deepseek-v10-pro");
  assert.throws(()=>selectLatestDeepSeekPro([]),/no matching/);
});
test("latest selection resolves before paid calls, caps output and keeps keys out of catalog requests",async()=>{
  const original=globalThis.fetch,requests=[];
  globalThis.fetch=async(url,options)=>{
    requests.push({url,options});
    return new Response(JSON.stringify(url.endsWith("/models")?{data:[{id:"deepseek/deepseek-v4-pro",top_provider:{max_completion_tokens:512},architecture:{input_modalities:["text"]}}]}:{choices:[{message:{content:'{"ok":true}'},finish_reason:"stop"}]}));
  };
  try {
    const config={provider:"openrouter",model:" latest:deepseek-pro ",key:"TEST_ONLY",maxTokens:4096};
    assert.equal(await complete(config,"system","card"),'{"ok":true}');
    assert.equal(requests.length,2);assert.equal(requests[0].options.headers,undefined);
    const body=JSON.parse(requests[1].options.body);
    assert.equal(body.model,"deepseek/deepseek-v4-pro");assert.equal(body.max_tokens,512);
    requests.length=0;
    await assert.rejects(()=>complete(config,"system","card","data:image/png;base64,AA=="),/does not accept images/);
    assert.equal(requests.length,1);
  } finally {globalThis.fetch=original;}
});
test("catalog errors never send the unresolved latest selector to completions",async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response('{}',{status:503});};
  try {
    await assert.rejects(()=>complete({provider:"openrouter",model:"latest:deepseek-pro",key:"TEST_ONLY"},"s","u"),/503/);
    assert.equal(calls,1);
  } finally {globalThis.fetch=original;}
});
