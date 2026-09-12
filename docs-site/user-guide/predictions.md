# Future predictions

See where your balance might go and plan for what-if changes. Open **Future predictions** from the sidebar.

The baseline uses recent monthly net from your transaction history plus dated plans in the horizon you pick. Scenarios and savings goals overlay extra lines on the chart.

![Future predictions page with projected balance chart, scenarios list, and savings goals list](/screenshots/predictions/list.png)

## Filters

- **All accounts** or one account - scopes the starting balance and baseline.
- **Presets** (**3 months**, **6 months**, **12 months**) or **Custom** dates.
- **Projected end balance** summary - starting balance, projected end, and average monthly net for the range.

## Projected balance chart

- **Baseline** (solid area) - history extended forward using average monthly net, adjusted for [Planning](/user-guide/planning) items in range.
- **Dots** on the baseline - planned spending (red = out, green = in) from Planning cashflow plans.
- **Dashed lines** - toggled scenarios and savings goals.

The subtitle under **Projected balance** shows how many recent months were averaged and how many planned items were included.

## What Planning feeds in

- [Planning](/user-guide/planning) **cashflow** plans - money in or out on the plan date
- [Planning](/user-guide/planning) **loan redraw** plans - a one-off cash credit on the plan date (not treated as income)

Refinance and repayment-change plans do **not** change the projection yet.

**Effect:** add or edit plans on [Planning](/user-guide/planning) and they appear as markers and baseline adjustments here. They do not change past totals on [Dashboard](/user-guide/dashboard) or [Breakdown](/user-guide/breakdown) until matching bank transactions exist.

## Scenarios

What-if overlays for extra income or spending on specific dates (on top of what Planning already includes).

1. Click **Add scenario**.
2. Enter a name and one or more **Adjustment lines** (amount, spending vs income, date, optional category).
3. Click **Add**.

Toggle the checkbox beside a scenario to show or hide it on the chart. Use **Edit** or **Delete** to maintain saved scenarios.

![Add scenario dialog with name field and adjustment line amount, date, and category inputs](/screenshots/predictions/add-scenario.png)

You can also pull an existing planned item into a line from **Add from planned spending** when plans exist in the horizon.

**Effect:** scenarios change the chart only. They do not create transactions or plans elsewhere.

## Savings goals

Target balance you want by a date.

1. Click **Add goal**.
2. Enter name, **Target balance**, and **Target date**.
3. Click **Add**.

Toggle goals on the chart to see a dashed ramp toward the target and a shortfall or **On track** hint with a suggested monthly saving amount.

**Effect:** goals are projection overlays. They do not move money or update [Accounts](/user-guide/accounts).

## Tips

- Category labels on scenario lines are optional context; categorise real transactions on [Transactions](/user-guide/transactions) to improve the baseline.
- If the chart is flat or empty, import more history or widen the horizon.
- Compare against [Dashboard](/user-guide/dashboard) **Current Balance** to sanity-check the starting point.

## Related

- [Planning](/user-guide/planning) - add or edit the plans that show up on the projection
- [Dashboard](/user-guide/dashboard) - current balances and recent spending or income totals
- [Breakdown](/user-guide/breakdown) - category-level history that shapes the baseline average
- [Transactions](/user-guide/transactions) - categorise imports that drive the baseline
- [Accounts](/user-guide/accounts) - account balances used as the starting point (full guide still growing)
