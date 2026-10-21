import test from 'node:test';
import assert from 'node:assert/strict';
import { IMMERSION_MODULES, normalizeModules, modulePrompt, moduleTemplate } from '../src/immersion-modules.js';
import { restoreSelections } from '../src/immersion-panel.js';
import { singlePrompt, comparePrompt, reportTemplate } from '../src/rubrics/assemble.js';
import { validateAudit, runSingle, runComparison } from '../src/evaluator.js';
import { renderAudit, renderComparison, reportToMarkdown } from '../src/report.js';

const kind = {primary:'character',secondary:null};
const ids = IMMERSION_MODULES.map(m => m.id);
const fill = v => typeof v === 'string' ? (v.startsWith('NUMBER') ? 8 : '<img src=x onerror=alert(1)> illustrative text')
  : Array.isArray(v) ? [fill(v[0])] : Object.fromEntries(Object.entries(v).map(([k,x])=>[k,fill(x)]));
const fixture = modules => {
  const result=fill(reportTemplate(kind,false,{}, {modules}));
  if(result.topSongs)result.topSongs=Array.from({length:5},()=>({...result.topSongs[0]}));
  if(result.shoppingList)result.shoppingList.items=Array(5).fill(result.shoppingList.items[0]);
  return result;
};
const card = '## Description\nA quiet mechanic.\n## First Message\nRain.\n## Alternate Greeting 1\nSunshine.';

