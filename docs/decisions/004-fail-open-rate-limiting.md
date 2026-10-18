# ADR 004: Redis Rate Limiting Failure Policy

## Context
Rate limiting protects the API against abusive traffic, denial of service, and credential brute-force attacks. In multi-instance deployments, counters must be shared in Redis. If Redis encounters downtime or network partitions, the application must decide whether to fail open (allow requests) or fail closed (block requests).

## Decision
We enforce a split failure policy based on route sensitivity:
1. **Standard & Read Endpoints (`/v1/workspaces/*`, `/health/*`, `/docs`)**:
   - **Fail Open**: Prioritizes application availability. Legitimate users can continue viewing expenses, reports, and budgets even during Redis maintenance.
2. **Authentication Endpoints (`/v1/auth/*`)**:
   - **Fail Closed / Local Fallback**: Reverts to per-process in-memory counters (20 requests/minute per client IP) to guarantee brute-force protection against credential stuffing.

## Consequences
- Maximizes business continuity for core user workflows during infrastructure degradation.
- Prevents credential stuffing vulnerabilities during Redis outages.
