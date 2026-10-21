import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCard,renderCard,greetingsOf,extractCardText} from '../src/card-context.js';
import {isolateGreetings} from '../src/greeting-context.js';
import {classificationPrompt} from '../src/classifier.js';
import {singlePrompt,reportTemplate} from '../src/rubrics/assemble.js';
import {GREETING_ASSESSMENT} from '../src/rubrics/greetings.js';
import {runSingle,runComparison,classifyCard,validateAudit} from '../src/evaluator.js';
import {prepareRun,complete} from '../src/providers.js';
import {renderAudit,reportToMarkdown} from '../src/report.js';

const kind={primary:'character',secondary:null};
const config={provider:'custom',baseUrl:'https://example.invalid',key:'SECRET_TEST_KEY',model:'test-model'};
const card={data:{name:'Mara',description:'Practical mechanic.',first_mes:'FIRST_START',alternate_greetings:['SECOND_START','THIRD_START']}};
const fill=v=>typeof v==='string'?(v.startsWith('NUMBER')?8:'Evidence supports the intended function.'):
  Array.isArray(v)?[]:Object.fromEntries(Object.entries(v).map(([k,value])=>[k,fill(value)]));
const audit=()=>fill(reportTemplate(kind));
const comparison=()=>({cardA:audit(),cardB:audit(),comparison:{verdict:'Tie.',aAdvantages:[],bAdvantages:[],sharedGround:[],scopeDifferences:[]}});
const diagnostic=()=>({coverage:'Supported portrayal.',score:8,register:'Practical',notes:'Clear and plausible.'});
const reply=(value,status=200)=>new Response(JSON.stringify(status===200?{model:'returned-test-model',usage:{prompt_tokens:100,completion_tokens:50},choices:[{message:{content:JSON.stringify(value)},finish_reason:'stop'}]}:{error:{message:'Test failure'}}),{status});
async function withFetch(fn,run){const old=globalThis.fetch;globalThis.fetch=fn;try{return await run();}finally{globalThis.fetch=old;}}
const prompt=opts=>JSON.parse(opts.body).messages[1].content;
const tick=()=>new Promise(r=>setImmediate(r));

