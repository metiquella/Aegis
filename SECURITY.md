# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately via GitHub Security Advisories
("Report a vulnerability" on the repo's Security tab). Do not open public issues
for security bugs.

## Handling cardholder data

This agent is designed to score transactions, not store them. Do not log or
persist full PANs, CVVs, or other sensitive authentication data. Only masked
identifiers (e.g. `cardLast4`) and non-sensitive signals should be passed to the
scoring API.

## Dependencies

This project has no runtime dependencies. Keep it that way where possible to
minimize supply-chain risk. Review any dependency before adding it.