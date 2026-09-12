# Income

See salary and other regular credits detected from your bank history. Confirm streams and enter employment package figures (ex GST) for broker-facing totals.

Open **Income** from the sidebar. Subtitle on the page: *Detected salary and regular credits for broker verification*.

![Income page with KPI cards and a table of detected streams with Primary and Confirmed badges](/screenshots/income/list.png)

## What you see

Summary cards at the top:

- **Est monthly** - combined take-home from detected streams
- **Est yearly ex GST** / **Est yearly inc GST** - annualised figures using package overrides where set
- **Streams detected** - count of recurring credit patterns

The **Income streams** table lists each pattern with source label, frequency, estimated amounts, months observed, and status pills (**Primary**, **Confirmed**, **Variable**).

## PAYG callout

Bank deposits are usually **after PAYG withholding**. The banner on the table reminds you to edit each stream and enter the **Package ex GST** from a contract or payslip (per week, month, or year) so lender-facing yearly figures reflect gross employment income, not just net deposits.

## Edit a stream

1. Click **Edit** on a row.
2. Adjust the **Label** if you want a clearer name.
3. Enter **Package ex GST** and pick the period (per week, month, or year). A preview shows yearly ex GST and inc GST.
4. Tick **Primary income** for the main job.
5. Tick **Confirmed by user** when you have checked the figures.
6. Click **Save**.

![Edit stream dialog with label, package ex GST, period selector, and primary or confirmed checkboxes](/screenshots/income/edit-stream.png)

- **Effect:** confirmed package amounts feed serviceability and broker report figures alongside [Living expenses](/user-guide/living-expenses). Salary categories on [Transactions](/user-guide/transactions) keep pay out of living expense buckets.

::: warning TO COME
A full **Serviceability** user guide is not published yet. Income and living expenses totals are combined there for surplus and stress views.
:::

## Empty state

You need imported statements with at least three occurrences of a regular credit (for example fortnightly pay). See [Guide: Getting started](/guide/getting-started) for imports.

## Related

- [Transactions](/user-guide/transactions) - categorise credits; salary categories exclude pay from living expenses
- [Living expenses](/user-guide/living-expenses) - HEM-style monthly averages for the other side of serviceability
- [Serviceability](/user-guide/serviceability) - monthly income panel uses confirmed streams when available
- [Report snapshots](/user-guide/report-snapshots) - frozen income figures at save time
- [Repeat payments](/user-guide/repeat-payments) - separate pattern view over the same transaction history
- [Planning](/user-guide/planning) - one-off bonuses can be planned separately from detected salary streams
- [Future predictions](/user-guide/predictions) - day-to-day projection; detected income streams are for verification totals, not the daily chart
