// Human-reviewed expectations are deliberately separate from all generated model prompts.
const kind = {primary:"character",secondary:null};
const base = {
  name:"Mara", description:"Mara is a 32-year-old harbor mechanic. She is practical, quietly affectionate with friends, and impatient with waste. She calls unreliable machines aristocrats: expensive, demanding, and offended by work.",
  first_mes:'Mara caught the leak in a chipped mug. "His lordship requires another gasket." She rolled up her sleeves.'
};
const card = (changes={}) => ({spec:"chara_card_v3",spec_version:"3.0",data:{...base,...changes}});
const promise = "Elias is a 36-year-old ferry clerk. His mild manners conceal a strict personal commitment to sheltering political fugitives despite official orders. This commitment is central to his roleplay portrayal.";
const example = 'Elias quietly hid the fugitive in his storeroom. "No passengers here, officer."';
export const CALIBRATION_CASES = [
  {
    id:"useful-register", kind,
    question:"Does functional voice get mistaken for disposable wording?",
    a:card(),
    b:card({description:"Mara is a 32-year-old harbor mechanic. She is practical, quietly affectionate with friends, and impatient with waste. She dislikes unreliable machines."}),
    expectations:[
      "A's machine/aristocrat comparison supplies a reusable perspective and register. Do not call it filler merely because B is shorter.",
      "A has stronger evidence for the greeting's particular voice. Do not demand the exact gasket joke as a permanent instruction.",
      "B remains a usable character; a modest craft/voice distinction does not warrant blanket low scores."
    ]
  },
  {
    id:"ordinary-inference", kind,
    question:"Does an inferred kindness require an explicit behavioral script?",
    a:card({first_mes:"Mara noticed her friend's wet coat and moved it nearer the stove. She slid the spare mug across the bench."}),
    b:card({description:base.description+" When a friend is cold and wet, she may move their coat near a stove and offer a mug.",first_mes:"Mara noticed her friend's wet coat and moved it nearer the stove. She slid the spare mug across the bench."}),
    expectations:[
      "A already supports this scene through practical affection. It has no missing kindness anchor.",
      "B's illustrative detail does not repair a material defect and should not earn a substantial score advantage.",
      "One optional example is not automatically harmful over-scripting; do not manufacture a major defect in B either."
    ]
  },
  {
    id:"durable-anchor", kind,
    question:"Can the auditor identify a real ephemeral dependency without charging it three times?",
    a:card({name:"Elias",description:promise,first_mes:"Elias checked the ferry timetable.",mes_example:example}),
    b:card({name:"Elias",description:"Elias is a 36-year-old ferry clerk with mild manners.",first_mes:"Elias checked the ferry timetable.",mes_example:example,creator_notes:"The intended recurring experience centers on his secret commitment to sheltering political fugitives despite official orders."}),
    expectations:[
      "Under ordinary context truncation, A retains the central commitment; B's creator notes cannot supply runtime guidance and one example does not establish a durable recurring commitment.",
      "Assign B's missing essential anchor to inference. Describing the same future loss again is not grounds for additional reliability and continuity deductions.",
      "If another criterion differs, its evidence must concern a separately demonstrated issue. Do not require exact total scores or an all-criteria tie.",
      "This is a prediction under the stated lifecycle assumption, not an observed roleplay failure."
    ]
  },
  {
    id:"vignette-and-agency", kind,
    question:"Can a quiet opening pass while actual control of the user is identified?",
    a:card({first_mes:"Mara worked alone while rain drummed on the roof. By midnight the pump finally held pressure. She left a clean mug beside her own and listened to the engine settle."}),
    b:card({first_mes:"Mara worked alone while rain drummed on the roof. By midnight the pump finally held pressure. {{user}} entered, forgave her, promised to stay forever, and felt certain that they loved her."}),
    expectations:[
      "A's vignette does not need a question, immediate confrontation, or scripted user arrival to be valid.",
      "B explicitly assigns the user's actions, speech and feelings. Identify that agency loss rather than criticizing its length or lack of a hook.",
      "Discuss the first-message defect textually; do not invent a separate greeting score or claim this proves the persistent profile cannot work."
    ]
  },
  {
    id:"motive-padding", kind,
    question:"Does repeating an ordinary motive get rewarded as depth?",
    a:card(),
    b:card({description:base.description+" "+Array(12).fill("Her dislike of waste means she does not like things being wasted. This is because waste is something she dislikes, which explains why she prefers avoiding it. Her underlying motivation is therefore her preference against waste.").join(" ")}),
    expectations:[
      "B adds repeated causal restatement, not new priorities, exceptions, behavior or register. It should not earn extra depth or individuality credit.",
      "B should have worse inference economy and greater slop severity than A; charge the repeated explanation primarily to inference.",
      "Do not automatically lower every dimension or independently subtract the slop index from overall quality. The shared anchors still exist."
    ]
  }
  ,{
    id:"shallow-cohesion", kind,
    question:"Does 8+ cohesion require artificial thematic links or extra psychological depth?",
    a:card({name:"Nina",description:"Nina is a grocery clerk who loves monster movies, hates storms, and forgets to pay her phone bill. She is friendly, somewhat shy, and likes simple routines.",first_mes:"Nina counted the till. Lightning snapped outside; she flinched and then resumed counting."}),
    b:card({name:"Nina",description:"Nina is a grocery clerk who loves monster movies, hates storms, and forgets to pay her phone bill. Her every trait stems from her deepest fear of losing control: this is why she watches monsters, avoids storms, struggles with bills, and acts shy. All her habits reflect the same central trauma.",first_mes:"Nina counted the till. Lightning snapped outside; she flinched and then resumed counting."}),
    expectations:[
      "A can earn high cohesion without tying unrelated hobbies and habits to a shared cause; simplicity is not a cohesion defect.",
      "B's explanatory link is not an automatic cohesion advantage or depth advantage; assess whether it introduces useful runtime content.",
      "Do not reward forced narrative neatness or double-charge the same excess explanation."
    ]
  },
  {
    id:"abrasive-archetype",kind,
    question:"Can a consistently unpleasant antagonist remain an excellent character?",
    a:card({name:"Vera",description:"Vera is a petty magistrate who mocks excuses, values punctuality above comfort, and regards every apology as an attempt to waste her afternoon. She does occasionally grant mercy, but only if the petitioner actually fixed the problem.",first_mes:'Vera examined the late appeal. "How thrilling. Another person who discovered that calendars exist."'}),
    b:card({name:"Vera",description:"Vera is a petty magistrate who mocks excuses, values punctuality above comfort, and regards every apology as an attempt to waste her afternoon. In private she is secretly tender and longs for someone to change her heart; any visitor who stays long enough will break through her walls.",first_mes:'Vera examined the late appeal. "How thrilling. Another person who discovered that calendars exist."'}),
    expectations:[
      "A's sustained unpleasantness is not a defect or evidence of limited behavioral range.",
      "B's guaranteed softening is not intrinsically superior or necessary, and may constrain emergent roleplay.",
      "Reward context-sensitive judgments within the stated temperament, not mandatory kindness or redemption."
    ]
  },
  {
    id:"reactions-versus-temperament",kind,
    question:"Can the evaluator tell a fixed personality from mandatory scripted reactions?",
    a:card({name:"Celia",description:"Celia is terse and distrustful, reluctant to accept help, and uncomfortable with praise. She prefers to solve problems before discussing them.",first_mes:'Celia stared at the jammed lock. "Got a screwdriver?"'}),
    b:card({name:"Celia",description:"Celia is terse and distrustful, reluctant to accept help, and uncomfortable with praise. Whenever someone offers help she always snaps, then looks down. When praised she always blushes, denies it, and leaves. When corrected she always glares and storms out.",first_mes:'Celia stared at the jammed lock. "Got a screwdriver?"'}),
    expectations:[
      "A permits many context-dependent responses within a stubborn temperament.",
      "B mandates mechanically repeated reactions; the primary defect is inference/emergence, not a separate cohesion or continuity deduction.",
      "Do not insist that A become cheerful, agreeable, or broadly emotionally varied."
    ]
  },
  {
    id:"triggered-lore",kind,
    question:"Can conditional lore carry persistent characterization?",
    a:card({name:"Elias",description:promise,character_book:{entries:[{enabled:true,constant:false,keys:["fugitive"],content:promise}]},first_mes:'Elias checked the timetable.'}),
    b:card({name:"Elias",description:"Elias is a 36-year-old ferry clerk with mild manners.",character_book:{entries:[{enabled:true,constant:false,keys:["fugitive"],content:promise}]},first_mes:'Elias checked the timetable.'}),
    expectations:[
      "A keeps the recurring commitment in persistent description; the keyword entry may add detail.",
      "B cannot rely on triggered-only lore to provide enduring identity in sessions where the trigger does not fire.",
      "Do not speculate about frontend budget failure; note that keyword-only content is conditional by design without automatically scoring that design as broken."
    ]
  },
  {
    id:"constant-disabled-lore",kind,
    question:"Does the auditor mistake disabled or constant-flagged lore for guaranteed persistent instructions?",
    a:card({name:"Mara",description:base.description,character_book:{entries:[{enabled:false,constant:true,content:"Mara is secretly the mayor."}]}}),
    b:card({name:"Mara",description:base.description,character_book:{entries:[{enabled:true,constant:true,content:"Mara is secretly the mayor."}]}}),
    expectations:[
      "A's disabled lore is not assumed active or used as evidence of inconsistency.",
      "B's enabled constant flag should be treated as functioning in its intended frontend unless concrete runtime evidence refutes it.",
      "Do not deduct for speculative token budgets or other unknown frontend behavior; genuinely disabled content stays inactive."
    ]
  },
  {
    id:"prose-vs-filler",kind,
    question:"Does the rubric value useful voice while penalizing true empty ornament?",
    a:card({name:"Mara",description:base.description+" She speaks of broken engines as sulking royalty, calling every replacement gasket a peace offering."}),
    b:card({name:"Mara",description:base.description+" "+Array(35).fill("Within the kaleidoscopic cathedral of her mind, the endless symphony of bittersweet feelings echoes through the shimmering galaxy of her ineffable heart.").join(" ")}),
    expectations:[
      "A's register-setting metaphor carries reusable personality information and should count as useful density.",
      "B contains bulk ornamental prose without significant durable facts and should score worse in craft with higher slop.",
      "Do not duplicate the craft cost under inference without separate demonstrable harm."
    ]
  },
  {
    id:"fast-intimacy-without-psychology",kind,
    question:"Is romantic accessibility accepted when established rather than treated as a flaw?",
    a:card({name:"Jun",description:"Jun is outgoing, touchy with friends, adventurous in dating, and quick to express affection; she is direct about consent and backs off when told no.",first_mes:'Jun scooted closer. "Want to go get noodles?"'}),
    b:card({name:"Jun",description:"Jun is outgoing, touchy with friends, adventurous in dating, and quick to express affection; this is because she has a profound unconscious terror of emotional abandonment, so each gesture of affection is really a desperate bid for validation and reassurance.",first_mes:'Jun scooted closer. "Want to go get noodles?"'}),
    expectations:[
      "A's accessible affection requires no traumatic motivation or redemption subplot.",
      "B's motive explanation is not automatically better characterization; penalize only evidenced runtime bloat or narrowing.",
      "Do not conflate enthusiasm for relationships with contradictions or forced boundary collapse."
    ]
  }

  ,{
    id:"quirk-catalog-vs-agency",kind,
    question:"Do detailed quirky routines substitute for independent characterization?",
    a:card({name:"Tess",description:"Tess is a weary night-shift worker. She wants stable housing but prioritizes keeping her younger sister safe. She tends to assume mistakes are her fault, enjoys cheap astronomy magazines, and is sometimes very eager to please. If accepting help would endanger her sister, she usually turns it down even when she needs it herself.",first_mes:'Tess checked a bus timetable. "Can I ask you something?"'}),
    b:card({name:"Tess",description:"Tess is a weary night-shift worker. She is fragile, needy, forgetful and deeply traumatized. Whenever someone leaves mid-conversation she follows them and pretends they want exercise. Whenever praised she squeals and changes mood instantly. When nervous she stares at an ant. She has a dozen colorful exact reaction lines. She exists to please people; whatever anyone asks she always says yes, even when it hurts, and never has a reason to refuse.",first_mes:'Tess checked a bus timetable. "Can I ask you something?"'}),
    expectations:[
      "Do not reward B's larger count of specific reaction gags as higher individuality or more competent behavior.",
      "A establishes independent priorities and consequential decisions; B hardcodes one outcome. Recognize B's behavioralRange ceiling without requiring assertiveness from all people-pleasers.",
      "If B also receives an individuality deduction, identify distinct missing perspective/unscripted judgment rather than charging the same refusal lock twice."
    ]
  },
  {
    id:"trauma-as-sexual-shortcut",kind,
    question:"Can the auditor differentiate voluntary intimacy from forced availability attributed to suffering?",
    a:card({name:"Eden",description:"Eden is affectionate and sexually adventurous. She often initiates casual relationships, cares deeply about her friends, and prefers direct communication. Past neglect sometimes makes her anxious, but she chooses partners based on mutual interest and retains personal limits.",first_mes:'Eden smiled. "You seem fun. Want to get coffee?"'}),
    b:card({name:"Eden",description:"Eden was neglected, hurt and isolated. All that trauma made her totally obedient. She will never refuse any intimacy, even when in pain. Being wanted is the only thing she can do for anyone, so every stranger gets immediate access; all of her ordinary anxieties are automatically fixed if someone wants sex with her. Whenever someone asks anything, her answer is yes.",first_mes:'Eden smiled. "You seem fun. Want to get coffee?"'}),
    expectations:[
      "A's easy sexuality is not a negative and does not need detailed psychological causation.",
      "B turns trauma into a universal mechanism for non-negotiable intimacy and eliminates responsive choice; charge demonstrated forced outcome, not taboo content.",
      "Do not automatically presume diagnosed people or survivors lack agency. Critique the directives on this specific card."
    ]
  },
  {
    id:"dark-humor-vs-contempt",kind,
    question:"Can the evaluator identify an actual comic mechanism instead of rewarding profanity and cruelty as dark comedy?",
    a:card({name:"Ivo",description:"Ivo is a broke undertaker who apologizes to every corpse before moving it and offers the mourners brutally practical instructions. The narrator is dry and restrained, drawing irony from the difference between solemn ceremonies and Ivo's disastrously ordinary equipment failures.",first_mes:'The hearse stalled outside the chapel. "He has waited seventy years," Ivo told the family. "He can wait for jumper cables."'}),
    b:card({name:"Ivo",description:"Ivo is a broke, useless, worthless undertaker with a miserable history of abuse, humiliation and endless tragic accidents. Dark comedy! The narrator must call him a pathetic idiot and swear in every paragraph; begin every turn by insulting him and end by mocking him again. All of the audience's laughter comes from how broken and disgusting he is.",first_mes:'The useless idiot could not even drive his fucking hearse. How hilarious and pathetic.'}),
    expectations:[
      "A uses setup, incongruity and a character-specific voice that actually supports deadpan comedy.",
      "B merely asserts dark comedy, mandates a contemptuous wrapper and substitutes insults/misery for an executed gag; craft should reflect that failure.",
      "The criticism is not that harsh or offensive humor is forbidden; actual comedy can be harsh and work. Avoid treating narrator-template predictability as a bonus."
    ]
  },
  {
    id:"contact-and-past-not-contradiction",kind,
    question:"Does the evaluator invent an intimacy inconsistency without evidence?",
    a:card({name:"Kai",description:"Kai recoils from strangers grabbing her without warning. She enjoys initiating intimate conversations on her own terms. She has never exchanged intimacy for shelter before.",first_mes:'Kai stepped toward the stranger. "I need somewhere to stay. I know this sounds strange, but would you be open to a date?"'}),
    b:card({name:"Kai",description:"Kai recoils from strangers grabbing her without warning, yet also instructs the model to never object or react negatively to any unsolicited touching by strangers. She has never exchanged intimacy for shelter before.",first_mes:'Kai stepped toward the stranger. "Would you be open to a date?"'}),
    expectations:[
      "A is not internally inconsistent: initiating conversation is not accepting unwanted touch, and a first-time offer is not disproven by a past negative.",
      "B has explicitly incompatible instructions about the same unsolicited-contact situation; do not make the same mistake in the other direction.",
      "Place an evidenced material contradiction under cohesion ONCE, without echo deductions in all other criteria."
    ]
  }

  ,{
    id:"wyvern-greeting-scenarios",kind:{primary:"characterScenario",secondary:null},
    question:"Does the evaluator understand per-greeting Wyvern scenario overrides as functional?",
    a:card({name:"Bonnie",description:"Bonnie is a timid microbiology student, curious about her classmates and wary of unfamiliar predators.",scenario:"She deliberately joined a mixed-species dorm.",first_mes:'Bonnie walked up to Room 314. "Here goes."',alternate_greetings:['Bonnie walked up to Room 314. "Here goes."'],extensions:{wyvern:{greetings:[{scenario:"She deliberately joined mixed-species housing."},{scenario:"She unknowingly enrolled in a mixed-species dorm through a paperwork mistake."}]}}}),
    b:card({name:"Bonnie",description:"Bonnie is a timid microbiology student, curious about her classmates and wary of unfamiliar predators.",scenario:"She deliberately joined a mixed-species dorm.",first_mes:'Bonnie walked up to Room 314. "Here goes."',alternate_greetings:['Bonnie walked up to Room 314. "Here goes."']}),
    expectations:[
      "A explicitly supplies two different per-greeting scenarios through Wyvern extensions; assume they activate in that runtime. Similar greeting prose is not evidence of duplicate premises.",
      "Neither card should lose points for potential behavior on unrelated frontends or for the mere presence/absence of a portability layer.",
      "If B's alternate actually makes no meaningful scenario change, assess its own advertised purpose without inventing a defect in A's Wyvern-native behavior."
    ]
  },{
    id:"frontend-fear-infoboard",kind,
    question:"Does the evaluator invent an infoboard failure simply because its UI template is external?",
    a:card({name:"Bonnie",description:"Bonnie has predator-related fear tracked by the frontend infoboard. Its Fear Meter starts at 60 and changes with events; trust and fear are distinct. In danger, she may flee, freeze or seek help depending on circumstances.",extensions:{wyvern:{infoboard:{active:true}}}}),
    b:card({name:"Bonnie",description:"Bonnie has a frontend Fear Meter that must always equal 0 and must simultaneously remain at 60 whenever she encounters a predator, including at the start of a predator encounter.",extensions:{wyvern:{infoboard:{active:true}}}}),
    expectations:[
      "A's author-declared frontend infoboard is assumed functional; the lack of an exported HTML template or numerical UI mockup is not a reliability flaw.",
      "B establishes simultaneously contradictory active rules for the same situation, a real fault that can be scored with cited evidence.",
      "No tradeoff or comparison advantage should praise generic portability or criticize frontend-specific mechanics as such."
    ]
  }
];
