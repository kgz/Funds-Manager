# Report snapshots

Freeze income, living costs, liabilities, and serviceability at a moment in time. Saved snapshots stay as they were even when live balances and categories change later.

Open **Report snapshots** from the sidebar under Cash flow.

![Report snapshots page with Save new snapshot form, coverage checks, and a table of saved snapshots](/screenshots/report-snapshots/list.png)

## Save a snapshot

1. Under **Save new snapshot**, pick the **Period** (same presets as other cash-flow screens).
2. Optionally choose an **Account** filter, or leave **All accounts**.
3. Enter a **Name** (for example `June refinance pack`). If you leave it blank, the app picks a dated default.
4. Review the **coverage** tiles. They flag gaps in statements, income, living data, liabilities, or assets for that period.
5. Click **Save snapshot**. If coverage is weak, the app asks you to confirm before saving.

- **Effect:** creates a frozen copy of [Serviceability](/user-guide/serviceability) figures plus coverage metadata for that period and account scope. Live [Income](/user-guide/income), [Living expenses](/user-guide/living-expenses), and [Liabilities](/user-guide/liabilities) keep moving; the snapshot does not.

## Saved snapshots list

The table shows **Name**, **As at** (capture date), **Period**, and **Saved** timestamp. Click a name to open the frozen detail. Use the trash icon to delete a snapshot.

## Frozen detail

The detail page shows KPIs (income, repayments, living, surplus, net worth), a **Serviceability breakdown**, and **Coverage summary** as they were when saved.

![Frozen report snapshot detail with KPI row, serviceability breakdown, and coverage summary](/screenshots/report-snapshots/detail.png)

- **Effect:** read-only history. Open **Print report** from the detail header for a printable broker-style layout.

::: warning TO COME
Sharing redacted report links and inline annotations on the print report are not documented here yet.
:::

## Tips

- Save before a big data clean-up so you can compare old vs new figures.
- Fix coverage warnings first when you can; snapshots saved with gaps still store what you had, but the warning is there for a reason.
- Name snapshots for the meeting or lender (`Pre-approval Aug 2026`) so the list stays scannable.

## Related

- [Serviceability](/user-guide/serviceability) - live surplus view that snapshots capture
- [Income](/user-guide/income) - streams frozen into the snapshot payload
- [Living expenses](/user-guide/living-expenses) - living buckets frozen into the snapshot
- [Liabilities](/user-guide/liabilities) - loan balances and repayments frozen at save time
- [Accounts](/user-guide/accounts) - account filter scope for a snapshot
