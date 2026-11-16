# Threat Model

In scope:
- Card testing (round/small amounts, high velocity)
- Account takeover signals (impossible travel, IP mismatch)
- Cross-border high-value fraud

Out of scope:
- Storage of sensitive authentication data
- Chargeback representment

Mitigations:
- Explainable rules with severity weighting
- Adaptive thresholds to control false positives
- Fail-open on scorer error to preserve availability
