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
test('original extras and creator-notes reflection are available, deduplicated and filtered',()=>{
  assert.deepEqual(ids,['datingProfile','shoppingList','topSongs','demise','psychoanalysis','emotionalRegisters','boringTuesday','pissThemOff','creatorNotesNotes','designConsiderations','greetingBreakdown']);
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

test('Design Considerations is a selectable optional, scoped per card and unscored',()=>{
  assert.ok(ids.includes('designConsiderations'));
  assert.ok(!restoreSelections(null).single.includes('designConsiderations'));
  const cardA=JSON.stringify({data:{description:'A quiet person.',first_mes:'Hello.'}});
  const promptOff=singlePrompt(cardA,kind);
  const promptOn=singlePrompt(cardA,kind,false,['designConsiderations']);
  assert.doesNotMatch(promptOff,/designConsiderations/);
  assert.doesNotMatch(promptOff,/OPTIONAL IMMERSION MODULES/);
  assert.match(promptOn,/designConsiderations \(Design Considerations\)/);
  assert.match(promptOn,/Return 0–3 concise evidence-based observations/);
  assert.match(promptOn,/no evidenced implementation tension earns \[\]/);
  assert.ok(Object.hasOwn(moduleTemplate(['designConsiderations']),'designConsiderations'));
  assert.ok(!Object.hasOwn(moduleTemplate([]),'designConsiderations'));
  const raw=fixture(['designConsiderations']);
  raw.designConsiderations=['Strict structured labels improve parsing but restrict natural dialogue.'];
  const scored=validateAudit(raw,kind,false,{modules:['designConsiderations']});
  const disabled=validateAudit(raw,kind);
  assert.equal(scored.overallScore,disabled.overallScore);
  assert.deepEqual(scored.designConsiderations,raw.designConsiderations);
  assert.ok(!Object.hasOwn(disabled,'designConsiderations'));
  assert.match(renderAudit(scored),/extra-card--designConsiderations/);
  assert.match(renderAudit(scored),/Strict structured labels improve parsing/);
  assert.match(reportToMarkdown(scored),/### Design Considerations/);
  assert.doesNotMatch(renderAudit(disabled),/Design Considerations/);
  const none=fixture(['designConsiderations']);
  none.designConsiderations=[];
  const empty=validateAudit(none,kind,false,{modules:['designConsiderations']});
  assert.deepEqual(empty.designConsiderations,[]);
  assert.deepEqual(empty.optionalWarnings,[]);
  assert.match(renderAudit(empty),/No evidenced implementation tensions found/);
  assert.match(reportToMarkdown(empty),/No evidenced implementation tensions found/);
  const bad=fixture(['designConsiderations']);
  bad.designConsiderations=['a','b','c','d'];
  const invalid=validateAudit(bad,kind,false,{modules:['designConsiderations']});
  assert.equal(invalid.overallScore,disabled.overallScore);
  assert.equal(invalid.designConsiderations,undefined);
  assert.match(invalid.optionalWarnings.join(' '),/Design Considerations/);
  const compare=comparePrompt(cardA,kind,cardA,kind,'independent',{modulesA:['designConsiderations'],modulesB:[]});
  const template=JSON.parse(compare.split('\n').find(line=>line.startsWith('{"cardA":')));
  assert.ok(Object.hasOwn(template.cardA,'designConsiderations'));
  assert.ok(!Object.hasOwn(template.cardB,'designConsiderations'));
});

test('Emotional Registers depicts new in-character reactions, not copied traits or comedic characterization',()=>{
  const prompt=modulePrompt(['emotionalRegisters']);
  assert.match(prompt,/imagine one small, plausible, fresh moment/);
  assert.match(prompt,/trigger → immediate reaction/);
  assert.match(prompt,/not a character description, psychological profile/);
  assert.match(prompt,/rather than replaying backstory events/);
  assert.match(prompt,/COMEDY is SPECIFICALLY how they react when someone tells them a joke/);
  assert.match(prompt,/Do NOT describe what makes the character funny/);
  assert.match(prompt,/reactions may be muted, delayed, confused, passive, or absent/);
  assert.match(prompt,/Do not script {{user}}'s speech/);
  const shape=moduleTemplate(['emotionalRegisters']).emotionalRegisters;
  assert.deepEqual(Object.keys(shape),['sad','angry','happy','grief','comedy']);
  assert.match(shape.comedy,/actual reaction to the humor, NOT why they are funny/);
  const solo=singlePrompt(card,kind,false,['emotionalRegisters']);
  const both=comparePrompt(card,kind,card,kind,'independent',{modulesA:['emotionalRegisters'],modulesB:[]});
  assert.match(solo,/fresh small sad trigger/);
  assert.match(both,/COMEDY is SPECIFICALLY/);
  assert.equal((both.match(/emotionalRegisters \(Reaction Map\)/g)||[]).length,1);
  const raw=fixture(['emotionalRegisters']);
  raw.emotionalRegisters.comedy='Someone makes a dry joke; she pauses, tries to identify the literal meaning, then asks if she missed something.';
  const r=validateAudit(raw,kind,false,{modules:['emotionalRegisters']});
  assert.equal(r.overallScore,validateAudit(raw,kind).overallScore);
  assert.equal(r.emotionalRegisters.comedy,raw.emotionalRegisters.comedy);
  assert.match(renderAudit(r),/Someone makes a dry joke/);
  assert.match(reportToMarkdown(r),/Someone makes a dry joke/);
});

test('creator-notes reflection is selected, grounded, non-scoring, and handles missing notes',()=>{
  const notesCard=JSON.stringify({data:{
    description:'Iris checks every risk and asks for consent before touching new machinery.',
    creator_notes:'Iris is utterly impulsive. She always leaps into danger without stopping to think.'
  }});
  const on=singlePrompt(notesCard,kind,false,['creatorNotesNotes']);
  const off=singlePrompt(notesCard,kind);
  assert.match(on,/creatorNotesNotes \(Creator's Notes Notes\)/);
  assert.match(on,/oversimplified, incomplete, unexpectedly insightful or contradicted/);
  assert.match(on,/Do NOT merely recap or paraphrase/);
  assert.ok(!off.includes('creatorNotesNotes'));
  const withoutNotes=singlePrompt(card,kind,false,['creatorNotesNotes']);
  const schema=JSON.parse(withoutNotes.split('\n').find(line=>line.startsWith('{"summary":')));
  assert.deepEqual(schema.creatorNotesNotes,{notApplicable:'No creator notes supplied.'});

  const raw=fill(reportTemplate(kind,false,{hasCreatorNotes:true},{modules:['creatorNotesNotes']}));
  raw.creatorNotesNotes='The creator calls Iris impulsive, but her safety checks complicate that description. <b>Precision matters.</b>\n\nThat mismatch could be shorthand rather than a failure to understand Iris.';
  const scored=validateAudit(raw,kind,false,{features:{hasCreatorNotes:true},modules:['creatorNotesNotes']});
  const base=validateAudit(raw,kind,false,{features:{hasCreatorNotes:true}});
  assert.equal(scored.overallScore,base.overallScore);
  assert.deepEqual(scored.core,base.core);
  assert.deepEqual(scored.specialists,base.specialists);
  assert.deepEqual(scored.optionalWarnings,[]);
  const html=renderAudit(scored);
  assert.match(html,/Creator's Notes Notes/);
  assert.match(html,/&lt;b&gt;Precision matters/);
  assert.doesNotMatch(html,/<b>Precision matters/);
  assert.match(html,/<\/p><p>That mismatch/);
  assert.match(reportToMarkdown(scored),/Creator's Notes Notes/);

  const absent=validateAudit(fixture([]),kind,false,{features:{hasCreatorNotes:false},modules:['creatorNotesNotes']});
  assert.deepEqual(absent.creatorNotesNotes,{notApplicable:'No creator notes supplied.'});
  assert.deepEqual(absent.optionalWarnings,[]);
  assert.match(renderAudit(absent),/Not applicable: No creator notes supplied/);
  const comparison=comparePrompt(notesCard,kind,card,kind,'independent',{modulesA:['creatorNotesNotes'],modulesB:[]});
  const shape=JSON.parse(comparison.split('\n').find(line=>line.startsWith('{"cardA":')));
  assert.ok(shape.cardA.creatorNotesNotes);
  assert.equal(shape.cardB.creatorNotesNotes,undefined);
});

test('optional presentation gives each extra a useful layout without changing scores or exports',()=>{
  const modules=['datingProfile','demise','greetingBreakdown','creatorNotesNotes'];
  const greetings=[{id:'first',label:'First Message'},{id:'alternate:2',label:'Alternate Greeting 2'}];
  const raw=fixture(modules);
  raw.datingProfile='**Amelia** likes *books*. <script>unsafe()</script>';
  raw.creatorNotesNotes='A documented perspective, not a character directive.';
  raw.demise={howTheyDie:'A plausible mishap.',obituary:'A farewell that fits.'};
  raw.greetingBreakdown=[
    {id:'first',label:'First Message',score:9,register:'Comedic chaos',notes:'Grounded sensory details.'},
    {id:'alternate:2',label:'Alternate Greeting 2',score:5,register:'Quiet conversation',notes:'A softer entry point.'}
  ];
  const r=validateAudit(raw,kind,false,{features:{hasCreatorNotes:true},modules,greetings});
  const baseline=validateAudit(raw,kind,false,{features:{hasCreatorNotes:true}});
  const html=renderAudit(r);
  const md=reportToMarkdown(r);
  assert.equal(r.overallScore,baseline.overallScore);
  for(const name of ['datingProfile','demise','creatorNotesNotes','greetingBreakdown'])assert.match(html,new RegExp('extra-card--'+name));
  assert.match(html,/dating-letter/);
  assert.match(html,/demise-layout/);
  assert.match(html,/creator-reading/);
  assert.equal((html.match(/class="greeting-card"/g)||[]).length,2);
  assert.match(html,/Graded 2 of 2 supplied greetings/);
  assert.match(html,/greeting-rating">9\/10/);
  assert.match(html,/width:90%/);
  assert.match(html,/width:50%/);
  assert.match(html,/<strong>Amelia<\/strong>/);
  assert.match(html,/<em>books<\/em>/);
  assert.match(html,/&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<script>unsafe/);
  assert.match(md,/\*\*Amelia\*\* likes \*books\*/);
  assert.match(md,/Alternate Greeting 2 · 5\/10/);
  assert.match(renderComparison({cardA:r,cardB:r,comparison:{verdict:'Tie.',aAdvantages:[],bAdvantages:[],sharedGround:[],scopeDifferences:[]}}),/greeting-card/);
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
  assert.equal(validated.overallScore,8.2);
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
