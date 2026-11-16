# Contributing

Thanks for your interest in the Fraud Detection Agent.

## Getting started

```bash
# run the tests
node --experimental-strip-types --test tests/*.test.ts

# run the training/evaluation report
node --experimental-strip-types src/cli.ts
```

## Guidelines

- Keep rules small, explainable, and independently tunable. Add new fraud
  techniques as new entries in `RULES` (`src/rules.ts`) with a clear
  `description` and `severity`.
- Add or update tests in `tests/` for any behavioral change.
- Do not commit secrets, tokens, or real cardholder data. Use the synthetic
  dataset generator or fully-masked fixtures.
- Open a pull request against `main` with a focused, descriptive title.

## Commit messages

Use conventional prefixes: `feat:`, `fix:`, `docs:`, `test:`, `build:`,
`chore:`.