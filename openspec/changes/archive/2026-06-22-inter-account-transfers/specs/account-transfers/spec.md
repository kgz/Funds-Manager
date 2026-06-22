### Requirement: Transfer pair storage
The system SHALL store inter-account transfer pairs linking one debit transaction and one credit transaction on different financial accounts.

#### Scenario: Confirm a pair
- **WHEN** user confirms a suggested or manual pair
- **THEN** a row exists with `status = confirmed` and both transaction ids

### Requirement: Detection heuristics
`GET /api/transfers/suggestions` SHALL return pairs where amounts are opposite signs with equal absolute value, transaction dates are within 3 days, accounts differ, and neither transaction is already paired.

#### Scenario: OSKO between accounts
- **WHEN** account A shows `OSKO PAYMENT -$500` and account B shows `OSKO DEPOSIT +$500` within 3 days
- **THEN** the pair appears in suggestions

### Requirement: Aggregate exclusion
Confirmed transfer transactions MUST be excluded from spending and income sums on dashboard KPIs, monthly charts, category breakdown, recurring detection, and lender expense spend totals.

#### Scenario: Confirmed transfer
- **WHEN** a $500 transfer pair is confirmed
- **THEN** dashboard spending and income do not each increase by $500

### Requirement: Suggested pairs not excluded
Transactions in `suggested` pairs MUST remain in aggregates until confirmed.

#### Scenario: Pending suggestion
- **WHEN** a pair is only suggested
- **THEN** both transactions still count toward spending/income
