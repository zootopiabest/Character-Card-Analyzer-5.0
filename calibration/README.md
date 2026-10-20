# Behavioral calibration cases

These twenty-four synthetic pairs probe grading behavior, not exact numerical answers. The new pairs target the failure pattern seen in a real 5.1.1 report on a strongly over-scripted character; they are SYNTHETIC and do not reproduce that creator's full card. They are development fixtures, never extra instructions injected into normal audits. Expectations in `cases.js` are for the human reviewer only. Passing local unit tests does **not** mean a model passes these cases.

Generate importable cards and production prompts without making API calls:

    npm run calibration

Each directory in `calibration-output/` contains `a.json`, `b.json`, independent single-a/single-b prompts, and comparisons in both AB and BA order. To use the browser app, import the JSON cards, manually select the primary rubric in each case’s `kind` and **No secondary rubric**, and run normal audits. Use the text prompts only if testing outside the app with the same provider settings. Do not show the model the question, expectations, previous verdicts, or paired card when running independent audits.

| Case | Distinction |
| --- | --- |
| useful-register | Behavioral voice conveys reusable information; shorter is not automatically better. |
| ordinary-inference | Practical affection supports a kind action without a permanent scene script. |
| durable-anchor | A real essential context dependency belongs in inference, not three copies of the same deduction. |
| vignette-and-agency | A vignette is legitimate; assigning the user's choices and feelings is an actual agency issue. |
| motive-padding | Repeated explanations of an obvious preference are not added depth. |
| shallow-cohesion | A simple character can have excellent cohesion without interconnected traits. |
| abrasive-archetype | Antagonism and unpleasant behavior need no redemptive soft side. |
| reactions-versus-temperament | Stable personality vs. rigid mandated reaction scripts. |
| triggered-lore | Conditional characterization is a scope choice unless always-active behavior is promised. |
| constant-disabled-lore | Disabled entries are inactive; enabled constant-requested entries are presumed active in their intended frontend. |
| prose-vs-filler | Useful behavioral register vs. repeated ornamental filler. |
| fast-intimacy-without-psychology | Accessibility and affection don't require an imposed trauma rationale. |
| quirk-catalog-vs-agency | Distinctive scripted reactions are not independently inferred judgments or an open-ended personality. |
| trauma-as-sexual-shortcut | Freely chosen sexual enthusiasm versus trauma invoked to mandate intimacy without refusal. |
| dark-humor-vs-contempt | Working dark comedy versus profanity/humiliation presented as the joke. |
| contact-and-past-not-contradiction | No invented inconsistency between unwanted contact, self-initiated intimacy, and past history. |
| wyvern-greeting-scenarios | Apply per-greeting Wyvern scenario overrides rather than penalizing cross-frontend portability. |
| frontend-fear-infoboard | Assume declared external infoboard works; still identify truly conflicting internal rules. |

Additional pairs cover RPG rule ownership, ensemble speaker attribution, responsive companion service, character-scene continuity, finite scenario player choice, and non-romantic relationship scope. The durable-anchor pair explicitly declares that example dialogue is removed after the opening exchange; no unknown truncation is assumed. Padding expectations use inference for information economy and craft only for a separate delivery failure.

Also compare equivalent JSON and marked imports, harmless internal headings, and empty greeting slots using the local regression suite. In live evaluation, repeat the same card with extras off/on and greetings combined/separate, and record any difference in main scores and reasoning. Unit tests confirm payload/aggregation contracts, not equality of stochastic model judgments. Do not label a model bias fixed from mocked tests alone.

For each case, read its expectations in `cases.js`. Run both cards independently, then compare them in both orders. Record app version, provider/model, settings, run date, and the unedited exported reports. Mark each expectation pass/fail/uncertain and cite the report passage that supports the decision. Judge directional differences and the stated reasoning; do not require an exact score or treat a tiny rounding change as meaningful. A score difference in another dimension is acceptable only when separately justified, not when it simply renames the same defect.

Repeat disputed cases before interpreting a result as systematic. If behavior changes across models, label that finding by model rather than claiming the rubric universally works or fails. The cases now cover all six specialists but do not replace human-rated real cards. The generator writes an unfilled `run-record-template.json`; this is a recording aid, not evidence that a live model passed. Reports also export actual request metadata and usage. Live runs use your provider credits; the generator and unit tests never do.
