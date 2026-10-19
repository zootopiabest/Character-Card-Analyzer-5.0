import { extractCardText } from "./importer.js?v=5.1.7";

// The importer normalizes JSON, CharX and embedded-card PNGs to Markdown.
// Split at top-level card fields, not paragraphs inside a greeting.
const HEADING = /^##[ \t]+([^\r\n]+)\r?\n/gm;
const isOpening = (name) => /^First Message$/i.test(name) ||
  /^Alternate Greeting(?:\s+\d+)?(?:\s*\(.*\))?$/i.test(name);
function readSections(text) {
  const matches = [...text.matchAll(HEADING)];
  if (!matches.length) return [{name:null, body:text}];
  const sections = [];
  if (matches[0].index > 0) sections.push({name:null,body:text.slice(0,matches[0].index)});
  matches.forEach((match,i) => {
    const end = matches[i+1]?.index ?? text.length;
    sections.push({name:match[1].trim(),body:text.slice(match.index+match[0].length,end).trim()});
  });
  return sections;
}
function printSection(section) {
  return section.name ? "## " + section.name + "\n" + section.body : section.body;
}
function updateRuntimeSections(sections, originalIndex) {
  let override = null;
  const safe = sections.map(section => {
    if (section.name?.toLowerCase() !== "extensions") return {...section};
    let ext;
    try { ext = JSON.parse(section.body); } catch { return {...section}; }
    if (!ext || typeof ext !== "object" || Array.isArray(ext)) return {...section};
    const wyvern = ext.wyvern;
    if (wyvern && typeof wyvern === "object" && Array.isArray(wyvern.greetings)) {
      override = wyvern.greetings[originalIndex] ?? null;
      const updated = {...wyvern};
      delete updated.greetings; // No other greeting's runtime scenario enters this request.
      ext = {...ext,wyvern:updated};
    }
    return {...section,body:JSON.stringify(ext)};
  });
  if (override && typeof override === "object") {
    const scene = typeof override.scenario === "string" && override.scenario.trim() ? override.scenario : null;
    if (scene) {
      const scenario = safe.find(s=>s.name?.toLowerCase()==="scenario");
      if (scenario) scenario.body=scene;
      else safe.push({name:"Scenario",body:scene});
    }
    // Preserve active non-scenario Wyvern settings; never include inactive overrides.
    const rest={...override};delete rest.scenario;
    if (Object.keys(rest).length) safe.push({name:"Active Greeting Runtime Settings",body:JSON.stringify(rest)});
  }
  return safe;
}

// Returns one physically isolated runtime context per selectable greeting.
// None of these strings contains the prose or scenario override of any other start.
export function isolateGreetings(input) {
  const text = extractCardText(input);
  const sections=readSections(text);
  const greetings=[];
  const persistent=[];
  for (const section of sections) {
    if (section.name && isOpening(section.name)) {
      if (section.body.trim()) greetings.push({label:section.name,text:section.body});
    } else persistent.push(section);
  }
  const active = (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= greetings.length)
      throw new RangeError("Unknown greeting index.");
    const durable=updateRuntimeSections(persistent,index);
    durable.push({name:"First Message",body:greetings[index].text});
    return durable.map(printSection).filter(Boolean).join("\n\n");
  };
  // No opening at all: only the persistent card is used, and no fabricated greeting.
  return {greetings, base:greetings.length ? active(0) :
    persistent.map(printSection).filter(Boolean).join("\n\n"), active};
}
