/**
 * Command-line demo for the Fraud Detection Agent.
 *
 * Usage:
 *   node --experimental-strip-types src/cli.ts            # run training report
 *   node --experimental-strip-types src/cli.ts score '<json>'   # score one tx
 */

import { FraudAgent } from "./agent.ts";
import { runTraining, formatReport } from "./train.ts";
import type { Transaction } from "./types.ts";

function scoreOne(json: string) {
  const tx = JSON.parse(json) as Transaction;
  const agent = new FraudAgent();
  const result = agent.score(tx);
  console.log(JSON.stringify(result, null, 2));
  console.log(`\nDecision: ${result.decision.toUpperCase()} (score=${result.score.toFixed(3)})`);
  if (result.ruleHits.length) {
    console.log("Triggered rules:");
    for (const hit of result.ruleHits) {
      console.log(`  - [${hit.severity}] ${hit.ruleId}: ${hit.description}`);
    }
  }
}

function main() {
  const arg = process.argv[2];
  if (arg === "score") {
    const json = process.argv.slice(3).join(" ");
    if (!json) {
      console.error("Usage: cli.ts score '<transaction-json>'");
      process.exit(1);
    }
    scoreOne(json);
    return;
  }

  console.log("Running fraud detection agent training/evaluation...\n");
  const { report } = runTraining();
  console.log(formatReport(report));
}

main();