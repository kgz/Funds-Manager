## ADDED Requirements

### Requirement: Transaction notes UI
The `/transactions` page SHALL provide an editable notes field per row. Changes SHALL persist via `PATCH /api/transactions/{id}/notes` and refresh the transaction list on success.

#### Scenario: Inline edit
- **WHEN** user edits a note and leaves the field (blur)
- **THEN** the note is saved to the server

#### Scenario: Empty note
- **WHEN** user clears the note field
- **THEN** the server stores null and the UI shows the empty placeholder

#### Scenario: Saving state
- **WHEN** a note save is in progress
- **THEN** that row's notes input is disabled until the request completes
