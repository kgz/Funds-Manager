## ADDED Requirements

### Requirement: Accounts page shows last known balance

The Accounts page SHALL display **Last balance** and **As at** columns for each account when stats are loaded.

- **Last balance**: formatted currency, or em dash when null
- **As at**: formatted date from `lastKnownBalanceDate`, or em dash when null

Values SHALL match the account-scoped dashboard balance for “All time” when transaction history exists.

#### Scenario: Balance displayed
- **WHEN** stats are loaded and `lastKnownBalance` is present
- **THEN** the Accounts table shows formatted currency in **Last balance** and a formatted date in **As at**

#### Scenario: No balance history
- **WHEN** `lastKnownBalance` is null
- **THEN** both columns show an em dash
