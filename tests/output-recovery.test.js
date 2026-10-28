import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeJson,completeJson} from '../src/model-output.js';
import {mountOutputReview} from '../src/output-review.js';
import {runSingle,runComparison,classifyCard} from '../src/evaluator.js';
import {reportTemplate,comparisonTemplate} from '../src/rubrics/assemble.js';
import {prepareRun} from '../src/providers.js';
import {escapeProseQuotes} from '../src/quoted-json.js';

const config={provider:'custom',baseUrl:'https://example.invalid',key:'TEST_SECRET_KEY',model:'test-model',maxTokens:4096};
const kind={primary:'character',secondary:null};
const card={data:{name:'Mara',description:'A practical mechanic.',first_mes:'First start.',alternate_greetings:['Another start.']}};
const fill=v=>typeof v==='string'?(v.startsWith('NUMBER')?8:'Supported finding.'):
  Array.isArray(v)?[]:Object.fromEntries(Object.entries(v).map(([k,value])=>[k,fill(value)]));
const audit=()=>({...fill(reportTemplate(kind)),profileGreetingCoverage:'All starts supported.'});
const reply=(raw,finish='stop')=>new Response(JSON.stringify({model:'test-model',choices:[{message:{content:raw},finish_reason:finish}],usage:{completion_tokens:20}}));
async function withFetch(fetcher,run) {
  const previous=globalThis.fetch;globalThis.fetch=fetcher;
  try{return await run();}finally{globalThis.fetch=previous;}
}
const tick=()=>new Promise(r=>setImmediate(r));

test('quote-only recovery preserves repeated quoted directives, comma-adjacent quotes and macros',()=>{
  const expected={rationale:'Instructions say "Never speak for {{user}}" and "Voice additional characters," preserving turn boundaries.',score:6,
    nested:{rationale:'Directives say "Constant menace," "Never yield," and "Strategic sweetness," with distinct effects.'}};
  const json=JSON.stringify(expected),raw=json.replaceAll('\\"','"');
  assert.equal(escapeProseQuotes(raw),json);
  assert.deepEqual(decodeJson(raw),{value:expected,repaired:true});
});
test('quoted commas never split one list finding into several entries',()=>{
  const expected={items:['She says "Hello," then "Wait," and stops.','Other finding.'],score:0};
  const json=JSON.stringify(expected),raw=json.replaceAll('\\"','"');
  assert.equal(escapeProseQuotes(raw),json);
  assert.deepEqual(decodeJson(raw).value,expected);
  assert.equal(decodeJson(raw).value.items.length,2);
});
test('quote-only recovery preserves existing escapes, escaped keys, nested arrays and Unicode',()=>{
  const expected={'quoted"key':{notes:'Already escaped "valid" text, path C:\\cards, newline\nthen "unescaped," text. अलविदा 🌿',
    values:[0,true,false,null,{rationale:'"Keep," then speak.'}]}};
  const json=JSON.stringify(expected),raw=json.replace('\\"unescaped,\\"','"unescaped,"').replace('\\"Keep,\\"','"Keep,"');
  assert.equal(escapeProseQuotes(raw),json);
  assert.deepEqual(decodeJson(raw).value,expected);
  assert.equal(decodeJson(json).repaired,false);
});
test('quote-only recovery refuses missing content and ambiguous closing delimiters',()=>{
  for(const raw of ['{"rationale":"Say "Go," then wait.','{"rationale":"Say "Go," then wait.","score":}',
    '{"rationale":"Quoted "}" inside prose.","score":7}', '{"rationale":"Say "Go," then wait.","score":undefined}'])
    assert.equal(escapeProseQuotes(raw),null);
});
test('a full comparison with repeated unescaped prose quotes is recovered without a review or paid retry',async()=>{
  const expected=fill(comparisonTemplate(card,kind,card,kind));
  expected.cardA.core.reliability.rationale='Instructions mandate "Never speak for {{user}}" and "Voice other characters," keeping boundaries intact.';
  expected.cardA.tradeoffs=['One opening says "Hello," she says, leaving the reaction open.'];
  expected.cardB.core.craft.rationale='Uses "word one," "word two," and "word three," without changing the assessment.';
  const raw=JSON.stringify(expected).replaceAll('\\"','"');let calls=0;
  const result=await withFetch(async()=>{calls++;return reply(raw);},()=>runComparison({...config,
    onOutputIssue:()=>{throw Error('This response should be recovered locally.');}},card,kind,card,kind));
  assert.equal(calls,1);assert.equal(result.run.requestCount,1);
  assert.equal(result.cardA.incomplete,false);assert.equal(result.cardB.incomplete,false);
  assert.equal(result.cardA.core.reliability.rationale,expected.cardA.core.reliability.rationale);
  assert.deepEqual(result.cardA.tradeoffs,expected.cardA.tradeoffs);
  assert.equal(result.cardB.core.craft.rationale,expected.cardB.core.craft.rationale);
  assert.equal(result.cardA.overallScore,8.1);assert.equal(result.cardB.overallScore,8.1);
});

