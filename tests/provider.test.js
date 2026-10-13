import test from "node:test";
import assert from "node:assert/strict";
import { complete } from "../src/providers.js";
const cfg = (provider, overrides = {}) => ({
  provider, key:"TEST_ONLY_NOT_REAL",model:provider === "gemini" ? "gemini-test" : "gpt-4.1",
  maxTokens:4096,baseUrl:"https://example.invalid/v1",...overrides
});
test("OpenAI-compatible provider never leaks key into request body",async()=>{
  let seen;
  const previous=globalThis.fetch;
  globalThis.fetch=async(url, options)=>{
    seen={url,options};
    return new Response(JSON.stringify({choices:[{finish_reason:"stop",message:{content:'{"ok":true}'}}]}),{status:200,headers:{"Content-Type":"application/json"}});
  };
  try {
    const result=await complete(cfg("openai"),"system guide","user card");
    assert.equal(result,'{"ok":true}');
    const payload=JSON.parse(seen.options.body);
    assert.equal(seen.url,"https://api.openai.com/v1/chat/completions");
    assert.equal(payload.messages[0].role,"system");
    assert.equal(payload.messages[1].role,"user");
    assert.equal(seen.options.headers.Authorization,"Bearer TEST_ONLY_NOT_REAL");
    assert.ok(!seen.options.body.includes("TEST_ONLY_NOT_REAL"));
    assert.equal(seen.options.headers["HTTP-Referer"],undefined);
  } finally {globalThis.fetch=previous;}
});
test("Gemini receives image as inline data instead of in card text",async()=>{
  let body,url;
  const prev=globalThis.fetch;
  globalThis.fetch=async(u,options)=>{
    url=u;body=JSON.parse(options.body);
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"done":1}'}]},finishReason:"STOP"}]}),{status:200,headers:{"Content-Type":"application/json"}});
  };
  try {
    const response=await complete(cfg("gemini"),"system","card","data:image/png;base64,YWJj");
    assert.equal(response,'{"done":1}');
    assert.match(url,/generativelanguage.googleapis.com/);
    assert.equal(body.contents[0].parts[1].inline_data.mime_type,"image/png");
    assert.equal(body.contents[0].parts[1].inline_data.data,"YWJj");
  } finally{globalThis.fetch=prev;}
});
test("The app fails explicitly on truncated outputs",async()=>{
  const prev=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{finish_reason:"length",message:{content:"{}"}}]}),{status:200});
  try{await assert.rejects(()=>complete(cfg("openrouter"),"a","b"),/cut off/);}
  finally{globalThis.fetch=prev;}
});
test("Custom endpoint must use HTTPS or localhost",async()=>{
  await assert.rejects(()=>complete(cfg("custom",{baseUrl:"http://insecure.example/v1"}),"a","b"),/Custom API URL/);
});

test("OpenRouter 5.0 has distinct attribution URL and title", async()=>{
  const previous=globalThis.fetch;
  let headers;
  globalThis.fetch=async(_url,options)=>{
    headers=options.headers;
    return new Response(JSON.stringify({choices:[{finish_reason:"stop",message:{content:'{"ok":true}'}}]}),{status:200,headers:{"Content-Type":"application/json"}});
  };
  try {
    await complete(cfg("openrouter"),"system","card");
    assert.equal(headers["HTTP-Referer"],"https://github.com/zootopiabest/Character-Card-Analyzer-5.0");
    assert.equal(headers["X-Title"],"Character Card Analyzer 5.0");
    assert.notEqual(headers["HTTP-Referer"],"https://zootopiabest.github.io");
  } finally { globalThis.fetch=previous; }
});

test('OpenRouter native_finish_reason reports length even if finish_reason says stop and preserves raw output',async()=>{
  const previous=globalThis.fetch;
  const partial='{"summary":"प्यास';
  globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{
    finish_reason:'stop', native_finish_reason:'max_tokens', message:{content:partial}
  }]}),{status:200});
  try {
    await assert.rejects(()=>complete(cfg('openrouter'),'system','card'),(error)=>{
      assert.match(error.message,/cut off/i);
      assert.equal(error.rawResponse,partial);
      return true;
    });
  } finally {globalThis.fetch=previous;}
});
