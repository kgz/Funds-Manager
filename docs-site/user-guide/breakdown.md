# Breakdown

Use **Breakdown** when you want spending and income by category in a sortable table, with grouped bank descriptions under each category.

![Breakdown page with period totals, By category table, and Groceries, Travel, and Salary rows](/screenshots/breakdown/list.png)

## Filters

- **All accounts** or one account - same account filter as the [Dashboard](/user-guide/dashboard).
- **Presets** or **Custom** date range - presets mirror common windows (**This month** through **1 year**). Custom lets you pick **From** and **To** dates.
- **Net this period** summary on the right - spending, income, and net for the filtered range.

## By category table

Each row is a category (or **Uncategorised**). Columns:

- **Spending**, **% of spending**, **Income**, **Net**, **Txns**
- Click column headers to sort.

Click a row to expand **Description** sub-rows. These groups use the same keys as repeat-payment detection, so identical merchant lines roll up together.

![Groceries expanded showing Woolworths and Coles description groups with Move actions](/screenshots/breakdown/expanded.png)

Sub-rows show counts and averages when a group has multiple transactions.

## Move to category

On an expanded description group, click **Move** to reassign every matching transaction in the period to another category.

1. Click **Move** on the group.
2. Pick the target category.
3. Click **Move** in the dialog.

**Effect:** updates transaction categories in bulk. [Dashboard](/user-guide/dashboard) pies, [Future predictions](/user-guide/predictions) category markers, and [Transactions](/user-guide/transactions) all reflect the new category after reload.

::: warning TO COME
Move only affects transactions in the current date range and account filter. Widen the range if older lines should move too.
:::

## Tips

- Expand **Uncategorised** first to clean up imports before trusting **% of spending**.
- Sort by **Spending** descending to find the categories worth splitting or recategorising.
- For one-off plan dates rather than historical totals, use [Planning](/user-guide/planning).

## Related

- [Dashboard](/user-guide/dashboard) - visual overview and pie-chart drilldown for the same categories
- [Transactions](/user-guide/transactions) - edit individual lines and link plans
- [Planning](/user-guide/planning) - future cashflow and loan events (not shown in Breakdown until they become transactions)
- [Future predictions](/user-guide/predictions) - forward balance impact of plans and scenarios
