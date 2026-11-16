# Performance

- Scoring is O(rules) per transaction; the rule set is small and fixed.
- The agent keeps only rolling counters, so memory is constant.
- The HTTP server is single-process; scale horizontally behind a load balancer.
- For high throughput, use POST /score/batch to amortize request overhead.
