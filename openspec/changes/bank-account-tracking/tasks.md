## 1. Database

- [ ] 1.1 Migration: `financial_accounts` table
- [ ] 1.2 Migration: `statement.financial_account_id` FK
- [ ] 1.3 Model + CRUD for `FinancialAccount`
- [ ] 1.4 Backfill migration from existing `statement.account_id` values

## 2. API

- [ ] 2.1 `GET/POST/PUT/DELETE /api/accounts`
- [ ] 2.2 Auto-create/link account on PDF import
- [ ] 2.3 `?account_id=` filter on `GET /api/statements` and `GET /api/transactions`
- [ ] 2.4 Include `financial_account` summary in statement/transaction JSON

## 3. Frontend — management

- [ ] 3.1 Redux slice + thunks for accounts
- [ ] 3.2 `/accounts` page (list, edit display name)
- [ ] 3.3 Nav link to accounts

## 4. Frontend — filtering

- [ ] 4.1 Account selector component (all / single account)
- [ ] 4.2 Wire filter to dashboard, breakdown, transactions, statements
- [ ] 4.3 Persist account filter in localStorage
- [ ] 4.4 Show account name column on statements and transactions tables

## 5. Verification

- [ ] 5.1 Import two different account numbers → two financial accounts created
- [ ] 5.2 Dashboard totals change when account filter applied
