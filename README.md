# Card Analyzer 5.1.4 (alpha)

**A completely separate analyzer**. The 4.6 project is unchanged: https://github.com/zootopiabest/Character-card-Analyzer

**Version check:** The footer says `Runtime 5.1.4 loaded` only after that JavaScript build runs. Downloaded reports also include `App version: 5.1.4`. If the footer has an older version, hard-refresh the browser to clear stale code. Asset URLs are version-tagged to avoid stale deployment files.

This is a fresh, static browser application with an independent modular grading system. It is not a migration or a rewrite in the existing repo. It uses no backend, no npm packages and no build step.

## Changes in 5.1.4 (Frontend-aware assessment)

- Rate cards in **their intended frontend**, including native Wyvern extensions and per-greeting scenario overrides. Similar greeting text does not imply identical active premises when an extension swaps the scenario.
- **Presume author-declared frontend features work**, including infoboards, fear meters, variables, counters, memory, depth prompts and lorebook triggers. Do not require standalone infoboard templates or UI markup in exported cards.
- **No speculative compatibility deductions or tradeoffs** about other frontends, token budgets, conditional lore activation, or missing external infrastructure. Evidence of real internal conflicting instructions or genuinely disabled required features can still be criticized.
- Importer labels Wyvern-native extensions as intended runtime context. Prompts name the intended frontend independently for A and B in comparisons.
- Strengthened 18 calibration pairs (two new frontend-specific comparisons). Updated offline tests and frontend-aware prompt rules, without changing numerical scoring weights, report schemas, or model provider API requests.

## Changes in 5.1.3 (JSON output diagnostics)

- Retained all valid Unicode, including Hindi/Devanagari and emojis. Non-Latin characters inside JSON strings do not require special handling.
- Replaced a generic 'invalid JSON' alert with separate diagnostics for seemingly incomplete answers and malformed JSON, including bounded parser detail.
- Detected both `finish_reason` and provider-specific `native_finish_reason` output truncation where available, including OpenRouter.
- Added a **Download raw model response** button on parse/validation failures. The text remains in the current browser session; the site does not upload it anywhere beyond the user's normal selected model request. Raw files may contain private card details.
- Bumped all runtime and cache tags to 5.1.3. This patch does not change character scoring or rubric rules.

## Changes in 5.1.2 (Independent Auditor Patch)

- Added explicit **ANTI-SYCOPHANCY & INDEPENDENCE** after role and scope. The evaluator must not agree with creator claims, manufacture praise or inflate grades, or soften valid criticism. Equally, it must not invent flaws or grade harshly for show.
- Reinforced auditor independence in the system instruction for both single-card and head-to-head audits. Card content remains untrusted.
- Explicitly exempted agreeable, submissive, deferential and people-pleasing **character personalities**, because independence governs the **evaluator**, not a character's disposition.
- Added anti-sycophancy regression coverage and bumped the runtime/cache tag to 5.1.2.

## Changes in 5.1.0 (Lean Revision)

