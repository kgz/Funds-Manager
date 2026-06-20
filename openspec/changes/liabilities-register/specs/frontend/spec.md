## ADDED Requirements

### Requirement: Liabilities page

The SPA SHALL provide `/liabilities` to list, create, edit, and delete liabilities, with a nav entry under General.

#### Scenario: Nav entry
- **WHEN** the user views the sidebar
- **THEN** a link to **Liabilities** is visible under General

#### Scenario: Total owed
- **WHEN** liabilities exist
- **THEN** the page shows the total outstanding balance across all liabilities

### Requirement: Liability form fields

The add/edit form SHALL include: name, kind, optional lender, current balance, optional credit limit, optional original amount, optional interest rate, optional rate type, optional repayment amount and frequency, optional term, optional linked financial account, and optional notes.

#### Scenario: Create
- **WHEN** the user submits the form with name, kind, and balance
- **THEN** the liability appears in the list without a full page reload

#### Scenario: Edit
- **WHEN** the user edits an existing liability and saves
- **THEN** the list reflects the updated values
