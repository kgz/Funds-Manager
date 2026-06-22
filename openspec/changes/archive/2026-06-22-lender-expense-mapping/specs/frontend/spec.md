## ADDED Requirements

### Requirement: Living expenses page

The app SHALL provide route `/lender-expenses` with nav label **Living expenses** under the Cash flow sidebar section.

The page SHALL have sub-routes: **Monthly summary** (`/lender-expenses`) and **Category mapping** (`/lender-expenses/mappings`). Category mapping SHALL be a full page with search and table layout, not a modal.

#### Scenario: Period filter
- **WHEN** user selects "6 months" on the summary tab
- **THEN** summary reloads for that date range

#### Scenario: Edit mapping
- **WHEN** user changes a category's lender bucket on the mapping page and saves
- **THEN** summary reflects the new mapping on reload
