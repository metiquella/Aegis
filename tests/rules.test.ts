import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, evaluateRules, scoreRules } from "../src/rules.ts";
import type { Transaction } from "../src/types.ts";

function tx(o: Partial<Transaction> = {}): Transaction {
  return {
    id: "T1",
    timestamp: new Date().toISOString(),
    currency: "USD",
    amount: 1234,
    cardLast4: "1234",
    cardCountry: "US",
    ip: "10.0.0.1",
    ipCountry: "US",
    mcc: "5411",
    merchantId: "M1",
    billingCountry: "US",
    hourOfDay: 12,
    velocity24h: 1,
    velocity1h: 1,
    maxAmount24h: 5000,
    unusualAmount: false,
    foreignTransaction: false,
    ipMismatch: false,
    highRiskMerchant: false,
    ...o,
  };
}

test("clean transaction triggers no rules", () => {
  assert.equal(evaluateRules(tx()).length, 0);
});

test("scoreRules is 0 with no hits", () => {
  assert.equal(scoreRules([]), 0);
});

test("each rule has a positive weight", () => {
  for (const r of RULES) assert.ok(r.weight > 0);
});

test("velocity rule fires above threshold", () => {
  const hits = evaluateRules(tx({ velocity1h: 4 }));
  assert.ok(hits.some((h) => h.ruleId === "velocity_1h"));
});

test("score is capped at 1", () => {
  const hits = evaluateRules(
    tx({
      velocity1h: 99,
      velocity24h: 99,
      ipMismatch: true,
      highRiskMerchant: true,
      unusualAmount: true,
    })
  );
  assert.ok(scoreRules(hits) <= 1);
});
