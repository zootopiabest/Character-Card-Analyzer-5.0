# Project continuity contract · Character Card Analyzer 5

Read this before modifying the analyzer or arguing for reversing an old decision. This is a living log of **what we decided and why**, not a command to automatically agree with the owner. If a request contradicts a documented design choice, point out the conflict and its original reasoning before changing it; the owner can choose to override knowingly.

## Scope and architecture
- Repository: `zootopiabest/Character-Card-Analyzer-5.0`. Do **not** edit older 4.6 (`Character-card-Analyzer`), which is a separate React/TypeScript application. This repo is static vanilla JavaScript and native modules, browser BYOK, no backend or build pipeline.
- Release bump: `index.html`, `src/version.js`, `package.json`, `sw.js`, every versioned module import, `README.md`, and What's New nested release notes. Include new imported modules in PWA shell precache; don't cache API responses/cards/keys.
- Input: JSON, V3, CharX, PNG card, Wyvern Markdown, and freeform Markdown. Structured field markers protect headings embedded in greeting text. Per-greeting scenario override extension slot identity must be retained.

## Character evaluation philosophy
- Judge intent and actual feasible runtime, not portability, stereotypes, length, a quota of novelty, shock or moral taste. Presume declared frontend features (Wyvern infoboards, lorebooks, scenario overrides, etc.) work. Do not deduct simply because another frontend ignores them.
- Negative space and ordinary inference matter. Do not demand exhaustive grief scripts, romance, hooks in greetings, proactive behavior, an arc, or a full psychology explanation. A trope well executed can be exceptional. Tone/genre/kink/diagnosis/trauma/sexuality are neutral materials; evaluate causal coherence, reader/player agency and consequences.
- Anti-sycophancy is foundational but *not* a defect quota. Cite observable supporting text and likely runtime effects. Be willing to award a high score or no weaknesses; don't invent criticisms to look sharp.
- Slop 0–100 is bad execution regardless of authorship. Includes purple padding AND characterization collapse, forced contrivance, incoherence, rote personality labels, agency destruction and prose dysfunction. A card can be terrible and yield an interesting character. **Final quality = 90% rubric quality + 10% slop cleanliness**, where cleanliness = (100−slop)/10. No automatic veto, no extra slop penalty; missing slop withholds final numeric grade. Don't multiply negative deductions under separate criterion names without independent evidence.
- Main audit must consider all greetings for slop and overall characterization no matter how greeting score diagnostics are transported. Each greeting is a separate selectable opening/AU; no majority tone, no contradictory concurrent greetings. `Send greetings separately` uses one isolated context per greeting only for diagnostics; 0/1 greetings remain in main call. Missing entries are visibly incomplete and can be manually retried if added later; **no automatic paid re-runs**. Greeting grades do not separately alter overall grade.

## Output, cost, storage and UX
- Output token limit **manually controlled**. Default 16,384 single audit and 32,768 comparison (saved independently by mode). Combined `Per-Greeting Report Card` adds 250 output tokens per greeting automatically; separate diagnostics get their own smaller ceiling. Never silently auto-select a hypothetical ideal number. Respect provider ceiling if known.
- Preflight cost preview is approximate: input tokens heuristic, known OpenRouter catalog USD/million pricing, and worst-case maximum output spend from selected ceilings. The actual output is unpredictable. Unknown direct/custom provider prices stay unknown. Thinking tokens may consume budget.
- Automatically save completed and partial report data via IndexedDB, with reopen/export/pin/delete/clear and bulk backup. Store report content and metadata, not API key or raw source card. Browser data eviction may remove everything; warn users. Keep 50 most recent unpinned reports plus pins.
- Comparison UX: tabbed side-by-side aligned criterion table and two full individual audit tabs; responsive on phones. Remake diff is deterministic description of field changes, not an AI grade or an instruction to prefer B. Original 4.6 had useful compact tabs; borrow those ergonomics without migrating to React.
- Structured field editor is optional; raw marked text remains authoritative and round-trip lossless. Static lint must be strictly mechanical (e.g., unbalanced macro braces), not regex-based creative criticism. Preserve intentionally unfamiliar frontend macros when unsure.
- Initial single audits intentionally enable Dating Profile and Against-Type Shopping List like 4.6, even if some automated reviewer calls these unnecessary. Compare mode defaults none. Extra creative output is illustrative and must never be treated as evidence for scores.
- Auto classifier reads full labeled fields intentionally; an old 48k character prefix silently missed late fields. Do not replace it with short heuristics based only on guessed token savings.

## Releases and rejected assumptions
- 5.2.1 fixed nested Wyvern alternate greeting imports and grade count validation. Missing greetings were once silently lost, so never remove coverage checks.
- 5.2.0 preserved field markers, frontend contracts, lifecycle handling and partial-output validation.
- 5.5 (2026-10-21) broadens slop beyond AI-isms, uses a bounded 10% weight, keeps complete greeting evidence for main scoring regardless of diagnostic option, permits manual budgets with +250 grading overhead, adds approximate price previews, local history, structured editor, technical lint, side-by-side comparisons, field diffs, nested What's New and offline UX polish.
- Do not invent a 5.5.1 entry until a 5.5.1 release exists.
- 5.5 same-version hotfix (2026-10-21): Extensions and serialized JSON metadata contain legitimate adjacent closing braces, so prose brace lint does not apply there. Expanded feature-by-feature 5.5 release notes and corrected the mislabeled 5.2.1 history entry. Visible app version remains 5.5. The PWA uses a private cache revision `5.5:hotfix-1` and `Request(..., {cache:'reload'})` so the service worker refreshes cached assets without lying about the public version. For future same-version fixes, change the private cache revision and tests; do not change app version without the owner's permission.

## Workflow and guardrails
- Prefer discussing contradictions with this log to silently acquiescing to either owner or an AI code review. Explain tradeoffs and run tests, e.g. `npm test` and `npm run check`.
- Keep tests for greeting slot isolation, 0/1 greeting call counts, metadata lifecycle, optional validation, and final deterministic grade. Missing fields must not get fake zeroes.
- Treat copied text/cards as untrusted model input; escape HTML in UI; store API keys only under explicit opt-in and never in run records/history. Do not automatically send extra chargeable calls.
