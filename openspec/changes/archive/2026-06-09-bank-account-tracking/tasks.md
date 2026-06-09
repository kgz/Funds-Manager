## 1. Database

- [x] 1.1 Migration: `financial_accounts` table
- [x] 1.2 Migration: `statement.financial_account_id` FK
- [x] 1.3 Model + CRUD for `FinancialAccount`
- [x] 1.4 Backfill migration from existing `statement.account_id` values

## 2. API

- [x] 2.1 `GET/POST/PUT/DELETE /api/accounts`
- [x] 2.2 Auto-create/link account on PDF import
- [x] 2.3 `?account_id=` filter on `GET /api/statements` and `GET /api/transactions`
- [x] 2.4 Include `financial_account` summary in statement/transaction JSON

## 3. Frontend — management

- [x] 3.1 Redux slice + thunks for accounts
- [x] 3.2 `/accounts` page (list, edit display name)
- [x] 3.3 Nav link to accounts

## 4. Frontend — filtering

- [x] 4.1 Account selector component (all / single account)
- [x] 4.2 Wire filter to dashboard, breakdown, transactions, statements
- [x] 4.3 Persist account filter in localStorage
- [x] 4.4 Show account name column on statements and transactions tables

## 5. Verification

- [ ] 5.1 Import two different account numbers → two financial accounts created
- [ ] 5.2 Dashboard totals change when account filter applied
