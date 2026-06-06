## 1. Database

- [ ] 1.1 Migration: add `notes TEXT NULL` to `transaction_data`
- [ ] 1.2 Update `schema.rs` and `Transaction` model
- [ ] 1.3 `Transaction::update_notes(id, notes)` and `notes: None` on insert

## 2. API

- [ ] 2.1 `PATCH /api/transactions/{id}/notes` handler
- [ ] 2.2 Trim/empty-string → null; return updated transaction

## 3. Frontend

- [ ] 3.1 Add `notes` to transaction type and normalizer
- [ ] 3.2 `patchTransactionNotes` thunk
- [ ] 3.3 Notes column on `/transactions` with inline edit on blur
