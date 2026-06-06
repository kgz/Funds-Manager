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
    statement (id) {
        id -> Bigint,
        date -> Date,
        #[max_length = 25]
        account_id -> Varchar,
        opening_balance -> Integer,
        closing_balance -> Integer,
        deleted_at -> Nullable<Timestamp>,
        created_at -> Timestamp,
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

diesel::joinable!(category_mappings -> categories (category_id));
diesel::joinable!(transaction_categories -> categories (category_id));
diesel::joinable!(transaction_categories -> transaction_data (transaction_id));

diesel::allow_tables_to_appear_in_same_query!(
    categories,
    category_mappings,
    statement,
    transaction_categories,
    transaction_data,
);
