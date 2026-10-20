# Card Analyzer 5.2.1 (alpha)

**A completely separate analyzer**. The 4.6 project is unchanged: https://github.com/zootopiabest/Character-card-Analyzer

**Version check:** The footer says `Runtime 5.2.1 loaded` only after that JavaScript build runs. Downloaded reports also include `App version: 5.2.1`. If the footer has an older version, use **Reload to update** when offered, or close all analyzer windows and reopen while online. Before the first installation, a normal browser refresh loads the new code. Asset URLs are version-tagged to avoid stale deployment files.

This is a fresh, static browser application with an independent modular grading system. It is not a migration or a rewrite in the existing repo. It uses no backend, no npm packages and no build step.

## Changes in 5.2.1 (Grouped Markdown greetings)

- Fixed Wyvern Markdown exports using `Alternate Greetings` with nested `Greeting 1`, `Greeting 2`, etc. Those starts were previously attached to the first message instead of becoming independent grading entries. Importing and pasting now recognize the same set, including fenced greeting bodies and original alternate indices.
- Recognize `Main Prompt (Description Field)`, `Message Example`, and `Character Metadata` as separate fields; headers inside fenced card text remain inside that field.
- With Per-Greeting Report Card selected, the main request's expected output contains an explicit entry for every detected greeting. Leaving **Send greetings separately?** off still sends all greetings in one main request; no extra paid calls are introduced.
- Show the detected greeting count and requested grade count before Run, and graded-versus-expected coverage in reports. Missing model entries remain visible as incomplete coverage without automatic retries.
- Added a synthetic Wyvern-format fixture and end-to-end import/prompt/validation/export regressions covering combined mode, separate mode, comparisons, empty slots and fenced subheadings.

## Changes in 5.2.0 (Analyzer and rubric review)

- Structured card fields survive import, editing and prompt assembly. Imported text contains field markers so headings inside a greeting cannot become profile instructions. Greeting IDs retain their original extension slots even when earlier greetings are blank. Unmarked pasted Markdown remains supported, with a warning that its boundaries are inferred.
- Preserve intent tags, lorebook configuration, entry extensions, V3 metadata and group-only starts. Tags and creator notes remain distinct from runtime instructions.
- Import `.charx` ZIP archives with a root `card.json` and optional embedded raster icon. Supports stored/deflated entries and prefixed archives, with size and integrity checks. Encrypted, multi-disk and ZIP64 archives are rejected explicitly. Archive assets are read locally; remote asset URLs are not fetched.
- **Send greetings separately?** remains optional and defaults off. Zero/one greeting uses the main call even when checked. Before Run, a breakdown shows the main audit, classification and greeting request counts. Separate diagnostics start after the main response and share a concurrency limit of two across cards.
- **Cancel audit**, a five-minute request timeout, captured input/settings and run IDs prevent stale completions or further queued requests after cancellation. Clear cancels the current run. Client cancellation cannot guarantee a refund for work already accepted by a provider; there are no automatic paid retries.
- Missing criteria or empty rationales retain the valid findings but withhold the overall grade. Invalid portrait/optional output produces warnings without discarding valid main scores. Greeting IDs/coverage and song/shopping counts are checked; successful greeting entries survive other failures.
- HTML, Markdown and JSON preserve portrait matches/mismatches and partial-result warnings. Run records include input identity, time, provider, selected/resolved model, generation settings, request purposes and provider-reported usage, without API keys. DeepSeek latest resolves once per run; native OpenRouter aliases are pinned for later requests when the first response supplies a concrete model ID.
- Classification uses complete labeled fields instead of a silent 48,000-character prefix. Its scope is supplied to grading as revisable context.
- One shared grading contract serves combined and separate greeting reports. Removed contradictory transport instructions and narrowed the frontend-only deduction restriction. Consolidated duplicated policy while preserving the substantive trauma-causality and comedy-execution checks.
- Clarified information-economy ownership, criterion-specific high scores, non-romantic interpersonal scope, world/state inference and specialist ownership. Scoring weights remain unchanged; missing output never becomes zero or silently reweights a report.
- Expanded calibration to 24 pairs covering all six specialists, corrected lifecycle/padding assumptions, and added run-record templates. Local regressions cover request counts, cancellation, partial outputs, import equivalence, CharX and run snapshots. These checks do not establish live-model judging quality.

## Changes in 5.1.8 (Optional separate greeting requests)

- **Send greetings separately?** is a remembered checkbox under Optional extras, off by default, applying to single and comparison audits.
- Off: all supplied greetings and selected extras, including Per-Greeting Report Card, use one main audit request. Prompt rules still require treating greetings as independent starts, but they share model context.
- On: the main audit uses the first active start; separate diagnostic requests each receive only their own greeting, the shared profile and applicable Wyvern scenario override. Cards with multiple greetings add one request per greeting. Cards with zero or one greeting always stay in the main call, including any selected report card. This check applies independently to each comparison card.
- Auto classification still adds its own request per card when selected. Greeting report scores remain separate from the overall grade in both modes.

## Changes in 5.1.7 (Installable web app)

