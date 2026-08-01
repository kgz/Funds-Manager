## Why

The app has no login screen yet. Open Design `funds-login.html` defines the warm-paper auth chrome that should ship before backend auth lands (`user-auth-data-encryption`), so the UI is ready when sessions are wired.

## What Changes

- New `/login` route outside the main app shell (no sidebar)
- Split-screen layout: dark brand panel + warm-paper sign-in card
- Email/password form with validation, password visibility toggle, remember-me row, inline banner, and submit loading state
- Form submit stubbed until auth API exists (no session or route guards in this change)

## Capabilities

### New Capabilities

- `login-page-chrome`: Visual layout and interaction states of the login page aligned with `funds-login.html`

### Modified Capabilities

## Impact

- `frontend/src/pages/login.tsx` (new)
- `frontend/src/App.tsx` — `/login` route outside `AppLayout`
- Reuses warm-paper tokens from `frontend/src/components/layout/tokens.ts`
- **GitHub**: Closes #232; stacks on warm-paper (#214)
- **Out of scope**: `POST /api/login`, sessions, route guards (`user-auth-data-encryption`); sidebar (#215); forgot-password backend
