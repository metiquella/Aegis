# Transaction Schema

Required fields:
- id (string)
- amount (number, minor units)
- timestamp (ISO-8601)

Signals used by rules:
- velocity1h, velocity24h
- maxAmount24h
- cardCountry, billingCountry, ipCountry
- foreignTransaction, ipMismatch
- highRiskMerchant, unusualAmount
- hourOfDay, mcc, merchantId

See src/types.ts for the full type.
