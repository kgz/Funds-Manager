# Categories

Build a parent and sub category tree for tagging transactions. Colours show on transaction dots and in spending views.

Open **Categories** from the sidebar. Search, filter by account, or expand rows to see subcategories.

![Categories page showing the category tree, uncategorized banner, and New category button](/screenshots/categories/list.png)

## Add a category

1. Click **New category** for a top-level group, or **+ Sub** on a parent row.
2. Enter a name and pick a colour.
3. Click **Add**.

![New category dialog with name and colour fields](/screenshots/categories/add.png)

- **Effect:** the category appears in pickers on [Transactions](/user-guide/transactions) and rolls up spending on the **Breakdown** screen (user guide for Breakdown is still being written).

## Edit, reorder, and merge

- **Drag** the handle on a row to reorder within its level.
- Click the **pencil** to rename or move a subcategory under another parent.
- Select two or more rows, then **Merge selected** to combine duplicates into one category (sources are soft-deleted).

**Transfers** and **Uncategorized** are system categories. They cannot be deleted.

## Deleted categories

Turn on **Show deleted** to see soft-deleted categories and **Restore** them. Deleted categories stay on old transactions but disappear from pickers until restored.

## Uncategorized banner

When transactions have no category, a banner shows how many lines need attention. Follow **Review on Transactions** to categorise them.

- **Effect:** categorising updates totals on **Breakdown** and filters on [Transactions](/user-guide/transactions).

## Related

- [Transactions](/user-guide/transactions) - assign categories to bank lines
- [Future predictions](/user-guide/predictions) - optional category on cashflow plans
