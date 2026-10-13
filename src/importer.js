const MAX_FILE = 15 * 1024 * 1024;

export function extractCardText(input) {
  if (typeof input !== "string" || !input.trim()) throw new Error("Card content is empty.");
  let parsed;
  try { parsed = JSON.parse(input); } catch { return input; }
  if (Array.isArray(parsed)) return JSON.stringify(parsed, null, 2);
  if (!parsed || typeof parsed !== "object") return input;
  const root = parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
  const lines = [];
  for (const [name, keys] of Object.entries({
    Name: ["name", "char_name"],
    Description: ["description", "char_persona"],
    Personality: ["personality"],
    Scenario: ["scenario", "world_scenario"],
    "First Message": ["first_mes", "char_greeting", "first_message"],
    "Example Dialogue": ["mes_example", "example_dialogue"],
    "System Prompt": ["system_prompt"],
    "Post History Instructions": ["post_history_instructions"],
    "Creator Notes (non-runtime metadata)": ["creator_notes"],
  })) {
    const content = keys.map((k) => root[k]).find((x) => typeof x === "string" && x.trim());
    if (content) lines.push("## " + name + "\n" + content);
  }
  const greetings = root.alternate_greetings || root.alternateGreetings || root.alt_greetings;
  if (Array.isArray(greetings)) greetings.forEach((g,i) => {
    const v = typeof g === "string" ? g : (g?.content || g?.text || "");
    if (v) lines.push("## Alternate Greeting " + (i+2) + " (separate roleplay start)\n" + v);
  });
  if (root.character_book || root.lorebook) lines.push("## Lorebook\n" + JSON.stringify(root.character_book || root.lorebook));
  if (root.extensions) lines.push("## Extensions\n" + JSON.stringify(root.extensions));
  if (!lines.length) return JSON.stringify(root, null, 2);
  return lines.join("\n\n");
}

const toDataUrl = (file) => new Promise((resolve,reject) => {
  const r = new FileReader(); r.onerror=()=>reject(new Error("Couldn't read image."));
  r.onload=()=>resolve(r.result); r.readAsDataURL(file);
});
async function inflate(bytes) {
  if (typeof DecompressionStream === "undefined") throw new Error("Compressed PNG metadata requires browser decompression support.");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
function readU32(bytes, offset) {
  return ((bytes[offset] * 0x1000000 + (bytes[offset+1]<<16) + (bytes[offset+2]<<8) + bytes[offset+3]) >>> 0);
}
function decodeBase64(s) {
  const latin = atob(s.replace(/\s+/g,""));
  return new TextDecoder().decode(Uint8Array.from(latin, (c) => c.charCodeAt(0)));
}
async function pngText(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 8 || bytes.slice(0,8).join(",") !== "137,80,78,71,13,10,26,10")
    throw new Error("Not a PNG file.");
  const latin = new TextDecoder("iso-8859-1");
  const utf8 = new TextDecoder("utf-8");
  for (let pos=8;pos+12<=bytes.length;) {
    const size=readU32(bytes,pos); const type=latin.decode(bytes.slice(pos+4,pos+8));
    const start=pos+8, end=start+size;
    if (end+4>bytes.length) break;
    const chunk=bytes.slice(start,end);
    let keyword, payload;
    const nullAt=chunk.indexOf(0);
    if (nullAt > -1 && ["tEXt","zTXt","iTXt"].includes(type)) {
      keyword=latin.decode(chunk.slice(0,nullAt)).toLowerCase();
      if (keyword === "chara" || keyword === "ccv3" || keyword === "character") {
        if(type==="tEXt") payload=latin.decode(chunk.slice(nullAt+1));
        else if(type==="zTXt") payload=utf8.decode(await inflate(chunk.slice(nullAt+2)));
        else {
          let off=nullAt+3; // flag, method
          let cut=chunk.indexOf(0,off); if(cut<0) {pos=end+4;continue;}
          off=cut+1; cut=chunk.indexOf(0,off); if(cut<0) {pos=end+4;continue;}
          off=cut+1;
          const rest=chunk.slice(off);
          payload=chunk[nullAt+1]===1 ? utf8.decode(await inflate(rest)) : utf8.decode(rest);
        }
        if (!payload) continue;
        const raw = keyword === "chara" ? decodeBase64(payload) : payload;
        return extractCardText(raw);
      }
    }
    pos=end+4;
  }
  throw new Error("No supported character-card metadata found in PNG. Try a JSON card.");
}
export async function importCardFile(file) {
  if (!file) throw new Error("Choose a file.");
  if (file.size>MAX_FILE) throw new Error("Card file exceeds 15 MB limit.");
  const lower=file.name.toLowerCase();
  if (lower.endsWith(".png")) {
    const [text,image] = await Promise.all([pngText(file),toDataUrl(file)]);
    return { text, image, filename: file.name };
  }
  if (/\.(json|md|txt|char|jsonl)$/i.test(lower)) {
    return { text: extractCardText(await file.text()), image: null, filename: file.name };
  }
  throw new Error("Use .json, .md, .txt or an embedded-card .png file.");
}
export async function importPortrait(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("Select an image file.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image exceeds 8 MB limit.");
  return toDataUrl(file);
}
