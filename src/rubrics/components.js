// These components are orthogonal to bot classification. They never pollute core scores.
export const GREETING_RUBRIC = [
  "GREETING MODULE (SEPARATE SCORE, NEVER PART OF CORE OR SPECIALIST SCORES):",
  "A greeting is a piece of reader-facing writing and a runtime example. Judge whether it depicts the character and context supported by the card, what register it establishes and whether it achieves its own intended reader experience.",
  "A first message or alternate can be a vignette, comedy beat, quiet moment, scene already in progress, narration or direct introduction. There is NO requirement to speak to the user, pose a question, create a hook, invent facts beyond the profile, maintain equal tone across alternatives, or start with user participation.",
  "Examine grammar and broken formatting, unsupported portrayal, user-turn takeover, actual harmful repetitive exposition or narration of obvious subtext, and register/pacing failures grounded in the scene. Style, length and plot intensity alone are not deductions.",
  "Judge EACH supplied greeting independently, as though it were the sole greeting. AU alternates can legitimately change setting. Do not compare, rank, count or cross-penalize the greetings. Report no greeting score if no greeting is supplied."
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
  "Overall numeric scores are computed deterministically outside the model. Do not output or invent a verdict score that could contradict the detailed evaluation."
].join("\n");
