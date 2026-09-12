# Dashboard

Open **Dashboard** from the sidebar for a quick read on spending, income, balances, and net worth for the period you pick.

The page title is **Spending & Income Overview**. Filters at the top apply to every chart and KPI on the page.

![Dashboard with KPI cards, monthly bar chart, category donuts, balance chart, and net worth panel](/screenshots/dashboard/list.png)

## Filters

- **All accounts** or one account - limits totals and charts to that account's transactions and balances.
- **This month / 3 months / 6 months / 1 year / All time** - sets the activity window. KPI cards compare against the prior window when a preset is selected (for example **6 months** compares to the previous six months).

Your choices are remembered next time you open the page.

## Key figures

The four cards at the top summarise the filtered period:

- **Current Balance** - latest combined balance for the selected account(s).
- **Spending**, **Income**, and **Net** - totals from categorised transactions in the period.

**Effect:** these numbers come from how you have categorised transactions on [Transactions](/user-guide/transactions). Fix categories there (or on [Breakdown](/user-guide/breakdown)) and the dashboard updates on refresh.

## Charts

### Receiving vs Spending

Monthly bars for money in and out. Useful for spotting lumpy months.

### Spending by Category and Income by Category

Donut charts with a ranked list. Click a slice to open a side drawer of matching transactions for that category in the period.

![Spending breakdown drawer listing transactions for the Groceries category](/screenshots/dashboard/spending-drilldown.png)

Use **Group by name** in the drawer to roll up similar descriptions.

### Balance over time

Track cash balance across the period. Switch **By account** (stacked) or **Combined** (single line with a trend).

### Net worth

Assets minus liabilities over time. Needs asset valuations and loan balances from [Accounts](/user-guide/accounts) and [Liabilities](/user-guide/liabilities).

::: warning TO COME
Net worth on the dashboard is read-only. Editing a loan or asset elsewhere does not jump you back here automatically - reload or change filters to refresh.
:::

## When there is no data

If you have not imported statements yet, the empty state links to **Upload statements**. Widen the period if you know data exists but the current window is empty.

## Related

- [Breakdown](/user-guide/breakdown) - sortable category table with grouped descriptions and bulk category moves
- [Future predictions](/user-guide/predictions) - forward balance projection using the same transaction history
- [Planning](/user-guide/planning) - dated plans that feed the prediction chart
- [Transactions](/user-guide/transactions) - categorise bank lines that drive the pies and KPIs
