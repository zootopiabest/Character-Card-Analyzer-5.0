import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {parseCard,greetingsOf,extractCardText} from '../src/card-context.js';
import {SPECIALISTS,SPECIALIST_KEYS} from '../src/rubrics/specialists.js';
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const tick=()=>new Promise(r=>setImmediate(r));
const fakeResult=()=>({summary:'Snapshot result',run:{inputs:[{label:'Captured card'}],startedAt:'TEST_DATE',resolvedModel:'test',requestCount:1}});
function harness({classifyCard=async()=>({primary:'character'}),runSingle=async()=>fakeResult(),runComparison=async()=>({...fakeResult(),cardA:{},cardB:{},comparisonWarnings:[]})}={}){
  const els=new Map(),storage=new Map();
  const element=id=>{
    if(!els.has(id))els.set(id,{id,value:'',checked:false,hidden:false,disabled:false,open:false,innerHTML:'',textContent:'',dataset:{},handlers:{},classList:{toggle(){}},
      appendChild(){},setAttribute(){},removeAttribute(){},scrollIntoView(){},addEventListener(type,fn){this.handlers[type]=fn;}});
    return els.get(id);
  };
  const ctx=vm.createContext({document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>element(Symbol())},
    localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    mountImmersionPanel:()=>({snapshot:()=>({modules:[],modulesA:[],modulesB:[]}),setMode(){}}),mountModelBrowser:()=>({syncSelection(){},activate(){}}),
    PROVIDERS:{gemini:{label:'Gemini'}},DEFAULT_MODEL:()=> 'test-model',SPECIALISTS,SPECIALIST_KEYS,parseCard,greetingsOf,extractCardText,
    AbortController,DOMException,prepareRun:async c=>c,classifyCard,runSingle,runComparison,renderAudit:r=>r.summary,renderComparison:()=> 'comparison',APP_VERSION:'test'});
  vm.runInContext(source+'\nglobalThis.review={run,setMode,updateRequestPlan};',ctx);
  for(const letter of ['A','B']){element('card'+letter).value='CARD_'+letter;element('primary'+letter).value='character';element('secondary'+letter).value='none';}
  element('apiKey').value='TEST_ONLY';element('comparisonType').value='independent';
  return {ctx,element,storage};
}
test('clear cancels and invalidates a run even if its completion ignores cancellation',async()=>{
  let resolveAudit,signal;
  const h=harness({runSingle:cfg=>{signal=cfg.signal;return new Promise(r=>resolveAudit=r);}});
  const run=h.ctx.review.run();await tick();h.element('clearButton').handlers.click();
  assert.equal(signal.aborted,true);assert.equal(h.element('results').hidden,true);assert.equal(h.element('cardA').value,'');
  resolveAudit(fakeResult());await run;
  assert.equal(h.element('results').hidden,true);assert.equal(h.element('analyzeButton').disabled,false);
});
test('both rubric selections are captured before an earlier classifier awaits',async()=>{
  let resolveClassification,seen;
  const h=harness({classifyCard:()=>new Promise(r=>resolveClassification=r),runComparison:async(_cfg,_a,_ka,_b,kb)=>{seen=kb;return {...fakeResult(),cardA:{},cardB:{},comparisonWarnings:[]};}});
  h.ctx.review.setMode('compare');h.element('primaryA').value='auto';
  const run=h.ctx.review.run();await tick();h.element('primaryB').value='rpg';h.element('secondaryB').value='ensemble';
  resolveClassification({primary:'character',secondary:null});await run;
  assert.equal(seen.primary,'character');assert.equal(seen.secondary,null);
  assert.match(h.element('resultIdentity').textContent,/Captured card.*TEST_DATE/);
});
test('cancelled stale completion cannot replace a newer result or unlock its controls',async()=>{
  const completions=[];const h=harness({runSingle:()=>new Promise(r=>completions.push(r))});
  const first=h.ctx.review.run();await tick();h.element('cancelButton').handlers.click();
  const second=h.ctx.review.run();await tick();completions[0](fakeResult());await first;
  assert.equal(h.element('analyzeButton').disabled,true);
  completions[1]({...fakeResult(),summary:'New run'});await second;
  assert.equal(h.element('resultContent').innerHTML,'New run');assert.equal(h.element('analyzeButton').disabled,false);
});
test('request plan exposes classification and per-card greeting counts including one-greeting bypass',()=>{
  const h=harness();h.element('separateGreetings').checked=true;
  h.element('cardA').value=JSON.stringify({first_mes:'One'});h.ctx.review.updateRequestPlan();
  assert.match(h.element('requestPlan').textContent,/1 total.*0 classification.*0 greeting diagnostics/);
  h.element('primaryA').value='auto';h.element('secondaryA').value='auto';h.ctx.review.updateRequestPlan();
  assert.match(h.element('requestPlan').textContent,/2 total.*1 classification/);
  h.ctx.review.setMode('compare');h.element('cardB').value=JSON.stringify({first_mes:'One',alternate_greetings:['Two','Three']});h.ctx.review.updateRequestPlan();
  assert.match(h.element('requestPlan').textContent,/5 total.*1 classification.*3 greeting diagnostics/);
  h.element('separateGreetings').handlers.change();
  assert.equal(JSON.parse(h.storage.get('card-analyzer-5-settings')).separateGreetings,true);
});
test('the pre-run summary shows all parsed greetings even with separate requests off',()=>{
  const h=harness();h.element('separateGreetings').checked=false;
  h.element('cardA').value='## First Message\nFirst.\n## Alternate Greetings\n### Greeting 1\nSecond.\n### Greeting 2\nThird.';
  h.ctx.review.updateRequestPlan();
  assert.match(h.element('greetingSummary').textContent,/Card A: 3 greetings detected/);
  assert.match(h.element('requestPlan').textContent,/1 total.*0 greeting diagnostics/);
});
