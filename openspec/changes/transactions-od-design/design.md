## Context

OD artifact: `funds-transactions.html` in Funds Manager Redesign. React page has full behaviour; presentation only.

Stacks on warm-paper tokens (#214) and matches breakdown/predictions flat header + entity panel pattern.

## Decisions

1. Flat header (no `PageHeader` GlassCard) — same as predictions.
2. Hide transfers uses OD-style toggle switch, not checkbox.
3. Status column maps API status + uncategorized state to OD pills (Posted / Needs cat. / Pending).
4. Amount colours use `chartColors.receiving` / `chartColors.spending`.
