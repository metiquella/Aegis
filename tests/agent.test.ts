import { test } from "node:test";
import assert from "node:assert/strict";
import { FraudAgent, DEFAULT_CONFIG } from "../src/agent.ts";
import { evaluateRules, scoreRules, RULES } from "../src/rules.ts";
import { generateDataset } from "../src/dataset.ts";
import { runTraining, evaluate } from "../src/train.ts";
import type { Transaction } from "../src/types.ts";

function baseTx(overrides: Partial<Transaction> = {}): Transaction {
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
    ...overrides,
  };
}

test("clean transaction is allowed", () => {
  const agent = new FraudAgent();
  const result = agent.score(baseTx());
  assert.equal(result.decision, "allow");
  assert.equal(result.score, 0);
});

test("velocity burst triggers block", () => {
  const agent = new FraudAgent();
  const result = agent.score(baseTx({ velocity1h: 5, velocity24h: 15 }));
  assert.equal(result.decision, "block");
  assert.ok(result.ruleHits.some((h) => h.ruleId === "velocity_1h"));
});

test("ip mismatch alone triggers review", () => {
  const agent = new FraudAgent();
  const result = agent.score(baseTx({ ipCountry: "RU", ipMismatch: true }));
  assert.ok(result.score > 0);
  assert.ok(result.ruleHits.some((h) => h.ruleId === "ip_mismatch"));
});

test("cross-border high amount triggers rule", () => {
  const agent = new FraudAgent();
  const result = agent.score(
    baseTx({
      foreignTransaction: true,
      amount: 90000,
      maxAmount24h: 10000,
    })
  );
  assert.ok(
    result.ruleHits.some((h) => h.ruleId === "cross_border_high_amount"),
    "expected cross_border_high_amount rule to fire"
  );
});

test("combined fraud signals block", () => {
  const agent = new FraudAgent();
  const result = agent.score(
    baseTx({
      velocity1h: 6,
      velocity24h: 20,
      ipMismatch: true,
      ipCountry: "RU",
      highRiskMerchant: true,
      amount: 200000,
      maxAmount24h: 10000,
      unusualAmount: true,
      hourOfDay: 3,
    })
  );
  assert.equal(result.decision, "block");
  assert.ok(result.score >= DEFAULT_CONFIG.blockThreshold);
});

test("score is bounded in [0,1]", () => {
  const agent = new FraudAgent();
  const result = agent.score(baseTx({ velocity1h: 100, velocity24h: 100 }));
  assert.ok(result.score >= 0 && result.score <= 1);
});

test("rules list is non-empty and all have weights", () => {
  assert.ok(RULES.length >= 5);
  for (const rule of RULES) {
    assert.ok(rule.weight > 0);
    assert.ok(rule.id.length > 0);
  }
});

test("dataset generation respects fraud rate", () => {
  const data = generateDataset({ count: 1000, fraudRate: 0.1, seed: 1 });
  const fraud = data.filter((t) => t.label === "fraud").length;
  assert.ok(Math.abs(fraud - 100) < 20, `expected ~100 fraud, got ${fraud}`);
});

test("training report has sane precision and recall", () => {
  const { report } = runTraining();
  assert.ok(report.precision > 0.7, `precision too low: ${report.precision}`);
  assert.ok(report.recall > 0.7, `recall too low: ${report.recall}`);
  assert.ok(report.falsePositiveRate < 0.3, `fpr too high: ${report.falsePositiveRate}`);
  assert.ok(report.total > 0);
});

test("thresholds adapt within bounds after many labels", () => {
  const agent = new FraudAgent();
  const data = generateDataset({ count: 500, fraudRate: 0.1, seed: 7 });
  evaluate(agent, data);
  const cfg = agent.getConfig();
  assert.ok(cfg.blockThreshold >= DEFAULT_CONFIG.minThreshold);
  assert.ok(cfg.blockThreshold <= DEFAULT_CONFIG.maxThreshold);
});

test("block threshold always stays above review threshold", () => {
  const agent = new FraudAgent();
  const data = generateDataset({ count: 2000, fraudRate: 0.15, seed: 11 });
  evaluate(agent, data);
  const cfg = agent.getConfig();
  assert.ok(
    cfg.blockThreshold > cfg.reviewThreshold,
    `block (${cfg.blockThreshold}) must exceed review (${cfg.reviewThreshold})`
  );
});