test('local repair preserves unescaped dialogue, Unicode, multiline strings and real zero scores',()=>{
  assert.deepEqual(decodeJson('{"text":"He said "hello". अलविदा 🌿\nNext line." "score":0,}'),
    {value:{text:'He said "hello". अलविदा 🌿\nNext line.',score:0},repaired:true});
  assert.equal(decodeJson('{"text":"Valid &quot; literal text."}').repaired,false);
  assert.deepEqual(decodeJson('Here is the JSON:\n{"score":8}\nDone.').value,{score:8});
  assert.throws(()=>decodeJson('{"summary":"cut off'),/unfinished/);
  assert.throws(()=>decodeJson(''),/empty response/);
});
test('a repaired single audit is schema-validated without another model call',async()=>{
  let calls=0;
  const raw=JSON.stringify(audit()).replace(/}$/,',}');
  const result=await withFetch(async()=>{calls++;return reply(raw);},()=>runSingle(config,card,kind));
  assert.equal(calls,1);assert.equal(result.incomplete,false);assert.equal(result.overallScore,8.1);
  assert.deepEqual(result.run.outputRepairs,[{request:'main audit',method:'local'}]);
  assert.doesNotMatch(JSON.stringify(result.run),/TEST_SECRET_KEY|rawResponse/);
});
test('repaired syntax never coerces an invalid score into a valid grade',async()=>{
  const bad=audit();bad.core.craft.score='8';
  let calls=0,issues=0;
  const result=await withFetch(async()=>{calls++;return reply(JSON.stringify(bad).replace(/}$/,',}'));},
    ()=>runSingle({...config,onOutputIssue:async issue=>{
      issues++;assert.match(issue.warnings.join('\n'),/core.craft/);
      assert.equal(issue.partial.value.overallScore,null);
      return {value:issue.partial.value,method:'partial'};
    }},card,kind));
  assert.equal(calls,1);assert.equal(issues,1);assert.equal(result.overallScore,null);assert.equal(result.incomplete,true);
});
test('comparison and classification use local repair with their own validation',async()=>{
  let calls=0;
  await withFetch(async(_url,options)=>{
    calls++;const prompt=JSON.parse(options.body).messages[1].content;
    return reply(prompt.startsWith('Classify')?'{"primary":"character","secondary":null,}':
      JSON.stringify(fill(comparisonTemplate(card,kind,card,kind))).replace(/}$/,',}'));
  },async()=>{
    assert.equal((await classifyCard(config,card)).primary,'character');
    const result=await runComparison(config,card,kind,card,kind);
    assert.equal(result.cardA.incomplete,false);assert.equal(result.cardB.incomplete,false);
    assert.equal(result.run.requestCount,1);
  });
  assert.equal(calls,2);
});
test('unrecoverable output waits for review; one explicit repair uses the captured model and is logged',async()=>{
  const original='{"summary":"cut off';let calls=0,reviewed=false;
  const result=await withFetch(async(_url,options)=>{
    calls++;const body=JSON.parse(options.body);assert.equal(body.model,'test-model');
    if(calls===1)return reply(original);
    assert.equal(body.max_tokens,4096);
    assert.match(body.messages[0].content,/Preserve all existing scores/);
    assert.match(body.messages[0].content,/Never fill missing evidence/);
    const sent=JSON.parse(body.messages[1].content);
    assert.equal(sent.responseToRepair,original);assert.ok(sent.expectedShape.core);
    assert.doesNotMatch(body.messages[1].content,/A practical mechanic|TEST_SECRET_KEY/);
    return reply(JSON.stringify(audit()));
  },()=>runSingle({...config,onOutputIssue:async issue=>{
    assert.equal(calls,1);await tick();assert.equal(calls,1);reviewed=true;
    assert.equal(issue.rawResponse,original);
    const fixed=await issue.repair(original),checked=issue.check(fixed);
    assert.equal(checked.warnings.length,0);
    return {value:checked.value,method:'model'};
  }},card,kind));
  assert.equal(reviewed,true);assert.equal(calls,2);assert.equal(result.run.requestCount,2);
  assert.equal(result.run.requests[1].purpose,'JSON repair: main audit');
  assert.deepEqual(result.run.outputRepairs,[{request:'main audit',method:'model'}]);
});
test('provider-reported truncation is reviewed without silently accepting or closing it',async()=>{
  let calls=0;
  await withFetch(async()=>{calls++;return reply('{"score":8}','length');},async()=>{
    const controller=new AbortController();
    await assert.rejects(completeJson({...config,signal:controller.signal,onOutputIssue:async issue=>{
      assert.match(issue.message,/cut off/);assert.equal(issue.partial,null);assert.equal(calls,1);
      controller.abort(new DOMException('Cancelled','AbortError'));throw controller.signal.reason;
    }},'system','prompt'),/Cancelled/);
  });
  assert.equal(calls,1);
});
test('failed LLM repair never starts a third call or hides the original response',async()=>{
  let calls=0;
  await withFetch(async()=>{calls++;return reply(calls===1?'bad initial output':'bad repair output');},async()=>{
    await assert.rejects(completeJson({...config,onOutputIssue:async issue=>{
      const fixed=await issue.repair(issue.rawResponse);
      assert.throws(()=>issue.check(fixed),/malformed JSON/);
      assert.equal(issue.rawResponse,'bad initial output');await tick();assert.equal(calls,2);
      throw Error('User stopped recovery.');
    }},'system','prompt'),/User stopped/);
  });
  assert.equal(calls,2);
});
test('a repaired classification resumes its captured run without redoing classification',async()=>{
  let calls=0;
  await withFetch(async()=>{
    calls++;return reply(calls===1?'invalid':calls===2?'{"primary":"character","secondary":null}':JSON.stringify(audit()));
  },async()=>{
    const cfg=await prepareRun({...config,onOutputIssue:async issue=>({value:issue.check(await issue.repair(issue.rawResponse)).value,method:'model'})});
    const selected=await classifyCard(cfg,card),result=await runSingle(cfg,card,selected);
    assert.equal(result.run.requestCount,3);assert.equal(result.run.outputRepairs[0].request,'classification');
  });
  assert.equal(calls,3);
});
test('separate greeting repair resumes without re-running the main audit or other greetings',async()=>{
  let calls=0,diagnostics=0;
  const result=await withFetch(async(_url,options)=>{
    calls++;const body=JSON.parse(options.body),prompt=body.messages[1].content;
    if(body.messages[0].content.startsWith('You repair JSON'))return reply('{"coverage":"Fixed coverage."}');
    if(prompt.includes('ACTIVE ROLEPLAY CONTEXT'))return reply(++diagnostics===1?'broken greeting':'{"coverage":"Good coverage."}');
    return reply(JSON.stringify({...audit(),profileGreetingCoverage:'All starts supported.'}));
  },()=>runSingle({...config,onOutputIssue:async issue=>{
    assert.equal(issue.allowSkip,true);
    return {value:issue.check(await issue.repair(issue.rawResponse)).value,method:'model'};
  }},card,kind,null,[],{separateGreetings:true}));
  assert.equal(calls,4);assert.equal(diagnostics,2);assert.equal(result.run.requestCount,4);
  assert.match(result.profileGreetingCoverage,/Fixed coverage/);
});

