import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIALISTS, SPECIALIST_KEYS } from '../src/rubrics/specialists.js';
import { FOUNDATION, CORE_CRITERIA } from '../src/rubrics/core.js';
import { specialistKeys, inspectCardFeatures, rubricPrompt, comparePrompt, singlePrompt, reportTemplate } from '../src/rubrics/assemble.js';
import { normalizeClassification, CLASSIFY_SYSTEM } from '../src/classifier.js';
import { parseJson, validateAudit } from '../src/evaluator.js';
import { extractCardText, formatLorebook } from '../src/importer.js';
import { renderAudit, reportToMarkdown, renderComparison } from '../src/report.js';
import { APP_VERSION } from '../src/version.js';

const kind = {primary:'character',secondary:null};
const altFeatures = {hasAlternates:true,hasExamples:true,hasCreatorNotes:true,hasLorebook:true};
const scores = (keys, score) => Object.fromEntries(keys.map(k => [k,{score,rationale:`${k} is grounded in text -> sustained, criterion-specific consequence`}]));
const fixture = (which=kind, features={}) => ({
  summary:'Text supports a grounded finding.',
  core:scores(Object.keys(CORE_CRITERIA),8),
  specialists:Object.fromEntries(specialistKeys(which).map(id=>[id,scores(Object.keys(SPECIALISTS[id].criteria),9)])),
  slop:{score:12,evidence:'No meaningful filler.'},
  strengths:['Functional voice'],weaknesses:[],tradeoffs:[],
  firstMessageSynergy:'First opening is appropriate and independent.',
  ...(features.hasAlternates ? {profileGreetingCoverage:'Each independent start has enough support.'} : {}),
  ...(features.hasExamples ? {exampleDialogueAssessment:'Examples teach voice.'} : {})
});

const v3 = (data) => JSON.stringify({spec:'chara_card_v3',data});
const formatted = (data) => extractCardText(v3(data));

