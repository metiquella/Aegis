# Operations

## Monitoring
- GET /metrics for counters, false-positive rate, and thresholds.
- Alert when falsePositiveRate exceeds targetFpr for a sustained period.

## Logging
Set LOG_REQUESTS=1 to emit method, path, status, and latency per request.

## Rollouts
Deploy config changes via AGENT_CONFIG. Thresholds can be tuned without a code
deploy. Reset counters with POST /reset after a config change.
