# Decision Semantics

score >= blockThreshold  -> block  (decline)
score >= reviewThreshold -> review (approve, flag)
otherwise                -> allow  (proceed)

Scoring:
effective = weight * severityMultiplier(severity)
score = min(1, 0.6*max(effective) + 0.4*min(1, sum(effective)))
