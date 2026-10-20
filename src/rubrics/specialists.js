// Independent scoring modules. Names and criterion IDs are stable for reports.
export const SPECIALISTS = {
  character: {
    label: "Standalone character", description: "Portable person across changing scenarios.",
    criteria: {
      individuality: "Does the supplied perspective support coherent, particular judgments and unscripted choices beyond a label or repeatable gag? High: a usable interpretive lens across fresh situations, even for a familiar, simple archetype. Novelty, surprise, trauma or a catalogue of mini-scenes is not required. Missing anchors belong to inference; judge the distinct perspective those present actually support.",
      behavioralRange: "Can materially different circumstances produce context-sensitive choices within the intended temperament? High: useful freedom within stable commitments, including passivity or enthusiasm. Own absolute never-refuse or identical-payoff constraints here, without demanding rebellion or variety for its own sake.",
      continuity: "Can portrayal persist and adapt without arbitrary identity resets as scenes change? High: stable recognizable commitments with plausible development. Missing anchors belong to inference; present-tense fact collisions belong to cohesion; true across-time resets belong here.",
      relationshipLogic: "Do interactions with friends, family, colleagues, rivals, strangers or other intended partners follow usable social expectations and boundaries? High: coherent interpersonal behavior at the promised scope. Evaluate romance, attraction or intimacy only if supported or promised; absence of romance is neither zero nor N/A for this criterion. Own distinct relationship progression/expectation failures, not a compliance lock already charged to behavioralRange or a fact collision charged to cohesion."
    },
    rules: ["People may simply exist without a plot. Apply the shared agency and trauma checks; do not demand resistance or an unusual archetype."]
  },
  characterScenario: {
    label: "Character-driven scenario", description: "A situation built to explore a particular person.",
    criteria: {
      individualPortrayal: "Profile and scenario together support this person's specific perspective and choices. High: the scene reveals usable judgments, without demanding unusual traits.",
      sceneIntegration: "Situation and character actively interact instead of remaining disconnected paragraphs. High: supplied pressures or opportunities matter to this portrayal.",
      userPossibilities: "User can participate meaningfully without scripted actions or mandatory dramatic escalation; quiet scenes are valid. High: usable choices inside the stated scene, including restraint.",
      consistency: "Does portrayal remain supported as the scene develops? High: plausible persistence or change across the promised scene. Persistent fact collisions belong to cohesion; judge scene-level portrayal continuity here."
    }, rules: ["A vignette may establish the situation without prompting the user to act."]
  },
  scenarioCharacter: {
    label: "Scenario-driven character", description: "A person designed chiefly for a finite or specific narrative role.",
    criteria: {
      roleExecution: "Specific and capable in the intended role; an entire off-screen life is not required. High: precise, responsive fulfillment of that role.",
      premiseFunction: "Character details do work in the scenario rather than acting as disconnected ornament. High: relevant details support the promised encounter.",
      scenarioCoherence: "Do constraints and stakes support a usable sequence or resolution at the intended scope? High: a workable encounter, including a finite vignette. Persistent fact collisions belong to cohesion; prompt directive collisions belong to reliability.",
      playerAgency: "User retains meaningful choices within stated restrictions; finite endings and tight starting roles are valid. High: choices can meaningfully affect the encounter without requiring unlimited freedom."
    }, rules: ["An archetype can be excellent when its actual execution is precise."]
  },
  rpg: {
    label: "RPG / world simulator", description: "Narrator, adventure, rule engine or persistent world.",
    criteria: {
      worldConsistency: "Can supplied causal relationships produce consistent consequences across the promised world? High: coherent extrapolation without requiring lore volume. Static fact collisions belong to cohesion; causal simulation is assessed here.",
      mechanics: "Are the game rules and outcome-resolution procedures usable? High: clear resolution at the promised complexity; freeform RPGs need no numeric stats. Own game-rule collisions here; prompt delivery and formatting conflicts belong to reliability.",
      playerAgency: "Player owns declared actions and choices within the game's rules. High: inputs have meaningful consequences and narration does not seize player decisions.",
      stateAndProgression: "State, consequences and advancement can persist or resolve at the promised depth. High: usable continuity of relevant state, including simple or finite progression."
    }, rules: ["Judge the advertised simulation, not human-style character complexity. Light systems may be excellent."]
  },
  companion: {
    label: "Companion / therapy / service", description: "Assistant, listener, comfort or service role.",
    criteria: {
      roleFit: "Serves its promised companion, coaching, comfort or service role; outside plot goals are unnecessary. High: concrete support for the promised service without extra roles.",
      communication: "Does the service respond appropriately to user needs and conversational context? High: useful listening, initiative or deliberate restraint. Own interaction failures here; prose execution belongs to craft and redundant anchors to inference.",
      boundaries: "Authority and limits fit the role; therapy-themed bots must not deceptively claim licensing or dangerous medical certainty. High: honest, usable limits appropriate to the actual service.",
      adaptability: "Handles varied user input within scope while retaining its commitments. High: context-sensitive service without forced identical outcomes."
    }, rules: ["User-centric, affectionate, passive and cooperative roles need no manufactured resistance."]
  },
  ensemble: {
    label: "Multi-character ensemble", description: "Several characters or a group chat in one runtime.",
    criteria: {
      distinction: "Voices, roles or priorities remain separable, avoiding speaker bleed; shared tropes are allowed. High: coherent differentiated portrayals; label/turn assignment belongs to coordination.",
      interactions: "Group dynamics and relationships support the advertised ensemble, without forced rivalry. High: usable interactions at the intended social scale.",
      coordination: "Do turns, focus and simultaneous presence operate without avoidable confusion? High: clear speaker/attention handling at the promised scale. Own speaker/turn assignment here; general prompt delivery conflicts belong to reliability.",
      groupScope: "Fulfills its domestic, social or scenario purpose without required heavy worldbuilding. High: sufficient support for the advertised group experience."
    }, rules: ["Judge both individuals and group operation; two-person domestic scenes may have light lore."]
  }
};
export const SPECIALIST_KEYS = Object.keys(SPECIALISTS);
export function assertSpecialist(id) {
  if (!SPECIALISTS[id]) throw new Error("Unknown rubric module: " + id);
  return id;
}
