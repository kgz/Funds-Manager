## ADDED Requirements

### Requirement: Dashboard KPI summary row
The dashboard SHALL display a row of summary cards above charts showing current balance, total spending, total income, and net savings derived from loaded transactions.

#### Scenario: KPI values from transactions
- **WHEN** transactions are loaded
- **THEN** summary cards show computed dollar amounts with consistent currency formatting

#### Scenario: No transactions
- **WHEN** transaction list is empty
- **THEN** summary cards show placeholder or zero values without error
