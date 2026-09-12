---
name: document-feature
description: >-
  Write or update product docs for a Funds Manager feature using VitePress,
  Playwright screenshots from seeded/demo data, and screenshot manifests with
  alt text for refresh detection. Use when documenting a ticket/MVP, adding
  feature guide pages, refreshing docs screenshots, or when the user mentions
  product docs, docs-site, or screenshot docs.
---

# Document a feature (product docs)

## Stack

- Site: VitePress under `docs-site/` → GitHub Pages (`https://kgz.github.io/Funds-Manager/`)
- One Pages site per repo — put **Guide** (install/dev) and **Features** (product how-tos) in the same site
- Screenshots: Playwright (`frontend/e2e/docs/` or `docs-site/scripts/capture/`) against seeded demo data
- Do not use live production DB; seed via `demo_seed` / known fixtures

## When to run

After an MVP lands (or mid-PR when the UI is stable):

1. Open/create the feature page under `docs-site/features/<slug>.md`
2. Capture or refresh screenshots
3. Wire nav in VitePress config
4. PR references the ticket (`Docs for #N` / part of same PR)

## Screenshot contract

Store images next to the page or under `docs-site/public/screenshots/<feature>/`.

Every image needs:

1. **Markdown alt text** — what the UI shows (enough for an agent to spot drift)
2. **Manifest entry** in `docs-site/screenshots.manifest.json`

```json
{
  "id": "planning-list",
  "file": "public/screenshots/planning/list.png",
  "alt": "Planning page with All/Cashflow/Loans tabs and a table of plans including kind badges",
  "route": "/planning",
  "seed": "demo",
  "capture": "frontend/e2e/docs/planning.screenshots.ts",
  "expects": [
    "heading:Planning",
    "tab:Cashflow",
    "text:Add plan"
  ],
  "ticket": 143
}
```

- `alt` + `expects` = refresh criteria. If UI copy/layout no longer matches, re-capture.
- Prefer stable `data-testid` on key chrome when writing new UI (optional but helps capture scripts).

### Capture script pattern

Reuse Playwright + `page.route` mocks **or** a running app with demo seed.

```ts
// frontend/e2e/docs/<feature>.screenshots.ts
test('docs: planning list', async ({ page }) => {
  await page.goto('/planning');
  await expect(page.getByRole('heading', { name: 'Planning' })).toBeVisible();
  await page.screenshot({
    path: '../../docs-site/public/screenshots/planning/list.png',
    fullPage: false,
  });
});
```

Run: `cd frontend && pnpm exec playwright test e2e/docs/<feature>.screenshots.ts`

## Page template

```markdown
# Planning

Short what/why (1–2 sentences).

![Planning page with All/Cashflow/Loans tabs and plan table](/screenshots/planning/list.png)

## Create a cashflow plan

Steps…

![Add plan modal with Cashflow kind selected](/screenshots/planning/add-cashflow.png)

## Create a loan redraw

…

## What each kind does

| Kind | Effect today |
|------|----------------|
| …    | …              |

Link related tickets (#143, #294).
```

## Update vs create

1. Find existing page by feature slug / ticket
2. Diff UI against `alt` + `expects` in the manifest
3. If drifted: re-run capture script, update alt/expects, edit prose
4. If new feature: add page + captures + nav + manifest entries

## Do not

- Commit screenshots of real personal finance data
- Document Phase-N behaviour as shipped (match OpenSpec / ticket plan tables)
- Stand up a second GH Pages site for this repo — extend the one VitePress site
