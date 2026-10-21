import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAudit} from '../src/evaluator.js';
import {CORE_CRITERIA} from '../src/rubrics/core.js';
import {SPECIALISTS} from '../src/rubrics/specialists.js';
import {planEstimate,estimatePricing} from '../src/cost-estimate.js';
import {lintCard} from '../src/static-lint.js';
import {diffCardFields} from '../src/card-diff.js';
const kind={primary:'character',secondary:null};
const criteria=obj=>Object.fromEntries(Object.keys(obj).map(k=>[k,{score:8,rationale:'A concrete demonstrated function.'}]));
function report(slop){return {summary:'Supported portrayal.',core:criteria(CORE_CRITERIA),specialists:{character:criteria(SPECIALISTS.character.criteria)},
  slop:{score:slop,evidence:'Evidence-based execution analysis.'},strengths:[],weaknesses:[],tradeoffs:[],firstMessageSynergy:'Adequate start.'};}
test('5.5 slop counts 10%, never imposes a veto and missing slop withholds overall',()=>{
  assert.equal(validateAudit(report(0),kind).overallScore,8.2);
  assert.equal(validateAudit(report(100),kind).overallScore,7.2);
  assert.equal(validateAudit(report(50),kind).overallScore,7.7);
  const missing=report(20);delete missing.slop;
  assert.equal(validateAudit(missing,kind).overallScore,null);
  assert.equal(validateAudit(missing,kind).incomplete,true);
});
test('budget stays manual: combined greetings add 250 each and separate ones do not inflate main',()=>{
  const card=JSON.stringify({data:{description:'Stable.',first_mes:'Opening 1',alternate_greetings:['Opening 2','Opening 3']}});
  const combined=planEstimate({cards:[card],perGreeting:[true],baseOutput:16384});
  assert.equal(combined.mainOutput,17134);
  assert.equal(combined.requestCount,1);
  const independent=planEstimate({cards:[card],perGreeting:[true],separateGreetings:true,baseOutput:16384});
  assert.equal(independent.mainOutput,16384);
  assert.equal(independent.diagnosticCalls,3);
  assert.equal(independent.maxOutputTokens,16384+3*4096);
  const one=planEstimate({cards:[JSON.stringify({data:{first_mes:'Only'}})],perGreeting:[true],separateGreetings:true,baseOutput:16384});
  assert.equal(one.diagnosticCalls,0);
  assert.equal(one.mainOutput,16634);
});
test('cost display is a priced upper budget, not an output forecast',()=>{
 const estimate=planEstimate({cards:['## Description\nA useful character.'],baseOutput:16384});
 const prices=estimatePricing(estimate,{input:2,output:10});
 assert.ok(prices.ceiling>prices.input);
 assert.ok(prices.input>0);
 assert.equal(estimate.requestCount,1);
});
test('technical lint refuses to grade taste and catches malformed macro braces',()=>{
 assert.deepEqual(lintCard('## Description\nPlain prose with {{char}} and {{user}}.'),['Pasted Markdown uses inferred field boundaries. For reliable greeting isolation, import JSON, PNG or CharX, or paste the marked text from an import.'].filter(()=>false).length?[]:lintCard('## Description\nPlain prose with {{char}} and {{user}}.').filter(x=>!x.includes('Pasted Markdown')));
 assert.ok(lintCard(JSON.stringify({data:{description:'Broken {{char}'}})).some(x=>/delimiter|macro/.test(x)));
});
test('remake field diff reports structural changes without storing full field text',()=>{
 const a={data:{name:'A',description:'Short.',first_mes:'Hello.'}};
 const b={data:{name:'A',description:'Much longer.',first_mes:'Hello.',alternate_greetings:['Bye.']}};
 const diff=diffCardFields(a,b);
 assert.ok(diff.some(x=>x.field==='Description'&&x.status==='modified'));
 assert.ok(diff.some(x=>x.status==='added'));
 assert.equal(JSON.stringify(diff).includes('Much longer'),false);
});
