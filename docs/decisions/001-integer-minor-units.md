# ADR 001: Integer Minor Units for Monetary Values

## Context
Floating-point arithmetic (`IEEE 754`) cannot represent decimal fractions like `0.1` or `0.01` with infinite precision, leading to cumulative rounding drift in financial calculations. In financial APIs, even a single fils drift invalidates accounting books.

## Decision
We store all monetary amounts as 64-bit integer minor units (`amount_minor BIGINT` in PostgreSQL, `bigint` in JavaScript/TypeScript). Each supported currency is assigned a deterministic exponent:
- `JOD`: Exponent `3` (1 JOD = 1,000 fils)
- `KWD`, `BHD`, `OMR`: Exponent `3`
- `USD`, `EUR`, `GBP`, `SAR`, `AED`: Exponent `2`
- `JPY`: Exponent `0`

When dividing or distributing funds (e.g., across 12 monthly budgets), any mathematical remainder is distributed one minor unit at a time to the earliest partitions, ensuring:
$$\sum \text{parts} \equiv \text{total}$$

Input decimal strings that exceed the currency's defined decimal exponent are rejected immediately with HTTP 422 `INVALID_AMOUNT_PRECISION` rather than silently truncated or rounded.

## Consequences
- Guaranteed zero rounding drift across millions of transactions.
- Strict rejection of invalid fractional inputs.
- Clean separation between storage/arithmetic (integer minor units) and display presentation (`amountFormatted`).
