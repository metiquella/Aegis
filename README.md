# Fraud Detection Agent

A real-time fraud detection agent that scores payment transactions, decides to
**block**, **flag for review**, or **allow** each one, and adapts its thresholds
over time to keep false positives under control.

Built with **zero external dependencies** on Node.js (v22+). Run TypeScript
directly with the built-in `--experimental-strip-types` flag.

## What it does

- **Real-time scoring** — evaluates a transaction against a library of
  explainable rules (velocity bursts, impossible travel, high-risk merchants,
  round-amount testing, night-time activity, unusual amounts) and produces a
  risk score in `[0, 1]`.
- **Three-way decision** — `block` (high risk), `review` (medium risk, allow but
  flag for the fraud team), `allow` (low risk).
- **Adaptive thresholds** — after enough labeled outcomes, the block threshold
  drifts to hold the false-positive rate near a target, so it stays effective as
  customer behavior and fraud patterns change.
- **Historical training + evaluation** — generates a labeled dataset of known
  fraud and legit transactions and reports precision / recall / F1 / FPR.
- **HTTP API** — a dependency-free server your payment system can call.

## Layout

```
src/
  types.ts    # Transaction, ScoredTransaction, Decision, metrics types
  rules.ts    # rule library + score aggregation
  agent.ts    # FraudAgent: scoring, decisions, adaptive thresholds
  dataset.ts  # deterministic labeled dataset generator
  train.ts    # offline evaluation / calibration harness
  api.ts      # HTTP server (POST /score, GET /metrics, ...)
  cli.ts      # CLI: run training report or score one transaction
tests/
  agent.test.ts
examples/
  suspicious-transaction.json
```

## Quick start

```bash
# Run the training/evaluation report
node --experimental-strip-types src/cli.ts

# Score a single transaction
node --experimental-strip-types src/cli.ts score "$(cat examples/suspicious-transaction.json)"

# Start the real-time API (default port 8080, override with PORT)
node --experimental-strip-types src/api.ts

# Run tests
node --experimental-strip-types --test tests/*.test.ts
```

## API

| Method | Path        | Description                                   |
| ------ | ----------- | --------------------------------------------- |
| POST   | `/score`    | Score one transaction, return decision + rules |
| POST   | `/score/batch` | Score multiple transactions in one request |
| GET    | `/metrics`  | Rolling metrics and current thresholds         |
| POST   | `/reset`    | Reset running counters                         |
| GET    | `/health`   | Liveness probe                                 |

Set `LOG_REQUESTS=1` to log per-request method, path, status, and latency.

Example:

```bash
curl -s -X POST http://localhost:8080/score \
  -H 'Content-Type: application/json' \
  -d @examples/suspicious-transaction.json
```

Response includes the `score`, `decision`, the `ruleHits` that fired, and the
`threshold` used.

## Integrating with a payment system

1. Before authorizing a payment, POST the transaction to `/score`.
2. If `decision == "block"`, decline the payment.
3. If `decision == "review"`, approve but enqueue for manual review.
4. After settlement, feed the ground-truth label back via the training harness
   (or extend `/score` with a label-callback) so the confusion matrix and
   thresholds stay calibrated.

## How scoring works

Each rule has a `weight` and a `severity` (`low`/`medium`/`high`/`critical`).
Triggered rules are combined into a single score:

```
effective = weight * severityMultiplier
score     = 0.6 * max(effective) + 0.4 * min(1, sum(effective))   # capped at 1
```

The decision is then:

```
score >= blockThreshold  -> block
score >= reviewThreshold -> review
otherwise                -> allow
```

## Tuning

- Adjust `DEFAULT_CONFIG` in `src/agent.ts` (`blockThreshold`, `reviewThreshold`,
  `targetFpr`, `adaptationStep`, `adaptationWindow`, `minThreshold`,
  `maxThreshold`).
- Add new fraud techniques by adding a `Rule` to `RULES` in `src/rules.ts`.

## Notes

- The dataset generator is synthetic and deterministic (seeded) so results are
  reproducible. Replace it with your real historical transactions (including
  known fraud labels) for production calibration.
- No network calls are made by the agent itself; the only I/O is the optional
  HTTP server.