## ADDED Requirements

### Requirement: Statement re-import confirmation
Before replacing an existing statement period, the statements page SHALL show a confirmation dialog listing affected account and month. Cancel MUST leave existing data unchanged.

#### Scenario: User cancels replace
- **WHEN** upload preview reports a conflict and the user clicks Cancel
- **THEN** no statement or transaction data is modified

#### Scenario: User confirms replace
- **WHEN** the user confirms Replace after a conflict warning
- **THEN** the import proceeds with `replace=true`
