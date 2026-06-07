## MODIFIED Requirements

### Requirement: Re-import replaces existing period
Re-importing a statement for the same `account_id` and `date` SHALL require explicit user confirmation. Preview (`POST /api/statements?preview=true`) MUST detect conflicts without writing to the database. Import with `replace=true` soft-deletes the existing statement(s) before insert. Import without `replace` MUST fail when a conflict exists.

#### Scenario: Preview detects conflict
- **WHEN** a PDF is uploaded with `preview=true` for an account+date that already has an active statement
- **THEN** the response lists the conflict with period label and does not modify the database

#### Scenario: Import blocked without confirm
- **WHEN** a PDF is uploaded without `replace=true` and a matching active statement exists
- **THEN** import fails and the existing statement is unchanged

#### Scenario: Confirmed replace
- **WHEN** a PDF is uploaded with `replace=true` for a conflicting account+date
- **THEN** existing statement(s) are soft-deleted and the new statement is inserted
