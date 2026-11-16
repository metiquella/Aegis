# Testing

Run the full suite:

    node --experimental-strip-types --test tests/*.test.ts

Coverage areas:
- rules and scoring (tests/rules.test.ts)
- decisions and thresholds (tests/agent.test.ts, tests/decision.test.ts)
- dataset generation (tests/dataset.test.ts)
- HTTP API (tests/api.test.ts)
- version constants (tests/version.test.ts)
