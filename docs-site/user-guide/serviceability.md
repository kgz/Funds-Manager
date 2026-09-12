# Serviceability

See a broker-style monthly surplus: income minus loan repayments and living costs. Use it to sense-check capacity before a refinance or new loan.

Open **Serviceability** from the sidebar under Cash flow.

![Serviceability page with monthly income, commitments, and surplus KPIs plus income, repayments, living costs, and surplus breakdown panels](/screenshots/serviceability/overview.png)

## Pick a period and account

1. Choose **This month**, **3 months**, **6 months**, or **1 year**. The figures use that date range.
2. Optionally narrow to one account with the account filter. **All accounts** uses everything imported.

The page recalculates when you change period or account. It reads live data; nothing here is frozen.

## Base case vs stress

- **Base case** uses repayments as entered on your loans.
- **Stress (+3%)** approximates higher repayments on variable-rate facilities (buffer comes from your settings).

![Serviceability stress scenario showing higher repayments and a lower monthly surplus](/screenshots/serviceability/stress.png)

## What feeds the numbers

### Income

Detected pay and other credits in the period. Confirmed streams are preferred; if none are confirmed, all detected income is used and a warning appears.

- **Effect:** comes from [Income](/user-guide/income). Confirming streams there improves accuracy here.

### Repayments

Monthly repayments from active [Liabilities](/user-guide/liabilities). Loans without a repayment set show as excluded (`No repayment set`).

- **Effect:** update repayments on the liability register; this screen picks them up on refresh.

### Living costs

HEM-style averages from categorised spending in the period (committed vs discretionary buckets).

- **Effect:** comes from [Living expenses](/user-guide/living-expenses) bucket mapping and [Transactions](/user-guide/transactions) categories.

### Surplus

`Income - Repayments - Living costs`, shown as monthly dollars and as a share of income.

- **Effect:** read-only here. To keep figures for a broker pack, save a [Report snapshot](/user-guide/report-snapshots).

## Tips

- Fix missing repayments in **Liabilities** before trusting commitments.
- Confirm salary streams in **Income** so surplus is not based on unconfirmed guesses.
- Use **Stress** to see whether a rate rise still leaves positive surplus.

## Related

- [Income](/user-guide/income) - streams and confirmation that drive the income panel
- [Living expenses](/user-guide/living-expenses) - bucket mapping behind living costs
- [Liabilities](/user-guide/liabilities) - loan repayments in the commitments total
- [Report snapshots](/user-guide/report-snapshots) - freeze these figures at a point in time
- [Transactions](/user-guide/transactions) - categorised spend that rolls up into living costs
