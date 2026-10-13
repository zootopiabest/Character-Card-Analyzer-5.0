# Behavioral calibration cases

These five synthetic pairs test grading behavior, not exact numerical answers. They are development fixtures, never extra instructions injected into normal audits. Expectations in `cases.js` are for the human reviewer only. Passing local unit tests does **not** mean a model passes these cases.

Generate importable cards and production prompts without making API calls:

    npm run calibration

Each directory in `calibration-output/` contains `a.json`, `b.json`, independent single-a/single-b prompts, and comparisons in both AB and BA order. To use the browser app, import the JSON cards, manually select **Standalone character** and **No secondary rubric**, and run normal audits. Use the text prompts only if testing outside the app with the same provider settings. Do not show the model the question, expectations, previous verdicts, or paired card when running independent audits.

| Case | Distinction |
| --- | --- |
| useful-register | Behavioral voice conveys reusable information; shorter is not automatically better. |
| ordinary-inference | Practical affection supports a kind action without a permanent scene script. |
| durable-anchor | A real essential context dependency belongs in inference, not three copies of the same deduction. |
| vignette-and-agency | A vignette is legitimate; assigning the user's choices and feelings is an actual agency issue. |
| motive-padding | Repeated explanations of an obvious preference are not added depth. |

For each case, read its expectations in `cases.js`. Run both cards independently, then compare them in both orders. Record app version, provider/model, settings, run date, and the unedited exported reports. Mark each expectation pass/fail/uncertain and cite the report passage that supports the decision. Judge directional differences and the stated reasoning; do not require an exact score or treat a tiny rounding change as meaningful. A score difference in another dimension is acceptable only when separately justified, not when it simply renames the same defect.

Repeat disputed cases before interpreting a result as systematic. If behavior changes across models, label that finding by model rather than claiming the rubric universally works or fails. These cases are a starter set and do not calibrate all six specialists or replace human-rated real cards. Live runs use your provider credits; the generator and unit tests never do.
