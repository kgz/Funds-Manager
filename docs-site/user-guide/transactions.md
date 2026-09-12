# Transactions

Review imported bank lines, search and filter them, and assign categories. Good categorisation feeds [Living expenses](/user-guide/living-expenses), [Income](/user-guide/income) detection, and matching [Planning](/user-guide/planning) cashflow plans.

![Transactions table with date, account, description, amount, balance, and category columns plus filter controls](/screenshots/transactions/list.png)

## Find transactions

- **Account filter** - limit to one bank account or see all accounts.
- **Search** - matches text in the description.
- **All / Uncategorized** - show everything or only lines still missing a category.
- **Hide transfers** - drop confirmed internal transfer legs from the list (they stay in your data).

Sort by clicking column headers (date, account, description, amount, balance).

## Categorise one line

1. Pick a category from the dropdown on the row.
2. If the app suggests a category (from mapping rules or the same description elsewhere on the page), accept it with one click.

Use **New category** in the header when you need a label that is not in the list yet.

- **Effect:** spending and income categories roll up into [Living expenses](/user-guide/living-expenses) lender buckets (via category mapping) and help separate salary from everyday debits.
- **Effect:** regular salary credits stay out of living expenses when categorised as income; see [Income](/user-guide/income) for detected pay streams.

## Bulk actions

Select rows with the checkboxes, then use the bar above the table:

- **Choose category** + **Apply** - set the same category on all selected lines.
- **Apply** (suggested name) - accept suggestions when every selected row agrees.
- **Mark as transfer** - link an outgoing and incoming leg of the same amount across accounts (available when exactly two matching legs are selected).
- **Apply to matching on page** - copy one row's category to other rows with the same description on this page.

![Bulk action bar with two transactions selected and category picker](/screenshots/transactions/bulk-actions.png)

## Transfer suggestions

When the app spots two legs that look like the same internal transfer, a callout appears above the table. Confirm to link them and treat both as transfers, or dismiss if it is wrong.

![Transfer match callout showing out and in legs with confirm and dismiss actions](/screenshots/transactions/transfer-suggestion.png)

- **Effect:** confirmed transfers are excluded from everyday spending totals when **Hide transfers** is on, and they do not inflate [Living expenses](/user-guide/living-expenses).

## Recategorize uncategorized

**Recategorize uncategorized** runs your mapping rules across all lines that still have no category. Use this after you change category-to-bucket mappings or add new rules.

## Planning links

When you add a [Planning](/user-guide/planning) cashflow plan, a matching bank transaction can be linked so the plan is marked done. Match suggestions appear from Planning and in the app nav when candidates exist.

- **Effect:** linked plans stop double-counting in [Future predictions](/user-guide/predictions) once the real transaction is tied to the plan.

::: warning TO COME
Linking a transaction to a plan from this screen is not documented here yet. Use Planning match suggestions for now.
:::

## Related

- [Dashboard](/user-guide/dashboard) - spending and income charts driven by categorised transactions
- [Breakdown](/user-guide/breakdown) - category table and bulk moves for grouped descriptions
- [Planning](/user-guide/planning) - cashflow plans you can mark done when a transaction matches
- [Future predictions](/user-guide/predictions) - projection uses categorised history and linked plans
- [Income](/user-guide/income) - recurring credits detected from salary-like transactions
- [Living expenses](/user-guide/living-expenses) - monthly HEM-style totals from categorised debits
- [Repeat payments](/user-guide/repeat-payments) - recurring patterns detected from imported history
- [Guide: Getting started](/guide/getting-started) - import statements that populate this screen
