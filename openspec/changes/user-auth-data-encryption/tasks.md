## 1. Database

- [ ] 1.1 Migration: `users` table (email unique, password_hash, created_at)
- [ ] 1.2 Encryption helper crate/module (AES-256-GCM encrypt/decrypt)
- [ ] 1.3 Wire decrypt on read / encrypt on write for `transaction_data.description`

## 2. API — auth

- [ ] 2.1 `POST /api/register` (first-user-only bootstrap)
- [ ] 2.2 `POST /api/login`, `POST /api/logout`, `GET /api/me`
- [ ] 2.3 Session middleware + auth guard on protected `/api/*` routes
- [ ] 2.4 OpenAPI entries for auth routes

## 3. API — encryption

- [ ] 3.1 Require `DATA_ENCRYPTION_KEY` in production
- [ ] 3.2 Encrypt statement PDF storage (or encrypted column for file path + encrypted blob store)
- [ ] 3.3 One-time migration to encrypt existing transaction descriptions

## 4. Frontend

- [ ] 4.1 Login page (`/login`) with email + password
- [ ] 4.2 Auth slice / session check on app load (`GET /api/me`)
- [ ] 4.3 Route guard: redirect unauthenticated users to `/login`
- [ ] 4.4 API client sends credentials on all requests

## 5. Verification

- [ ] 5.1 Integration tests: register, login, protected route 401 without session
- [ ] 5.2 Verify encrypted values are not plaintext in MySQL
