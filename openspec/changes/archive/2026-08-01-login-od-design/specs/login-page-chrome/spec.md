## ADDED Requirements

### Requirement: Login page shell

The `/login` route SHALL render a full-viewport split layout aligned with `funds-login.html`: a dark brand panel and a warm-paper sign-in panel, without the main app sidebar.

#### Scenario: Desktop layout
- **WHEN** user opens `/login` on a viewport wider than 860px
- **THEN** the page shows the brand panel on the left and the sign-in card on the right in a two-column grid

#### Scenario: No app chrome
- **WHEN** user opens `/login`
- **THEN** the sidebar and main app layout are not rendered

### Requirement: Brand panel

The brand panel SHALL display the Funds mark, FUNDS headline, tagline, and footer note from the OD prototype.

#### Scenario: Brand content
- **WHEN** the login page loads
- **THEN** the brand panel shows the F mark, "Funds" label, FUNDS title, household tagline, and prototype footnote

### Requirement: Sign-in form

The sign-in card SHALL include email and password fields, remember-me checkbox, forgot-password link, and a primary submit button.

#### Scenario: Field labels and inputs
- **WHEN** user views the sign-in card
- **THEN** email and password fields are shown with labels, placeholders, and appropriate autocomplete attributes

#### Scenario: Password visibility toggle
- **WHEN** user clicks the password visibility control
- **THEN** the password field toggles between masked and plain text and the control updates its aria-label

### Requirement: Form validation and feedback

The form SHALL validate required fields client-side and show inline field errors and a form-level banner for validation and stub submit outcomes.

#### Scenario: Empty submit
- **WHEN** user submits with empty email or password
- **THEN** the affected fields show error hints and a form banner asks the user to check highlighted fields

#### Scenario: Stub submit
- **WHEN** user submits with valid email and password
- **THEN** the submit button shows a loading state briefly, then a form banner indicates sign-in is not configured yet

#### Scenario: Forgot password
- **WHEN** user clicks "Forgot password?"
- **THEN** an inline error banner states password reset is not available

### Requirement: Responsive layout

On narrow viewports the login layout SHALL stack the brand panel above the sign-in card.

#### Scenario: Mobile stack
- **WHEN** user opens `/login` on a viewport at or below 860px
- **THEN** the brand panel appears above the sign-in card in a single column