test('structured imports retain nested headings and empty greeting slots through marked round-trips',()=>{
  const source={data:{name:'Nested',description:'Profile\n## Scenario\nThis is prose inside the profile.',first_mes:'',
    alternate_greetings:['FIRST_ALT\n## Description\nINSIDE_GREETING\n## Scenario\nSTILL_INSIDE','   ','LAST_ALT'],
    extensions:{wyvern:{greetings:[{scenario:'EMPTY_FIRST'},{scenario:'FIRST_ALT_SCENE'},{scenario:'EMPTY_MIDDLE'},{scenario:'LAST_ALT_SCENE'}]}}}};
  const imported=extractCardText(source);
  for(const input of [source,JSON.stringify(source),imported]){
    const isolated=isolateGreetings(input);
    assert.deepEqual(isolated.greetings.map(g=>g.originalIndex),[1,3]);
    assert.match(isolated.active(0),/FIRST_ALT_SCENE/);
    assert.match(isolated.active(1),/LAST_ALT_SCENE/);
    assert.doesNotMatch(isolated.active(1),/INSIDE_GREETING|STILL_INSIDE|FIRST_ALT_SCENE|EMPTY_MIDDLE/);
    assert.match(isolated.active(1),/This is prose inside the profile/);
    assert.equal(parseCard(input).sections.filter(s=>s.name==='Description').length,1);
  }
  assert.equal(singlePrompt(source,kind),singlePrompt(imported,kind));
});
test('intent, lorebook configuration, unknown extensions and group-only starts survive import',()=>{
  const source={spec:'chara_card_v3',data:{...card.data,tags:['Non-romantic','Slice of life'],nickname:'M',group_only_greetings:['GROUP_START'],
    character_book:{scan_depth:4,extensions:{recursive:true},entries:[{enabled:true,keys:['dock'],extensions:{priority:9},content:'Pier lore'}]},
    extensions:{wyvern:{greetings:[{scenario:'FIRST_SCENE'},{scenario:'SECOND_SCENE'},{scenario:'THIRD_SCENE'}]},custom:{supported:true}}}};
  const text=extractCardText(source),parts=isolateGreetings(text);
  for(const value of ['Non-romantic','scan_depth','recursive','priority','nickname','supported'])assert.ok(text.includes(value));
  assert.equal(parts.greetings.at(-1).groupOnly,true);
  assert.equal(parts.greetings.at(-1).originalIndex,null);
  assert.doesNotMatch(parts.active(3),/FIRST_SCENE|SECOND_SCENE|THIRD_SCENE/);
  assert.match(parts.active(3),/group-chat start/);
});
test('manual Markdown discloses inferred boundaries and ignores fenced fake headings',()=>{
  const parsed=parseCard('## Description\nPersona.\n```md\n## First Message\nFake\n```\n## First Message\nReal');
  assert.equal(greetingsOf(parsed).length,1);assert.equal(greetingsOf(parsed)[0].text,'Real');
  assert.match(parsed.warnings[0],/inferred field boundaries/);
});
test('classification includes late fields and grading receives declared scope',()=>{
  const source={data:{description:'x'.repeat(60000),tags:['Finite'],system_prompt:'LATE_SYSTEM_RULE',post_history_instructions:'LATE_DEPTH_RULE'}};
  const p=classificationPrompt(source);
  assert.match(p,/LATE_SYSTEM_RULE/);assert.match(p,/LATE_DEPTH_RULE/);assert.match(p,/Finite/);
  assert.match(singlePrompt(source,{...kind,scope:'finite'}),/CLASSIFIED SCOPE: finite/);
  assert.notEqual(singlePrompt(source,{...kind,scope:'finite'}),singlePrompt(source,{...kind,scope:'open-ended'}));
});
test('combined and separate greeting requests use the identical grading contract without an example score',async()=>{
  const seen=[];
  await withFetch(async(_url,opts)=>{seen.push(prompt(opts));return reply(prompt(opts).includes('ACTIVE ROLEPLAY CONTEXT')?diagnostic():audit());},
    ()=>runSingle(config,card,kind,null,['greetingBreakdown'],{separateGreetings:true}));
  const combined=singlePrompt(card,kind,false,['greetingBreakdown']);
  assert.ok(combined.includes(GREETING_ASSESSMENT));
  for(const p of seen.slice(1)){assert.ok(p.includes(GREETING_ASSESSMENT));assert.doesNotMatch(p,/"score":7/);}
  assert.match(combined,/Multiple starts share this review request/);
  assert.doesNotMatch(combined,/application must keep/);
});
test('failed main audit starts no greeting requests, including after rejection returns',async()=>{
  let calls=0;
  await withFetch(async()=>{calls++;return reply(null,503);},async()=>{
    await assert.rejects(runSingle(config,card,kind,null,[],{separateGreetings:true}),/503/);
    await tick();assert.equal(calls,1);
  });
});
test('failed optional diagnostics retain successful entries and do not retry',async()=>{
  let calls=0;
  const result=await withFetch(async(_url,opts)=>{
    calls++;const p=prompt(opts);
    if(!p.includes('ACTIVE ROLEPLAY CONTEXT'))return reply(audit());
    return p.includes('SECOND_START')?reply(null,503):reply(diagnostic());
  },()=>runSingle(config,card,kind,null,['greetingBreakdown'],{separateGreetings:true}));
  assert.equal(calls,4);assert.equal(result.overallScore,8.1);
  assert.deepEqual(result.greetingBreakdown.map(g=>g.id),['first','alternate:1']);
  assert.equal(result.greetingBreakdownIncomplete,true);assert.equal(result.optionalWarnings.length,1);
});
test('comparison shares one diagnostic concurrency limit across both cards',async()=>{
  let active=0,maximum=0,calls=0;
  await withFetch(async(_url,opts)=>{
    calls++;
    if(!prompt(opts).includes('ACTIVE ROLEPLAY CONTEXT'))return reply(comparison());
    active++;maximum=Math.max(maximum,active);await tick();active--;return reply(diagnostic());
  },()=>runComparison(config,card,kind,card,kind,'independent',{separateGreetings:true}));
  assert.equal(calls,7);assert.equal(maximum,2);
});
test('cancel aborts both active diagnostics and prevents remaining calls',async()=>{
  const controller=new AbortController();let calls=0,aborted=0;
  await withFetch(async(_url,opts)=>{
    calls++;
    if(!prompt(opts).includes('ACTIVE ROLEPLAY CONTEXT'))return reply(audit());
    return new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>{aborted++;reject(opts.signal.reason);},{once:true}));
  },async()=>{
    const run=runSingle({...config,signal:controller.signal},card,kind,null,[],{separateGreetings:true});
    await tick();assert.equal(calls,3);controller.abort(new DOMException('Cancelled','AbortError'));
    await assert.rejects(run,/Cancelled/);await tick();assert.equal(calls,3);assert.equal(aborted,2);
  });
});
test('provider timeout aborts the pending POST without another paid request',async()=>{
  let calls=0;
  await withFetch(async(_url,opts)=>{calls++;return new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(opts.signal.reason),{once:true}));},async()=>{
    await assert.rejects(complete({...config,timeoutMs:10},'system','card'),/timed out/);assert.equal(calls,1);
  });
});
test('latest DeepSeek resolves once for classification and all audit calls; run exports contain usage without keys',async()=>{
  let catalogs=0,posts=0;
  const result=await withFetch(async(url,opts)=>{
    if(url.endsWith('/models')){catalogs++;return new Response(JSON.stringify({data:[{id:'deepseek/deepseek-v9-pro',created:9,top_provider:{max_completion_tokens:4096}}]}));}
    posts++;const body=JSON.parse(opts.body);assert.equal(body.model,'deepseek/deepseek-v9-pro');
    const p=body.messages[1].content;
    return reply(p.startsWith('Classify')?{primary:'character',secondary:null,scope:'recurring'}:p.includes('ACTIVE ROLEPLAY CONTEXT')?diagnostic():audit());
  },async()=>{
    const cfg=await prepareRun({...config,provider:'openrouter',model:'latest:deepseek-pro'});
    const k=await classifyCard(cfg,card);return runSingle(cfg,card,k,null,[],{separateGreetings:true});
  });
  assert.equal(catalogs,1);assert.equal(posts,5);assert.equal(result.run.requestCount,5);
  assert.equal(result.run.resolvedModel,'deepseek/deepseek-v9-pro');assert.equal(result.run.requests[0].usage.prompt_tokens,100);
  assert.doesNotMatch(JSON.stringify(result),/SECRET_TEST_KEY|Authorization/);
  assert.match(reportToMarkdown(result),/Run record/);assert.match(reportToMarkdown(result),/returned-test-model/);
});
test('missing/empty criteria withhold the overall grade while genuine zeros remain valid',()=>{
  const raw=audit();raw.core.inference.rationale='   ';delete raw.specialists.character.individuality;
  const partial=validateAudit(raw,kind);
  assert.equal(partial.overallScore,null);assert.equal(partial.core.craft.score,8);assert.equal(partial.validationWarnings.length,2);
  const html=renderAudit(partial),md=reportToMarkdown(partial);
  assert.match(html,/Withheld/);assert.doesNotMatch(html,/NaN|0.0<small>/);assert.match(md,/incomplete criteria/);
  const zero=audit();for(const c of Object.values(zero.core))c.score=0;for(const c of Object.values(zero.specialists.character))c.score=0;
  assert.equal(validateAudit(zero,kind).overallScore,0.9);
});
test('optional counts and greeting identities are validated without discarding valid main scores',()=>{
  const raw=audit();raw.topSongs=[{title:'One',artist:'Artist',vibe:'A reason'}];raw.shoppingList={items:['One'],notes:'A reason'};
  const greetings=greetingsOf(card);
  raw.greetingBreakdown=[{id:greetings[0].id,label:greetings[0].label,...diagnostic()},{id:'made-up',label:'Made up',...diagnostic()}];
  const result=validateAudit(raw,kind,false,{modules:['topSongs','shoppingList','greetingBreakdown'],greetings});
  assert.equal(result.overallScore,8.1);assert.equal(result.topSongs,undefined);assert.equal(result.shoppingList,undefined);
  assert.equal(result.greetingBreakdown.length,1);assert.equal(result.greetingBreakdownIncomplete,true);assert.equal(result.optionalWarnings.length,5);
  raw.topSongs={notApplicable:'This card has no character or supported roster.'};
  assert.ok(validateAudit(raw,kind,false,{modules:['topSongs']}).topSongs.notApplicable);
});
test('optional portrait failure keeps the main audit and successful visual exports retain all evidence',()=>{
  const raw=audit(),partial=validateAudit(raw,kind,true);
  assert.equal(partial.overallScore,8.1);assert.equal(partial.visual,null);assert.equal(partial.optionalWarnings.length,1);
  raw.visual={score:90,matches:['Blue jacket matches.'],mismatches:['Eyes are green rather than blue.'],notes:'Visible evidence only.'};
  const md=reportToMarkdown(validateAudit(raw,kind,true));
  assert.match(md,/Blue jacket matches/);assert.match(md,/Eyes are green/);
});
test('native latest aliases use the concrete model from the first response for later calls',async()=>{
  const sent=[];
  await withFetch(async(_url,opts)=>{sent.push(JSON.parse(opts.body).model);return reply({ok:true});},async()=>{
    const cfg=await prepareRun({...config,provider:'openrouter',model:'~provider/family-latest'});
    // Mock the returned model as a provider/model ID, as OpenRouter returns it.
    const old=globalThis.fetch;
    globalThis.fetch=async(...args)=>{const response=await old(...args),data=await response.json();data.model='provider/concrete-model';return new Response(JSON.stringify(data));};
    await complete(cfg,'system','first');await complete(cfg,'system','second');
  });
  assert.deepEqual(sent,['~provider/family-latest','provider/concrete-model']);
});
