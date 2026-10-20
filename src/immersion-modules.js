// Optional modules ported from the original analyzer. Only selected asks and fields enter a request.
export const IMMERSION_MODULES = [
  {
    "id": "datingProfile",
    "label": "Dating App Profile",
    "blurb": "Their Tinder/Grindr bio, adapted to whatever dating looks like in their universe.",
    "ask": "datingProfile: a short dating-app profile written in the character's own voice, adapted to whatever a dating app would plausibly look like in their universe (matchmaking scrolls, guild notice boards, ship-net personals, etc. when the setting demands it).",
    "schema": "2-4 sentence in-universe dating bio in their own voice"
  },
  {
    "id": "shoppingList",
    "label": "Against-Type Shopping List",
    "blurb": "An in-universe shopping run for things OUTSIDE their usual likes.",
    "ask": "shoppingList: an in-universe shopping list of things the character might plausibly grab OUTSIDE their typical likes and stated routine — be creative and against-type, but every item must still be defensible from the card's traits.",
    "schema": {
      "items": [
        "5-8 concrete in-universe items, each with a short parenthetical why"
      ],
      "notes": "one line on what this against-type trip reveals"
    }
  },
  {
    "id": "topSongs",
    "label": "Top 5 Songs",
    "blurb": "Their most-listened tracks, in-universe adjusted.",
    "ask": "topSongs: the character's top 5 most-listened songs, in-universe adjusted; invent plausible in-world artists and titles when the setting has no real-world music.",
    "schema": [
      {
        "title": "song title",
        "artist": "artist",
        "vibe": "why it is on their rotation; exactly 5 songs"
      }
    ]
  },
  {
    "id": "demise",
    "label": "Demise & Obituary",
    "blurb": "The most fitting way they'd die, plus their in-universe obituary.",
    "ask": "demise: howTheyDie is the most narratively fitting death for this character given their traits and world; obituary is a short obituary for that death, written the way their world would memorialize them.",
    "schema": {
      "howTheyDie": "fitting death grounded in the card",
      "obituary": "short in-universe obituary"
    }
  },
  {
    "id": "psychoanalysis",
    "label": "Psychoanalysis",
    "blurb": "A grounded psychological reading of the character.",
    "ask": "psychoanalysis: a grounded psychological reading of the character based only on textual patterns in the card; describe behavior, do not diagnose the creator, and do not invent pathology the text does not support.",
    "schema": "grounded psychological reading based only on textual patterns"
  },
  {
    "id": "emotionalRegisters",
    "label": "Emotional Registers",
    "blurb": "How they react to sad, angry, happy, grief, and comedy beats.",
    "ask": "emotionalRegisters: how the character concretely reacts when a scene hits each register — sad, angry, happy, grief, and comedy — using only behavior the card supports.",
    "schema": {
      "sad": "supported concrete reaction",
      "angry": "supported concrete reaction",
      "happy": "supported concrete reaction",
      "grief": "supported concrete reaction",
      "comedy": "supported concrete reaction"
    }
  },
  {
    "id": "boringTuesday",
    "label": "The Boring Tuesday Test",
    "blurb": "One ordinary, low-stakes inconvenience and what they actually notice, say, and do about it.",
    "ask": "boringTuesday (The Boring Tuesday Test): choose one ordinary, low-stakes inconvenience within the card's intended setting and scope, then give a brief illustrative beat showing what the character notices, says (or leaves unsaid), and actually does. Let priorities, voice, and relationship habits carry the moment without manufacturing a crisis or requiring initiative — quiet, reactive, passive, or uncomplicated responses are valid. For a narrow scenario, use an ordinary moment inside that scenario; never demand unrelated domestic play. This is an illustrative interpretation, not canon or scoring evidence.",
    "schema": {
      "inconvenience": "ordinary low-stakes inconvenience",
      "beat": "what they notice, say or leave unsaid, and actually do"
    }
  },
  {
    "id": "pissThemOff",
    "label": "Three Ways to Piss Them Off",
    "blurb": "A trivial irritation, a personal hurt, and something they claim doesn't bother them.",
    "ask": "pissThemOff (Three Ways to Piss Them Off): three compact entries — a trivial irritation, a personal hurt, and something they claim does not bother them. Ground each trigger in supplied characterization and describe the supported response; hurt may produce withdrawal, humor, silence, or indifference rather than anger. Distinguish explicit facts from plausible interpretation. Do not invent hidden hurt or denial to complete the third entry — say it is not established when unsupported. Different triggers need not produce different reactions.",
    "schema": {
      "trivial": "trivial irritation and supported response",
      "personal": "personal hurt and supported response",
      "denied": "claimed non-bother and response, or not established"
    }
  },
  {
    "id": "greetingBreakdown",
    "label": "Per-Greeting Report Card",
    "blurb": "Every greeting graded on its own — first message and each alternate, judged as if it were the only one.",
    "ask": "greetingBreakdown (Per-Greeting Report Card): one entry for EVERY greeting supplied — the First Message first, then each alternate in the order the card lists them — using that greeting's own label from the card text. Grade each one by the current greeting rules and the following discipline: what register it teaches, whether the profile supports the portrayal, whether it delivers the reader experience it intends, and objective failures: grammar/formatting that impairs reading, unsupported portrayal, contradictions of stated boundaries or pacing, scripted user participation, redundant explanation that harms pacing or voice, or sustained purple/drab prose that undermines the intended experience. Judge control, not ornament; do not reward big vocabulary or demand excitement. Judge each greeting in isolation, exactly as if it were the only greeting the card had and you had never seen the others: never compare them to each other, never rank or count them, never call one an outlier or say it is outnumbered by or stands alone against the rest, and never treat the set's majority tone as the character's default register. An alternate that establishes its own AU or overrides the persistent setting is playing by its own rules and is graded on its own terms, not penalized for disagreeing with the others. Reusing profile material is never a deduction, and short, long, immediate, gradual, and vignette openings are all equally valid. These per-greeting scores are module-local: they must never change, justify, or be cited by the slop score, any core or specialist score, or any other field, and firstMessageSynergy remains the audit's judgment of the active greeting. If the card supplies only a first message, return exactly one entry; if it supplies no greeting text at all, return an empty array.",
    "schema": [
      {
        "label": "greeting's own label, in supplied order",
        "score": "NUMBER 0-10; higher is better; module-local only",
        "register": "register this greeting teaches",
        "notes": "2-3 sentences: accomplishment and objective failures, if any"
      }
    ],
    "warning": "Adds one graded entry per greeting. Uses the main audit request unless Send greetings separately? is on, which adds one request per greeting only for cards with multiple greetings. Zero or one greeting always stays in the main call."
  }
];

