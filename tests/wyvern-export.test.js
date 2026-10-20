import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCard,greetingsOf} from '../src/card-context.js';
import {importCardFile} from '../src/importer.js';
import {isolateGreetings} from '../src/greeting-context.js';
import {runSingle,runComparison} from '../src/evaluator.js';
import {inspectCardFeatures,intendedFrontend,reportTemplate,singlePrompt,comparePrompt} from '../src/rubrics/assemble.js';
import {renderAudit,reportToMarkdown} from '../src/report.js';
const text=readFileSync(new URL('./fixtures/wyvern-export.md',import.meta.url),'utf8');
const kind={primary:'character',secondary:null};
const expected=[{id:'first',label:'First Message'},{id:'alternate:0',label:'Greeting 1'},{id:'alternate:1',label:'Greeting 2'}];
const starts=['FIRST_START','SECOND_START','THIRD_START'];
const config={provider:'custom',baseUrl:'https://example.invalid',key:'TEST_ONLY',model:'test'};
const fill=value=>typeof value==='string'?(value.startsWith('NUMBER')?8:'Cited evidence supports the intended function.'):
  Array.isArray(value)?[]:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,fill(v)]));
const report=()=>({...fill(reportTemplate(kind,false,{hasAlternates:true,hasExamples:true})),greetingBreakdown:expected.map(g=>({...g,score:8,register:'Quiet',notes:'A plausible, clear start.'}))});
async function intercept(reply,run){
  const old=globalThis.fetch,prompts=[];
  globalThis.fetch=async(_url,options)=>{const p=JSON.parse(options.body).messages[1].content;prompts.push(p);return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(reply(p))}}]}));};
  try{return {result:await run(),prompts};}finally{globalThis.fetch=old;}
}
test('pasted and imported Wyvern Markdown recognize first message and grouped alternates',async()=>{
  const file=new Blob([text],{type:'text/markdown'});file.name='wyvern-export.md';
  const imported=await importCardFile(file);
  assert.equal(imported.text,text,'workspace retains all imported text');
  for(const input of [text,imported.text,imported.card]){
    const greetings=greetingsOf(input);
    assert.deepEqual(greetings.map(({id,label})=>({id,label})),expected);
    assert.deepEqual(greetings.map(g=>g.originalIndex),[0,1,2]);
    greetings.forEach((g,i)=>{
      assert.ok(g.text.includes(starts[i]));
      for(const other of starts.filter((_,j)=>j!==i))assert.ok(!g.text.includes(other));
      assert.doesNotMatch(g.text,/EXAMPLE_ONLY|METADATA_ONLY|```hbs/);
    });
    assert.equal(inspectCardFeatures(input).hasAlternates,true);
    assert.equal(inspectCardFeatures(input).hasExamples,true);
    assert.match(intendedFrontend(input),/Wyvern/);
    assert.match(parseCard(input).sections.find(s=>s.name==='Description').body,/PROFILE_ONLY/);
  }
});
test('combined mode sends all three Wyvern greetings in one request and returns all three grades',async()=>{
  const {result,prompts}=await intercept(()=>report(),()=>runSingle(config,text,kind,null,['greetingBreakdown'],{separateGreetings:false}));
  assert.equal(prompts.length,1);
  for(const marker of starts)assert.ok(prompts[0].includes(marker));
  const schema=JSON.parse(prompts[0].split('\n').find(line=>line.startsWith('{"summary":')));
  assert.deepEqual(schema.greetingBreakdown.map(({id,label})=>({id,label})),expected);
  assert.deepEqual(result.greetingBreakdown.map(({id,label})=>({id,label})),expected);
  assert.equal(result.greetingBreakdownExpected,3);
  assert.equal(result.run.inputs[0].greetingCount,3);
  assert.equal(result.optionalWarnings.length,0);
  assert.match(renderAudit(result),/Graded 3 of 3 supplied greetings/);
  assert.match(reportToMarkdown(result),/Graded 3 of 3 supplied greetings/);
});
test('separate mode isolates grouped Wyvern starts without losing profile, examples or greeting slots',async()=>{
  const isolated=isolateGreetings(text);
  for(let i=0;i<3;i++){
    const active=isolated.active(i);
    assert.match(active,/PROFILE_ONLY/);assert.match(active,/EXAMPLE_ONLY/);
    assert.ok(active.includes(starts[i]));
    for(const other of starts.filter((_,j)=>j!==i))assert.ok(!active.includes(other));
  }
  const {result,prompts}=await intercept(p=>p.includes('ACTIVE ROLEPLAY CONTEXT')?{coverage:'Supported.',score:8,register:'Quiet',notes:'Plausible.'}:report(),
    ()=>runSingle(config,text,kind,null,['greetingBreakdown'],{separateGreetings:true}));
  assert.equal(prompts.length,4);assert.deepEqual(result.greetingBreakdown.map(({id,label})=>({id,label})),expected);
  assert.doesNotMatch(prompts[0],/SECOND_START|THIRD_START/);
});
test('comparison has separate explicit grading entries for every greeting on each card',async()=>{
  const {result,prompts}=await intercept(()=>({cardA:report(),cardB:report(),comparison:{verdict:'Tie.',aAdvantages:[],bAdvantages:[],sharedGround:[],scopeDifferences:[]}}),
    ()=>runComparison(config,text,kind,text,kind,'independent',{modulesA:['greetingBreakdown'],modulesB:['greetingBreakdown'],separateGreetings:false}));
  assert.equal(prompts.length,1);
  const schema=JSON.parse(prompts[0].split('\n').find(line=>line.startsWith('{"cardA":')));
  for(const letter of ['cardA','cardB']){
    assert.deepEqual(schema[letter].greetingBreakdown.map(({id,label})=>({id,label})),expected);
    assert.equal(result[letter].greetingBreakdown.length,3);
  }
});
test('an empty grouped alternate keeps the later original slot and nested fenced headings never add greetings',()=>{
  const source=text.replace(/### Greeting 1\n```hbs[\s\S]*?```/,'### Greeting 1\n```hbs\n   \n```');
  assert.deepEqual(greetingsOf(source).map(g=>g.originalIndex),[0,2]);
  assert.deepEqual(greetingsOf(text).map(g=>g.originalIndex),[0,1,2]);
  const mixed=text.replace('### Greeting 99','~~~\n### Greeting 99\n~~~');
  assert.equal(greetingsOf(mixed).length,3,'a different fence type does not close the hbs block');
  const outside='## Description\n### Greeting 1\nNot an alternate container.\n## First Message\nReal start.';
  assert.equal(greetingsOf(outside).length,1);
});
test('missing optional grades report explicit coverage instead of silently looking complete',async()=>{
  const raw=report();raw.greetingBreakdown=raw.greetingBreakdown.slice(0,1);
  const {result,prompts}=await intercept(()=>raw,()=>runSingle(config,text,kind,null,['greetingBreakdown']));
  assert.equal(prompts.length,1);assert.equal(result.overallScore,8);
  assert.equal(result.greetingBreakdownIncomplete,true);assert.equal(result.optionalWarnings.length,2);
  assert.match(renderAudit(result),/Graded 1 of 3 supplied greetings/);
});
