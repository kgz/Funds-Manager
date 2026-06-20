## ADDED Requirements

### Requirement: Income streams summary API

`GET /api/income-streams` SHALL return detected income streams with frequency, estimated monthly amount, months observed, irregular flag, and user profile fields (label, primary, confirmed, gross monthly).

#### Scenario: Streams listed

- **WHEN** regular credit transactions exist
- **THEN** the response lists income streams sorted with primary first
