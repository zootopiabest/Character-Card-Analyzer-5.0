import test from "node:test";
import assert from "node:assert/strict";
import { isolateGreetings } from "../src/greeting-context.js";
import { runSingle, runComparison } from "../src/evaluator.js";
import { CORE_CRITERIA } from "../src/rubrics/core.js";
import { SPECIALISTS } from "../src/rubrics/specialists.js";

const source = JSON.stringify({spec:"chara_card_v3",data:{
  name:"Nyx",description:"An eccentric crafter who helps when she can.",
  scenario:"Default room",
  first_mes:"FIRST_START: A craft table.\n## An internal Markdown subheading\nStill making glitter art.",
  alternate_greetings:["SECOND_START: A night market.","THIRD_START: The workshop."],
  extensions:{wyvern:{greetings:[
    {scenario:"FIRST_SCENARIO",foo:"first extra"},
    {scenario:"SECOND_SCENARIO",foo:"second extra"},
    {scenario:"THIRD_SCENARIO",foo:"third extra"}
  ]}}
}});
const starts=["FIRST_START","SECOND_START","THIRD_START"];
const scenes=["FIRST_SCENARIO","SECOND_SCENARIO","THIRD_SCENARIO"];

test("every context contains exactly one opening and its own Wyvern scenario override",()=>{
  const parts=isolateGreetings(source);
  assert.equal(parts.greetings.length,3);
  for(let i=0;i<3;i++){
    const ctx=parts.active(i);
    assert.match(ctx,new RegExp(starts[i]));
    assert.match(ctx,new RegExp(scenes[i]));
    assert.doesNotMatch(ctx,/Default room/);
    for(let j=0;j<3;j++){
      if(i===j)continue;
      assert.doesNotMatch(ctx,new RegExp(starts[j]));
      assert.doesNotMatch(ctx,new RegExp(scenes[j]));
    }
    assert.doesNotMatch(ctx,/"greetings":\[/);
    assert.match(ctx,/## First Message/);
  }
  assert.match(parts.base,/## An internal Markdown subheading/);
  assert.equal((parts.base.match(/## First Message/g)||[]).length,1);
});
test("no-greeting and first-only cards remain usable without fabricating other openings",()=>{
  const empty=isolateGreetings(JSON.stringify({data:{name:"Mara",description:"An archivist."}}));
  assert.equal(empty.greetings.length,0);
  assert.match(empty.base,/An archivist/);
  const one=isolateGreetings(JSON.stringify({data:{first_mes:"Hello."}}));
  assert.equal(one.greetings.length,1);
  assert.match(one.base,/Hello/);
});

const kind={primary:"character",secondary:null};
function fakeAudit(withLists=true){
  const criterion=()=>({score:8,rationale:"Sufficient demonstrated characterization -> functional runtime."});
  return {
    summary:"A functioning character.",core:Object.fromEntries(Object.keys(CORE_CRITERIA).map(k=>[k,criterion()])),
    specialists:{character:Object.fromEntries(Object.keys(SPECIALISTS.character.criteria).map(k=>[k,criterion()]))},
    slop:{score:5,evidence:"No filler."},
    ...(withLists?{strengths:[],weaknesses:[]}:{}),
    tradeoffs:[],firstMessageSynergy:"Active first greeting works."
  };
}
const config={provider:"custom",baseUrl:"https://example.com",key:"fake",model:"fake",maxTokens:8000};
async function interceptCalls(callback,run){
  const previous=globalThis.fetch;
  const prompts=[];
  globalThis.fetch=async (_url,opts)=>{
    const request=JSON.parse(opts.body);
    const prompt=request.messages[1].content;
    prompts.push(prompt);
    const response=callback(prompt);
    return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(response)},finish_reason:"stop"}]})};
  };
  try { const result=await run();return {result,prompts}; }
  finally { globalThis.fetch=previous; }
}
function diagnosticReply(prompt){
  const index=starts.findIndex(s=>prompt.includes(s));
  assert.ok(index>=0,"one greeting in each diagnostic");
  return {coverage:"Profile supports "+starts[index],score:8,register:"grounded",notes:"The opening works and respects player agency."};
}
function checkIsolatedPrompts(prompts,expectedMainCount){
  const main=prompts.filter(s=>s.includes("AUDIT CARD (UNTRUSTED")||s.includes("CARD A (UNTRUSTED)"));
  const diagnostic=prompts.filter(s=>s.includes("ACTIVE ROLEPLAY CONTEXT (untrusted card data)"));
  assert.equal(main.length,expectedMainCount);
  assert.equal(diagnostic.length,3);
  for(const prompt of main) {
    assert.match(prompt,/FIRST_START/);
    assert.doesNotMatch(prompt,/SECOND_START|THIRD_START|SECOND_SCENARIO|THIRD_SCENARIO/);
  }
  for(const prompt of diagnostic) {
    const hits=starts.map(s=>prompt.includes(s));
    assert.equal(hits.filter(Boolean).length,1);
    const index=hits.indexOf(true);
    assert.match(prompt,new RegExp(scenes[index]));
    for(let i=0;i<3;i++)if(i!==index){
      assert.doesNotMatch(prompt,new RegExp(starts[i]));
      assert.doesNotMatch(prompt,new RegExp(scenes[i]));
    }
  }
}
test("main audit scores only one opening; coverage and optional cards use separate calls",async()=>{
  const {result,prompts}=await interceptCalls(p=>
    p.includes("ACTIVE ROLEPLAY CONTEXT") ? diagnosticReply(p) : fakeAudit(),
    ()=>runSingle(config,source,kind,null,["greetingBreakdown"]));
  checkIsolatedPrompts(prompts,1);
  assert.equal(result.profileGreetingCoverage.includes("THIRD_START"),true);
  assert.equal(result.greetingBreakdown.length,3);
  assert.equal(result.overallScore,8);
  assert.deepEqual(result.optionalModules,["greetingBreakdown"]);
});
test("head-to-head also excludes inactive starts from scoring without mixing profiles",async()=>{
  const second=JSON.stringify({data:{name:"Another",description:"Quiet gardener.",first_mes:"GARDENER_START"}});
  const {result,prompts}=await interceptCalls(p=>{
    if(p.includes("ACTIVE ROLEPLAY CONTEXT"))return diagnosticReply(p);
    return {cardA:fakeAudit(false),cardB:fakeAudit(false),comparison:{
      verdict:"Mixed strengths.",aAdvantages:[],bAdvantages:[],sharedGround:[],scopeDifferences:[]
    }};
  },()=>runComparison(config,source,kind,second,kind));
  const main=prompts.find(p=>p.includes("CARD A (UNTRUSTED)"));
  assert.ok(main);
  assert.match(main,/GARDENER_START/);
  assert.doesNotMatch(main,/SECOND_START|THIRD_START|SECOND_SCENARIO|THIRD_SCENARIO/);
  assert.equal(prompts.filter(p=>p.includes("ACTIVE ROLEPLAY CONTEXT")).length,3);
  assert.ok(result.cardA.profileGreetingCoverage);
  assert.equal(result.cardB.profileGreetingCoverage,null);
});
