# Cursor-Based Pagination Guide

`GET /v1/workspaces/:wid/transactions` uses cursor-based pagination to ensure stable reading under continuous inserts and high concurrency.

## Parameters
- `limit`: Integer between `1` and `100` (default: `50`).
- `cursor`: Opaque, URL-safe base64 string provided by the server in previous responses.

## Example Request
```bash
# Page 1
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/v1/workspaces/$WID/transactions?limit=2"
```

Response:
```json
{
  "data": [
    {
      "id": "18f9d02e-...",
      "occurred_on": "2026-10-18",
      "amountMinor": "15250",
      "amountFormatted": "15.250",
      "currency": "JOD"
    },
    {
      "id": "9b2c8a14-...",
      "occurred_on": "2026-10-17",
      "amountMinor": "8000",
      "amountFormatted": "8.000",
      "currency": "JOD"
    }
  ],
  "nextCursor": "eyJvY2N1cnJlZE9uIjoiMjAyNi0xMC0xNyIsImlkIjoiOWIyYzhhMTQtLi4uIn0"
}
```

## Requesting the Next Page
Supply the `nextCursor` value in the `cursor` query parameter:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/v1/workspaces/$WID/transactions?limit=2&cursor=eyJvY2N1cnJlZE9uIjoiMjAyNi0xMC0xNyIsImlkIjoiOWIyYzhhMTQtLi4uIn0"
```

When there are no further records, `nextCursor` is `null`.
