// Non-numeric diagnostics and optional visual analysis. No automatic per-greeting grades.
export const GREETING_RUBRIC = [
  "RUNTIME FIELD SEPARATION:",
  "Creator Notes and listing metadata are NOT injected as runtime character instructions and must never repair a missing profile anchor. If they contain behavior instructions, report only that their location makes them ineffective, not that the content is active.",
  "Only the selected greeting begins a given roleplay. Alternate greetings are independent starts and can establish alternate universes, relationships, locations and temporary emotional states. They do not all occupy context at once or dictate each other's register.",
  "PROFILE → GREETINGS (DIRECTION MATTERS): Audit whether the persistent profile could plausibly generate the portrayal, cadence, decisions and behavior in EACH greeting. Allow that greeting's own local setup and AU; do not demand that unmentioned scene facts be repeated permanently. Identify unsupported load-bearing characterization that appears exclusively in a greeting. Do not use the greetings to infer a supposedly complete profile and award it credit.",
  "FIRST GREETING SYNERGY ONLY: Comment on the first greeting's supported portrayal, actual reader-facing effect and pacing, and how it hands off to persistent characterization as play continues. Judge claimed humor by functioning comedy, not swearing, contempt or tragedy. A first greeting can be a vignette, long scene or indirect opening; no dialogue with the user or instant invitation is required.",
  "EXAMPLE DIALOGUE: Optional when profile supplies enough character-specific voice and behavior. If examples are the only source of load-bearing behavior, dialogue register, identity facts or motivation, flag fragile placement. Example dialogue and a past selected greeting may fall out of runtime context, so never assume they teach permanent behavior. Do not punish missing examples merely because examples would be nice.",
  "No automatic numeric greeting grades. No per-greeting report-card list. The textual first-message synergy and profile-to-all-greetings coverage belong in their own non-numeric fields; grade only genuine profile/behavioral defects under the appropriate existing scored criterion.",
  "Avoid conflating perfectly legitimate local variation with incompatibility. Evaluate narrative quality, actual user agency, contradictory behavior or over-narration when evidenced rather than style, length or mere lack of a hook."
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
