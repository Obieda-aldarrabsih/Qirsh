# Rate Limiting & Abuse Prevention Guide

To prevent denial-of-service, brute force attacks, and ensure fair resource sharing, Qirsh implements multi-tier rate limiting backed by Redis.

## Rate Limits by Tier

| Caller Type | Matching Criteria | Limit Window | Allowed Requests |
| :--- | :--- | :--- | :--- |
| **Authentication Routes** | Client IP (`/v1/auth/*`) | 1 minute | **20 requests** |
| **Scoped API Keys** | API Key ID (`qirsh_live_*`) | 1 minute | **60 requests** |
| **Authenticated Users** | User ID (JWT token) | 1 minute | **300 requests** |
| **Unauthenticated / Other** | Client IP | 1 minute | **100 requests** |

## HTTP Response Headers
Every API response includes rate limit telemetry headers:
```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 298
X-RateLimit-Reset: 1729219200
```

When a client exceeds their allowance, Qirsh answers with HTTP 429 Too Many Requests and includes a `Retry-After` header indicating the number of seconds to wait:
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 42

{
  "type": "https://qirsh.dev/docs/errors/rate-limit-exceeded",
  "title": "Too Many Requests",
  "status": 429,
  "code": "RATE_LIMIT_EXCEEDED",
  "detail": "Rate limit exceeded. Please back off before retrying.",
  "instance": "req_01J9..."
}
```
