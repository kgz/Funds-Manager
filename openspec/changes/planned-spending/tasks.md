## 1. Database

- [ ] 1.1 Migration: `planned_spending` table
- [ ] 1.2 Diesel model + schema registration
- [ ] 1.3 Queries: list with overlap filter, total, CRUD, soft-delete

## 2. API

- [ ] 2.1 `GET /api/planned-spending` with `from`/`to` + `totalCents`
- [ ] 2.2 `POST /api/planned-spending`
- [ ] 2.3 `PUT /api/planned-spending/{id}`
- [ ] 2.4 `DELETE /api/planned-spending/{id}`
- [ ] 2.5 Register routes in app
- [ ] 2.6 Rust tests for overlap logic and validation

## 3. Frontend — data layer

- [ ] 3.1 Types + API client functions
- [ ] 3.2 Redux thunks: list, create, update, delete

## 4. Frontend — page

- [ ] 4.1 `/planned` page shell (header, period filter, stat card)
- [ ] 4.2 Table of planned items with category pills
- [ ] 4.3 Add/Edit modal form
- [ ] 4.4 Delete confirmation
- [ ] 4.5 Empty and loading states
- [ ] 4.6 Route + sidebar nav link

## 5. Verification

- [ ] 5.1 `cargo test` in `database/` and `app/`
- [ ] 5.2 `pnpm run build:embed`
- [ ] 5.3 Manual QA: create range item, filter by month, edit, delete
