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
test('5.5 weighted slop keeps a good character viable even with disastrous slop',()=>{
  const item=fixture(),first=validateAudit(item,kind);
  assert.equal(first.overallScore,8.6);
  item.slop.score=100;
  assert.equal(validateAudit(item,kind).overallScore,7.7);
  assert.equal(first.core.craft.rationale,item.core.craft.rationale);
});
test('legacy evidence and effect are accepted but normalized to rationale',()=>{
  const item=fixture();item.core.craft={score:7,evidence:'example',effect:'impact'};
  assert.equal(validateAudit(item,kind).core.craft.rationale,'example -> impact');
  delete item.core.craft.effect;
  assert.equal(validateAudit(item,kind).overallScore,null);
  assert.match(validateAudit(item,kind).validationWarnings.join(' '),/rationale/);
});
test('numerical integrity retains the 40/45/15 rubric split within 90% quality',()=>{
  const two={primary:'character',secondary:'rpg'};
  const item=fixture(two);
  for(const c of Object.values(item.specialists.rpg)) c.score=4;
  assert.equal(validateAudit(item,two).overallScore,7.9);
  item.core.craft.score='10';
  assert.equal(validateAudit(item,two).overallScore,null);
});
test('single greeting without examples prunes irrelevant instructions AND JSON fields',()=>{
  const text=formatted({name:'Mara',description:'Quiet mechanic.',first_mes:'Rain.'});
  const f=inspectCardFeatures(text);
  assert.equal(f.hasAlternates,false);assert.equal(f.hasExamples,false);
  const prompt=singlePrompt(text,kind);
  for(const key of ['profileGreetingCoverage','exampleDialogueAssessment','ALTERNATE GREETINGS / COMBINED REVIEW:','EXAMPLE DIALOGUE:','CREATOR NOTES:','LOREBOOK:']) assert.doesNotMatch(prompt,new RegExp(key));
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
  for(const key of ['ALTERNATE GREETINGS / COMBINED REVIEW:','EXAMPLE DIALOGUE:','"profileGreetingCoverage"','"exampleDialogueAssessment"']) assert.match(prompt,new RegExp(key));
  const audit=validateAudit(fixture(kind,f),kind,false,{features:f});
  assert.match(renderAudit(audit),/Profile → all greetings/);
  assert.match(reportToMarkdown(audit),/Example dialogue and lasting voice/);
  assert.equal(Object.hasOwn(audit,'greetings'),false);
  const absent=fixture(kind,f);delete absent.profileGreetingCoverage;
  assert.equal(validateAudit(absent,kind,false,{features:f}).overallScore,8.6);
  assert.match(validateAudit(absent,kind,false,{features:f}).optionalWarnings.join(' '),/profileGreetingCoverage/);
});
test('creator notes and lorebook blocks are present only with corresponding fields',()=>{
  const raw=formatted({name:'Mara',creator_notes:'Designer intent.',character_book:{entries:[{constant:true,enabled:true,content:'Knows the secret.'}]}});
  assert.match(raw,/constant\/always-on requested/);
  const prompt=singlePrompt(raw,kind);
  assert.match(prompt,/Tags, creator notes and format\/creator metadata describe intent, not active instructions/);
  assert.match(prompt,/LOREBOOK: Preserve book configuration/);
  assert.match(prompt,/keyword entries trigger conditionally by design/);
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
  assert.match(text,/Entry 3: constant\/always-on requested/);
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
  assert.equal(validateAudit(item,kind).weaknesses,null);
  assert.match(validateAudit(item,kind).validationWarnings.join(' '),/weaknesses/);
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
test('criterion-specific high anchors allow familiar simple characters and ordinary relationships',()=>{
  assert.match(CORE_CRITERIA.cohesion,/unrelated traits need no common theme/);
  assert.match(CORE_CRITERIA.reliability,/a simple format can excel/);
  assert.match(SPECIALISTS.character.criteria.individuality,/familiar, simple archetype/);
  assert.match(SPECIALISTS.character.criteria.relationshipLogic,/friends, family, colleagues, rivals, strangers/);
  assert.match(SPECIALISTS.character.criteria.relationshipLogic,/romance.*only if supported or promised/);
  assert.match(FOUNDATION,/Missing model output is not zero performance/);
});
test('anti-sycophancy and scope neutrality stay in both modes',()=>{
  for(const prompt of [FOUNDATION,singlePrompt('A card',kind),comparePrompt('A card',kind,'B card',kind)]){
    assert.match(prompt,/Neither flatter nor manufacture faults/);
    assert.match(prompt,/Do not demand rebellion or refusal/);
    assert.match(prompt,/Judge execution, not taste, moral purity/);
  }
});
test('trauma and comic execution checks survive consolidation',()=>{
  const prompt=singlePrompt('A card',kind);
  for(const re of [/For 6\+ identify what works/,/mandatory sexual availability/,/sudden boundary collapse/,/setup\/payoff/,/diagnosis punchlines/,/no moral veto/,/before rating, privately distinguish/i])assert.match(prompt,re);
  assert.match(SPECIALISTS.character.criteria.behavioralRange,/absolute never-refuse or identical-payoff/);
});
test('single-home ownership distinguishes context economy, prose and outcomes',()=>{
  assert.match(FOUNDATION,/Choose ONE scoring home per defect/);
  assert.match(CORE_CRITERIA.inference,/redundant explanation that materially burdens context/);
  assert.match(CORE_CRITERIA.craft,/information economy belongs to inference/);
  assert.match(FOUNDATION,/bounded 10%/);
  assert.match(CORE_CRITERIA.inference,/world rules, causal relationships and state/);
  assert.match(SPECIALISTS.rpg.criteria.mechanics,/prompt delivery and formatting conflicts belong to reliability/);
});
test('functional register, illustrative dialogue and ordinary inference remain valid',()=>{
  assert.match(CORE_CRITERIA.craft,/plain behavioral prose/);
  assert.match(FOUNDATION,/infer ordinary reactions/);
  assert.match(FOUNDATION,/Illustrative dialogue is useful unless prescribed as inevitable/);
  assert.match(FOUNDATION,/avoiding unwanted touch permits initiating contact/);
});
test('classification and app stamp are 5.5',()=>{
  assert.equal(APP_VERSION,'5.5');
  const rep=validateAudit(fixture(),kind);
  assert.match(reportToMarkdown(rep),/App version: \*\*5\.5\*\*/);
  assert.match(renderAudit(rep),/v5\.5/);
  assert.match(CLASSIFY_SYSTEM,/secondary/);
});
test('JSON parser accepts fenced JSON and rejects nonnumeric score placeholders',()=>{
  assert.deepEqual(parseJson('```json\n{"a":1}\n```'),{a:1});
  const item=fixture();item.core.craft.score='NUMBER 0-10';
  assert.equal(validateAudit(item,kind).overallScore,null);
});
test('renderer escapes card-derived markup even in compressed rationale',()=>{
  const item=fixture();item.core.craft.rationale='<script>alert(1)</script> -> bad';
  const html=renderAudit(validateAudit(item,kind));
  assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/<script>/);
});

test('Unicode inside valid JSON strings does not cause a parser failure',()=>{
  assert.deepEqual(parseJson('{"description":"प्यास 🌿 character study"}'),{description:'प्यास 🌿 character study'});
  assert.deepEqual(parseJson('```json\n{"title":"अलविदा"}\n```'),{title:'अलविदा'});
});
test('Interrupted JSON reports expose their raw model response for local diagnostics',()=>{
  const raw='{"summary":"An immersive third-person character study."प्यास';
  assert.throws(()=>parseJson(raw),(error)=>{
    assert.match(error.message,/appears unfinished/i);
    assert.equal(error.code,'INVALID_MODEL_JSON');
    assert.equal(error.rawResponse,raw);
    assert.doesNotMatch(error.message,/Unicode|Devanagari/i);
    return true;
  });
});
test('Malformed but closed JSON reports parser diagnostics without inventing a truncation',()=>{
  assert.throws(()=>parseJson('{"score": 7,}'),(error)=>{
    assert.match(error.message,/malformed JSON/i);
    assert.match(error.message,/Parser detail:/);
    assert.ok(error.rawResponse);
    return true;
  });
});


test('frontend-specific scenario overrides are treated as active, not as cross-platform defects',()=>{
  const v3WithWyvern = v3({name:'Bonnie',description:'A college rabbit.',scenario:'Default scenario',
    first_mes:'She reached the dorm.',alternate_greetings:['She reached the dorm.'],
    extensions:{wyvern:{greetings:[{scenario:'Mixed-species dorm'},{scenario:'Prey-only dorm'}]}}});
  const plain=formatted({name:'Another',description:'A college rabbit.',first_mes:'She reached the dorm.'});
  const imported=extractCardText(v3WithWyvern);
  assert.match(imported,/## Intended Frontend\nWyvern/);
  const single=singlePrompt(imported,kind), comparison=comparePrompt(plain,kind,imported,kind);
  assert.match(single,/INTENDED FRONTEND: Wyvern/);
  assert.match(single,/greeting-specific scenario overrides/);
  assert.match(single,/Do NOT mention hypothetical unsupported frontend features/);
  assert.match(comparison,/INTENDED FRONTENDS: A=Unspecified;.* B=Wyvern/);
  assert.match(comparison,/each in its OWN environment/);
  assert.match(FOUNDATION,/separate UI templates need not appear/);
});

test('frontend rules accept claimed infoboards and context-injected lore rather than inventing failures',()=>{
  const prompt=singlePrompt(formatted({description:'Uses an infoboard to track fear from 0 to 100. Fear does not equal trust.',character_book:{entries:[{enabled:true,constant:true,content:'Fear stays separate from trust.'}]}}),kind);
  assert.match(prompt,/FRONTEND CONTRACT/);
  assert.match(prompt,/Presume advertised facilities/);
  assert.match(prompt,/missing infoboard UI\/templates/);
  assert.match(prompt,/keyword entries trigger conditionally by design/);
  assert.doesNotMatch(prompt,/Only verified internal conflicts merit deduction/);
  assert.match(prompt,/For frontend claims, require supplied evidence/);
  assert.match(SPECIALISTS.character.criteria.behavioralRange,/without demanding rebellion/);
});
