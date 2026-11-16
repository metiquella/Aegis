/**
 * Core data models for the Fraud Detection Agent.
 *
 * A transaction carries the signals the agent scores in real time.
 * Historical transactions also carry a `label` (known fraud / legit) used
 * to calibrate thresholds and evaluate the agent offline.
 */

export type Decision = "block" | "review" | "allow";

export type RuleSeverity = "low" | "medium" | "high" | "critical";

export interface Transaction {
  /** Unique transaction identifier assigned by the payment system. */
  id: string;
  /** ISO-8601 UTC timestamp of authorization. */
  timestamp: string;
  /** ISO-4211 currency code. */
  currency: string;
  /** Amount in the smallest currency unit (cents / fils / minor units). */
  amount: number;
  /** Card network token or masked PAN. */
  cardLast4: string;
  /** Cardholder country (ISO 3166-1 alpha-2). */
  cardCountry: string;
  /** IP address of the payer. */
  ip: string;
  /** IP country (resolved server-side). */
  ipCountry: string;
  /** Merchant category code. */
  mcc: string;
  /** Merchant identifier. */
  merchantId: string;
  /** 3-letter ISO currency of the billing address. */
  billingCountry: string;
  /** Hours since midnight UTC when the transaction was authorized. */
  hourOfDay: number;
  /** Number of transactions on this card in the trailing 24h window. */
  velocity24h: number;
  /** Number of transactions on this card in the trailing 1h window. */
  velocity1h: number;
  /** Amount of the largest transaction on this card in the trailing 24h. */
  maxAmount24h: number;
  /** Whether the transaction amount exceeds the card's typical range. */
  unusualAmount: boolean;
  /** Whether billing country differs from card country. */
  foreignTransaction: boolean;
  /** Whether the IP country differs from the card country. */
  ipMismatch: boolean;
  /** Whether the merchant is on the known-fraud watchlist. */
  highRiskMerchant: boolean;
  /** Optional label for historical/training data. */
  label?: "fraud" | "legit";
}

export interface RuleHit {
  ruleId: string;
  severity: RuleSeverity;
  weight: number;
  description: string;
}

export interface ScoredTransaction extends Transaction {
  score: number;
  decision: Decision;
  ruleHits: RuleHit[];
  /** Threshold used for the decision at evaluation time. */
  threshold: number;
  /** UTC timestamp the scoring completed. */
  scoredAt: string;
}

export interface AgentMetrics {
  /** Rolling window of evaluated decisions. */
  evaluated: number;
  blocked: number;
  flagged: number;
  allowed: number;
  /** Confusion-matrix-ish counters over labeled data. */
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  /** Current adaptive block threshold. */
  blockThreshold: number;
  /** Current adaptive review threshold. */
  reviewThreshold: number;
  /** Rolling false-positive rate over the last window. */
  falsePositiveRate: number;
}