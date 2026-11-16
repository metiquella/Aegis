/**
 * Training / calibration & evaluation harness.
 *
 * Runs the agent over a labeled historical dataset to:
 *   - measure precision/recall/F1 and false-positive rate
 *   - feed labels back into the agent so thresholds adapt
 *   - report the final calibrated thresholds
 *
 * This is the offline counterpart to the real-time API: it lets you tune the
 * agent against known fraud before deploying it in front of live payments.
 */

import { FraudAgent, type AgentConfig } from "./agent.ts";
import { generateDataset, DEFAULT_DATASET_OPTIONS } from "./dataset.ts";
import type { Decision, Transaction } from "./types.ts";

export interface EvaluationReport {
  total: number;
  fraudCount: number;
  precision: number;
  recall: number;
  f1: number;
  falsePositiveRate: number;
  blockThreshold: number;
  reviewThreshold: number;
  confusion: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
  };
}

export function evaluate(
  agent: FraudAgent,
  transactions: Transaction[]
): EvaluationReport {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const tx of transactions) {
    const scored = agent.score(tx);
    const predictedFraud = scored.decision === "block";
    const actualFraud = tx.label === "fraud";

    if (predictedFraud && actualFraud) tp++;
    else if (predictedFraud && !actualFraud) fp++;
    else if (!predictedFraud && actualFraud) fn++;
    else tn++;

    agent.recordLabel(scored.decision as Decision, tx.label!);
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
  const cfg = agent.getConfig();

  return {
    total: transactions.length,
    fraudCount: tp + fn,
    precision,
    recall,
    f1,
    falsePositiveRate: fpr,
    blockThreshold: cfg.blockThreshold,
    reviewThreshold: cfg.reviewThreshold,
    confusion: { tp, fp, tn, fn },
  };
}

export function runTraining(
  config: Partial<AgentConfig> = {},
  datasetOptions = DEFAULT_DATASET_OPTIONS
): { agent: FraudAgent; report: EvaluationReport } {
  const dataset = generateDataset(datasetOptions);
  const agent = new FraudAgent(config);
  const report = evaluate(agent, dataset);
  return { agent, report };
}

export function formatReport(report: EvaluationReport): string {
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
  const { confusion: c } = report;
  return [
    `Transactions evaluated : ${report.total}`,
    `Fraud cases            : ${report.fraudCount}`,
    ``,
    `Precision              : ${pct(report.precision)}`,
    `Recall                 : ${pct(report.recall)}`,
    `F1 score               : ${pct(report.f1)}`,
    `False-positive rate    : ${pct(report.falsePositiveRate)}`,
    ``,
    `Confusion matrix`,
    `  True positives  (blocked fraud)      : ${c.tp}`,
    `  False positives (blocked legit)      : ${c.fp}`,
    `  True negatives  (allowed legit)      : ${c.tn}`,
    `  False negatives (allowed fraud)      : ${c.fn}`,
    ``,
    `Calibrated thresholds  : block=${report.blockThreshold.toFixed(2)} review=${report.reviewThreshold.toFixed(2)}`,
  ].join("\n");
}