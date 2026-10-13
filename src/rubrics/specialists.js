// Independent scoring modules. Names and criterion IDs are stable for reports.
export const SPECIALISTS = {
  character: {
    label: "Standalone character", description: "Portable person across changing scenarios.",
    criteria: {
      individuality: "Does the model have a functionally distinctive interpretive perspective, priorities, judgments or likely UNSCRIPTED choices? Use the Archetype Swap Test on fresh situations, not on verbatim quotable quirks. Sexual preference, trauma, gimmicky surprise, odd behaviors and many explicit mini-scenes can still leave a one-outcome, interchangeable person. For 6+, identify independently inferable decisions/perspective beyond repeating a gag.",
      behavioralRange: "Can the character respond to materially different circumstances with context-sensitive choices inside its INTENDED temperament? Stable passivity, sexual enthusiasm, hostility and people-pleasing are legitimate. A universal command to agree, never refuse even when hurt, or always produce the same payoff is an outcome lock, not a nuanced temperament; own that constraint here once, rather than counting it as an unrelated reliability or inference defect. No artificial demand for rebellion, rejection or emotional variety.",
      continuity: "Can portrayal persist and adapt without arbitrary identity resets? Continuity does not imply compelling individuality. Charge missing durable anchors to inference, a hardcoded outcome lock to behavioralRange, and true resets here; do not re-penalize the same issue.",
      relationshipLogic: "Do attraction, boundaries, conflict and relationship expectations have workable logic? Enthusiastic, submissive, transactional or rapid intimacy need no trauma justification and can be excellent. Flag a distinct inconsistency ONLY if evidenced, such as separate explicit relationship rules conflicting; do not re-charge the same blanket compliance rule already owned by behavioralRange. Offering sex today does not contradict never selling it before, nor does fearing unwanted touch prohibit initiating contact."
    },
    rules: ["People may simply exist without a plot. Do not mistake dozens of quirky prewritten situations for individualized decision-making; a person can be memorable yet mostly scripted. Do not equate being compliant with having no agency, but a mandatory never-refuse-even-when-harmed loop can foreclose context-sensitive choices. Sex, trauma and disability themselves never lower scores."]
  },
  characterScenario: {
    label: "Character-driven scenario", description: "A situation built to explore a particular person.",
    criteria: {
      individualPortrayal: "Profile and scenario together support this person's specific perspective and choices.",
      sceneIntegration: "Situation and character actively interact instead of remaining disconnected paragraphs.",
      userPossibilities: "User can participate meaningfully without scripted actions or mandatory dramatic escalation; quiet scenes are valid.",
      consistency: "Role, stakes, scene and established traits cohere across the premise."
    }, rules: ["A vignette may establish the situation without prompting the user to act."]
  },
  scenarioCharacter: {
    label: "Scenario-driven character", description: "A person designed chiefly for a finite or specific narrative role.",
    criteria: {
      roleExecution: "Specific and capable in the intended role; an entire off-screen life is not required.",
      premiseFunction: "Character details do work in the scenario rather than acting as disconnected ornament.",
      scenarioCoherence: "Constraints, stakes and setup make the encounter runnable.",
      playerAgency: "User retains meaningful choices within stated restrictions; finite endings and tight starting roles are valid."
    }, rules: ["An archetype can be excellent when its actual execution is precise."]
  },
  rpg: {
    label: "RPG / world simulator", description: "Narrator, adventure, rule engine or persistent world.",
    criteria: {
      worldConsistency: "Needed world facts cohere at the promised scope; lore volume is not quality.",
      mechanics: "Advertised rules, precedence and outcomes are implementable. Freeform RPGs need no numeric stats.",
      playerAgency: "Player owns declared actions and choices within the game's rules.",
      stateAndProgression: "State, consequences and advancement can persist or resolve at the promised depth."
    }, rules: ["Judge the advertised simulation, not human-style character complexity. Light systems may be excellent."]
  },
  companion: {
    label: "Companion / therapy / service", description: "Assistant, listener, comfort or service role.",
    criteria: {
      roleFit: "Serves its promised companion, coaching, comfort or service role; outside plot goals are unnecessary.",
      communication: "Voice and initiative suit user needs without boilerplate or validation loops.",
      boundaries: "Authority and limits fit the role; therapy-themed bots must not deceptively claim licensing or dangerous medical certainty.",
      adaptability: "Handles varied user input within scope while retaining its commitments."
    }, rules: ["User-centric, affectionate, passive and cooperative roles need no manufactured resistance."]
  },
  ensemble: {
    label: "Multi-character ensemble", description: "Several characters or a group chat in one runtime.",
    criteria: {
      distinction: "Voices, roles or priorities remain separable, avoiding speaker bleed; shared tropes are allowed.",
      interactions: "Group dynamics and relationships support the advertised ensemble, without forced rivalry.",
      coordination: "Turns, focus and simultaneous presence operate without avoidable confusion.",
      groupScope: "Fulfills its domestic, social or scenario purpose without required heavy worldbuilding."
    }, rules: ["Judge both individuals and group operation; two-person domestic scenes may have light lore."]
  }
};
export const SPECIALIST_KEYS = Object.keys(SPECIALISTS);
export function assertSpecialist(id) {
  if (!SPECIALISTS[id]) throw new Error("Unknown rubric module: " + id);
  return id;
}
