/**
 * Synthetic transaction dataset generator.
 *
 * Produces labeled historical transactions (fraud vs legit) for training and
 * evaluation. The generator models common fraud signatures: velocity bursts,
 * impossible travel (IP mismatch), high-risk merchants, round-amount testing,
 * and night-time activity. Legit transactions are drawn from a realistic
 * baseline distribution.
 *
 * A fixed PRNG seed keeps the dataset deterministic for reproducible tests.
 */

import type { Transaction } from "./types.ts";

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HIGH_RISK_MCCS = new Set(["7995", "5967", "5051", "7273"]); // gambling, misc, etc.
const COUNTRIES = ["US", "GB", "DE", "FR", "CA", "AU", "IN", "BR", "NG", "RU"];
const CURRENCIES = ["USD", "GBP", "EUR", "CAD", "AUD", "INR", "BRL"];

interface GenOptions {
  count: number;
  fraudRate: number; // fraction of transactions that are fraud
  seed: number;
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function randInt(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function makeBase(rand: () => number, id: string): Transaction {
  const cardCountry = pick(rand, COUNTRIES);
  const amount = randInt(rand, 500, 50000); // in minor units
  const hourOfDay = randInt(rand, 0, 23);
  return {
    id,
    timestamp: new Date(
      Date.UTC(2026, 0, 1, hourOfDay, randInt(rand, 0, 59), randInt(rand, 0, 59))
    ).toISOString(),
    currency: pick(rand, CURRENCIES),
    amount,
    cardLast4: String(randInt(rand, 0, 9999)).padStart(4, "0"),
    cardCountry,
    ip: `10.0.${randInt(rand, 0, 255)}.${randInt(rand, 0, 255)}`,
    ipCountry: cardCountry,
    mcc: pick(rand, ["5411", "5812", "5732", "5999", "4121"]),
    merchantId: `M${randInt(rand, 1000, 9999)}`,
    billingCountry: cardCountry,
    hourOfDay,
    velocity24h: randInt(rand, 1, 5),
    velocity1h: randInt(rand, 1, 2),
    maxAmount24h: amount + randInt(rand, 0, 20000),
    unusualAmount: false,
    foreignTransaction: false,
    ipMismatch: false,
    highRiskMerchant: false,
  };
}

function makeFraud(rand: () => number, id: string): Transaction {
  const tx = makeBase(rand, id);
  const profile = randInt(rand, 0, 4);
  switch (profile) {
    case 0: // velocity burst
      tx.velocity1h = randInt(rand, 4, 9);
      tx.velocity24h = randInt(rand, 10, 25);
      break;
    case 1: // impossible travel
      tx.ipCountry = pick(rand, COUNTRIES.filter((c) => c !== tx.cardCountry));
      tx.ipMismatch = true;
      tx.foreignTransaction = rand() > 0.5;
      break;
    case 2: // high-risk merchant + round amount testing
      tx.mcc = pick(rand, [...HIGH_RISK_MCCS]);
      tx.highRiskMerchant = true;
      tx.amount = pick(rand, [500, 1000, 2500, 5000]) * 100; // round amounts
      tx.unusualAmount = true;
      break;
    case 3: // large unusual amount at night
      tx.amount = randInt(rand, 100000, 500000);
      tx.maxAmount24h = randInt(rand, 5000, 30000);
      tx.unusualAmount = true;
      tx.hourOfDay = randInt(rand, 2, 4);
      break;
    default: // combined signals
      tx.velocity1h = randInt(rand, 4, 7);
      tx.highRiskMerchant = true;
      tx.mcc = pick(rand, [...HIGH_RISK_MCCS]);
      tx.ipMismatch = true;
      tx.ipCountry = pick(rand, COUNTRIES.filter((c) => c !== tx.cardCountry));
      break;
  }
  tx.label = "fraud";
  return tx;
}

export function generateDataset(opts: GenOptions): Transaction[] {
  const rand = mulberry32(opts.seed);
  const nFraud = Math.round(opts.count * opts.fraudRate);
  const nLegit = opts.count - nFraud;
  const out: Transaction[] = [];

  for (let i = 0; i < nLegit; i++) {
    const tx = makeBase(rand, `L${i}`);
    tx.label = "legit";
    out.push(tx);
  }
  for (let i = 0; i < nFraud; i++) {
    out.push(makeFraud(rand, `F${i}`));
  }

  // Shuffle deterministically.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const DEFAULT_DATASET_OPTIONS: GenOptions = {
  count: 2000,
  fraudRate: 0.08,
  seed: 42,
};