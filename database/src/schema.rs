// @generated automatically by Diesel CLI.

pub mod sql_types {
    #[derive(diesel::query_builder::QueryId, diesel::sql_types::SqlType)]
    #[diesel(postgres_type(name = "category_mappings_match_type"))]
    pub struct CategoryMappingsMatchTypeEnum;
}

diesel::table! {
    use diesel::sql_types::*;
    use super::sql_types::CategoryMappingsMatchTypeEnum;

    categories (id) {
        id -> Bigint,
        #[max_length = 100]
        name -> Varchar,
        description -> Nullable<Text>,
        parent_category_id -> Nullable<Bigint>,
        created_at -> Timestamp,
        deleted_at -> Nullable<Timestamp>,
        #[max_length = 7]
        colour -> Nullable<Varchar>,
        sort_order -> Integer,
    }
}

diesel::table! {
    use diesel::sql_types::*;
    use super::sql_types::CategoryMappingsMatchTypeEnum;

    category_mappings (id) {
        id -> Bigint,
        #[max_length = 255]
        pattern -> Varchar,
        match_type -> CategoryMappingsMatchTypeEnum,
        category_id -> Bigint,
        priority -> Integer,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    financial_accounts (id) {
        id -> Bigint,
        #[max_length = 100]
        bank_name -> Varchar,
        #[max_length = 200]
        display_name -> Varchar,
        #[max_length = 25]
        account_number -> Varchar,
        #[max_length = 50]
        parser_name -> Varchar,
        #[max_length = 50]
        account_type -> Nullable<Varchar>,
        created_at -> Timestamp,
        deleted_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    prediction_goals (id) {
        id -> Bigint,
        #[max_length = 200]
        name -> Varchar,
        target_amount_cents -> Bigint,
        target_date -> Date,
        created_at -> Timestamp,
        deleted_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    prediction_scenario_lines (id) {
        id -> Bigint,
        scenario_id -> Bigint,
        #[max_length = 200]
        name -> Varchar,
        amount_cents -> Integer,
        #[max_length = 20]
        frequency -> Varchar,
        start_date -> Date,
        end_date -> Nullable<Date>,
        category_id -> Nullable<Bigint>,
        sort_order -> Integer,
    }
}

diesel::table! {
    prediction_scenarios (id) {
        id -> Bigint,
        #[max_length = 200]
        name -> Varchar,
        created_at -> Timestamp,
        deleted_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    assets (id) {
        id -> Bigint,
        #[max_length = 200]
        name -> Varchar,
        #[max_length = 32]
        kind -> Varchar,
        value_cents -> Bigint,
        valued_at -> Nullable<Date>,
        #[max_length = 200]
        value_source -> Nullable<Varchar>,
        liability_id -> Nullable<Bigint>,
        notes -> Nullable<Text>,
        created_at -> Timestamp,
        deleted_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    asset_valuations (id) {
        id -> Bigint,
        asset_id -> Bigint,
        valued_at -> Date,
        value_cents -> Bigint,
        #[max_length = 200]
        source -> Nullable<Varchar>,
        created_at -> Timestamp,
        deleted_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    broker_report_annotations (id) {
        id -> Bigint,
        snapshot_id -> Bigint,
        transaction_id -> Bigint,
        note -> Text,
        exclude_from_analysis -> Bool,
        created_at -> Timestamp,
        deleted_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    broker_report_shares (id) {
        id -> Bigint,
        snapshot_id -> Bigint,
        token -> Text,
        redaction -> Text,
        created_at -> Timestamp,
        revoked_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    broker_report_snapshots (id) {
        id -> Bigint,
        #[max_length = 200]
        name -> Varchar,
        as_at -> Date,
        start_date -> Date,
        end_date -> Date,
        account_id -> Nullable<Bigint>,
        rate_buffer_bps -> Integer,
        payload -> Text,
        created_at -> Timestamp,
        deleted_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    liabilities (id) {
        id -> Bigint,
        #[max_length = 200]
        name -> Varchar,
        #[max_length = 32]
        kind -> Varchar,
        #[max_length = 200]
        lender -> Nullable<Varchar>,
        balance_cents -> Bigint,
        credit_limit_cents -> Nullable<Bigint>,
        original_amount_cents -> Nullable<Bigint>,
        interest_rate_bps -> Nullable<Integer>,
        #[max_length = 16]
        rate_type -> Nullable<Varchar>,
        repayment_cents -> Nullable<Bigint>,
        #[max_length = 16]
        repayment_frequency -> Nullable<Varchar>,
        term_months -> Nullable<Integer>,
        financial_account_id -> Nullable<Bigint>,
        notes -> Nullable<Text>,
        created_at -> Timestamp,
        deleted_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    liability_balances (id) {
        id -> Bigint,
        liability_id -> Bigint,
        balanced_at -> Date,
        balance_cents -> Bigint,
        #[max_length = 200]
        source -> Nullable<Varchar>,
        created_at -> Timestamp,
        deleted_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    planned_spending (id) {
        id -> Bigint,
        #[max_length = 200]
        name -> Varchar,
        amount_cents -> Integer,
        start_date -> Date,
        end_date -> Nullable<Date>,
        category_id -> Nullable<Bigint>,
        notes -> Nullable<Text>,
        created_at -> Timestamp,
        deleted_at -> Nullable<Timestamp>,
        resolved_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    planned_spending_links (id) {
        id -> Bigint,
        planned_spending_id -> Bigint,
        transaction_id -> Bigint,
        linked_at -> Timestamp,
    }
}

diesel::table! {
    planned_spending_dismissed_matches (id) {
        id -> Bigint,
        planned_spending_id -> Bigint,
        transaction_id -> Bigint,
        dismissed_at -> Timestamp,
    }
}

diesel::table! {
    statement (id) {
        id -> Bigint,
        date -> Date,
        #[max_length = 25]
        account_id -> Varchar,
        opening_balance -> Integer,
        closing_balance -> Integer,
        deleted_at -> Nullable<Timestamp>,
        created_at -> Timestamp,
        financial_account_id -> Nullable<Bigint>,
        period_start -> Nullable<Date>,
        period_end -> Nullable<Date>,
    }
}

diesel::table! {
    transaction_categories (id) {
        id -> Bigint,
        transaction_id -> Bigint,
        category_id -> Bigint,
        created_at -> Timestamp,
    }
}

diesel::table! {
    transaction_data (id) {
        id -> Bigint,
        statement_id -> Integer,
        category_id -> Nullable<Integer>,
        description -> Text,
        amount -> Integer,
        transaction_date -> Timestamp,
        last_updated -> Timestamp,
        deleted_at -> Nullable<Timestamp>,
        created_at -> Timestamp,
        #[max_length = 50]
        status -> Varchar,
        balance -> Integer,
    }
}

diesel::table! {
    account_transfer_pairs (id) {
        id -> Bigint,
        out_transaction_id -> Bigint,
        in_transaction_id -> Bigint,
        #[max_length = 16]
        status -> Varchar,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    category_lender_exclusions (category_id) {
        category_id -> Bigint,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    category_lender_mappings (category_id) {
        category_id -> Bigint,
        #[max_length = 64]
        bucket_key -> Varchar,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    lender_expense_buckets (bucket_key) {
        #[max_length = 64]
        bucket_key -> Varchar,
        #[max_length = 120]
        label -> Varchar,
        sort_order -> Integer,
    }
}

diesel::table! {
    income_stream_profiles (stream_key) {
        #[max_length = 255]
        stream_key -> Varchar,
        #[max_length = 255]
        display_label -> Nullable<Varchar>,
        is_primary -> Bool,
        is_confirmed -> Bool,
        gross_monthly_dollars -> Nullable<Double>,
        #[max_length = 255]
        merged_into_key -> Nullable<Varchar>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::joinable!(category_lender_exclusions -> categories (category_id));
diesel::joinable!(category_lender_mappings -> categories (category_id));
diesel::joinable!(category_lender_mappings -> lender_expense_buckets (bucket_key));
diesel::joinable!(assets -> liabilities (liability_id));
diesel::joinable!(asset_valuations -> assets (asset_id));
diesel::joinable!(broker_report_annotations -> broker_report_snapshots (snapshot_id));
diesel::joinable!(broker_report_annotations -> transaction_data (transaction_id));
diesel::joinable!(broker_report_shares -> broker_report_snapshots (snapshot_id));
diesel::joinable!(broker_report_snapshots -> financial_accounts (account_id));
diesel::joinable!(liabilities -> financial_accounts (financial_account_id));
diesel::joinable!(liability_balances -> liabilities (liability_id));
diesel::joinable!(planned_spending -> categories (category_id));
diesel::joinable!(planned_spending_dismissed_matches -> planned_spending (planned_spending_id));
diesel::joinable!(planned_spending_dismissed_matches -> transaction_data (transaction_id));
diesel::joinable!(planned_spending_links -> planned_spending (planned_spending_id));
diesel::joinable!(planned_spending_links -> transaction_data (transaction_id));
diesel::joinable!(prediction_scenario_lines -> categories (category_id));
diesel::joinable!(prediction_scenario_lines -> prediction_scenarios (scenario_id));
diesel::joinable!(category_mappings -> categories (category_id));
diesel::joinable!(statement -> financial_accounts (financial_account_id));
diesel::joinable!(transaction_categories -> categories (category_id));
diesel::joinable!(transaction_categories -> transaction_data (transaction_id));

diesel::allow_tables_to_appear_in_same_query!(
    account_transfer_pairs,
    assets,
    asset_valuations,
    broker_report_annotations,
    broker_report_shares,
    broker_report_snapshots,
    categories,
    category_lender_exclusions,
    category_lender_mappings,
    category_mappings,
    financial_accounts,
    income_stream_profiles,
    lender_expense_buckets,
    liabilities,
    liability_balances,
    planned_spending,
    planned_spending_dismissed_matches,
    planned_spending_links,
    prediction_goals,
    prediction_scenario_lines,
    prediction_scenarios,
    statement,
    transaction_categories,
    transaction_data,
);
