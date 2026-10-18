# ADR 002: Stable Cursor-Based Pagination

## Context
Standard offset pagination (`?page=2&pageSize=50` or `LIMIT 50 OFFSET 50`) suffers from two major problems:
1. **Instability under concurrent inserts**: If new transactions are logged while a user or client navigates pages, rows shift, resulting in duplicate entries or skipped records.
2. **Performance degradation**: `OFFSET N` requires the database engine to scan and discard $N$ rows, degrading performance linearly with large datasets.

## Decision
We implement cursor-based pagination using the composite tuple `(occurred_on, id)`:
- Keys are encoded into an opaque, URL-safe base64 string.
- Database index: `CREATE INDEX idx_transactions_workspace_cursor ON transactions(workspace_id, occurred_on DESC, id DESC)`.
- Query predicate:
  ```sql
  WHERE workspace_id = :wid
    AND ((occurred_on < :cursorDate) OR (occurred_on = :cursorDate AND id < :cursorId))
  ORDER BY occurred_on DESC, id DESC
  LIMIT :limit;
  ```

## Consequences
- Paginated results are strictly deterministic and immune to concurrent record inserts.
- Queries run in $O(1)$ index lookups regardless of how deep the client paginates.
- Response payload contract: `{ "data": [...], "nextCursor": "..." | null }`.