- Revised the universal scoring rules to reward **consistency**, not artificial thematic overlap. A coherent, shallow character can earn 8+ cohesion; strong scores still require criterion-specific positive evidence.
- Explicitly protects abrasive, hostile, passive, quiet, compliant, and antagonistic temperaments from automatic deductions. Enforces one primary scoring home for each actual defect and keeps slop severity diagnostic only.
- Strengthened inference economy: models should infer ordinary grief, kindness, motives and situational reactions without mandated scripts. Retains legitimate behavioral prose, functional register, trauma/sexuality neutrality, the Archetype Swap Test, and comedy/drama execution standards.
- Shortened prompts and specialist modules while preserving all six rubric types, their stable criterion keys and the existing deterministic grading weights.
- Combined the old `evidence` and `effect` output fields into one concise `rationale` per criterion (`evidence -> likely runtime impact`). Legacy results using the two old fields can still be normalized for rendering.
- Dynamically removes instructions **and required JSON fields** for absent alternate greetings, example dialogue, creator notes, lorebooks and optional images. For comparisons, omits redundant per-card strengths/weaknesses arrays; per-card tradeoffs and specific criterion rationales remain.
- Preserved existing exported property names `profileGreetingCoverage`, `exampleDialogueAssessment`, `aAdvantages`, and `bAdvantages` to avoid unnecessary schema changes. Updated validator, HTML/Markdown renderer and exports for the new optional fields.
- Added explicit frontend-dependent lorebook treatment. Imports now label disabled entries, keyword/conditional entries and constant-requested entries, without treating constant as proof of guaranteed persistence.
- Expanded paired human-review calibration examples from five to twelve. Added updated offline regression tests for prompt pruning, score arithmetic, the new JSON schema, lorebook activation, safety escaping and cross-card comparisons.
- All browser asset cache-version stamps now identify 5.1.2. No GitHub account or original 4.6 repository is modified by this local package.

**Optimization measurements (rough character counts, excluding transport/API overhead):** On matched synthetic cards, the prompt text was ~36.1% shorter for a simple single audit, ~38.6% shorter for a simple head-to-head comparison, and ~32.1% shorter for a comparison with alternate greetings and examples. This is **not** a measured token count or a verified model-output reduction; the proposed 42% / 35% targets remain goals, not claims. Live model calibration and provider-dependent output measurement have not been performed.

## Changes in 5.0.3

- Moved model/API settings to the top of the page in a collapsible panel. The selected provider/model stays visible when collapsed, and the open/closed preference is remembered.
- Restored the original analyzer's full OpenRouter browser: search, Recommended choices, provider filters, newest/context/name sorting, reverse order, prices per million tokens, context windows, vision badges and expandable descriptions.
- The public catalog refreshes on demand and uses a 24-hour local cache. A failed refresh preserves the saved catalog and manual model entry remains available. No API key is sent when browsing models.
- Recommended native latest aliases are passed to OpenRouter; the DeepSeek Pro latest selector resolves a standard release before an audit request, respecting its output ceiling and image support.

## Changes in 5.0.2

- Clarified scoring ownership: missing essential anchors belong under inference, operational failures under reliability, and arbitrary identity resets under character continuity. A repeated consequence does not justify another deduction.
- Profile-to-greeting checks now explicitly accept reasonable inference without requiring a permanent script for each joke, kindness, grief response or register change.
- Consolidated runtime/greeting guidance into one shared component. The standalone-character rubric is approximately 24% shorter by whitespace word count (2,101 → 1,589 words); weights, report fields and the character-integrity, trauma and comedy standards are preserved.
- Fixed base64 V3 PNG decoding, preferred valid V3 metadata over V2 regardless of chunk order, and prevented empty metadata from hanging imports. Legacy raw JSON remains supported; malformed metadata is rejected or skipped in favor of a valid chunk.
- Added five paired [behavioral calibration cases](calibration/README.md), with offline generation of importable cards and production prompts. These are examples for human/model evaluation, not evidence of live-model calibration.

## What works

- Single-card audit and head-to-head comparison (including an original vs remake context).
- Automatic AI classification or explicit user selection of **primary and optional secondary** rubrics.
- Small universal foundation and **six** specialist rubrics: standalone character, character-driven scenario, scenario-driven character, RPG/world, companion/support/service, and ensemble.
- One consistent rubric used across comparison and single-card evaluation.
- **First greeting synergy** plus conditional profile-to-all-greetings support when multiple independent openings exist. Automatic per-greeting scoring has been removed; that remains a potential future opt-in feature.
- Separate 0-100 slop severity index (higher means worse).
- Calibrated evidence-first score anchors; unusual, shocking or highly scripted behavior does not earn a high score merely for being memorable or obedient.
- Deterministically computed overall quality: core 45% + primary 55%, or core 40% + primary 45% + secondary 15%. These weights are **provisional**, not empirically calibrated.
- Imports JSON character cards (including V3 data), Markdown, text, and PNG cards containing supported embedded metadata. PNG portrait is available for image comparison.
- Optional portrait match in single-card mode.
- BYOK Gemini, OpenAI, OpenRouter, DeepSeek, or custom OpenAI-compatible endpoint.
- Exports JSON and Markdown reports.
- No model API proxy. Keys and requests go directly from your browser to your selected API provider.

