# RFC 7807 / RFC 9457 Problem Details Guide

Qirsh formats all HTTP 4xx and 5xx errors using the standard **RFC 9457 Problem Details for HTTP APIs** specification with `Content-Type: application/problem+json`.

## Error Structure
```json
{
  "type": "https://qirsh.dev/docs/errors/currency-mismatch",
  "title": "Currency does not match workspace",
  "status": 422,
  "code": "CURRENCY_MISMATCH",
  "detail": "Workspace uses JOD; got USD.",
  "instance": "req_01J9...",
  "errors": [
    {
      "path": "currency",
      "message": "Expected JOD"
    }
  ]
}
```

## Standard Error Codes

| Code | HTTP Status | Description | Recommended Client Action |
| :--- | :--- | :--- | :--- |
| `VALIDATION_ERROR` | 400 | Request body, query, or path failed schema validation | Inspect `errors[]` array for specific fields |
| `UNAUTHORIZED` | 401 | Missing, malformed, or expired access token | Re-authenticate via `/v1/auth/login` or `/v1/auth/refresh` |
| `TOKEN_FAMILY_REVOKED` | 401 | Refresh token reuse detected (potential replay attack) | Prompt user to log in again |
| `FORBIDDEN` | 403 | Role or API key lacks required permission | Check workspace role or API key scopes |
| `WORKSPACE_NOT_FOUND` | 404 | Workspace does not exist or caller is not a member | Check workspace ID |
| `PRECONDITION_FAILED` | 412 | Resource version mismatch (`If-Match` ETag check failed) | Refetch latest state and merge user updates |
| `CURRENCY_MISMATCH` | 422 | Transaction currency differs from workspace currency | Convert or supply workspace currency |
| `INVALID_AMOUNT_PRECISION` | 422 | Decimal fraction exceeds currency exponent | Check decimal places for currency |
| `DATE_TOO_FAR_IN_FUTURE` | 422 | `occurredOn` date is more than 1 day in the future | Fix calendar date |
| `IDEMPOTENCY_KEY_REUSED` | 422 | Same idempotency key used with different request body | Generate new UUID idempotency key |
| `RATE_LIMIT_EXCEEDED` | 429 | Request rate exceeded allowed limits | Back off according to `Retry-After` header |