- Install Analyzer 5 as a standalone app from the **Install app** button or your browser's install/Add to Home screen menu. Its manifest identity and scope are separate from the original analyzer.
- Reused the original app icons, with Android and Apple home-screen metadata.
- A service worker caches only the public app shell so the interface opens offline after the first successful online setup. Model audits and model catalog refreshes still need internet access. API requests, keys, cards, and reports are never stored in the service-worker cache.
- Updates download in the background. A waiting update offers **Reload to update**; finish the audit and save needed input/reports first. An active audit blocks that button. Closing all analyzer windows also lets a waiting update activate. No automatic reload interrupts work.
- Caches are scoped to this project, and old analyzer/other GitHub Pages caches are left alone. Offline setup failure does not block online auditing.

### Maintaining offline releases

Bump `sw.js`'s `VERSION` alongside the runtime/cache URL version on every release. Keep its `SHELL` list synchronized with all browser modules and local assets. A test checks every versioned local module is precached. Do not add API endpoints, arbitrary requests, credentials, or report data to the shell cache.

## Changes in 5.1.5 (Optional extras restored)

- Restored all nine original options: Dating App Profile, Against-Type Shopping List, Top 5 Songs, Demise & Obituary, Psychoanalysis, Emotional Registers, The Boring Tuesday Test, Three Ways to Piss Them Off, and Per-Greeting Report Card.
- The collapsible **Optional extras** panel saves selections separately for single audits and each comparison card. Single audits initially enable dating/shopping, matching the original; comparisons start with none. Use Select all or Clear extras for the current mode.
- Only selected module instructions and output fields enter requests. Core scoring weights and specialist rubrics are unchanged. Interpretations are illustrative, not canon or scoring evidence. Per-greeting scores are isolated from the main audit and respect each greeting's own AU and frontend scenario override.
- Extras appear in HTML, Markdown, and JSON reports. Missing or malformed optional sections produce a visible warning while preserving a valid main audit. Unrequested model-generated extras are discarded.
- More extras use more output tokens; per-greeting reports scale with greeting count. No extra model call is required unless **Send greetings separately?** is enabled.

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
- **First greeting synergy** plus conditional profile-to-all-greetings support when multiple independent openings exist. Per-Greeting Report Card is an optional diagnostic; its scores never enter the overall grade.
- Separate 0-100 slop severity index (higher means worse).
- Evidence-first score anchors; unusual, shocking or highly scripted behavior does not earn a high score merely for being memorable or obedient.
- Deterministically computed overall quality: core 45% + primary 55%, or core 40% + primary 45% + secondary 15%. These weights are **provisional**, not empirically calibrated.
- Imports JSON character cards (including V3 data), Markdown, text, PNG cards containing supported embedded metadata, and CharX archives. Imported portraits are available for image comparison.
- Optional portrait match in single-card mode.
- BYOK Gemini, OpenAI, OpenRouter, DeepSeek, or custom OpenAI-compatible endpoint.
- Exports JSON and Markdown reports.
- No model API proxy. Keys and requests go directly from your browser to your selected API provider.

## Running it

Open index.html through an HTTP server (ES module imports will not work reliably with file://).

Node 20.12+:

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
- src/immersion-modules.js: optional module catalog, prompt fragments, validation and export content.
- src/immersion-panel.js: saved single/per-card selection controls.
- src/classifier.js: model-based bot type classification.
- src/providers.js: direct BYOK model calls.
- src/evaluator.js: parsing, partial-result validation, diagnostic scheduling, and deterministic aggregation.
- src/card-context.js: structured fields, stable greeting IDs and marked text round-trips.
- src/charx.js: bounded local ZIP extraction.
- src/rubrics/greetings.js: shared greeting assessment and score anchors.
- src/importer.js: card extraction from supported formats.
- src/report.js: escaped HTML report and downloads.
- src/app.js: browser UI orchestration.

## Known alpha limitations

- Runtime simulation of regex-based lorebook activation, group-chat orchestration, custom stress-test modules and model discovery for providers other than OpenRouter are not yet implemented.
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

The tests exercise assembly, score contracts, cancellation, UI run state, provider requests and PNG/CharX imports without requiring provider keys. Run them on Node 20.12+.

    npm run calibration

This writes paired cards and single/AB/BA production prompts to the ignored `calibration-output/` directory without contacting a provider. See [calibration instructions](calibration/README.md) for human review expectations and recording model results. Expected judgments are never included in generated model prompts.

## Rubric principles

1. Characterization should enable *inference*, not script every emotion.
2. A character-specific preference does not require a psychological rationale.
3. Treat scope and user-freedom promises precisely, not as demands for universal portability.
4. Static anatomy is continuity metadata; sexuality/genre are not defects.
5. Quiet, cooperative or dependent character behavior can be excellent.
6. No irrelevant categories can be "high scored" as a workaround; modules are omitted if not applicable.
7. Use textual first greeting synergy and profile support for all independent greetings; visual continuity and explicitly selected per-greeting report cards have separate optional scores that never enter overall quality.
8. Every actual deduction requires attributable evidence and a consequence.
9. Creator notes and tags describe intent; only one selected greeting initializes a chat. Do not assume examples disappear without an explicit lifecycle rule. Lorebook activation follows provided frontend settings, including enabled constant entries.
10. Credit voice and behavior that are reasonably implied by the profile. Only genuinely unsupported central characterization requires an additional anchor; illustrative lines and ordinary reactions do not.
11. Give each defect one primary scoring home. A separate deduction requires a separately evidenced failure, not a renamed consequence.

