## 1. Database

- [x] 1.1 Migration: `planned_spending` table
- [x] 1.2 Diesel model + schema registration
- [x] 1.3 Queries: list with overlap filter, total, CRUD, soft-delete

## 2. API

- [x] 2.1 `GET /api/planned-spending` with `from`/`to` + `totalCents`
- [x] 2.2 `POST /api/planned-spending`
- [x] 2.3 `PUT /api/planned-spending/{id}`
- [x] 2.4 `DELETE /api/planned-spending/{id}`
- [x] 2.5 Register routes in app
- [x] 2.6 Rust tests for overlap logic and validation

## 3. Frontend — data layer

- [x] 3.1 Types + API client functions
- [x] 3.2 Redux thunks: list, create, update, delete

## 4. Frontend — page

- [x] 4.1 `/planned` page shell (header, period filter, stat card)
- [x] 4.2 Table of planned items with category pills
- [x] 4.3 Add/Edit modal form
- [x] 4.4 Delete confirmation
- [x] 4.5 Empty and loading states
- [x] 4.6 Route + sidebar nav link

## 5. Verification

- [x] 5.1 `cargo test` in `database/` and `app/`
- [x] 5.2 `pnpm run build:embed`
- [x] 5.3 Manual QA: create, filter by period, edit, delete
