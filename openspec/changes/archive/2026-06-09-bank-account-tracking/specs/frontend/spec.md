## ADDED Requirements

### Requirement: Accounts management page
The SPA SHALL provide `/accounts` to list financial accounts, edit display names, and show linked statement counts.

#### Scenario: Edit account label
- **WHEN** user changes display name on `/accounts` and saves
- **THEN** the new name appears on statements, transactions, and filters

### Requirement: Account filter
Dashboard, breakdown, transactions, and statements pages SHALL support filtering by financial account: **All accounts** or a single selected account.

#### Scenario: Dashboard scoped to one bank
- **WHEN** user selects "Heritage Joint" in the account filter
- **THEN** dashboard charts and KPIs reflect only that account's transactions

#### Scenario: Filter persistence
- **WHEN** user selects an account filter and reloads the page
- **THEN** the selection is restored from localStorage

### Requirement: Account column in tables
Statements and transactions tables SHALL display the financial account display name (or bank + account number fallback).

#### Scenario: Statement shows account
- **WHEN** user views `/statements`
- **THEN** each row shows which bank/account the statement belongs to
