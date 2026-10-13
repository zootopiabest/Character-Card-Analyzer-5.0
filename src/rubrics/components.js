// Canonical runtime and greeting policy. Shared by single and comparison prompts.
export const GREETING_RUBRIC = [
  "RUNTIME FIELDS: Persistent profile/system instructions anchor long-term portrayal. Creator Notes and listing metadata are non-runtime: use only for declared intent, never as active guidance, bloat or a repair for missing characterization. Respect an explicitly supplied frontend/context configuration; otherwise state lifecycle uncertainty rather than inventing portability defects.",
  "INDEPENDENT STARTS: Only ONE selected greeting initializes a chat. Alternates may establish independent AUs, relationships, locations and temporary moods; they are not simultaneous instructions. The selected greeting may teach cadence for that chat, but need not survive context truncation. Its local scene facts do not require permanent duplication.",
  "PROFILE → GREETINGS: For EACH opening, could a capable model plausibly generate this portrayal from the persistent profile plus that opening's legitimate setup? Accept reasonable inference, not just explicit wording. A situational joke, act of kindness, grief response or change of register need not be a named permanent trait. Flag a missing anchor only when a central, enduring characterization is neither stated nor reasonably implied; name that unsupported characterization and its consequence. A vivid greeting cannot repair that gap. Do not require the exact line, reaction or scene to be reproducible.",
  "FIRST MESSAGE SYNERGY: Discuss only the first greeting's reader experience, cadence, prose execution and supported portrayal. A vignette, quiet beat, AU or long scene is valid; no required user hook or immediate dialogue. Summarize profile coverage across all openings separately, without per-greeting grades or rankings. Charge an actual defect only in its primary existing scored criterion.",
  "EXAMPLES: Optional when the profile already supports voice and behavior, including by inference. Examples and greetings may fall out of runtime context. Essential characterization found only there belongs under inference unless the supplied configuration retains it; missing example dialogue is not itself a defect. Do not demand permanent repetition of an illustrative line or ordinary reaction."
].join("\n");

export const VISUAL_RUBRIC = [
  "VISUAL CONTINUITY (SEPARATE, OPTIONAL):",
  "If an image is supplied, compare observable hairstyle, eyes, build, clothes, species markers and accessories against concrete physical description in the card.",
  "Report matches and mismatches actually visible in the image. Unknown/hidden attributes are not mismatches. Style choice does not count as an anatomy contradiction without evidence. Do not infer unseen details."
].join("\n");

export const COMPARISON_RUBRIC = [
  "COMPARISON RULES:",
  "Judge each card in isolation first using its own intent and rubric selection, with absolute scores. Only then compare their actual strengths, defects and tradeoffs.",
  "The labels A/B and original/remake imply no hierarchy. Reusing a shared premise is not an originality penalty.",
  "Do not reward extra explanation, extra drama, or scripted reactions unless they convey additional distinctions the other card lacks.",
  "A different intended audience or narrower scope is a tradeoff, not automatically a loss. Do not manufacture a winner if mixed.",
  "Compare persistent profiles separately from creator notes, examples and each selected greeting. A vividly written greeting is not proof that the profile can generate its behavior.",
  "Overall numeric scores are computed deterministically outside the model. Do not output or invent a verdict score that could contradict the detailed evaluation."
].join("\n");

