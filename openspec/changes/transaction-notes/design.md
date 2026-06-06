## Data model

- Column: `transaction_data.notes` — `TEXT NULL`
- Empty string from API normalizes to `null`

## API

```
PATCH /api/transactions/{id}/notes
Body: { "notes": string | null }
Response: updated Transaction JSON
```

Mirror `PATCH /api/transactions/{id}/category` error handling (404 if missing/deleted).

## Frontend

- Extend `Transaction` type with `notes: string | null`
- Thunk `patchTransactionNotes` → PATCH → `getAllTransactions({ force: true })`
- Table column: text input, placeholder "Add note…", disabled while saving
- Save on blur; trim whitespace; empty clears note

## Migration

Diesel embedded migration in `database/migrations/`.
