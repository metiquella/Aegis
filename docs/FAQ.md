# FAQ

**Does the agent store card data?**
No. It only processes masked identifiers (e.g. cardLast4) and non-sensitive
signals.

**How are thresholds chosen?**
Defaults live in src/agent.ts; override via agent.config.json (AGENT_CONFIG).
The block threshold adapts to hold the false-positive rate near targetFpr.

**Can I add my own fraud rules?**
Yes, add a Rule to RULES in src/rules.ts and a test in tests/.
