## ADDED Requirements

### Requirement: Connect persists only after successful swap

The system SHALL update saved connection active state and persisted database URL only after `swap_postgres_pool` succeeds. When swap fails, the previous active profile and live pool SHALL remain unchanged on disk and in the pool.

#### Scenario: Pending migrations on target

- **WHEN** the user Save & connects to a database with pending migrations
- **THEN** the API returns a failure message about pending migrations
- **AND** the previously active saved connection remains active
- **AND** the live pool remains on the previous database

#### Scenario: Successful connect

- **WHEN** the user Save & connects to a reachable database with zero pending migrations
- **THEN** the pool swaps to that database
- **AND** the selected profile is marked active and config is saved

### Requirement: Migrations status and run for selected target

The system SHALL allow listing and applying pending migrations against a target PostgreSQL URL built from optional connection id and form fields. When no target is provided, the system SHALL use the live pool.

#### Scenario: Selected profile differs from live

- **WHEN** the settings UI requests migrations status for the selected (non-live) connection
- **THEN** pending/applied status reflects that target database
- **AND** Run pending migrations applies to that target when invoked with the same target

#### Scenario: Live pool default

- **WHEN** migrations endpoints are called without target fields
- **THEN** status and run use the current live pool (existing behaviour)

### Requirement: Honest settings UI for storage failures

Warn and error storage banners SHALL NOT use a success checkmark icon. The live database readout SHALL be labelled so it is not confused with connect success.

#### Scenario: Connect failure banner

- **WHEN** Save & connect fails
- **THEN** the banner uses a warning/error icon and title indicating failure
