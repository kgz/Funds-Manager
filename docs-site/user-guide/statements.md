# Statements

Import bank statement PDFs so Funds Manager can read transactions and keep your account history complete.

Open **Statements** from the sidebar. Use the account filter to focus on one account or see everything.

![Statements page with PDF drop zone, missing-period alert, and a table of imported statement periods](/screenshots/statements/list.png)

## Upload a statement

1. Click **Upload PDF** or drop PDF files onto the upload area.
2. Supported formats include People's Choice, CBA, and similar Australian bank PDFs (max 20 MB each).
3. If that account and month are already imported, you can choose **Replace** to re-import (this removes the old statement and its transactions for that period).

When parsing succeeds, the statement appears in **Imported statements** with a **Parsed** status.

- **Effect:** new transactions show up on [Transactions](/user-guide/transactions). Bank accounts are created or matched automatically when you import.
- Missing months are flagged at the top so you can upload the gaps.

## Imported statements table

Each row shows the statement period, account, import date, and status. Use **Upload** on a **Missing** row to add that month.

::: warning TO COME
**View** on a parsed row is not wired up yet. Use [Transactions](/user-guide/transactions) to review lines from imported statements.
:::

## Tips

- Filter by account when you only care about one offset or everyday account.
- Re-importing the same month replaces that period's data. Check [Transactions](/user-guide/transactions) afterward if you had manual edits.

## Related

- [Transactions](/user-guide/transactions) - review and categorise lines from imported statements
- [Accounts](/user-guide/accounts) - accounts created or updated when statements import
