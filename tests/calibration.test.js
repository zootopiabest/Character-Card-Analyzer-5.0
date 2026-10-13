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
