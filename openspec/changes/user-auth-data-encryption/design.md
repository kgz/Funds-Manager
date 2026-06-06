## Auth model

- **Sessions**: Actix session cookie (`HttpOnly`, `SameSite=Lax`, `Secure` in production)
- **Passwords**: Argon2id hashes in `users.password_hash`; never log or return passwords
- **Bootstrap**: first `POST /api/register` allowed only when no users exist; thereafter registration disabled or admin-only (config flag)
- **Guards**: middleware on `/api/*` except `/api/login`, `/api/register`, `/api/openapi.json`

## Encryption model

- **Algorithm**: AES-256-GCM with random 12-byte nonce per value; stored as `base64(nonce || ciphertext || tag)` in `TEXT` columns
- **Key**: 32-byte key from `DATA_ENCRYPTION_KEY` (base64 or hex in env); app refuses to start in production without it
- **Fields encrypted at rest**:
  - `transaction_data.description`
  - `transaction_data.notes` (when `transaction-notes` lands)
  - Statement PDF binary or path reference (TBD in apply — prefer encrypting stored file bytes)
- **Not encrypted**: amounts, dates, category IDs, category names (needed for aggregation queries)

## Frontend

- `/login` public; all other routes redirect when session missing
- `fetch` / axios: `credentials: 'include'` for API calls
- Dev proxy must forward cookies to backend

## Migration

- Add columns or in-place replace with encrypted blobs
- Background or startup migration script encrypts existing plaintext rows once

## Security notes

- Rotate `DATA_ENCRYPTION_KEY` requires re-encryption tooling (out of scope v1; document limitation)
- Session secret separate from encryption key (`SESSION_SECRET`)
