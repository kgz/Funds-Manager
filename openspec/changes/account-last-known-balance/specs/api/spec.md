## ADDED Requirements

### Requirement: Accounts list includes last known balance

`GET /api/accounts?with_stats=true` SHALL return, for each account, `lastKnownBalance` (number | null, dollars) and `lastKnownBalanceDate` (string | null, ISO `YYYY-MM-DD`).

The balance SHALL be the `balance` field (converted to dollars) from the latest non-deleted transaction on a non-deleted statement linked to that account, ordered by `transaction_date` descending then transaction id descending.

When no such transaction exists, both fields SHALL be `null`.
