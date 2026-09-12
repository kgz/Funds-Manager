# Repeat payments

Spot recurring debits and credits in your imported statements: subscriptions, loan repayments, salary-like deposits, and other patterns that show up on a steady cadence.

Open **Repeat payments** from the sidebar under Cash flow.

![Repeat payments page with estimated monthly spending and income KPIs and a table of detected patterns sorted by match score](/screenshots/repeat-payments/by-pattern.png)

## Filters and views

- **Account** - all accounts or one register.
- **By pattern / By category** - flat list of each detected pattern, or rolled up by category with expandable rows.
- **Minimum occurrences** - require more history before a pattern appears (3 to 6). Lower it to surface weaker matches.

Click the **?** next to the title for a short explanation of detection, monthly estimates, and match score.

## Reading the table

Each row is an estimate from transaction history, not a bill you edit here.

- **Description** - sample payee text and category (when assigned).
- **Frequency** - cadence label and typical spacing in days.
- **Amount · per month** - typical charge and an estimated monthly equivalent.
- **Min / max** - range seen in the period.
- **Times seen** - how many matching transactions.
- **Match score** - higher when amount and timing are more consistent.

![Repeat payments grouped by category with expandable rows showing individual patterns behind each category](/screenshots/repeat-payments/by-category.png)

## What it drives

Repeat payments is an analytics view. It refreshes when new statements import and categories change.

- **Effect on [Transactions](/user-guide/transactions):** reads categorised history. Better categories improve grouping; it does not write back to transactions.
- **Effect on [Income](/user-guide/income) / [Living expenses](/user-guide/living-expenses):** separate detection pipelines. Patterns here are a cross-check, not the source of truth for those screens.
- **Effect on [Serviceability](/user-guide/serviceability) / [Future predictions](/user-guide/predictions):** no direct link. Surplus uses income streams, liability repayments, and living buckets; predictions use historical net flow plus [Planning](/user-guide/planning) items. Use repeat payments to sanity-check what you already see elsewhere.

::: warning TO COME
There is no way yet to promote a repeat pattern into a plan or income stream from this screen.
:::

## Tips

- Start with **By pattern** and sort by **Match score** (default) to review the strongest signals first.
- Switch to **By category** to see total monthly spend or income per category.
- If subscriptions look uncategorised, fix categories in **Transactions** and revisit after the next import refresh.

## Related

- [Transactions](/user-guide/transactions) - source data and categories for detection
- [Income](/user-guide/income) - confirmed income streams (separate from repeat income patterns)
- [Living expenses](/user-guide/living-expenses) - HEM-style living totals used in serviceability
- [Serviceability](/user-guide/serviceability) - monthly surplus built from income, repayments, and living
- [Planning](/user-guide/planning) - one-off or dated loan changes that predictions pick up
