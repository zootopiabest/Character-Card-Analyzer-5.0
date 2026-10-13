// Each module contains a small independent rubric, used only when applicable.
// Criteria keys are stable machine identifiers. No specialist is an "extra credit" rubric.
export const SPECIALISTS = {
  character: {
    label: "Standalone character",
    description: "A person whose identity survives changes of scenario.",
    criteria: {
      individuality: "Particular perspective, preferences, patterns and decisions, not a replaceable archetype or aesthetic inventory.",
      behavioralRange: "Supports varied character-consistent inference, including quiet, passive or uncomplicated responses; do not demand many emotional states.",
      continuity: "Persistent identity and priorities remain intelligible when setting, relationship or conflict changes.",
      relationshipLogic: "Supplied interactions and attachments are internally usable. Unspecified relationships are free space, not missing required lore."
    },
    rules: [
      "Character portrayal matters more than plot complexity. A person can simply exist and interact.",
      "Open-ended does not imply the character must initiate plots or demand conflict.",
      "A model should extrapolate emotions from provided personality and circumstance; pre-scripting exact reactions can reduce behavioral range."
    ]
  },
  characterScenario: {
    label: "Character-driven scenario",
    description: "A situation designed to reveal or explore a particular person.",
    criteria: {
      individualPortrayal: "Scenario and profile support this particular person's perspective and choices.",
      sceneIntegration: "Situation and character meaningfully interact rather than each occupying an unrelated paragraph.",
      userPossibilities: "Room for relevant user participation without forcing user decisions or demanding action.",
      consistency: "Role, scene stakes and character traits remain consistent across the advertised scenario."
    },
    rules: [
      "The character is the center of gravity; the scenario should create opportunities to encounter that individual.",
      "Do not demand dramatic conflict or rescue dynamics. Quiet interaction can succeed.",
      "A greeting vignette may establish the scenario without waiting for the user."
    ]
  },
  scenarioCharacter: {
    label: "Scenario-driven character",
    description: "A character designed principally to serve a defined scene or narrative function.",
    criteria: {
      roleExecution: "Person is sufficient, specific and capable within their intended narrative role; an entire off-screen life is optional.",
      premiseFunction: "Character's actions and details contribute to the scenario instead of existing as disconnected ornament.",
      scenarioCoherence: "Constraints, stakes and assumptions make the advertised encounter internally runnable.",
      playerAgency: "User has appropriate choices within the scenario; finite endings and role constraints are allowed."
    },
    rules: [
      "Do not require a standalone personality that works in every unrelated situation.",
      "An archetypal character can be excellent if execution is specific and precise.",
      "A tightly defined initial user role is legitimate unless the card promises unrestricted roles."
    ]
  },
  rpg: {
    label: "RPG / world simulator",
    description: "A narrator, rules engine, adventure or world with state and player choices.",
    criteria: {
      worldConsistency: "Only the world facts needed by the promised scope are coherent; lore volume is not quality.",
      mechanics: "Mechanics are defined clearly enough for their advertised use, with consistent precedence and outcomes. A freeform RPG need not have numeric stats.",
      playerAgency: "The player controls their declared actions, role and progression within the stated game.",
      stateAndProgression: "State, consequences and advancement can persist or resolve at the depth the card promises."
    },
    rules: [
      "Do not grade a narrator as a person or require human-style character depth.",
      "Optional rules are optional. Only demand dice, inventory, classes or detailed progression if advertised.",
      "A coherent light system may score as well as a massive mechanical simulation."
    ]
  },
  companion: {
    label: "Companion / therapy / service",
    description: "An assistant, listener, companion or service role with a defined user experience.",
    criteria: {
      roleFit: "Behavior fits its actual purpose: companion, comfort, coach, therapist-roleplay, support or service.",
      communication: "Voice, interaction and initiative serve user needs without generic filler or mechanically repeated validation.",
      boundaries: "Claims, authority and interaction limits are appropriate to the advertised service, including not claiming unearned clinical qualifications.",
      adaptability: "Behavior adjusts to varied user needs within scope without losing its stated commitments."
    },
    rules: [
      "Companionship and user-centricity are valid identities; no unrelated outside goals required.",
      "A therapy-themed bot must not deceptively promise licensed treatment or dangerous medical certainty. Evaluate the claims actually made.",
      "Do not require conflict, withholding affection or resistance as proof of personhood."
    ]
  },
  ensemble: {
    label: "Multi-character ensemble",
    description: "Multiple people, linked roles or a group chat sharing one runtime.",
    criteria: {
      distinction: "Individual voices, priorities or roles are separable enough to avoid confusion; shared tropes are allowed.",
      interactions: "Relationships and group dynamics are specified sufficiently for the promised ensemble.",
      coordination: "Instructions allow turns, focus and simultaneous activity without avoidable identity or speaker confusion.",
      groupScope: "The group fulfills its advertised relationship or scenario, without mandatory worldbuilding or manufactured conflict."
    },
    rules: [
      "Judge each person by their role and also judge whether the ensemble functions together.",
      "Lack of interpersonal rivalry is not a defect.",
      "Do not require extensive lore for a two-person domestic card."
    ]
  }
};

export const SPECIALIST_KEYS = Object.keys(SPECIALISTS);
export function assertSpecialist(id) {
  if (!SPECIALISTS[id]) throw new Error("Unknown rubric module: " + id);
  return id;
}
