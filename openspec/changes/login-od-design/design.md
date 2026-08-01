## Context

OD artifact: `funds-login.html` + `css/login.css` in Funds Manager Redesign. The SPA has no login route today; auth API is deferred to `user-auth-data-encryption`. This change is presentation-only — port the OD chrome so `/login` exists when sessions land.

Stacks on warm-paper tokens (#214). Route sits outside `AppLayout` (no sidebar), same pattern as `/r/:token` public broker report.

## Goals / Non-Goals

**Goals:**

- Match OD split layout: dark brand panel (left) + warm-paper sign-in card (right)
- Wire form UX: validation, password toggle, remember-me, forgot-password link, inline banner, submit loading
- Responsive stack at ≤860px (brand above form)
- Stub submit — show informational banner, no API call

**Non-Goals:**

- `POST /api/login`, sessions, route guards
- Forgot-password backend
- OD prototype demo toggles, "Continue to app" link, toast on success
- Sidebar / command palette (#215)

## Decisions

1. **Single page component** — `frontend/src/pages/login.tsx` with Tailwind classes mapped from `login.css`; no separate CSS file.
2. **Route placement** — `/login` as a top-level route in `App.tsx`, sibling to `AppLayout`, not nested under sidebar shell.
3. **Token reuse** — `paper-*` Tailwind theme + `buttonPrimaryClass` / input tokens from `layout/tokens.ts` where they align; brand panel uses inverted `paper-fg` / `paper-surface` pairing from OD.
4. **Submit stub** — on valid submit, set loading briefly then show error banner: "Sign-in is not configured yet." Avoids implying auth works.
5. **Forgot password** — link present; click shows inline banner that reset is not available (matches OD prototype behaviour).

**Alternatives considered:** Build login inside `user-auth-data-encryption` — rejected; #232 is an independent OD port that unblocks parallel backend work.

## Risks / Trade-offs

- **[Risk] Users expect working login** → Mitigation: clear stub banner on submit; no redirect to dashboard.
- **[Trade-off] Remember-me checkbox is visual only** → Acceptable until auth stores preference.
- **[Trade-off] Brand copy from OD prototype** → Use OD text; can refine later.