// Test the request and data contracts, not just the presence of checkbox markup.
test('all nine original extras are available, deduplicated and filtered',()=>{
  assert.deepEqual(ids,['datingProfile','shoppingList','topSongs','demise','psychoanalysis','emotionalRegisters','boringTuesday','pissThemOff','greetingBreakdown']);
  assert.deepEqual(normalizeModules(['demise','unknown','demise','datingProfile']),['datingProfile','demise']);
  for (const invalid of [null,{},'demise',true]) assert.deepEqual(normalizeModules(invalid),[]);
});
test('unchecked extras contribute neither instructions nor schema; each selection is isolated',()=>{
  assert.equal(modulePrompt([]),'');
  assert.deepEqual(moduleTemplate([]),{});
  const off = singlePrompt(card,kind);
  assert.doesNotMatch(off,/OPTIONAL IMMERSION MODULES/);
  for(const id of ids) assert.ok(!off.includes(id));
  for(const selected of ids) {
    const prompt=singlePrompt(card,kind,false,[selected]);
    assert.ok(prompt.includes(selected));
    for(const unselected of ids.filter(id=>id!==selected)) assert.ok(!prompt.includes(unselected),unselected+' leaked into '+selected);
    assert.deepEqual(Object.keys(moduleTemplate([selected])),[selected]);
  }
});
test('per-greeting option overrides only score prohibitions and retains independent frontend-aware starts',()=>{
  const on=singlePrompt(card,kind,false,['greetingBreakdown']);
  assert.doesNotMatch(on,/No per-greeting scorecards|without numeric greeting scores|numeric greeting grades or model-computed/);
  assert.match(on,/intended frontend scenario override/);
  assert.match(on,/Never compare openings/);
  assert.match(on,/zero greetings receives \[\]/);
  assert.match(on,/module-local/);
  assert.match(on,/First-message synergy is a separate textual assessment/);
  assert.match(singlePrompt(card,kind),/No per-greeting scorecards/);
});
test('comparison extras are independently scoped and shared asks occur once in either comparison mode',()=>{
  for(const mode of ['independent','remake']) {
    const prompt=comparePrompt(card,kind,'Another card',kind,mode,{modulesA:['demise','greetingBreakdown'],modulesB:['demise','topSongs']});
    const template=JSON.parse(prompt.split('\n').find(l=>l.startsWith('{"cardA":')));
    assert.ok(template.cardA.greetingBreakdown);assert.ok(!template.cardB.greetingBreakdown);
    assert.ok(template.cardB.topSongs);assert.ok(!template.cardA.topSongs);
    assert.equal((prompt.match(/demise: howTheyDie/g)||[]).length,1);
    assert.match(prompt,/ONLY for the card that selected them/);
    assert.match(prompt,/every main-audit list <=3/);
  }
});
test('valid extras survive validation and both exports without affecting score arithmetic',()=>{
  const base=validateAudit(fixture([]),kind);
  const raw=fixture(ids), low=validateAudit(raw,kind,false,{modules:ids});
  raw.greetingBreakdown[0].score=0;
  const zero=validateAudit(raw,kind,false,{modules:ids});
  raw.greetingBreakdown[0].score=10;
  const high=validateAudit(raw,kind,false,{modules:ids});
  for(const r of [low,zero,high]) {
    assert.equal(r.overallScore,base.overallScore);
    assert.equal(r.slop.score,base.slop.score);
    assert.deepEqual(r.core,base.core);assert.deepEqual(r.specialists,base.specialists);
    assert.deepEqual(r.optionalWarnings,[]);
    for(const id of ids) assert.ok(Object.hasOwn(r,id));
  }
  const html=renderAudit(high),md=reportToMarkdown(high),json=JSON.parse(JSON.stringify(high));
  for(const mod of IMMERSION_MODULES) {assert.ok(html.includes(mod.label.replaceAll('&','&amp;')));assert.ok(md.includes(mod.label));assert.ok(Object.hasOwn(json,mod.id));}
  assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
  assert.match(md,/10\/10/);assert.match(html,/10\/10/);
});
test('missing or malformed extras preserve main report and warn; unsolicited output is discarded',()=>{
  const raw=fixture(ids);
  delete raw.demise;raw.greetingBreakdown[0].score='10';raw.emotionalRegisters.sad={text:'wrong'};
  const validated=validateAudit(raw,kind,false,{modules:['demise','greetingBreakdown','emotionalRegisters','datingProfile']});
  assert.equal(validated.optionalWarnings.length,3);
  assert.ok(validated.datingProfile);assert.ok(!Object.hasOwn(validated,'topSongs'));
  assert.ok(!Object.hasOwn(validated,'demise'));assert.ok(!Object.hasOwn(validated,'greetingBreakdown'));
  assert.equal(validated.overallScore,8.1);
  assert.match(renderAudit(validated),/Optional output incomplete/);
  assert.match(reportToMarkdown(validated),/Optional output incomplete/);
  const disabled=validateAudit(raw,kind);
  for(const id of ids) assert.ok(!Object.hasOwn(disabled,id));
  assert.doesNotMatch(renderAudit(disabled),/Optional extras/);
  assert.doesNotMatch(reportToMarkdown(disabled),/Optional extras/);
});
test('invalid per-greeting numbers are rejected; no greeting is a valid empty result',()=>{
  for(const score of [-1,11,NaN,Infinity,null,'8']) {
    const raw=fixture(['greetingBreakdown']);raw.greetingBreakdown[0].score=score;
    const r=validateAudit(raw,kind,false,{modules:['greetingBreakdown']});
    assert.equal(r.optionalWarnings.length,1);assert.equal(r.greetingBreakdown,undefined);
  }
  const raw=fixture(['greetingBreakdown']);raw.greetingBreakdown=[];
  const r=validateAudit(raw,kind,false,{modules:['greetingBreakdown']});
  assert.deepEqual(r.greetingBreakdown,[]);assert.deepEqual(r.optionalWarnings,[]);
  assert.match(renderAudit(r),/No greeting text supplied/);assert.match(reportToMarkdown(r),/No greeting text supplied/);
});
test('saved selections retain deliberate empty lists, ignore unknown IDs, and recover corrupt storage',()=>{
  const defaults={single:['datingProfile','shoppingList'],compareA:[],compareB:[]};
  for(const raw of [null,'bad json','null','42','{}']) assert.deepEqual(restoreSelections(raw),defaults);
  assert.deepEqual(restoreSelections('{"single":[],"compareA":["demise","unknown","demise"],"compareB":["topSongs"]}'),{single:[],compareA:['demise'],compareB:['topSongs']});
});
test('production evaluators carry selections through provider request, validation, comparison rendering and export',async()=>{
  const config={provider:'openai',key:'TEST_ONLY',model:'test-model',maxTokens:4096};
  const previous=globalThis.fetch;let seen;let response=fixture(['boringTuesday']);
  globalThis.fetch=async(_url,options)=>{
    seen=JSON.parse(options.body).messages[1].content;
    return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(response)}}]}),{status:200});
  };
  try {
    const solo=await runSingle(config,'A card',kind,null,['boringTuesday']);
    assert.ok(solo.boringTuesday);assert.ok(seen.includes('boringTuesday'));
    const verdict={verdict:'Tie.',aAdvantages:[],bAdvantages:[],sharedGround:[],scopeDifferences:[]};
    response={cardA:fixture(['demise']),cardB:fixture(['topSongs']),comparison:verdict};
    const result=await runComparison(config,'A card',kind,'B card',kind,'remake',{modulesA:['demise'],modulesB:['topSongs']});
    assert.ok(result.cardA.demise);assert.ok(!result.cardA.topSongs);
    assert.ok(result.cardB.topSongs);assert.ok(!result.cardB.demise);
    assert.match(renderComparison(result),/Demise &amp; Obituary/);
    assert.match(reportToMarkdown(result,'compare'),/Top 5 Songs/);
    assert.match(seen,/B is labeled remake/);
  } finally {globalThis.fetch=previous;}
});
