# Threshold Tuning

- blockThreshold: score at or above which a transaction is blocked.
- reviewThreshold: score at or above which a transaction is flagged.
- targetFpr: desired false-positive rate for adaptation.
- adaptationStep / adaptationWindow: how fast and after how many labels the
  block threshold moves.
- minThreshold / maxThreshold: bounds for the block threshold.

Invariant: blockThreshold stays above reviewThreshold after adaptation.

Set these in agent.config.json and point AGENT_CONFIG at it.
