import test from "node:test";
import assert from "node:assert/strict";
import { SPECIALISTS, SPECIALIST_KEYS } from "../src/rubrics/specialists.js";
import { FOUNDATION } from "../src/rubrics/core.js";
import { specialistKeys, rubricPrompt, comparePrompt, singlePrompt, reportTemplate } from "../src/rubrics/assemble.js";
import { normalizeClassification } from "../src/classifier.js";
import { parseJson, validateAudit } from "../src/evaluator.js";
import { extractCardText } from "../src/importer.js";
import { renderAudit, reportToMarkdown } from "../src/report.js";
import { APP_VERSION } from "../src/version.js";

const fixture = (kind) => ({
  summary: "Complete report.",
  core: Object.fromEntries(["cohesion","inference","reliability","craft"].map((k)=>[k,{score:8,evidence:"e",effect:"f"}])),
  specialists: Object.fromEntries(specialistKeys(kind).map((id)=>[id,Object.fromEntries(Object.keys(SPECIALISTS[id].criteria).map((k)=>[k,{score:9,evidence:"e",effect:"f"}]))])),
  slop:{score:12,evidence:"No material filler."},
  strengths:["Well delineated"],weaknesses:[],tradeoffs:[],
  firstMessageSynergy:"The first start is supported by the profile.",
  profileGreetingCoverage:"All independent openings are character-consistent.",
  exampleDialogueAssessment:"Optional; lasting voice comes from the profile."
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
test("greeting diagnostics remain textual without creating extra grades",()=>{
  const kind={primary:"character",secondary:null};
  const a=fixture(kind),b=fixture(kind);
  b.firstMessageSynergy="First opening is poor.";
  b.profileGreetingCoverage="One alternate contains unsupported behavior.";
  assert.equal(validateAudit(a,kind).overallScore,validateAudit(b,kind).overallScore);
  assert.equal(validateAudit(b,kind).firstMessageSynergy,"First opening is poor.");
  assert.equal(Object.hasOwn(validateAudit(b,kind),"greetings"),false);
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
  for(const re of [/Card A data/,/Card B data/,/"cardA"/,/"cardB"/,/"firstMessageSynergy"/,/"profileGreetingCoverage"/,/"exampleDialogueAssessment"/,/"comparison"/]) assert.match(str,re);
});
test("universal rules don't mandate conflict",()=>{
  assert.match(FOUNDATION,/initiative, defiance, conflict, redemption and psychological complexity are not prerequisites/);
});

test("scoring anchors disallow high scores for simple clarity, shock, or rule obedience",()=>{
  for(const re of [/8\+ EVIDENCE TEST/,/A card may make a bland loop extremely predictable, or enforce a cumbersome fixed response format/i,/shock value/i,/distinctiveness is not quality/i,/Only ONE selected greeting/i,/Creator Notes, listing tags.*NOT seen/i]) assert.match(FOUNDATION,re);
});
test("single and comparison use the same mandatory report shape",()=>{
  const kind={primary:"character",secondary:null};
  const template=reportTemplate(kind);
  assert.equal(Object.hasOwn(template,"greetings"),false);
  for(const k of ["firstMessageSynergy","profileGreetingCoverage","exampleDialogueAssessment"]) {
    assert.equal(typeof template[k],"string");
    assert.match(singlePrompt("FIRST MESSAGE",kind),new RegExp('"'+k+'"'));
    assert.match(comparePrompt("A",kind,"B",kind),new RegExp('"'+k+'"'));
  }
});
test("runtime treatment separates creator metadata, alternate starts and ephemeral example dialogue",()=>{
  const kind={primary:"character",secondary:null};
  const prompt=rubricPrompt(kind);
  assert.match(prompt,/Only the selected greeting begins a given roleplay/);
  assert.match(prompt,/Creator Notes and listing metadata are NOT injected/);
  assert.match(prompt,/Example dialogue is generally optional|EXAMPLE DIALOGUE: Optional/i);
  assert.match(prompt,/fall out of runtime context/);
  assert.match(prompt,/persistent profile could plausibly generate/i);
  assert.doesNotMatch(prompt,/Judge EACH supplied greeting independently, as though it were the sole greeting/i);
});
test("rendered and markdown reports show first greeting synergy and profile coverage, not per-greeting scorecards",()=>{
  const kind={primary:"character",secondary:null};
  const report=validateAudit(fixture(kind),kind);
  const html=renderAudit(report);
  const md=reportToMarkdown(report);
  assert.match(html,/First message synergy/);
  assert.match(html,/Profile → all greetings/);
  assert.match(html,/Example dialogue/);
  assert.doesNotMatch(html,/Greeting report cards/);
  assert.match(md,/## First message synergy/);
  assert.match(md,/## Profile → all greetings/);
  assert.doesNotMatch(md,/## Greetings/);
});
test("missing required context diagnostics fail validation instead of inventing a default",()=>{
  const kind={primary:"character",secondary:null};
  const report=fixture(kind);
  delete report.exampleDialogueAssessment;
  assert.throws(()=>validateAudit(report,kind),/exampleDialogueAssessment/);
});
test("specialists discourage oddity-as-originality and treat sex/trauma as potentially neutral",()=>{
  const prompt=rubricPrompt({primary:"character",secondary:null});
  assert.match(prompt,/An extraordinary character may be recognizably distinctive while badly executed/);
  assert.match(prompt,/Sexual content, trauma, disability and dark comedy are neutral premises/);
});

test("voice-rich prose is functional information, not a generic construction defect",()=>{
  const kind={primary:"character",secondary:null};
  const prompt=rubricPrompt(kind);
  assert.match(prompt,/voice, cadence, humor, attitude/);
  assert.match(prompt,/shorter declarative rewrite is not automatically more efficient/);
  assert.match(prompt,/token savings without meaningful runtime impact/);
  assert.match(prompt,/empty weaknesses are valid/);
});

test("explanation and purple prose are only useful when they carry runtime information",()=>{
  const prompt=rubricPrompt({primary:"character",secondary:null});
  assert.match(prompt,/not every preference, emotion or action needs a psychological rationale/);
  assert.match(prompt,/psychological overexplanation/);
  assert.match(prompt,/ornamental purple prose/);
  assert.match(prompt,/Grounded brown prose, behavioral prose and deliberate style instruction/);
  assert.match(prompt,/shorter declarative rewrite is not automatically more efficient/);
  assert.match(prompt,/4,000 tokens of filler are costly/);
  assert.match(prompt,/vivid writing alone/);
});

test("version 5.0.1 is stamped on completed results and exports",()=>{
  assert.equal(APP_VERSION,"5.0.1");
  const kind={primary:"character",secondary:null};
  const report=validateAudit(fixture(kind),kind);
  assert.equal(report.appVersion,APP_VERSION);
  assert.match(reportToMarkdown(report),/App version: \*\*5\.0\.1\*\*/);
  assert.match(renderAudit(report),/v5\.0\.1/);
});
