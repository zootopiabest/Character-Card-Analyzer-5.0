# Card Analyzer 5.0.2 (alpha)

**A completely separate analyzer**. The 4.6 project is unchanged: https://github.com/zootopiabest/Character-card-Analyzer

**Version check:** The footer says `Runtime 5.0.2 loaded` only after that JavaScript build runs. Downloaded reports also include `App version: 5.0.2`. If the footer has an older version, hard-refresh the browser to clear stale code. Asset URLs are version-tagged to avoid stale deployment files.

This is a fresh, static browser application with an independent modular grading system. It is not a migration or a rewrite in the existing repo. It uses no backend, no npm packages and no build step.

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
- **First greeting synergy** plus a profile-to-all-greetings support assessment. Automatic per-greeting scoring has been removed; that remains a potential future opt-in feature.
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

- CharX ZIP bundles, regex-based lorebook activation, group-chat orchestration, custom stress-test modules and provider model discovery are not yet implemented.
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
9. Creator Notes are non-runtime metadata, only one selected greeting initializes a given chat, and example dialogue can fall out of context; respect explicit frontend context settings.
10. Credit voice and behavior that are reasonably implied by the profile. Only genuinely unsupported central characterization requires an additional anchor; illustrative lines and ordinary reactions do not.
11. Give each defect one primary scoring home. A separate deduction requires a separately evidenced failure, not a renamed consequence.

