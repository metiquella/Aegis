# Architecture

The Fraud Detection Agent is a small, dependency-free pipeline that scores payment
transactions in real time.

## Components

```
Transaction ──▶ Rule Engine ──▶ Score Aggregator ──▶ Decision ──▶ Payment System
                     │                                     │
                     └──────────────┬──────────────────────┘
                                    ▼
                            Adaptive Threshold
```

- **`types.ts`** — data contracts: `Transaction`, `ScoredTransaction`,
  `Decision`, `RuleHit`, `AgentMetrics`.
- **`rules.ts`** — the rule library. Each `Rule` inspects a transaction and emits
  a `RuleHit` with a severity and weight. `scoreRules` aggregates hits into a
  bounded score in `[0, 1]`.
- **`agent.ts`** — `FraudAgent`. Scores transactions, maps scores to
  `block`/`review`/`allow` decisions, tracks a confusion matrix, and adapts the
  block threshold to hold the false-positive rate near a target.
- **`dataset.ts`** — deterministic synthetic data generator producing labeled
  fraud/legit transactions for offline training.
- **`train.ts`** — offline evaluation harness (precision, recall, F1, FPR).
- **`api.ts`** — dependency-free HTTP server exposing the agent to payment
  systems.
- **`cli.ts`** — command-line entry point for reports and single-transaction
  scoring.

## Scoring flow

1. `evaluateRules(tx)` returns all triggered rule hits.
2. `scoreRules(hits)` combines them: `0.6 * max(effective) + 0.4 * min(1, sum)`,
   capped at 1, where `effective = weight * severityMultiplier`.
3. `agent.decide(score)` maps the score to a decision using the current
   (possibly adapted) thresholds.

## Decision semantics

| Decision | Meaning                                             |
| -------- | --------------------------------------------------- |
| `block`  | Decline the payment immediately.                    |
| `review` | Approve but flag for the fraud team to review.       |
| `allow`  | Proceed normally.                                   |

## Extension points

- **New fraud techniques** — add a `Rule` to `RULES` in `src/rules.ts`.
- **New signals** — extend `Transaction` and populate them in the caller and
  the dataset generator.
- **Threshold policy** — tune `AgentConfig` in `src/agent.ts`.