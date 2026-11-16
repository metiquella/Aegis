import { test } from "node:test";
import assert from "node:assert/strict";
import { generateDataset, DEFAULT_DATASET_OPTIONS } from "../src/dataset.ts";

test("dataset is deterministic for a fixed seed", () => {
  const a = generateDataset({ ...DEFAULT_DATASET_OPTIONS, seed: 123 });
  const b = generateDataset({ ...DEFAULT_DATASET_OPTIONS, seed: 123 });
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    assert.deepEqual(a[i], b[i], `row ${i} differs`);
  }
});

test("different seeds produce different datasets", () => {
  const a = generateDataset({ ...DEFAULT_DATASET_OPTIONS, seed: 1, count: 50 });
  const b = generateDataset({ ...DEFAULT_DATASET_OPTIONS, seed: 2, count: 50 });
  assert.notDeepEqual(a, b);
});

test("every generated transaction is labeled", () => {
  const data = generateDataset({ ...DEFAULT_DATASET_OPTIONS, count: 100, seed: 5 });
  for (const tx of data) {
    assert.ok(tx.label === "fraud" || tx.label === "legit");
  }
});

test("fraud cases carry at least one risk signal", () => {
  const data = generateDataset({ ...DEFAULT_DATASET_OPTIONS, count: 500, seed: 9 });
  const fraud = data.filter((t) => t.label === "fraud");
  for (const tx of fraud) {
    const risky =
      tx.velocity1h > 3 ||
      tx.velocity24h > 8 ||
      tx.ipMismatch ||
      tx.highRiskMerchant ||
      tx.unusualAmount ||
      tx.amount > tx.maxAmount24h * 2;
    assert.ok(risky, `fraud tx ${tx.id} has no risk signal`);
  }
});