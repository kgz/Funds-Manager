CREATE TABLE prediction_scenarios (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE prediction_scenario_lines (
    id BIGSERIAL PRIMARY KEY,
    scenario_id BIGINT NOT NULL REFERENCES prediction_scenarios (id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    amount_cents INTEGER NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    category_id BIGINT REFERENCES categories (id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT prediction_scenario_lines_amount_nonzero CHECK (amount_cents <> 0),
    CONSTRAINT prediction_scenario_lines_frequency_check CHECK (
        frequency IN ('once', 'weekly', 'fortnightly', 'monthly', 'yearly')
    ),
    CONSTRAINT prediction_scenario_lines_date_order CHECK (
        end_date IS NULL OR end_date >= start_date
    )
);

CREATE TABLE prediction_goals (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    target_amount_cents BIGINT NOT NULL,
    target_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX prediction_scenarios_active_idx
    ON prediction_scenarios (id)
    WHERE deleted_at IS NULL;

CREATE INDEX prediction_scenario_lines_scenario_idx
    ON prediction_scenario_lines (scenario_id);

CREATE INDEX prediction_goals_active_target_idx
    ON prediction_goals (target_date)
    WHERE deleted_at IS NULL;
