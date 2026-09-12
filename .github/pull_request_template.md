## Summary

<!-- What changed and why -->

## Test plan

- [ ] Frontend build (`pnpm run build:embed` in `frontend/`) - CI
- [ ] `cargo test --workspace` - local
- [ ] Manual QA (routes affected):

## Docs + e2e (user-facing changes)

Skip only for pure chore/deps/internal refactors with no UI or behaviour change.

- [ ] User guide / Guide updated (`docs-site/`) - focus on **effects** of using the feature
- [ ] Cross-links: this page links out to related guides; those pages link back
- [ ] Screenshots + `screenshots.manifest.json` when UI changed (`.cursor/skills/document-feature/SKILL.md`)
- [ ] Playwright e2e for the main happy path (`frontend/e2e/`)
- [ ] `cd docs-site && pnpm build`
- [ ] No private board/issue links or fancy Unicode dashes/quotes in published pages

## Dead-end review

What does this feature **drive**? (predictions, liabilities, KPIs, another screen, export, ...)

- [ ] Either: effects are real and documented with cross-links
- [ ] Or: intentionally reminder-only / calendar-only (stated in User guide)
- [ ] Or: follow-up issue filed + boarded + linked from the parent (not a silent dead end)

Follow-up issue (if any): #

## Issue

Closes #