export function normalizeModules(value) {
  return IMMERSION_MODULES.filter(m => Array.isArray(value) && value.includes(m.id)).map(m => m.id);
}
export function moduleTemplate(selected = []) {
  const ids = normalizeModules(selected);
  return Object.fromEntries(IMMERSION_MODULES.filter(m => ids.includes(m.id)).map(m => [m.id, m.schema]));
}
export function modulePrompt(selected = []) {
  const ids = normalizeModules(selected);
  if (!ids.length) return "";
  return [
    "OPTIONAL IMMERSION MODULES (USER-SELECTED): These are illustrative interpretations, not canon, actual roleplay tests, or scoring evidence. Never use generated scenes, reactions, or module-local greeting scores to justify or change core, specialist, slop, or overall scores. Infer plausible behavior without requiring the author to script it. Adapt modern concepts to the card's universe. For a roster/world card, name the supported character(s) being portrayed; do not invent a personality for the setting itself. If a request has no applicable subject, state that it is not applicable.",
    "Complete the main audit before the selected extras. The general three-entry list limit does not apply to these modules; follow each selected module's requested count and keep entries concise.",
    ...IMMERSION_MODULES.filter(m => ids.includes(m.id)).map(m => m.ask)
  ].join("\n");
}

// Bad optional output should not throw away an otherwise valid scored audit.
// Copy only selected, validated fields; unsolicited modules never reach exports.
function validateValue(value, shape, path) {
  if (path.endsWith(".score")) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 10) throw new Error(path);
    return value;
  }
  if (typeof shape === "string") {
    if (typeof value !== "string") throw new Error(path);
    return value;
  }
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) throw new Error(path);
    return value.map((item, i) => validateValue(item, shape[0], path + "." + i));
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(path);
  return Object.fromEntries(Object.entries(shape).map(([key, child]) => [key, validateValue(value[key], child, path + "." + key)]));
}
export function validateModules(report, selected = []) {
  const ids = normalizeModules(selected), fields = {}, warnings = [];
  for (const mod of IMMERSION_MODULES.filter(m => ids.includes(m.id))) {
    try { fields[mod.id] = validateValue(report[mod.id], mod.schema, mod.id); }
    catch { warnings.push(mod.label + ": the model omitted this section or returned an invalid format. Try again with fewer extras or a higher output limit."); }
  }
  return ids.length ? {...fields, optionalModules:ids, optionalWarnings:warnings} : {};
}

// Shared content for HTML and Markdown, so neither export drops an extra.
export function optionalSections(report) {
  const sections = [];
  for (const {id, label} of IMMERSION_MODULES) {
    const v = report[id];
    if (v == null) continue;
    let paragraphs = [], items = [];
    if (typeof v === "string") paragraphs = [v];
    else if (id === "shoppingList") { items = v.items; paragraphs = [v.notes]; }
    else if (id === "topSongs") items = v.map(s => s.title + " — " + s.artist + ": " + s.vibe);
    else if (id === "greetingBreakdown") {
      items = v.map(g => g.label + " · " + g.score + "/10 · " + g.register + ": " + g.notes);
      if (!v.length) paragraphs = ["No greeting text supplied."];
    } else {
      const labels = {
        howTheyDie:"Projected demise", obituary:"Obituary", sad:"Sad", angry:"Angry", happy:"Happy", grief:"Grief", comedy:"Comedy",
        inconvenience:"Inconvenience", beat:"The moment", trivial:"Trivial irritation", personal:"Personal hurt", denied:"Claims it doesn't bother them"
      };
      paragraphs = Object.entries(v).map(([key, text]) => (labels[key] || key) + ": " + text);
    }
    sections.push({title:label, paragraphs, items});
  }
  return sections;
}
