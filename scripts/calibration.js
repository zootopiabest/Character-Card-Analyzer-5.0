import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CALIBRATION_CASES } from "../calibration/cases.js";
import { APP_VERSION } from "../src/version.js";
import { extractCardText } from "../src/importer.js";
import { singlePrompt, comparePrompt } from "../src/rubrics/assemble.js";

export function calibrationPackets(item) {
  const a=extractCardText(JSON.stringify(item.a)),b=extractCardText(JSON.stringify(item.b));
  // The auditor sees normal production prompts, never the expected judgment or test question.
  return {
    "a.json":JSON.stringify(item.a,null,2), "b.json":JSON.stringify(item.b,null,2),
    "single-a.txt":singlePrompt(a,item.kind), "single-b.txt":singlePrompt(b,item.kind),
    "compare-ab.txt":comparePrompt(a,item.kind,b,item.kind),
    "compare-ba.txt":comparePrompt(b,item.kind,a,item.kind)
  };
}
async function main() {
  const out=resolve(process.argv[2] || "calibration-output");
  await mkdir(out,{recursive:true});
  await writeFile(resolve(out,'run-record-template.json'),JSON.stringify({appVersion:APP_VERSION,generatedAt:new Date().toISOString(),liveRun:false,
    provider:null,requestedModel:null,resolvedModel:null,settings:null,runDate:null,repetitions:null,
    assessments:CALIBRATION_CASES.map(c=>({id:c.id,kind:c.kind,status:'not run',reportFiles:[],findings:[]}))},null,2)+'\n');
  for(const item of CALIBRATION_CASES) {
    const directory=resolve(out,item.id);
    await mkdir(directory,{recursive:true});
    for(const [name,text] of Object.entries(calibrationPackets(item)))
      await writeFile(resolve(directory,name),text+"\n");
  }
  console.log(`Wrote ${CALIBRATION_CASES.length} calibration pairs to ${out}. No API calls made.`);
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
