## ADDED Requirements

### Requirement: Accounts page shows last known balance

The Accounts page SHALL display **Last balance** and **As at** columns for each account when stats are loaded.

- **Last balance**: formatted currency, or em dash when null
- **As at**: formatted date from `lastKnownBalanceDate`, or em dash when null

Values SHALL match the account-scoped dashboard balance for “All time” when transaction history exists.
