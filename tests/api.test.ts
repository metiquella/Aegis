import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/api.ts";
import { FraudAgent } from "../src/agent.ts";
import type { AddressInfo } from "node:net";

async function withServer(fn: (base: string) => Promise<void>) {
  const agent = new FraudAgent();
  const server = createApp(agent);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  try {
    await fn(base);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

const baseTx = {
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
};

test("GET /health returns ok", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
  });
});

test("GET /version returns agent info", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/version`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.name, "fraud-detection-agent");
    assert.ok(body.version);
  });
});

test("POST /score returns a decision", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baseTx),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(["block", "review", "allow"].includes(body.decision));
    assert.equal(body.decision, "allow");
  });
});

test("POST /score rejects invalid body", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: "nope" }),
    });
    assert.equal(res.status, 400);
  });
});

test("POST /score/batch scores multiple transactions", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/score/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([baseTx, { ...baseTx, id: "T2", velocity1h: 9 }]),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.count, 2);
    assert.equal(body.results.length, 2);
  });
});