## 1. Open Design

- [x] 1.1 Review `funds-login.html` + `css/login.css` in Funds Manager Redesign

## 2. React port

- [x] 2.1 OpenSpec apply on `feature/232-login-od-design`
- [x] 2.2 Add `frontend/src/pages/login.tsx` — split shell, brand panel, sign-in card
- [x] 2.3 Wire form states: validation, password toggle, banner, loading, stub submit
- [x] 2.4 Add `/login` route outside `AppLayout` in `frontend/src/App.tsx`

## 3. Verify

- [x] 3.1 `pnpm run build` in `frontend/`
- [x] 3.2 Manual QA: desktop split, mobile stack, validation, password toggle, stub submit

## 4. Backend auth (e2e)

- [x] 4.1 `users` table migration + model
- [x] 4.2 `POST /api/register`, `/api/login`, `/api/logout`, `GET /api/me`
- [x] 4.3 Session middleware + API auth guard
- [x] 4.4 Frontend auth provider, route guards, credentials
