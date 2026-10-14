const MAX_FILE = 15 * 1024 * 1024;

// Keep declared activation metadata visible; assess it inside the intended
// frontend rather than speculating about unrelated runtime configurations.
export function formatLorebook(book) {
  const entries = Array.isArray(book) ? book : Array.isArray(book?.entries) ? book.entries :
    book?.entries && typeof book.entries === "object" ? Object.values(book.entries) : null;
  if (!entries) return JSON.stringify(book);
  const header = "Activation follows the intended frontend: enabled constant entries are always-on as configured; keyword entries trigger conditionally by design.";
  const formatted = entries.map((entry,i) => {
    if (!entry || typeof entry !== "object") return "Entry " + (i+1) + ": " + String(entry);
    const flag = (entry.enabled === false) ? "disabled" :
      entry.constant === true ? "constant/always-on requested" : "conditional/triggered";
    const meta = {
      enabled: entry.enabled ?? "unspecified",
      constant: entry.constant ?? false,
      keys: entry.keys ?? entry.key ?? [],
      secondary_keys: entry.secondary_keys ?? entry.keysecondary ?? [],
      selective: entry.selective ?? "unspecified",
      insertion_order: entry.insertion_order ?? entry.order ?? "unspecified",
      position: entry.position ?? "frontend-defined",
      probability: entry.probability ?? "unspecified"
    };
    return "### Entry " + (i+1) + ": " + flag + "\nActivation: " + JSON.stringify(meta) +
      "\n" + (typeof entry.content === "string" ? entry.content : JSON.stringify(entry));
  });
  return [header,...formatted].join("\n\n");
}

export function extractCardText(input) {
  if (typeof input !== "string" || !input.trim()) throw new Error("Card content is empty.");
  let parsed;
  try { parsed = JSON.parse(input); } catch { return input; }
  if (Array.isArray(parsed)) return JSON.stringify(parsed, null, 2);
  if (!parsed || typeof parsed !== "object") return input;
  const root = parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
  const lines = [];
  if (root.extensions?.wyvern && typeof root.extensions.wyvern === "object")
    lines.push("## Intended Frontend\nWyvern (native extensions.wyvern runtime behavior applies, including greeting-specific scenario overrides and other frontend facilities). Do not assume generic frontend behavior.");
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
  if (root.character_book || root.lorebook) lines.push("## Lorebook\n" + formatLorebook(root.character_book || root.lorebook));
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
  const candidates = [];
  let metadataError = null;
  for (let pos=8;pos+12<=bytes.length;) {
    const size=readU32(bytes,pos); const type=latin.decode(bytes.slice(pos+4,pos+8));
    const start=pos+8, end=start+size;
    if (end+4>bytes.length) break;
    const chunk=bytes.slice(start,end);
    pos=end+4; // Advance before any empty/malformed metadata can continue the loop.
    let keyword, payload;
    const nullAt=chunk.indexOf(0);
    if (nullAt > -1 && ["tEXt","zTXt","iTXt"].includes(type)) {
      keyword=latin.decode(chunk.slice(0,nullAt)).toLowerCase();
      if (keyword === "chara" || keyword === "ccv3" || keyword === "character") {
        try {
          if(type==="tEXt") payload=latin.decode(chunk.slice(nullAt+1));
          else if(type==="zTXt") payload=utf8.decode(await inflate(chunk.slice(nullAt+2)));
          else {
            let off=nullAt+3; // flag, method
            let cut=chunk.indexOf(0,off); if(cut<0) throw new Error("Incomplete PNG international text metadata.");
            off=cut+1; cut=chunk.indexOf(0,off); if(cut<0) throw new Error("Incomplete PNG international text metadata.");
            off=cut+1;
            const rest=chunk.slice(off);
            payload=chunk[nullAt+1]===1 ? utf8.decode(await inflate(rest)) : utf8.decode(rest);
          }
          if (!payload) continue;
          // Both chara and ccv3 use base64 JSON; accept direct JSON from legacy exporters.
          const trimmed = payload.trim();
          if (!trimmed) continue;
          const raw = trimmed.startsWith("{") ? trimmed : decodeBase64(trimmed);
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
            throw new Error("Character metadata must be a JSON object.");
          candidates.push({ priority: keyword === "ccv3" ? 2 : keyword === "chara" ? 1 : 0,
            text: extractCardText(raw) });
        } catch (error) {
          metadataError = error;
        }
      }
    }
  }
  // A PNG can carry both formats. Prefer V3 regardless of chunk order.
  if (candidates.length) return candidates.sort((a,b)=>b.priority-a.priority)[0].text;
  if (metadataError) throw new Error("Invalid character-card PNG metadata. Try a JSON export.");
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