function ui() {
  const elements=new Map(),notices=[],originals=[];
  const element=id=>{
    if(!elements.has(id))elements.set(id,{hidden:true,disabled:false,value:'',textContent:'',handlers:{},attrs:{},
      addEventListener(type,fn){this.handlers[type]=fn;},setAttribute(key,value){this.attrs[key]=value;},focus(){}});
    return elements.get(id);
  };
  const panel=mountOutputReview({getElement:element,status:(...args)=>notices.push(args),onShow:issue=>originals.push(issue.rawResponse)});
  return {panel,element,notices,originals,click:id=>element(id).handlers.click()};
}
const issue=overrides=>({label:'main audit',rawResponse:'ORIGINAL',message:'Malformed JSON',warnings:[],partial:null,allowSkip:false,
  check:text=>{if(text!=='VALID')throw Error('Still invalid.');return {value:{summary:'Valid'},warnings:[],repaired:false};},
  repair:async()=> 'VALID',...overrides});

test('Review only reveals editable text; manual validation uses no repair call',async()=>{
  const h=ui();let calls=0;
  const pending=h.panel.review(issue({repair:async()=>{calls++;return 'VALID';}}));
  assert.equal(h.element('outputRecovery').hidden,false);assert.equal(h.element('outputReviewEditor').hidden,true);
  h.click('reviewModelOutput');assert.equal(h.element('outputReviewEditor').hidden,false);assert.equal(calls,0);
  h.click('applyReviewedOutput');assert.match(h.element('outputRecoveryFeedback').textContent,/Still invalid/);assert.equal(calls,0);
  h.element('outputReviewText').value='VALID';h.click('applyReviewedOutput');
  assert.deepEqual(await pending,{value:{summary:'Valid'},method:'manual'});
  assert.equal(h.element('outputRecovery').hidden,true);assert.deepEqual(h.originals,['ORIGINAL']);
});
test('repair click sends once, blocks duplicate clicks, and waits for Apply after validation',async()=>{
  const h=ui();let calls=0,finish,accepted=false;
  const pending=h.panel.review(issue({repair:()=>{calls++;return new Promise(r=>finish=r);}}));
  pending.then(()=>accepted=true);
  const send=h.click('repairModelOutput');h.click('repairModelOutput');assert.equal(calls,1);
  assert.equal(h.element('repairModelOutput').disabled,true);assert.equal(h.element('outputReviewText').disabled,true);
  finish('VALID');await send;assert.equal(accepted,false);assert.equal(h.element('repairModelOutput').disabled,false);
  assert.match(h.element('outputRecoveryFeedback').textContent,/passed validation/);
  assert.equal(h.element('outputReviewText').value,'VALID');assert.deepEqual(h.originals,['ORIGINAL']);
  h.click('applyReviewedOutput');assert.equal((await pending).method,'model');assert.equal(calls,1);
});
test('failed repair stays reviewable and allows another call only on another click',async()=>{
  const h=ui();let calls=0;
  const pending=h.panel.review(issue({repair:async()=>{calls++;return calls===1?'BAD':'VALID';}}));
  await h.click('repairModelOutput');await tick();assert.equal(calls,1);
  assert.match(h.element('outputRecoveryFeedback').textContent,/No further request/);
  assert.equal(h.element('outputReviewText').value,'BAD');assert.deepEqual(h.originals,['ORIGINAL']);
  await h.click('repairModelOutput');assert.equal(calls,2);h.click('applyReviewedOutput');await pending;
});
test('partial result needs an explicit choice and never accepts stale edits',async()=>{
  const h=ui(),partial={value:{overallScore:null,incomplete:true},warnings:['Missing score']};
  const pending=h.panel.review(issue({rawResponse:'PARTIAL',partial,warnings:partial.warnings,
    check:text=>{if(text!=='PARTIAL')throw Error('Invalid edit.');return partial;}}));
  assert.equal(h.element('keepPartialOutput').hidden,false);
  h.element('outputReviewText').value='BROKEN';h.click('keepPartialOutput');
  assert.equal(h.element('outputRecovery').hidden,false);assert.equal(h.element('keepPartialOutput').hidden,true);
  h.element('outputReviewText').value='PARTIAL';h.click('applyReviewedOutput');
  assert.match(h.element('outputRecoveryFeedback').textContent,/Still incomplete/);
  h.click('keepPartialOutput');assert.deepEqual(await pending,{value:partial.value,method:'partial'});
});
test('queued diagnostics stay independent and can be skipped without a repair request',async()=>{
  const h=ui();let calls=0;
  const a=h.panel.review(issue({label:'first',allowSkip:true,repair:async()=>{calls++;return 'VALID';}}));
  const b=h.panel.review(issue({label:'second',rawResponse:'SECOND'}));
  const rejected=assert.rejects(a,/Diagnostic skipped/);
  h.click('skipModelOutput');await rejected;assert.match(h.element('outputRecoveryMessage').textContent,/second/);
  h.element('outputReviewText').value='VALID';h.click('applyReviewedOutput');await b;
  assert.equal(calls,0);assert.deepEqual(h.originals,['ORIGINAL','SECOND']);
});
test('cancel invalidates an in-flight repair and prevents stale UI from replacing a newer review',async()=>{
  const h=ui(),controller=new AbortController();let finish;
  const old=h.panel.review(issue({repair:()=>new Promise(r=>finish=r)}),controller.signal);
  const rejected=assert.rejects(old,/Cancelled/);const sending=h.click('repairModelOutput');
  controller.abort(new DOMException('Cancelled','AbortError'));await rejected;
  assert.equal(h.element('outputRecovery').hidden,true);
  const current=h.panel.review(issue({label:'new review',rawResponse:'NEW'}));
  finish('VALID');await sending;
  assert.equal(h.element('outputReviewText').value,'NEW');assert.match(h.element('outputRecoveryMessage').textContent,/new review/);
  h.element('outputReviewText').value='VALID';h.click('applyReviewedOutput');await current;
});
test('real evaluator and review controls complete a repaired audit only after explicit send and apply',async()=>{
  const h=ui();let calls=0,done=false;
  await withFetch(async()=>{calls++;return reply(calls===1?'BROKEN RESPONSE':JSON.stringify(audit()));},async()=>{
    const run=runSingle({...config,onOutputIssue:h.panel.review},card,kind).then(data=>{done=true;return data;});
    await tick();assert.equal(calls,1);assert.equal(h.element('outputRecovery').hidden,false);
    h.click('reviewModelOutput');assert.equal(calls,1);
    await h.click('repairModelOutput');assert.equal(calls,2);assert.equal(done,false);
    assert.equal(h.element('outputRecovery').hidden,false);assert.deepEqual(h.originals,['BROKEN RESPONSE']);
    h.click('applyReviewedOutput');const data=await run;
    assert.equal(data.incomplete,false);assert.equal(data.run.requestCount,2);
    assert.equal(data.run.outputRepairs[0].method,'model');assert.equal(h.element('outputRecovery').hidden,true);
  });
});
