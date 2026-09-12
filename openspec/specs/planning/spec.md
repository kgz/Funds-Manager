# planning Specification

## Purpose
TBD - created by archiving change planning-hub. Update Purpose after archive.
## Requirements
### Requirement: Planning API path
The system SHALL expose planning CRUD and match endpoints under `/api/planning`. The system SHALL keep `/api/planned-spending` as an alias to the same handlers.

#### Scenario: List via new path
- **WHEN** `GET /api/planning` is called
- **THEN** the response matches the planned spending list contract including `plan_kind` on each item

### Requirement: Plan kinds
Each planning item SHALL have `plan_kind` of `cashflow`, `loan_redraw`, `loan_refinance`, or `loan_repayment_change`. Existing rows SHALL default to `cashflow`.

#### Scenario: Create redraw
- **WHEN** `POST /api/planning` includes `plan_kind=loan_redraw`, positive `amount_cents`, `liability_id`, and `financial_account_id`
- **THEN** the item is stored and returned with those fields

### Requirement: Cashflow-only match flows
Match suggestions, link candidates, and resolve-match SHALL apply only to `cashflow` items.

#### Scenario: Resolve on redraw rejected
- **WHEN** resolve-match is called for a `loan_redraw` item
- **THEN** the API returns 400

### Requirement: Planning UI route
The app SHALL serve Planning at `/planning` with nav label **Planning**, and SHALL redirect `/planned` to `/planning`.

#### Scenario: Command deep link
- **WHEN** the user runs Add loan redraw from ⌘K
- **THEN** the app navigates to `/planning?add=loan_redraw` and opens Add plan with redraw selected

### Requirement: Kind filter and badges
The Planning page SHALL filter All | Cashflow | Loans and show kind badges with warm-paper colours matching the OD prototype.

#### Scenario: Loans filter
- **WHEN** Loans is selected
- **THEN** only `loan_*` kinds are listed

### Requirement: Predictions lump sums (v1)
Baseline projection SHALL apply cashflow planned amounts on their dates. For `loan_redraw`, the system SHALL apply a once positive cash adjustment of `amount_cents` on `start_date`. For `loan_refinance` and `loan_repayment_change`, the system SHALL NOT alter the prediction baseline in v1 (plans are stored and shown in Planning UI only; applying them to predictions/liabilities is #294).

#### Scenario: Redraw on chart date
- **WHEN** a redraw is dated within the prediction horizon
- **THEN** projected balance includes that credit on that date

#### Scenario: Refinance ignored by baseline in v1
- **WHEN** a `loan_refinance` item falls within the prediction horizon
- **THEN** projected cash baseline is unchanged by that item

