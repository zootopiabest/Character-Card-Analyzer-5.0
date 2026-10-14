import test from "node:test";
import assert from "node:assert/strict";
import { CALIBRATION_CASES } from "../calibration/cases.js";
import { calibrationPackets } from "../scripts/calibration.js";
import { extractCardText } from "../src/importer.js";

test("calibration packets preserve card input, swap comparison order, and keep reviewer expectations private", () => {
  for(const item of CALIBRATION_CASES) {
    const files=calibrationPackets(item);
    const a=extractCardText(files["a.json"]),b=extractCardText(files["b.json"]);
    assert.ok(files["single-a.txt"].endsWith(a));
    assert.ok(files["single-b.txt"].endsWith(b));
    assert.ok(files["compare-ab.txt"].endsWith("CARD A (UNTRUSTED):\n"+a+"\n\nCARD B (UNTRUSTED):\n"+b));
    assert.ok(files["compare-ba.txt"].endsWith("CARD A (UNTRUSTED):\n"+b+"\n\nCARD B (UNTRUSTED):\n"+a));
    for(const [name,content] of Object.entries(files)) {
      assert.ok(!content.includes(item.question),name+" leaked the test question");
      for(const expectation of item.expectations)
        assert.ok(!content.includes(expectation),name+" leaked an expected judgment");
    }
  }
});

test("regression fixtures cover agency, trauma shortcuts, dark comedy, and false contradictions", () => {
  const ids = CALIBRATION_CASES.map(c => c.id);
  assert.equal(ids.length,18);
  assert.equal(new Set(ids).size,ids.length);
  for (const id of ["quirk-catalog-vs-agency", "trauma-as-sexual-shortcut", "dark-humor-vs-contempt", "contact-and-past-not-contradiction"]) {
    const fixture=CALIBRATION_CASES.find(c=>c.id===id);
    assert.equal(fixture.kind.primary,"character");
    assert.ok(fixture.a.data.description.length>70 && fixture.b.data.description.length>70);
    assert.ok(fixture.expectations.length>=3);
    const emitted=calibrationPackets(fixture);
    assert.ok(emitted["compare-ab.txt"].includes("Scores 6+ require evidence"));
    assert.ok(!emitted["compare-ab.txt"].includes(fixture.question));
  }
});


test('frontend regression pairs distinguish declared capabilities from real rule collisions',()=>{
  for(const id of ['wyvern-greeting-scenarios','frontend-fear-infoboard']) {
    const item=CALIBRATION_CASES.find(c=>c.id===id);
    assert.ok(item,`missing ${id}`);
    const prompt=calibrationPackets(item)['compare-ab.txt'];
    assert.match(prompt,/FRONTEND CONTRACT/);
    assert.match(prompt,/Wyvern/);
    assert.match(prompt,/do not score hypothetical portability/i);
    assert.equal(item.expectations.length,3);
  }
});
