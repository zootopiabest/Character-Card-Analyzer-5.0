import test from "node:test";
import assert from "node:assert/strict";
import { SPECIALISTS, SPECIALIST_KEYS } from "../src/rubrics/specialists.js";
import { FOUNDATION } from "../src/rubrics/core.js";
import { specialistKeys, rubricPrompt, comparePrompt } from "../src/rubrics/assemble.js";
import { normalizeClassification } from "../src/classifier.js";
import { parseJson, validateAudit } from "../src/evaluator.js";
import { extractCardText } from "../src/importer.js";

const fixture = (kind) => ({
  summary: "Complete report.",
  core: Object.fromEntries(["cohesion","inference","reliability","craft"].map((k)=>[k,{score:8,evidence:"e",effect:"f"}])),
  specialists: Object.fromEntries(specialistKeys(kind).map((id)=>[id,Object.fromEntries(Object.keys(SPECIALISTS[id].criteria).map((k)=>[k,{score:9,evidence:"e",effect:"f"}]))])),
  slop:{score:12,evidence:"No material filler."},
  strengths:["Well delineated"],weaknesses:[],tradeoffs:[],greetings:[]
});

test("all six specialist rubrics are independently selectable",()=>{
  assert.equal(SPECIALIST_KEYS.length,6);
  for(const primary of SPECIALIST_KEYS) {
    const prompt=rubricPrompt({primary,secondary:null});
    assert.match(prompt,new RegExp("MODULE: "+primary));
    assert.equal((prompt.match(/MODULE: /g)||[]).length,1);
  }
});
test("secondary cannot duplicate primary",()=>{
  assert.deepEqual(specialistKeys({primary:"rpg",secondary:"rpg"}),["rpg"]);
  assert.equal(normalizeClassification({primary:"companion",secondary:"companion"}).secondary,null);
});
test("no irrelevant high grade is invented",()=>{
  const kind={primary:"character",secondary:null};
  const report=validateAudit(fixture(kind),kind);
  assert.equal(Object.keys(report.specialists).length,1);
  assert.ok(Math.abs(report.overallScore-8.6)<0.11);
});
test("greeting score cannot distort overall quality",()=>{
  const kind={primary:"character",secondary:null};
  const a=fixture(kind),b=fixture(kind);
  b.greetings=[{label:"First Message",score:0,notes:"Poor."}];
  assert.equal(validateAudit(a,kind).overallScore,validateAudit(b,kind).overallScore);
});
test("nonnumeric grades fail instead of silently defaulting",()=>{
  const kind={primary:"character",secondary:null};
  const item=fixture(kind);item.core.craft.score="10";
  assert.throws(()=>validateAudit(item,kind),/Invalid or missing score/);
});
test("two modules use the 40-45-15 aggregate",()=>{
  const kind={primary:"character",secondary:"rpg"},item=fixture(kind);
  for(const k in item.specialists.rpg) item.specialists.rpg[k].score=4;
  assert.ok(Math.abs(validateAudit(item,kind).overallScore-7.85)<0.11);
});
test("V3 import preserves alternate greetings",()=>{
  const s=extractCardText(JSON.stringify({data:{name:"Lisa",description:"Tired vampire",first_mes:"Hello",alternate_greetings:["At the tavern","Against trolls"]}}));
  assert.match(s,/Lisa/);assert.match(s,/Greeting 2/);assert.match(s,/Greeting 3/);
});
test("response JSON parser allows surrounding text",()=>{
  assert.deepEqual(parseJson('prefix {"a":1} suffix'),{a:1});
});
test("comparison prompt includes both modules and cards",()=>{
  const str=comparePrompt("Card A data",{primary:"character",secondary:null},"Card B data",{primary:"rpg",secondary:null});
  for(const re of [/Card A data/,/Card B data/,/"cardA"/,/"cardB"/,/"greetings"/,/"comparison"/]) assert.match(str,re);
});
test("universal rules don't mandate conflict",()=>{
  assert.match(FOUNDATION,/No mandatory independent goals, friction, conflict/);
});
