/**
 * Fraud Detection Agent.
 *
 * Scores a transaction in real time and returns a decision:
 *   - block   : high risk, stop the payment immediately
 *   - review  : medium risk, allow but flag for human/fraud-team review
 *   - allow   : low risk, proceed
 *
 * Thresholds adapt over time based on the observed false-positive rate so
 * the agent stays effective as fraud patterns and customer behavior shift.
 */

import type {
  AgentMetrics,
  Decision,
  ScoredTransaction,
  Transaction,
} from "./types.ts";
import { evaluateRules, scoreRules } from "./rules.ts";

export interface AgentConfig {
  /** Score at or above which a transaction is blocked. */
  blockThreshold: number;
  /** Score at or above which a transaction is flagged for review. */
  reviewThreshold: number;
  /** Target false-positive rate; if exceeded, raise the block threshold. */
  targetFpr: number;
  /** Step size for threshold adaptation. */
  adaptationStep: number;
  /** Number of labeled decisions in the rolling window before adapting. */
  adaptationWindow: number;
  /** Maximum allowed block threshold. */
  maxThreshold: number;
  /** Minimum allowed block threshold. */
  minThreshold: number;
}

export const DEFAULT_CONFIG: AgentConfig = {
  blockThreshold: 0.7,
  reviewThreshold: 0.4,
  targetFpr: 0.05,
  adaptationStep: 0.02,
  adaptationWindow: 500,
  maxThreshold: 0.95,
  minThreshold: 0.3,
};

export class FraudAgent {
  private config: AgentConfig;
  private metrics: AgentMetrics;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = this.resetMetrics();
  }

  private resetMetrics(): AgentMetrics {
    return {
      evaluated: 0,
      blocked: 0,
      flagged: 0,
      allowed: 0,
      truePositives: 0,
      falsePositives: 0,
      trueNegatives: 0,
      falseNegatives: 0,
      blockThreshold: this.config.blockThreshold,
      reviewThreshold: this.config.reviewThreshold,
      falsePositiveRate: 0,
    };
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /** Score a transaction and return the enriched, decision-bearing result. */
  score(tx: Transaction): ScoredTransaction {
    const ruleHits = evaluateRules(tx);
    const rawScore = scoreRules(ruleHits);
    const decision = this.decide(rawScore);

    this.metrics.evaluated++;
    if (decision === "block") this.metrics.blocked++;
    else if (decision === "review") this.metrics.flagged++;
    else this.metrics.allowed++;

    const scored: ScoredTransaction = {
      ...tx,
      score: rawScore,
      decision,
      ruleHits,
      threshold: this.config.blockThreshold,
      scoredAt: new Date().toISOString(),
    };
    return scored;
  }

  /** Score and immediately apply the payment-system action. */
  process(tx: Transaction): ScoredTransaction {
    const scored = this.score(tx);
    return scored;
  }

  private decide(rawScore: number): Decision {
    if (rawScore >= this.config.blockThreshold) return "block";
    if (rawScore >= this.config.reviewThreshold) return "review";
    return "allow";
  }

  /**
   * Feed a labeled observation to update confusion-matrix counters and
   * adapt thresholds. Call this with ground-truth labels after settlement.
   */
  recordLabel(predicted: Decision, actual: "fraud" | "legit") {
    const blocked = predicted === "block";
    const fraudulent = actual === "fraud";

    if (blocked && fraudulent) this.metrics.truePositives++;
    else if (blocked && !fraudulent) this.metrics.falsePositives++;
    else if (!blocked && fraudulent) this.metrics.falseNegatives++;
    else this.metrics.trueNegatives++;

    // FPR is measured over blocked decisions (false alarms / all alarms).
    const alarms = this.metrics.truePositives + this.metrics.falsePositives;
    this.metrics.falsePositiveRate =
      alarms > 0 ? this.metrics.falsePositives / alarms : 0;

    this.adapt();
  }

  /**
   * Adapt thresholds when enough labeled data has accumulated and the
   * false-positive rate drifts from target. Raising the block threshold
   * reduces false positives at the cost of some fraud leakage.
   */
  private adapt() {
    const labeled =
      this.metrics.truePositives +
      this.metrics.falsePositives +
      this.metrics.trueNegatives +
      this.metrics.falseNegatives;

    if (labeled < this.config.adaptationWindow) return;

    if (this.metrics.falsePositiveRate > this.config.targetFpr) {
      this.config.blockThreshold = Math.min(
        this.config.maxThreshold,
        this.config.blockThreshold + this.config.adaptationStep
      );
    } else if (
      this.metrics.falsePositiveRate < this.config.targetFpr / 2 &&
      this.config.blockThreshold > this.config.minThreshold
    ) {
      // FPR well below target: relax slightly to catch more fraud, but never
      // let the block threshold fall to or below the review threshold.
      const floor = Math.max(
        this.config.minThreshold,
        this.config.reviewThreshold + this.config.adaptationStep
      );
      this.config.blockThreshold = Math.max(
        floor,
        this.config.blockThreshold - this.config.adaptationStep
      );
    }

    this.metrics.blockThreshold = this.config.blockThreshold;
    this.metrics.reviewThreshold = this.config.reviewThreshold;
  }

  /** Reset running counters (keeps config). */
  reset() {
    this.metrics = this.resetMetrics();
  }
}