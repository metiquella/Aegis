/**
 * Rule engine.
 *
 * Each rule inspects a transaction and emits zero or more `RuleHit`s with a
 * severity and weight. The rule engine aggregates hits into a raw risk score
 * in [0, 1]. Rules are intentionally simple, explainable, and independently
 * tunable so the agent can adapt to new fraud techniques by adding rules.
 */

import type { RuleHit, RuleSeverity, Transaction } from "./types.ts";

export interface Rule {
  id: string;
  severity: RuleSeverity;
  weight: number;
  description: string;
  evaluate(tx: Transaction): boolean;
}

const SEVERITY_WEIGHT: Record<RuleSeverity, number> = {
  low: 0.25,
  medium: 0.5,
  high: 0.75,
  critical: 1.0,
};

export function severityMultiplier(severity: RuleSeverity): number {
  return SEVERITY_WEIGHT[severity];
}

export const RULES: Rule[] = [
  {
    id: "high_amount",
    severity: "high",
    weight: 0.6,
    description: "Amount exceeds the card's 24h maximum by a wide margin.",
    evaluate: (tx) => tx.amount > tx.maxAmount24h * 2 && tx.maxAmount24h > 0,
  },
  {
    id: "velocity_1h",
    severity: "critical",
    weight: 1.0,
    description: "More than 3 transactions within one hour on the same card.",
    evaluate: (tx) => tx.velocity1h > 3,
  },
  {
    id: "velocity_24h",
    severity: "high",
    weight: 0.7,
    description: "More than 8 transactions within 24 hours on the same card.",
    evaluate: (tx) => tx.velocity24h > 8,
  },
  {
    id: "foreign_transaction",
    severity: "medium",
    weight: 0.4,
    description: "Card country differs from billing country.",
    evaluate: (tx) => tx.foreignTransaction,
  },
  {
    id: "ip_mismatch",
    severity: "high",
    weight: 0.6,
    description: "IP country does not match card country.",
    evaluate: (tx) => tx.ipMismatch,
  },
  {
    id: "high_risk_merchant",
    severity: "high",
    weight: 0.6,
    description: "Transaction with a merchant on the fraud watchlist.",
    evaluate: (tx) => tx.highRiskMerchant,
  },
  {
    id: "unusual_amount",
    severity: "medium",
    weight: 0.4,
    description: "Amount flagged as unusual for this card's profile.",
    evaluate: (tx) => tx.unusualAmount,
  },
  {
    id: "night_hours",
    severity: "low",
    weight: 0.2,
    description: "Authorization between 02:00-05:00 UTC (common fraud window).",
    evaluate: (tx) => tx.hourOfDay >= 2 && tx.hourOfDay < 5,
  },
  {
    id: "round_amount",
    severity: "low",
    weight: 0.15,
    description: "Round amount typical of amount-testing attacks.",
    evaluate: (tx) =>
      tx.amount > 0 && (tx.amount % 1000 === 0 || tx.amount % 500 === 0),
  },
  {
    id: "cross_border_high_amount",
    severity: "high",
    weight: 0.55,
    description: "Large amount on a cross-border transaction.",
    evaluate: (tx) =>
      tx.foreignTransaction && tx.amount > tx.maxAmount24h && tx.maxAmount24h > 0,
  },
];

export function evaluateRules(tx: Transaction): RuleHit[] {
  const hits: RuleHit[] = [];
  for (const rule of RULES) {
    if (rule.evaluate(tx)) {
      hits.push({
        ruleId: rule.id,
        severity: rule.severity,
        weight: rule.weight,
        description: rule.description,
      });
    }
  }
  return hits;
}

/**
 * Aggregate rule hits into a raw risk score in [0, 1].
 *
 * The score is a weighted combination of the highest-severity hit and the
 * cumulative weight of all hits, capped at 1. This keeps the score bounded
 * and monotonic in the number/weight of triggered rules.
 */
export function scoreRules(hits: RuleHit[]): number {
  if (hits.length === 0) return 0;

  let maxWeight = 0;
  let cumulative = 0;
  for (const hit of hits) {
    const effective = hit.weight * severityMultiplier(hit.severity);
    if (effective > maxWeight) maxWeight = effective;
    cumulative += effective;
  }

  const combined = 0.6 * maxWeight + 0.4 * Math.min(1, cumulative);
  return Math.min(1, combined);
}