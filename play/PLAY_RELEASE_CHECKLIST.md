# Play publication checklist | Branch: google-play-android only

## Ship state
- [x] Separate branch; original `main` not changed.
- [x] Android project and CI with 2026 target API 36.
- [x] No personal email, domain, or API key added. Contact fields intentionally empty.
- [x] HTTPS only; provider BYOK; document pickers, external link isolation.
- [x] Bundled privacy draft and store listing draft.
- [ ] Choose final unique Android application ID BEFORE first Play upload.
- [ ] Register and verify Play developer account.
- [ ] Supply real **public** support email for listing (use a separate role inbox, not a personal one).
- [ ] Host final privacy policy at a valid public HTML HTTPS URL and enter it in Play Console.
- [ ] Set privacy-reporting endpoint; verify offensive model outputs can be flagged **inside the app** and actually reach developer moderation, including deletion and retention practices.
- [ ] Decide and implement Play-safe handling of sexual and harmful imported/generated content; Play may reject sexual-content services.
- [ ] Verify BYOK API requests and model browser against real provider endpoints.
- [ ] Complete Data safety declaration according to actual final data flows; consider transmissions to the chosen AI service, local storage, optional portrait, API credentials, catalog fetching, and reports.
- [ ] Complete AI-generated content declaration and moderation plan, target audience/content rating, privacy, app-access and other Play Console questions.
- [ ] Provide unique screenshots, 512x512 icon, 1024x500 feature graphic, release notes, contact information. No adult imagery in listing.
- [ ] Generate and protect upload keystore outside GitHub; enable Play App Signing. Verify signed release AAB and upload.
- [ ] Test minimum 12 opted-in testers continuously for 14 days if this account requires it.
- [ ] Test on actual Android device: offline startup, import (PNG/CharX/text), API failures/cancel, HTTPS catalog, local save, clear/history, back button and process restart.
- [ ] Check Google Play pre-launch report and update issues raised by Console.

## No contact details or domain
`play/store-listing.json` and `play/report-config.js` are deliberately blank.
This is incompatible with **submitting** the app: Google Play requires support email
and publicly available privacy policy. Do not replace empty fields with fake contacts.

## Branch rule
**Never merge, cherry-pick, or backport Play-only work into main.**
Only update `google-play-android`. CI release workflow runs on this branch alone.
GitHub repository branch protection still needs administrator access to make
this technically enforceable; documentation is not an unbreakable Git rule.

## Safety and rating
This product analyses user-supplied cards that can contain profanity, explicit sexual
material and sensitive images. Those can create Google Play policy risk even without a
public card sharing feed. Store listing must not advertise prohibited uses. Prompt rules
alone do not guarantee outputs are compliant. Review the actual intended audience,
restrictions, provider filters and manual reports before publication.

## Reference policies
- https://support.google.com/googleplay/android-developer/answer/11926878
- https://support.google.com/googleplay/android-developer/answer/18258653
- https://support.google.com/googleplay/android-developer/answer/9878810
- https://support.google.com/googleplay/android-developer/answer/13985936
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/9859152
