# ADR 003: Calendar Date Storage for `occurred_on`

## Context
In financial tracking, an expense occurs on a specific calendar day from the user's human perspective within their local jurisdiction. For example, in Amman, Jordan (`Asia/Amman`, UTC+3), an expense recorded at 23:30 on October 31st belongs in October's budget.
If stored as a UTC timestamp (`2026-10-31T20:30:00Z`), simple date queries without careful timezone conversion or queries made across systems risk categorizing the expense into the wrong month or day.

## Decision
We store `occurred_on` strictly as a calendar `DATE` (`YYYY-MM-DD`) in the workspace's designated timezone (`Asia/Amman` by default):
- Reports query date intervals as simple strings:
  ```sql
  occurred_on >= '2026-10-01' AND occurred_on < '2026-11-01'
  ```
- Validation checks ensure that incoming transactions cannot have an `occurred_on` date more than 1 calendar day in the future in the workspace's timezone.

## Consequences
- Month and day boundary queries are simple, fast range queries without SQL runtime timezone conversions.
- An expense recorded late at night never slips into an adjacent month.
