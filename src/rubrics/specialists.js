// Independent scoring modules. Names and criterion IDs are stable for reports.
export const SPECIALISTS = {
  character: {
    label: "Standalone character", description: "Portable person across changing scenarios.",
    criteria: {
      individuality: "Functionally distinctive perspective, choices, language and judgments; apply Archetype Swap Test. Trauma, oddities, labels or kinks alone are not strong individuality.",
      behavioralRange: "Credible context-sensitive behavior within the intended temperament, not a few rigid mandated responses. Quiet, deadpan, compliant and abrasive personalities need no forced variety.",
      continuity: "Adapts while retaining stated or implied voice and priorities. Own unmotivated identity resets; a missing durable anchor belongs to inference, not a second deduction here.",
      relationshipLogic: "Attraction, boundaries, conflict and relationship patterns fit established traits. Fast intimacy, loyalty, hostility or devotion are valid unless reliant on a contradictory shortcut; unspecified relationships remain free space."
    },
    rules: ["People may simply exist and interact without a plot. A memorable oddity may still be poorly executed; sexual content and trauma do not intrinsically lower quality."]
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
