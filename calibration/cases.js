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
];
