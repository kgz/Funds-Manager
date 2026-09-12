# Living expenses

HEM-style monthly averages from your categorised spending, grouped into lender buckets for broker declarations. The screen title is **Living expenses** (sidebar may show the same label).

Two tabs: **Monthly summary** and **Category mapping**.

![Living expenses monthly summary with KPI cards, period selector, and lender bucket table with Housing expanded](/screenshots/living-expenses/summary.png)

## Monthly summary

Pick a period (3 months, 6 months, 12 months, or all). Use the account filter to limit to one bank account.

Summary cards show:

- **Living expenses / month** - mapped buckets only (excludes salary and excluded categories)
- **All debits / month** - every outflow in range for comparison
- **Months in range** and **Period** - the dates behind the averages

The **Lender buckets** table lists each bucket with total spend, monthly average, and transaction count. Rows for **Unmapped** and **Excluded** appear at the bottom.

Click a bucket row to expand category detail underneath.

- **Effect:** totals here feed serviceability surplus calculations together with [Income](/user-guide/income). They also appear on broker-oriented exports.

::: warning TO COME
A full **Serviceability** user guide is not published yet.
:::

## Category mapping

Open the **Category mapping** tab (or follow **Review category mapping** in the callout on the summary).

![Category mapping table with search, filter segments, and lender bucket dropdowns per app category](/screenshots/living-expenses/mappings.png)

Map each app category to a lender bucket or **Excluded**:

- **Default** - using the built-in bucket for that category
- **Override** - you picked a different bucket
- **Excluded** - left out of living expenses (salary, loan payments, and discretionary items you exclude manually)

Salary and loan categories are excluded by default. Search and filter (**All**, **Overrides**, **Excluded**) to audit mappings quickly.

- **Effect:** changes apply the next time the summary recalculates. Recategorize uncategorized lines on [Transactions](/user-guide/transactions) if unmapped spend stays high.

## Tips

- Living expenses exclude salary/income and **Excluded** categories - match the callout on the summary page.
- Widen the period or import more statements if a bucket looks empty.
- Keep grocery and housing categories accurate so food and housing buckets reflect reality.

## Related

- [Transactions](/user-guide/transactions) - assign categories that drive bucket totals
- [Income](/user-guide/income) - employment income kept separate from living expenses
- [Serviceability](/user-guide/serviceability) - living costs panel uses these bucket averages
- [Report snapshots](/user-guide/report-snapshots) - frozen living totals at save time
- [Planning](/user-guide/planning) - planned spends are separate from historical averages here
- [Guide: Getting started](/guide/getting-started) - import statements before totals appear
