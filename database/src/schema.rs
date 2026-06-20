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

diesel::joinable!(planned_spending -> categories (category_id));
diesel::joinable!(prediction_scenario_lines -> categories (category_id));
diesel::joinable!(prediction_scenario_lines -> prediction_scenarios (scenario_id));
diesel::joinable!(category_mappings -> categories (category_id));
diesel::joinable!(statement -> financial_accounts (financial_account_id));
diesel::joinable!(transaction_categories -> categories (category_id));
diesel::joinable!(transaction_categories -> transaction_data (transaction_id));

diesel::allow_tables_to_appear_in_same_query!(
    categories,
    category_mappings,
    financial_accounts,
    planned_spending,
    prediction_goals,
    prediction_scenario_lines,
    prediction_scenarios,
    statement,
    transaction_categories,
    transaction_data,
);
