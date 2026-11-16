# API Reference

Base URL (default): `http://localhost:8080`

All request and response bodies are JSON.

## `GET /health`

Liveness probe.

**200**
```json
{ "status": "ok" }
```

## `GET /version`

Returns the agent name and version.

**200**
```json
{ "name": "fraud-detection-agent", "version": "1.0.0" }
```

## `POST /score`

Score a single transaction.

**Request**
```json
{ "id": "txn_1", "amount": 1234, "velocity1h": 1, "cardCountry": "US", "...": "..." }
```

**200**
```json
{
  "id": "txn_1",
  "score": 0.0,
  "decision": "allow",
  "ruleHits": [],
  "threshold": 0.7
}
```

Returns **400** for invalid JSON or a body missing `id` / numeric `amount`.

## `POST /score/batch`

Score multiple transactions in one request. The body may be an array of
transactions or an object with a `transactions` array.

**200**
```json
{ "count": 2, "results": [ { "decision": "allow" }, { "decision": "block" } ] }
```

Invalid entries appear as `{ "error": "...", "tx": {...} }` within `results`.

## `GET /metrics`

Returns rolling counters and the current adaptive thresholds.

**200**
```json
{
  "evaluated": 10,
  "blocked": 2,
  "flagged": 1,
  "allowed": 7,
  "truePositives": 0,
  "falsePositives": 0,
  "trueNegatives": 0,
  "falseNegatives": 0,
  "blockThreshold": 0.7,
  "reviewThreshold": 0.4,
  "falsePositiveRate": 0
}
```

## `POST /reset`

Reset the running counters (thresholds are preserved).

**200**
```json
{ "status": "reset" }
```

## `GET /` and unknown paths

Returns **404** with `{ "error": "not found" }`.