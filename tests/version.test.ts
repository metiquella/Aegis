import { test } from "node:test";
import assert from "node:assert/strict";
import { AGENT_NAME, VERSION } from "../src/version.ts";

test("exposes agent name and version", () => {
  assert.equal(AGENT_NAME, "fraud-detection-agent");
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
