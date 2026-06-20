## Approach

Reuse the same “latest balance per account” logic as dashboard analytics: for each `financial_account_id`, take the most recent non-deleted `transaction_data` row (by `transaction_date`, then `id`) on a non-deleted statement.

## API

Extend `FinancialAccountWithStats`:

```json
{
  "lastKnownBalance": 7177.86,
  "lastKnownBalanceDate": "2026-06-20"
}
```

Both fields are `null` when no transactions exist for the account.

Values in dollars (consistent with other analytics endpoints). Date is the transaction’s calendar day in UTC/`YYYY-MM-DD`.

## Query strategy

Single list query with a lateral subquery or grouped join — avoid N+1 per account in `all_active_with_stats()`.

## Frontend

Add columns after **Statements**:

| Last balance | As at |
|--------------|-------|
| `$7,177.86`  | `20 Jun 2026` |

Use existing dashboard currency formatting. Empty cell: em dash with accessible “No transactions yet” hint.

## Out of scope

- Manual balance overrides
- Balance history on this page