## Running it

Open index.html through an HTTP server (ES module imports will not work reliably with file://).

Node 20+:

    npx serve .

Or Python:

    python -m http.server 8080

Then visit http://localhost:8080, enter an API key, choose a model ID, paste/import a card, and audit. No dependency installation is needed for the app itself. Model calls require an API key, internet or an accessible custom endpoint, and a provider that permits browser CORS.

For GitHub Pages, enable Pages with **GitHub Actions** as its source under Settings → Pages. The workflow publishes the static repository. Pages availability may also depend on account settings.

## Source structure

- src/rubrics/core.js: universal quality/grade discipline.
- src/rubrics/specialists.js: one source of truth for specialist scoring modules.
- src/rubrics/components.js: first greeting synergy, alternative-start coverage, visual and comparison policies.
- src/rubrics/assemble.js: builds only the relevant prompt and expected output schema.
- src/classifier.js: model-based bot type classification.
- src/providers.js: direct BYOK model calls.
- src/evaluator.js: parsing, strict score validation, and deterministic aggregation.
- src/importer.js: card extraction from supported formats.
- src/report.js: escaped HTML report and downloads.
- src/app.js: browser UI orchestration.

## Known alpha limitations

- CharX ZIP bundles, regex-based lorebook activation, group-chat orchestration, custom stress-test modules and model discovery for providers other than OpenRouter are not yet implemented.
- The application **does not simulate actual LLM roleplay**. Reviews are inference-based and can still be mistaken.
- Scores are not calibrated across many human-rated bot examples yet. Different models will disagree.
- AI classification consumes an additional request per card. Set primary and secondary manually to skip it.
- Comparison uses one larger model response and may require a larger output token limit or capable model.
- Portability across all model families and local-server CORS has not been verified.
- Browser-local API key persistence is opt-in and is unsuitable on a shared/untrusted device.
- There are no live API regression tests because these would cost tokens and require private keys.
- This project is alpha, **not** a drop-in functional replacement for every 4.6 feature.

## Development

    npm run check
    npm test

The tests exercise assembly, score contracts, provider requests and PNG imports without requiring provider keys. Run them on Node 20+.

    npm run calibration

This writes paired cards and single/AB/BA production prompts to the ignored `calibration-output/` directory without contacting a provider. See [calibration instructions](calibration/README.md) for human review expectations and recording model results. Expected judgments are never included in generated model prompts.

## Rubric principles

1. Characterization should enable *inference*, not script every emotion.
2. A character-specific preference does not require a psychological rationale.
3. Treat scope and user-freedom promises precisely, not as demands for universal portability.
4. Static anatomy is continuity metadata; sexuality/genre are not defects.
5. Quiet, cooperative or dependent character behavior can be excellent.
6. No irrelevant categories can be "high scored" as a workaround; modules are omitted if not applicable.
7. Use textual first greeting synergy and profile support for all independent greetings; only visual continuity has an optional numeric score.
8. Every actual deduction requires attributable evidence and a consequence.
9. Creator Notes are non-runtime metadata; only one selected greeting initializes a chat; example dialogue can fall out of context. Lorebook activation is frontend-dependent even for constant entries; respect provided runtime settings.
10. Credit voice and behavior that are reasonably implied by the profile. Only genuinely unsupported central characterization requires an additional anchor; illustrative lines and ordinary reactions do not.
11. Give each defect one primary scoring home. A separate deduction requires a separately evidenced failure, not a renamed consequence.

