# Payment System Integration

1. Authorize: POST /score with the transaction before capturing funds.
2. Decide on the response:
   - block -> decline
   - review -> approve, enqueue for manual review
   - allow -> proceed
3. Settle: after settlement, feed the ground-truth label into the training
   harness to recalibrate thresholds.
4. Monitor: poll GET /metrics for false-positive rate and threshold drift.

Call /score with a short timeout (e.g. 100ms) and fail open (allow) on error to
avoid blocking legitimate payments.
