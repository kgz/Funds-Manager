## ADDED Requirements

### Requirement: Assets page

The SPA SHALL provide `/assets` to list, create, edit, and delete assets and external balances, with a nav entry under General.

#### Scenario: Nav entry
- **WHEN** the user views the sidebar
- **THEN** a link to **Assets** is visible under General

#### Scenario: Total value
- **WHEN** assets exist
- **THEN** the page shows the total value across all assets

#### Scenario: Stale valuation
- **WHEN** an asset's `valued_at` is null or older than 12 months
- **THEN** the row shows a stale-valuation indicator

### Requirement: Asset form fields

The add/edit form SHALL include: name, kind, value, optional valuation date and source, optional linked liability, and optional notes.

#### Scenario: Create
- **WHEN** the user submits the form with name, kind, and value
- **THEN** the asset appears in the list without a full page reload
