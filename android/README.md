# Google Play Android variant (NOT FOR MERGE TO main)

This directory and the `play/` changes exist only on the `google-play-android` branch.
There is no Play Store submission or production release yet.

## Build prerequisites

Android Studio / Android SDK Platform 36, JDK 17, Gradle 8.13, Android Gradle Plugin 8.13.2.
Open `android/` as the Android Studio project, allow Gradle sync, and run the app.
The branch CI uses `gradle/actions/setup-gradle` and builds a debug APK plus an unsigned
release AAB. Build output is intentionally not committed.

For local Gradle installs run from `android/`:

```sh
gradle :app:assembleDebug
gradle :app:bundleRelease
```

Before an upload, choose a unique PERMANENT `applicationId` (provisional:
`app.cardanalyzer.mobile`) and keep it unchanged thereafter. Also provide a
Play App Signing upload keystore stored OUTSIDE the repository. Example (DO NOT
commit real values or execute with real passwords in shared shell history):

```sh
gradle :app:bundleRelease \
  -PplayStoreFile=/private/path/upload-key.jks \
  -PplayStorePassword=YOUR_PRIVATE_SECRET \
  -PplayKeyAlias=upload \
  -PplayKeyPassword=YOUR_PRIVATE_SECRET
```

Prefer Android Studio > Build > Generate Signed Bundle / APK to avoid secrets in shell
history. Never commit `.jks`, `.keystore`, `key.properties`, API keys, or signed
bundles. Release AABs built without those properties are NOT signed or Play-uploadable.

## Technical structure

- Offline app HTML/CSS/JS are packaged directly into the Android app. They are
  served at the Android WebView asset loader origin, not from an owned domain.
- Android WebView and Activity handle local card/photo import, document exports
  via system file picker, and HTTPS model calls using an asynchronous native bridge
  (avoids browser CORS limitations).
- External links open the browser. The embedded WebView cannot navigate to a
  third-party site or load third-party subframes/resources.
- No contacts, location, camera, microphone, background services, advertising ID,
  dangerous storage permissions, analytics SDK or advertising libraries.
- BYOK requests are made to the provider picked by the user. API keys can be
  optionally remembered on-device using web local storage; treat the device as
  sensitive. No credentials are checked into the package.
- The Android variant disables the web install/update UX. Its native binary has
  its own release cadence and should be installed/updated via Play.

## Publishing is blocked until

1. Set a genuine publicly accessible privacy-policy URL in Play Console. An
   in-app policy is included, but a Play Console link is mandatory.
2. Provide a distinct public support contact in Play Console. This repo intentionally
   contains NO real email address. The policy lists an empty contact field.
3. Implement a developer-receiving, in-app offensive AI output reporting endpoint.
   `play/report-config.js` deliberately has an empty URL. The visible form
   will not pretend a report was delivered without a configured endpoint.
4. Review content safety: the analyzer may ingest explicit third-party character
   cards or receive explicit AI output. Google Play can reject sexual-content
   apps regardless of age rating. Restrict what this Play variant accepts/displays
   as necessary, then test moderation in actual provider responses.
5. Complete Play Console Data safety, content rating, app-access, declarations,
   screenshots, app signing, device tests and (if applicable) closed testing
   (12 testers for 14 days for newer personal accounts).
6. Test against a physical API 36 phone (including back navigation, file import,
   report export, offline UI, API providers, accessibility, 16 KB page devices).

Do not call this version policy-approved or upload-ready until these gates are met.
See `play/PLAY_RELEASE_CHECKLIST.md`.
