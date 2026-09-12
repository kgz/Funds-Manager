# Planning

Use **Planning** to jot down money you expect soon - a holiday, a loan redraw, a refinance date - so it shows up when you look ahead.

Open it from the sidebar: **Planning**. Or open the command palette (`Ctrl+K`, or Command+K on Mac) and pick an "Add ... plan" action.

![Planning page showing All, Cashflow, and Loans filters, an Add plan button, and a table of upcoming plans with kind badges](/screenshots/planning/list.png)

## Add a plan

1. Click **Add plan**.
2. Choose what kind of plan it is (see below).
3. Fill in the name, date, and the fields for that kind.
4. Click **Add**.

You can edit or delete a plan later from the table.

![Add plan dialog with Cashflow selected in the plan kind picker, name and amount fields below](/screenshots/planning/add-cashflow.png)

## Kinds of plan

### Cashflow

A one-off spend or income on a date - for example a holiday deposit or a bonus.

- Enter the amount as spending or income.
- Optionally pick a category.
- **Effect:** [Future predictions](/user-guide/predictions) treats this as money in or out on that date.
- When a matching bank transaction shows up, you can link it so the plan is marked done. See [Transactions](/user-guide/transactions) once that guide is filled out.

### Loan redraw

You're pulling money from a loan into an account (often an offset). The account balance goes up; the loan balance goes up by the same amount. It is **not** income.

- Pick the loan, the account the money lands in, the amount, and the date.
- **Effect:** [Future predictions](/user-guide/predictions) includes that cash on the date (not as income).

::: warning TO COME
Redraw does **not** update the loan or account balances in [Liabilities](/user-guide/liabilities) or [Accounts](/user-guide/accounts) yet. Change those yourself if you need the registers exact.
:::

![Add plan dialog with Loan redraw selected, showing redraw amount, liability, and destination account fields](/screenshots/planning/add-redraw.png)

### Refinance

You're replacing a home loan (or other facility) with new terms on a settlement date.

- Pick the loan you're closing, name the new facility, and enter the new rate and repayment.
- The plan stays on your calendar with an impact summary so you don't lose the date.

::: warning TO COME
Refinance does **nothing** to the rest of the app yet - it won't close the old loan in [Liabilities](/user-guide/liabilities), create the new one, or change [Future predictions](/user-guide/predictions). Use it as a dated reminder for now.
:::

### Repayment change

The repayment amount or rate changes from a date (for example a rate reset).

- Pick the loan and the new repayment (and rate if you know it).

::: warning TO COME
Repayment change does **not** update [Liabilities](/user-guide/liabilities) or [Future predictions](/user-guide/predictions) yet. Same as refinance - calendar reminder only until this lands.
:::

## Finding plans

- **All / Cashflow / Loans** - show everything, only cashflow plans, or only loan-related plans.
- Search and date range - narrow what you see in the table.
- Account filter - for redraws, limit to a destination account; for cashflow it's context only.

## Tips

- Redraws and other loan moves should not be categorised as salary or everyday income.
- Use notes for anything you'll want later (broker, settlement, deal number).

## Related

- [Future predictions](/user-guide/predictions) - where cashflow and redraw plans show up on the projection
- [Liabilities](/user-guide/liabilities) - loans you pick for redraw / refinance / repayment change (full guide still growing)
- [Accounts](/user-guide/accounts) - destination accounts for redraws (full guide still growing)
