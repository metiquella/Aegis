import { test } from "node:test";
import assert from "node:assert/strict";
import { FraudAgent } from "../src/agent.ts";
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

test("clean transaction is allowed", () => {
  assert.equal(new FraudAgent().score(tx()).decision, "allow");
});

test("single medium signal is reviewed", () => {
  const r = new FraudAgent().score(tx({ ipMismatch: true, ipCountry: "RU" }));
  assert.equal(r.decision, "review");
});

test("velocity burst is blocked", () => {
  assert.equal(new FraudAgent().score(tx({ velocity1h: 5 })).decision, "block");
});