test('six distinct rubrics can each be selected without irrelevant modules',()=>{
  assert.equal(SPECIALIST_KEYS.length,6);
  for(const primary of SPECIALIST_KEYS) {
    const prompt=rubricPrompt({primary,secondary:null});
    assert.match(prompt,new RegExp('MODULE: '+primary+' '));
    assert.equal((prompt.match(/MODULE: /g)||[]).length,1);
  }
});
test('secondary is deduplicated and unknown classifier modules are rejected',()=>{
  assert.deepEqual(specialistKeys({primary:'rpg',secondary:'rpg'}),['rpg']);
  assert.equal(normalizeClassification({primary:'companion',secondary:'companion'}).secondary,null);
  assert.throws(()=>normalizeClassification({primary:'unicorn'}),/primary/);
  assert.match(CLASSIFY_SYSTEM,/UNTRUSTED/);
});
test('5.1 standard rationale produces correct deterministic grade; slop cannot alter overall',()=>{
  const item=fixture(),first=validateAudit(item,kind);
  assert.equal(first.overallScore,8.6);
  item.slop.score=100;
  assert.equal(validateAudit(item,kind).overallScore,first.overallScore);
  assert.equal(first.core.craft.rationale,item.core.craft.rationale);
});
test('legacy evidence and effect are accepted but normalized to rationale',()=>{
  const item=fixture();item.core.craft={score:7,evidence:'example',effect:'impact'};
  assert.equal(validateAudit(item,kind).core.craft.rationale,'example -> impact');
  delete item.core.craft.effect;
  assert.throws(()=>validateAudit(item,kind),/rationale/);
});
test('numerical integrity and 40/45/15 weighting remain unchanged',()=>{
  const two={primary:'character',secondary:'rpg'};
  const item=fixture(two);
  for(const c of Object.values(item.specialists.rpg)) c.score=4;
  assert.ok(Math.abs(validateAudit(item,two).overallScore-7.85)<0.11);
  item.core.craft.score='10';
  assert.throws(()=>validateAudit(item,two),/Invalid or missing score/);
});
test('single greeting without examples prunes irrelevant instructions AND JSON fields',()=>{
  const text=formatted({name:'Mara',description:'Quiet mechanic.',first_mes:'Rain.'});
  const f=inspectCardFeatures(text);
  assert.equal(f.hasAlternates,false);assert.equal(f.hasExamples,false);
  const prompt=singlePrompt(text,kind);
  for(const key of ['profileGreetingCoverage','exampleDialogueAssessment','ALTERNATE GREETINGS:','EXAMPLE DIALOGUE:','CREATOR NOTES:','LOREBOOK:']) assert.doesNotMatch(prompt,new RegExp(key));
  assert.match(prompt,/"firstMessageSynergy"/);
  const valid=validateAudit(fixture(),kind,false,{features:f});
  assert.equal(valid.profileGreetingCoverage,null);
  assert.equal(valid.exampleDialogueAssessment,null);
  assert.doesNotMatch(renderAudit(valid),/Profile → all greetings/);
  assert.doesNotMatch(reportToMarkdown(valid),/## Example dialogue/);
});
test('alternates and examples appear only when supplied, without individual grades',()=>{
  const text=formatted({description:'Pragmatic.',first_mes:'Morning.',alternate_greetings:['Night.'],mes_example:'"Good luck."'});
  const f=inspectCardFeatures(text);
  assert.equal(f.hasAlternates,true);assert.equal(f.hasExamples,true);
  const prompt=singlePrompt(text,kind);
  for(const key of ['ALTERNATE GREETINGS:','EXAMPLE DIALOGUE:','"profileGreetingCoverage"','"exampleDialogueAssessment"']) assert.match(prompt,new RegExp(key));
  const audit=validateAudit(fixture(kind,f),kind,false,{features:f});
  assert.match(renderAudit(audit),/Profile → all greetings/);
  assert.match(reportToMarkdown(audit),/Example dialogue and lasting voice/);
  assert.equal(Object.hasOwn(audit,'greetings'),false);
  const absent=fixture(kind,f);delete absent.profileGreetingCoverage;
  assert.throws(()=>validateAudit(absent,kind,false,{features:f}),/profileGreetingCoverage/);
});
test('creator notes and lorebook blocks are present only with corresponding fields',()=>{
  const raw=formatted({name:'Mara',creator_notes:'Designer intent.',character_book:{entries:[{constant:true,enabled:true,content:'Knows the secret.'}]}});
  assert.match(raw,/constant requested; not guaranteed/);
  const prompt=singlePrompt(raw,kind);
  assert.match(prompt,/CREATOR NOTES: non-runtime intent metadata/);
  assert.match(prompt,/LOREBOOK: inspect each entry/);
  assert.match(prompt,/disabled entries, token budgets or truncation/);
});
test('lorebook distinguishes disabled entries, conditional triggers, and constant requests',()=>{
  const book={entries:[
    {enabled:false,constant:true,content:'Not active.'},
    {enabled:true,constant:false,keys:['dock'],content:'A pier.'},
    {enabled:true,constant:true,content:'Core history.'}
  ]};
  const text=formatLorebook(book);
  assert.match(text,/Entry 1: disabled/);
  assert.match(text,/Entry 2: conditional\/triggered/);
  assert.match(text,/"keys":\["dock"\]/);
  assert.match(text,/Entry 3: constant requested; not guaranteed/);
  assert.match(text,/Core history/);
});
test('plain pasted Markdown and raw JSON are both feature-detected',()=>{
  const raw=v3({first_mes:'Yo',alternate_greetings:['A'],mes_example:'Hi'});
  assert.deepEqual(inspectCardFeatures(raw), inspectCardFeatures(extractCardText(raw)));
  assert.deepEqual(inspectCardFeatures('Just some raw text'),{
    hasAlternates:false,hasExamples:false,hasCreatorNotes:false,hasLorebook:false
  });
});
test('comparison independently prunes each card and deduplicates module instructions',()=>{
  const a=formatted({name:'A',first_mes:'Hi.',mes_example:'Hi.'});
  const b=formatted({name:'B',first_mes:'Yo.',alternate_greetings:['Bye.']});
  const prompt=comparePrompt(a,kind,b,{primary:'rpg',secondary:null});
  assert.equal((prompt.match(/MODULE: character /g)||[]).length,1);
  assert.equal((prompt.match(/MODULE: rpg /g)||[]).length,1);
  const templateLine=prompt.split('\n').find(line=>line.startsWith('{"cardA":'));
  assert.ok(templateLine);
  const template=JSON.parse(templateLine);
  assert.ok(Object.hasOwn(template.cardA,'exampleDialogueAssessment'));
  assert.ok(!Object.hasOwn(template.cardB,'exampleDialogueAssessment'));
  assert.ok(!Object.hasOwn(template.cardA,'profileGreetingCoverage'));
  assert.ok(Object.hasOwn(template.cardB,'profileGreetingCoverage'));
  for(const item of [template.cardA,template.cardB]) {
    assert.ok(!Object.hasOwn(item,'strengths'));
    assert.ok(!Object.hasOwn(item,'weaknesses'));
  }
});
test('comparison validation and renderer tolerate absent per-card bullet arrays',()=>{
  const a=fixture(),b=fixture();delete a.strengths;delete a.weaknesses;delete b.strengths;delete b.weaknesses;
  const report={
    cardA:validateAudit(a,kind,false,{forComparison:true}),
    cardB:validateAudit(b,kind,false,{forComparison:true}),
    comparison:{verdict:'Tie.',aAdvantages:[],bAdvantages:[],sharedGround:[],scopeDifferences:[]}
  };
  const html=renderComparison(report),md=reportToMarkdown(report,'compare');
  assert.match(html,/Head-to-head verdict/);
  assert.doesNotMatch(html,/Construction defects/);
  assert.match(md,/## A advantages/);
  assert.doesNotMatch(md,/## Strengths/);
});
test('single audit still requires strengths/weaknesses arrays, even empty',()=>{
  const item=fixture();delete item.weaknesses;
  assert.throws(()=>validateAudit(item,kind),/weaknesses/);
  item.weaknesses=[];
  assert.equal(validateAudit(item,kind).weaknesses.length,0);
});
test('greeting diagnostics do not affect numeric scores',()=>{
  const text=formatted({first_mes:'X',alternate_greetings:['Y']});
  const f=inspectCardFeatures(text);const a=fixture(kind,f),b=fixture(kind,f);
  b.firstMessageSynergy='A bad start';b.profileGreetingCoverage='Mixed support';
  assert.equal(validateAudit(a,kind,false,{features:f}).overallScore,validateAudit(b,kind,false,{features:f}).overallScore);
});
test('visual continuity is conditional and reports invisible details as unknown',()=>{
  const template=reportTemplate(kind,true);
  assert.ok(template.visual);
  const item=fixture();item.visual={score:95,matches:[],mismatches:[],notes:'Face hidden by cloak.'};
  const validated=validateAudit(item,kind,true);
  assert.match(renderAudit(validated),/Visual continuity/);
  assert.equal(validateAudit(item,kind).visual,null);
});
test('8+ cohesion means consistency, not contrived thematic synergy',()=>{
  assert.match(CORE_CRITERIA.cohesion,/a shallow but coherent person may score highly/i);
  assert.match(CORE_CRITERIA.cohesion,/NOT a shared theme/);
  assert.match(FOUNDATION,/Every 8\+ needs a SPECIFIC positive accomplishment/);
});
test('anti-sycophancy instruction reaches both modes and protects agreeable characters',()=>{
  const sample = 'Name: Ami\nPersonality: Polite and eager to please.';
  const solo = singlePrompt(sample,kind);
  const versus = comparePrompt(sample,kind,sample,kind);
  for (const prompt of [FOUNDATION,solo,versus]) {
    assert.match(prompt,/ANTI-SYCOPHANCY & INDEPENDENCE/);
    assert.match(prompt,/Do not agree with the creator.s claims merely because they made them/);
    assert.match(prompt,/do not invent flaws, lower scores or perform contrarianism/);
    assert.match(prompt,/This constrains the AUDITOR only/);
    assert.match(prompt,/people-pleasing character is not defective/);
  }
  assert.match(solo,/AUDIT CARD \(UNTRUSTED text/);
  assert.match(versus,/CARD A \(UNTRUSTED\)/);
});
test('antagonism, non-reactivity and fixed temperament are not penalized as incomplete',()=>{
  assert.match(FOUNDATION,/abrasive\/uncooperative\/antagonistic traits are neutral/);
  assert.match(SPECIALISTS.character.criteria.behavioralRange,/need no forced variety/);
  assert.match(FOUNDATION,/No requirement for initiative, conflict, rebellion/);
});
test('defects route once, slop is diagnostic, and agency has an explicit scoring home',()=>{
  assert.match(FOUNDATION,/Charge each failure once/);
  assert.match(FOUNDATION,/Repetition harming inference is charged to inference/);
  assert.match(FOUNDATION,/PRIMARY dimension/);
  assert.match(FOUNDATION,/userPossibilities or playerAgency when present, otherwise craft/);
  assert.match(FOUNDATION,/NEVER a penalty added to overall score/);
});
test('functional language and inferred reactions are protected',()=>{
  for(const re of [/Behavioral\/brown prose/,/Brevity is not automatically better/,/ordinary motives, grief, kindness/,/Archetype Swap Test/]) assert.match(FOUNDATION,re);
});
test('classification output and entire 5.1 app stamp are stable',()=>{
  assert.equal(APP_VERSION,'5.1.1');
  const rep=validateAudit(fixture(),kind);
  assert.match(reportToMarkdown(rep),/App version: \*\*5\.1\.1\*\*/);
  assert.match(renderAudit(rep),/v5\.1\.1/);
  assert.match(CLASSIFY_SYSTEM,/secondary/);
});
test('JSON parser accepts fenced JSON and rejects nonnumeric score placeholders',()=>{
  assert.deepEqual(parseJson('```json\n{"a":1}\n```'),{a:1});
  const item=fixture();item.core.craft.score='NUMBER 0-10';
  assert.throws(()=>validateAudit(item,kind),/Invalid or missing score/);
});
test('renderer escapes card-derived markup even in compressed rationale',()=>{
  const item=fixture();item.core.craft.rationale='<script>alert(1)</script> -> bad';
  const html=renderAudit(validateAudit(item,kind));
  assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/<script>/);
});
