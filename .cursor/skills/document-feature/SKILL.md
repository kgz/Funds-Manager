---
name: document-feature
description: >-
  Write or update Funds Manager VitePress docs (Guide + User guide) with
  Playwright screenshots from mocked/demo data and screenshot manifests.
  Use when documenting a ticket/MVP, user-guide pages, setup docs, refreshing
  screenshots, dead-end review, or when the user mentions docs-site / product docs.
---

# Document a feature (product docs)

## Stack

- Site: VitePress under `docs-site/` -> GitHub Pages (`https://kgz.github.io/Funds-Manager/`)
- **Guide** = install / run. **User guide** = how to use the app (`docs-site/user-guide/`)
- Screenshots: Playwright (`frontend/e2e/docs/`) with mocks or demo seed. Never real PII.

## When to run

1. Add/update `docs-site/user-guide/<slug>.md` (or Guide pages for setup)
2. Capture screenshots; register in `screenshots.manifest.json`
3. Wire User guide sidebar in `.vitepress/config.ts`
4. Cross-link related pages both ways (see Effects below)
5. Dead-end review (see below)
6. PR can reference the ticket for maintainers; **never** put issue/epic/board links in published user-facing pages

## Effects first + cross-links

User guide copy should answer: **if I do this, what changes elsewhere in the app?**

For each action or plan kind:

1. Brief how-to (fields / clicks)
2. **Effect** - what it drives (predictions, balances, matching, etc.)
3. Link to the User guide page for that effect
4. On the **other** page, add or update a short "Related" / inbound blurb that links back

Example (Planning -> Future predictions):

```markdown
### Cashflow

A one-off spend or income on a date - for example a holiday deposit or a bonus.

- Enter the amount as spending or income.
- Optionally pick a category.
- **Effect:** counts as money in or out on that date in [Future predictions](/user-guide/predictions).
- When a matching bank transaction shows up, you can link it so the plan is marked done.
```

And on the Future predictions page:

```markdown
## Related

- [Planning](/user-guide/planning) cashflow and redraw plans show up on the projection for their dates.
```

If the linked page does not exist yet, add a short stub page + sidebar entry in the same PR (honest `TO COME` for missing screenshots is fine) so links are not dead.

## Voice (no AI watermark)

Published docs must read like a normal product guide.

**Do:**
- Short sentences, concrete UI labels matching the app
- ASCII punctuation only: `-` `'` `"` `...` (three dots). No em/en dashes, curly quotes, ellipsis character, nbsp, zero-width, thin spaces
- Say `Ctrl+K` (and mention Command on Mac in prose if needed). Do not use fancy keyboard glyphs
- Plain `TO COME` warning boxes for unfinished behaviour

**Do not:**
- Issue numbers, epic links, project board, OpenSpec, "v1", "Phase 3", PR links
- Routes/redirects/API paths in User guide
- Filler ("seamless", "robust", "leverage", "empower", "in today's...")
- Fancy Unicode dashes/quotes/spaces that look machine-generated
- Meta asides about "the docs pipeline" or "coverage tracked in..."

## Dead-end review

Before the PR is "ready":

List every new capability and what it **drives**.

| Outcome | Action |
|---------|--------|
| Drives something real | Document effect + bidirectional User guide links |
| Intentionally reminder-only | Say so in the User guide (no fake "it updates X") |
| UI exists but drives nothing, and more is planned | File follow-up GitHub issue, board it, link from parent ticket + PR; `TO COME` in User guide |

Silent dead ends (ship UI that implies an effect with no follow-up and no honesty in docs) are not allowed.

## Screenshot contract

Images under `docs-site/public/screenshots/<feature>/`.

1. Markdown **alt** describes what the user sees
2. Manifest entry (internal; `ticket` ok here, not in the page):

```json
{
  "id": "planning-list",
  "file": "public/screenshots/planning/list.png",
  "alt": "Planning page with All/Cashflow/Loans tabs and a table of plans",
  "route": "/planning",
  "seed": "mock",
  "capture": "frontend/e2e/docs/planning-screenshots.spec.ts",
  "expects": ["heading:Planning", "tab:Cashflow", "text:Add plan"]
}
```

`cd frontend && pnpm exec playwright test e2e/docs/<feature>-screenshots.spec.ts`

## Page shape

```markdown
# Planning

One or two sentences on what this screen is for.

![...](/screenshots/planning/list.png)

## Add a plan

1. Click **Add plan**.
2. ...

### Cashflow

How to fill it in.

- **Effect:** ... See [Future predictions](/user-guide/predictions).

::: warning TO COME
Honest limit in plain language.
:::

## Related

- [Future predictions](/user-guide/predictions) - ...
```

## Delivery gate

Docs + e2e + dead-end review are part of the normal ticket loop (`.cursor/rules/funds-manager-workflow.mdc` step 5). Do **not** mark In review without them unless the user explicitly waives.

OpenSpec `tasks.md` for UI work should include:

```markdown
## Docs + e2e

- [ ] User guide page - effects + cross-links both ways
- [ ] Screenshots + manifest
- [ ] Playwright e2e happy path
- [ ] Dead-end review (follow-up issue if needed)
- [ ] `cd docs-site && pnpm build`
```
