// @generated automatically by Diesel CLI.

diesel::table! {
    data (id) {
        id -> Integer,
        #[max_length = 255]
        title -> Varchar,
        description -> Mediumtext,
        #[max_length = 100]
        channel -> Varchar,
        start -> Datetime,
        end -> Datetime,
        sport_id -> Nullable<Integer>,
    }
}

diesel::table! {
    jobs (id) {
        id -> Integer,
        #[max_length = 255]
        name -> Varchar,
        #[max_length = 255]
        cron -> Varchar,
        last_run -> Nullable<Timestamp>,
        created_at -> Nullable<Timestamp>,
        deleted_at -> Nullable<Timestamp>,
        deleted -> Nullable<Bool>,
    }
}

diesel::table! {
    password_resets (id) {
        id -> Integer,
        #[max_length = 255]
        email -> Varchar,
        #[max_length = 255]
        token -> Varchar,
        created_at -> Timestamp,
    }
}

diesel::table! {
    sports (id) {
        id -> Integer,
        #[max_length = 255]
        name -> Varchar,
        #[max_length = 255]
        regex -> Varchar,
    }
}

diesel::table! {
    sports_regex (id) {
        id -> Unsigned<Bigint>,
        sport_id -> Integer,
        #[max_length = 255]
        regex -> Varchar,
    }
}

diesel::table! {
    test_table (id) {
        id -> Unsigned<Bigint>,
        #[max_length = 255]
        name -> Varchar,
    }
}

diesel::table! {
    user_rights (id) {
        id -> Integer,
        user_id -> Integer,
        right_name -> Text,
        created_at -> Timestamp,
        created_by -> Nullable<Integer>,
    }
}

diesel::table! {
    user_rights_history (id) {
        id -> Integer,
        user_id -> Integer,
        right_name -> Text,
        created_at -> Timestamp,
        created_by -> Nullable<Integer>,
        deleted_at -> Nullable<Timestamp>,
        deleted_by -> Nullable<Integer>,
    }
}

diesel::table! {
    users (id) {
        id -> Integer,
        #[max_length = 255]
        username -> Varchar,
        #[max_length = 255]
        email -> Varchar,
        #[max_length = 255]
        password -> Varchar,
        #[max_length = 255]
        location -> Varchar,
        created_at -> Timestamp,
        enabled -> Bool,
        validated -> Bool,
        validation_key -> Nullable<Text>,
    }
}

diesel::joinable!(data -> sports (sport_id));
diesel::joinable!(sports_regex -> sports (sport_id));

diesel::allow_tables_to_appear_in_same_query!(
    data,
    jobs,
    password_resets,
    sports,
    sports_regex,
    test_table,
    user_rights,
    user_rights_history,
    users,
);
