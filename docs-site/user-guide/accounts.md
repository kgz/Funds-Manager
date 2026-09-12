# Accounts

Bank accounts you track in Funds Manager. Most accounts are created when you import a statement; this screen is where you review them and tidy up display names.

Open it from the sidebar under **Net worth**: **Accounts**.

![Accounts page listing bank accounts with display names, last balances from statements, and an Edit action on each row](/screenshots/accounts/list.png)

## Where accounts come from

Accounts appear after you import a bank statement. The account number and statement parser are set at import and cannot be changed here.

If you have no accounts yet, use **Go to Statements** on the empty state to import your first file.

## Edit an account

1. Click **Edit** on a row.
2. Update **Bank** or **Display name** as needed.
3. Click **Save changes**.

The display name is what you see in account filters across the app and in missing-statement warnings.

![Edit account dialog showing read-only account number and parser fields plus editable bank and display name](/screenshots/accounts/edit.png)

## Last balance and as-at date

**Last balance** and **As at** come from your imported transactions, not from manual entry on this screen.

- **Effect:** imported balances feed **available cash** on the Dashboard net worth chart (alongside assets and liabilities you record elsewhere).
- **Effect:** transaction and planning filters use the display name you set here.

## Planning and redraws

[Planning](/user-guide/planning) **loan redraw** plans pick a destination account - often an offset.

::: warning TO COME
Redraw does **not** update account balances here or loan balances in [Liabilities](/user-guide/liabilities) yet. Change those registers yourself if you need them exact.
:::

## Related

- [Statements](/user-guide/statements) - import PDFs that create or match accounts
- [Planning](/user-guide/planning) - redraw plans pick a destination account
- [Liabilities](/user-guide/liabilities) - link an offset or repayment account to a loan
- [Assets](/user-guide/assets) - property and other valuations for net worth (separate from everyday account balances)
