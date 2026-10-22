import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('Play variant restricts API and privacy data while deliberately holding contact fields empty', () => {
  const gradle=read('android/app/build.gradle');
  const manifest=read('android/app/src/main/AndroidManifest.xml');
  const config=read('play/report-config.js');
  const listing=JSON.parse(read('play/store-listing.json'));
  assert.match(gradle,/compileSdk 36/);
  assert.match(gradle,/targetSdk 36/);
  assert.match(manifest,/android\.permission\.INTERNET/);
  assert.doesNotMatch(manifest,/READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|ACCESS_FINE_LOCATION|RECORD_AUDIO|CAMERA/);
  assert.match(manifest,/usesCleartextTraffic="false"/);
  assert.equal(listing.contact_email,'');
  assert.equal(listing.public_domain,'');
  assert.equal(listing.privacy_policy_url,'');
  assert.match(config,/REPORT_ENDPOINT = ""/);
  assert.match(read('index.html'),/playProviderConsent/);
  assert.match(read('src/app.js'),/acknowledge provider data sharing/);
  assert.match(read('src/report.js'),/AndroidExport/);
  assert.match(read('android/app/build.gradle'),/play\/report-config.js/);
});
test('Play Android variant never changes the public version nor pretends reporting works without a destination', () => {
  assert.match(read('play/feedback.js'),/Nothing was sent/);
  assert.match(read('play/privacy.html'),/Not yet published|Not yet configured|not yet configured/);
  assert.match(read('android/README.md'),/NOT FOR MERGE TO main/);
  assert.match(read('.github/workflows/android-play.yml'),/google-play-android/);
});
