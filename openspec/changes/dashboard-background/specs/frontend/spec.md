## ADDED Requirements

### Requirement: Local app background
The application shell background SHALL NOT depend on external image URLs. It SHALL use CSS-only styling (gradient or subtle pattern).

#### Scenario: No external assets
- **WHEN** the app loads without network access to image CDNs
- **THEN** the background still renders correctly
