import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reportTemplate,singlePrompt,comparePrompt} from '../src/rubrics/assemble.js';
import {validateAudit} from '../src/evaluator.js';
import {renderAudit,renderComparison,reportToMarkdown} from '../src/report.js';

const kind={primary:'character',secondary:null};
const fill=v=>typeof v==='string'?(v.startsWith('NUMBER')?8:'Supported finding.'):
  Array.isArray(v)?[]:Object.fromEntries(Object.entries(v).map(([k,value])=>[k,fill(value)]));
const report=(slop=0,context=0)=>{
  const r=fill(reportTemplate(kind));
  r.slop={score:slop,evidence:'Execution assessment.'};
  r.contextSlop={score:context,removablePercent:{min:0,max:10},evidence:'Description: "She is angry. She feels anger." → "She is angry." Same trait, less repetition.'};
  return r;
};

test('rubric quality is 80% and each independent slop index is exactly 10%',()=>{
  assert.equal(validateAudit(report(),kind).overallScore,8.4);
  assert.equal(validateAudit(report(100,0),kind).overallScore,7.4);
  assert.equal(validateAudit(report(0,100),kind).overallScore,7.4);
  assert.equal(validateAudit(report(100,100),kind).overallScore,6.4);
  const zero=report(100,100);
  for(const c of [...Object.values(zero.core),...Object.values(zero.specialists.character)])c.score=0;
  assert.equal(validateAudit(zero,kind).overallScore,0);
  for(const c of [...Object.values(zero.core),...Object.values(zero.specialists.character)])c.score=10;
  zero.slop.score=zero.contextSlop.score=0;
  assert.equal(validateAudit(zero,kind).overallScore,10);
});

test('compression estimate is not substituted for the context score',()=>{
  const r=report(10,30),base=validateAudit(r,kind).overallScore;
  r.contextSlop.removablePercent={min:80,max:95};
  assert.equal(validateAudit(r,kind).overallScore,base);
});

test('missing or invalid Context Slop withholds new grades without fabricated zeroes',()=>{
  for(const bad of [undefined,null,{},
    {score:'20',removablePercent:{min:10,max:20},evidence:'Reason'},
    {score:20,removablePercent:{min:30,max:10},evidence:'Reason'},
    {score:20,removablePercent:{min:0,max:101},evidence:'Reason'},
    {score:20,removablePercent:{min:0,max:10},evidence:' '},
    {score:NaN,removablePercent:{min:0,max:10},evidence:'Reason'}]){
    const r=report();r.contextSlop=bad;
    const result=validateAudit(r,kind);
    assert.equal(result.overallScore,null);
    assert.equal(result.contextSlop,null);
    assert.equal(result.incomplete,true);
    assert.equal(result.core.cohesion.score,8);
    assert.match(result.validationWarnings.join(' '),/Context Slop unavailable/);
    assert.match(renderAudit(result),/Withheld/);
    assert.doesNotMatch(renderAudit(result),/legacy report/);
  }
});

test('single and comparison prompts isolate bloat and preserve valuable detail',()=>{
  const card={data:{description:'A guard.',scenario:'World rules.',first_mes:'Scene.'}};
  for(const prompt of [singlePrompt(card,kind),comparePrompt(card,kind,card,kind)]){
    assert.match(prompt,/CONTEXT SLOP/);
    assert.match(prompt,/Exclude greetings, temporary examples, and creator\/auditor metadata/);
    assert.match(prompt,/no context overflow or observed model failure is required/);
    assert.match(prompt,/Preserve useful reinforcement, concrete facts, voice cues, and world rules/);
    assert.match(prompt,/no extra bloat deductions under inference, craft or general slop/);
    assert.match(prompt,/"contextSlop"/);
    assert.match(prompt,/"removablePercent"/);
  }
});

test('HTML, Markdown, comparison and JSON retain Context Slop evidence safely',()=>{
  const raw=report(5,35);
  raw.contextSlop.removablePercent={min:25,max:40};
  raw.contextSlop.evidence+='<img src=x onerror=alert(1)>';
  const r=validateAudit(raw,kind);
  const html=renderAudit(r),md=reportToMarkdown(r);
  assert.match(html,/80% rubric quality/);
  assert.match(html,/Context Slop/);
  assert.match(html,/25–40%/);
  assert.match(html,/&lt;img/);
  assert.doesNotMatch(html,/<img src=x/);
  assert.match(md,/Context Slop: \*\*35\/100/);
  assert.match(md,/25–40%/);
  assert.match(md,/Same trait, less repetition/);
  assert.equal(JSON.parse(JSON.stringify(r)).contextSlop.score,35);
  const comparison={cardA:r,cardB:validateAudit(report(5,0),kind),comparison:{verdict:'Different efficiency.',aAdvantages:[],bAdvantages:[],sharedGround:[],scopeDifferences:[]}};
  assert.match(renderComparison(comparison),/Context Slop 35\/100/);
  assert.match(renderComparison(comparison),/Context Slop 0\/100/);
  assert.equal((reportToMarkdown(comparison,'compare').match(/## Context Slop/g)||[]).length,2);
});

test('saved legacy reports keep their score and original formula without inventing Context Slop',()=>{
  const legacy=validateAudit(report(),kind);
  delete legacy.contextSlop;delete legacy.scoringVersion;
  legacy.overallScore=8.2;
  const before=JSON.stringify(legacy);
  assert.match(renderAudit(legacy),/90% rubric quality.*legacy scoring/);
  assert.match(renderAudit(legacy),/Not assessed \(legacy report\)/);
  assert.match(reportToMarkdown(legacy),/Overall: \*\*8.2\/10/);
  assert.equal(JSON.stringify(legacy),before);
});

test('new assessment instructions stay compact',()=>{
  const source=readFileSync(new URL('../src/rubrics/core.js',import.meta.url),'utf8');
  const section=source.split("'CONTEXT SLOP")[1].split("',")[0];
  assert.ok(section.split(/\s+/).length<=220);
});
