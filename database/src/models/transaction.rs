use crate::models::description_key::canonical_expense_group_key;
use crate::modules::database::get_dbo;
use crate::schema::transaction_data;
use chrono::{NaiveDate, NaiveDateTime, Utc};
use diesel::dsl::count_star;
use diesel::pg::Pg;
use diesel::prelude::*;
use diesel::sql_query;
use diesel::sql_types::{BigInt, Date, Integer, Nullable, Text};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy)]
pub struct CategoryUsageStats {
    pub line_count: i64,
    pub spending_cents: i64,
    pub income_cents: i64,
}

pub const ACTIVE_STATEMENT_WHERE: &str =
    "EXISTS (SELECT 1 FROM statement s WHERE s.id = transaction_data.statement_id AND s.deleted_at IS NULL)";

pub const EXCLUDE_CONFIRMED_TRANSFERS: &str = "NOT EXISTS (
    SELECT 1 FROM account_transfer_pairs p
    WHERE p.status = 'confirmed'
      AND (p.out_transaction_id = transaction_data.id OR p.in_transaction_id = transaction_data.id)
)";

pub const EXCLUDE_CONFIRMED_TRANSFERS_AND: &str = "AND NOT EXISTS (
    SELECT 1 FROM account_transfer_pairs p
    WHERE p.status = 'confirmed'
      AND (p.out_transaction_id = transaction_data.id OR p.in_transaction_id = transaction_data.id)
)";

pub fn exclude_confirmed_transfers_sql(transaction_alias: &str) -> String {
    format!(
        "NOT EXISTS (
            SELECT 1 FROM account_transfer_pairs p
            WHERE p.status = 'confirmed'
              AND (p.out_transaction_id = {transaction_alias}.id OR p.in_transaction_id = {transaction_alias}.id)
        )"
    )
}

#[derive(QueryableByName, Debug)]
struct BreakdownGroupMatchRow {
    #[diesel(sql_type = BigInt)]
    id: i64,
    #[diesel(sql_type = Text)]
    description: String,
    #[diesel(sql_type = Nullable<Integer>)]
    category_id: Option<i32>,
}

pub fn filter_active_statement(
    query: transaction_data::BoxedQuery<'_, Pg>,
    financial_account_id: Option<i64>,
) -> transaction_data::BoxedQuery<'_, Pg> {
    let statement_scope = match financial_account_id {
        Some(account_id) => format!(
            "EXISTS (SELECT 1 FROM statement s WHERE s.id = transaction_data.statement_id AND s.deleted_at IS NULL AND s.financial_account_id = {account_id})"
        ),
        None => ACTIVE_STATEMENT_WHERE.to_string(),
    };

    query.filter(diesel::dsl::sql::<diesel::sql_types::Bool>(&statement_scope))
}

fn like_pattern(term: &str) -> String {
    let escaped = term
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_");
    format!("%{escaped}%")
}

fn sort_descending(sort_dir: Option<&str>) -> bool {
    !matches!(sort_dir, Some(direction) if direction.eq_ignore_ascii_case("asc"))
}

fn apply_transaction_list_order<'a>(
    query: transaction_data::BoxedQuery<'a, Pg>,
    sort_by: Option<&str>,
    sort_dir: Option<&str>,
) -> transaction_data::BoxedQuery<'a, Pg> {
    let descending = sort_descending(sort_dir);
    match sort_by.unwrap_or("transaction_date") {
        "amount" => {
            if descending {
                query.order((
                    transaction_data::amount.desc(),
                    transaction_data::id.desc(),
                ))
            } else {
                query.order((
                    transaction_data::amount.asc(),
                    transaction_data::id.desc(),
                ))
            }
        }
        "description" => {
            if descending {
                query.order((
                    transaction_data::description.desc(),
                    transaction_data::id.desc(),
                ))
            } else {
                query.order((
                    transaction_data::description.asc(),
                    transaction_data::id.desc(),
                ))
            }
        }
        "balance" => {
            if descending {
                query.order((
                    transaction_data::balance.desc(),
                    transaction_data::id.desc(),
                ))
            } else {
                query.order((
                    transaction_data::balance.asc(),
                    transaction_data::id.desc(),
                ))
            }
        }
        "status" => {
            if descending {
                query.order((
                    transaction_data::status.desc(),
                    transaction_data::id.desc(),
                ))
            } else {
                query.order((
                    transaction_data::status.asc(),
                    transaction_data::id.desc(),
                ))
            }
        }
        "id" => {
            if descending {
                query.order(transaction_data::id.desc())
            } else {
                query.order(transaction_data::id.asc())
            }
        }
        "account" | "financial_account" => {
            let direction = if descending { "DESC" } else { "ASC" };
            query
                .order(diesel::dsl::sql::<diesel::sql_types::Text>(&format!(
                    "(SELECT COALESCE(fa.display_name, fa.bank_name, '') FROM statement s LEFT JOIN financial_accounts fa ON fa.id = s.financial_account_id WHERE s.id = transaction_data.statement_id) {direction}"
                )))
                .then_order_by(transaction_data::id.desc())
        }
        _ => {
            if descending {
                query.order((
                    transaction_data::transaction_date.desc(),
                    transaction_data::id.desc(),
                ))
            } else {
                query.order((
                    transaction_data::transaction_date.asc(),
                    transaction_data::id.desc(),
                ))
            }
        }
    }
}

fn filtered_transactions_query(
    search: Option<&str>,
    uncategorized_only: bool,
    financial_account_id: Option<i64>,
    exclude_confirmed_transfers: bool,
) -> transaction_data::BoxedQuery<'_, Pg> {
    let mut query = filter_active_statement(
        transaction_data::table
            .filter(transaction_data::deleted_at.is_null())
            .into_boxed(),
        financial_account_id,
    );

    if uncategorized_only {
        query = query.filter(transaction_data::category_id.is_null());
    }

    if exclude_confirmed_transfers {
        query = query.filter(diesel::dsl::sql::<diesel::sql_types::Bool>(
            EXCLUDE_CONFIRMED_TRANSFERS,
        ));
    }

    if let Some(term) = search.map(str::trim).filter(|t| !t.is_empty()) {
        query = query.filter(transaction_data::description.ilike(like_pattern(term)));
    }

    query
}

// Note: The presence of a `transaction_categories` join table suggests a many-to-many
// relationship might be intended. Adding a single `category_id` here implies either
// a shift to a one-to-many relationship (one category per transaction) or that
// this field represents a primary/default category. Ensure this aligns with your
// application's logic.

#[derive(
    Queryable,
    Selectable,
    Debug,
    Serialize,
    Deserialize,
    Clone,
    AsChangeset,
    Identifiable,
)]
#[diesel(table_name = transaction_data)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Transaction {
    pub id: i64,
    pub statement_id: i32,
    pub category_id: Option<i32>,
    pub description: String,
    pub amount: i32,
    pub transaction_date: NaiveDateTime,
    pub last_updated: NaiveDateTime,
    pub deleted_at: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub status: String,
    pub balance: i32,
}

#[derive(Insertable)]
#[diesel(table_name = transaction_data)]
pub struct NewTransaction {
    pub statement_id: i32,
    pub category_id: Option<i32>,
    pub description: String,
    pub amount: i32,
    pub transaction_date: NaiveDateTime,
    pub last_updated: NaiveDateTime,
    pub deleted_at: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub status: String,
    pub balance: i32,
}

impl Transaction {
    /// Soft-deletes all active transactions for a statement (used when replacing or removing a statement).
    pub fn soft_delete_for_statement(statement_id: i32) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();
        diesel::update(
            transaction_data::table
                .filter(transaction_data::statement_id.eq(statement_id))
                .filter(transaction_data::deleted_at.is_null()),
        )
        .set((
            transaction_data::deleted_at.eq(Some(now)),
            transaction_data::last_updated.eq(now),
        ))
        .execute(conn)?;
        Ok(())
    }

    /// Returns all non-deleted transactions on active statements.
    pub fn all() -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        filter_active_statement(
            transaction_data::table
                .filter(transaction_data::deleted_at.is_null())
                .into_boxed(),
            None,
        )
        .load(conn)
    }

    /// Finds a non-deleted transaction by its ID.
    pub fn find(id: i64) -> Result<Option<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        filter_active_statement(
            transaction_data::table
                .filter(transaction_data::id.eq(id))
                .filter(transaction_data::deleted_at.is_null())
                .into_boxed(),
            None,
        )
        .first::<Self>(conn)
        .optional()
    }

    /// Finds a non-deleted transaction by its statement ID.
    /// Note: Returns the first match found if multiple exist for the same statement ID.
    pub fn find_by_statement_id(statement_id: i32) -> Result<Option<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        transaction_data::table
            .filter(transaction_data::statement_id.eq(statement_id))
            .filter(transaction_data::deleted_at.is_null()) // Filter out deleted
            .first::<Self>(conn)
            .optional()
    }

    /// Finds non-deleted transactions by statement IDs.
    pub fn find_by_statement_ids(
        statement_ids: Vec<i32>,
    ) -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        transaction_data::table
            .filter(transaction_data::statement_id.eq_any(statement_ids))
            .filter(transaction_data::deleted_at.is_null()) // Filter out deleted
            .load(conn)
    }

    /// Inserts a new transaction.
    /// Note: `deleted_at` parameter might be unusual here unless creating pre-deleted records.
    /// Consider removing it or defaulting to None internally.
    pub fn insert_batch(rows: &[NewTransaction]) -> Result<(), diesel::result::Error> {
        if rows.is_empty() {
            return Ok(());
        }
        let conn = &mut get_dbo();
        diesel::insert_into(transaction_data::table)
            .values(rows)
            .execute(conn)?;
        Ok(())
    }

    pub fn insert(
        statement_id: i32,
        category_id: Option<i32>,
        description: String,
        amount: i32,
        transaction_date: NaiveDateTime,
        deleted_at: Option<NaiveDateTime>, // Consider if this should always be None on insert
        status: String,
        balance: i32,
    ) -> Result<Self, diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();

        let new_transaction = NewTransaction {
            statement_id,
            category_id,
            description,
            amount,
            transaction_date,
            last_updated: now,
            deleted_at,
            created_at: now,
            status,
            balance,
        };

        diesel::insert_into(transaction_data::table)
            .values(&new_transaction)
            .returning(Transaction::as_returning())
            .get_result(conn)
    }

    /// Soft deletes a transaction by setting the deleted_at field.
    /// Also updates the last_updated timestamp.
    pub fn delete(id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();
        let rows_affected = diesel::update(transaction_data::table.find(id)) // .find(id) is shorthand for filter(id.eq(id))
            .set((
                transaction_data::deleted_at.eq(Some(now)), // Set deleted_at
                transaction_data::last_updated.eq(now),     // Update last_updated
            ))
            .execute(conn)?;

        if rows_affected == 0 {
            Err(diesel::result::Error::NotFound) // Return NotFound if no row was updated
        } else {
            Ok(())
        }
    }

    /// Updates category_id for many non-deleted transactions. Returns rows updated.
    pub fn bulk_update_category(
        ids: &[i64],
        category_id: Option<i32>,
    ) -> Result<usize, diesel::result::Error> {
        if ids.is_empty() {
            return Ok(0);
        }
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();
        diesel::update(
            transaction_data::table
                .filter(transaction_data::id.eq_any(ids))
                .filter(transaction_data::deleted_at.is_null()),
        )
        .set((
            transaction_data::category_id.eq(category_id),
            transaction_data::last_updated.eq(now),
        ))
        .execute(conn)
    }

    /// Updates category for transactions matching a breakdown merchant group in a date range.
    pub fn bulk_update_category_for_breakdown_group(
        group_key: &str,
        source_category_id: Option<i64>,
        start: NaiveDate,
        end: NaiveDate,
        financial_account_id: Option<i64>,
        category_id: Option<i32>,
    ) -> Result<usize, diesel::result::Error> {
        let conn = &mut get_dbo();
        let rows: Vec<BreakdownGroupMatchRow> = sql_query(
            r#"
            SELECT id, description, category_id
            FROM transaction_data
            WHERE deleted_at IS NULL
              AND EXISTS (SELECT 1 FROM statement s WHERE s.id = transaction_data.statement_id AND s.deleted_at IS NULL)
              AND ($3::bigint IS NULL OR EXISTS (
                  SELECT 1 FROM statement s2
                  WHERE s2.id = transaction_data.statement_id
                    AND s2.deleted_at IS NULL
                    AND s2.financial_account_id = $3
              ))
              AND transaction_date::date >= $1
              AND transaction_date::date <= $2
            "#,
        )
        .bind::<Date, _>(start)
        .bind::<Date, _>(end)
        .bind::<Nullable<BigInt>, _>(financial_account_id)
        .load(conn)?;

        let ids: Vec<i64> = rows
            .into_iter()
            .filter(|row| {
                if canonical_expense_group_key(&row.description) != group_key {
                    return false;
                }
                match source_category_id {
                    None => row.category_id.is_none(),
                    Some(source) => row.category_id.map(i64::from) == Some(source),
                }
            })
            .map(|row| row.id)
            .collect();

        Self::bulk_update_category(&ids, category_id)
    }

    /// Updates the category_id for a specific, non-deleted transaction.
    /// Also updates the last_updated timestamp.
    /// Returns the updated transaction.
    pub fn update_category(
        id: i64,
        category_id: Option<i32>,
    ) -> Result<Self, diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();

        // Target only non-deleted transactions for the update
        let target = transaction_data::table
            .filter(transaction_data::id.eq(id))
            .filter(transaction_data::deleted_at.is_null());

        let rows_affected = diesel::update(target)
            .set((
                // Use a tuple to set multiple fields
                transaction_data::category_id.eq(category_id),
                transaction_data::last_updated.eq(now), // Update last_updated timestamp
            ))
            .execute(conn)?;

        if rows_affected == 0 {
            // If no rows were affected, the transaction either didn't exist or was already deleted.
            Err(diesel::result::Error::NotFound)
        } else {
            // Fetch and return the updated transaction using the `find` method (which checks deleted_at).
            Self::find(id).and_then(|opt| opt.ok_or(diesel::result::Error::NotFound))
            // Should succeed if update worked
        }
    }

    pub fn list_paginated(
        page: i64,
        per_page: i64,
        search: Option<&str>,
        uncategorized_only: bool,
        financial_account_id: Option<i64>,
        exclude_confirmed_transfers: bool,
        sort_by: Option<&str>,
        sort_dir: Option<&str>,
    ) -> Result<(Vec<Self>, i64), diesel::result::Error> {
        let conn = &mut get_dbo();
        let page = page.max(1);
        let per_page = per_page.clamp(1, 200);
        let offset = (page - 1) * per_page;

        let total: i64 = filtered_transactions_query(
            search,
            uncategorized_only,
            financial_account_id,
            exclude_confirmed_transfers,
        )
        .select(count_star())
        .get_result(conn)?;

        let items = apply_transaction_list_order(
            filtered_transactions_query(
                search,
                uncategorized_only,
                financial_account_id,
                exclude_confirmed_transfers,
            ),
            sort_by,
            sort_dir,
        )
        .limit(per_page)
        .offset(offset)
        .select(Transaction::as_select())
        .load(conn)?;

        Ok((items, total))
    }

    /// Counts active, non-deleted transactions with no category assigned.
    pub fn count_uncategorized() -> Result<i64, diesel::result::Error> {
        let conn = &mut get_dbo();
        filter_active_statement(
            transaction_data::table
                .filter(transaction_data::deleted_at.is_null())
                .filter(transaction_data::category_id.is_null())
                .filter(diesel::dsl::sql::<diesel::sql_types::Bool>(
                    EXCLUDE_CONFIRMED_TRANSFERS,
                ))
                .into_boxed(),
            None,
        )
        .select(count_star())
        .get_result(conn)
    }

    /// Per-category usage from imported statement lines (active statements only).
    pub fn usage_by_category(
        financial_account_id: Option<i64>,
    ) -> Result<std::collections::HashMap<i64, CategoryUsageStats>, diesel::result::Error> {
        use diesel::sql_query;
        use diesel::sql_types::{BigInt, Nullable};
        use diesel::QueryableByName;

        #[derive(QueryableByName)]
        struct CategoryUsageRow {
            #[diesel(sql_type = BigInt)]
            category_id: i64,
            #[diesel(sql_type = BigInt)]
            line_count: i64,
            #[diesel(sql_type = BigInt)]
            spending_cents: i64,
            #[diesel(sql_type = BigInt)]
            income_cents: i64,
        }

        let conn = &mut get_dbo();
        let rows: Vec<CategoryUsageRow> = sql_query(
            "SELECT
                category_id::bigint AS category_id,
                COUNT(*)::bigint AS line_count,
                COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)::bigint AS spending_cents,
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::bigint AS income_cents
             FROM transaction_data
             WHERE deleted_at IS NULL
               AND category_id IS NOT NULL
               AND EXISTS (
                   SELECT 1 FROM statement s
                   WHERE s.id = transaction_data.statement_id
                     AND s.deleted_at IS NULL
                     AND ($1::bigint IS NULL OR s.financial_account_id = $1)
               )
               AND NOT EXISTS (
                   SELECT 1 FROM account_transfer_pairs p
                   WHERE p.status = 'confirmed'
                     AND (p.out_transaction_id = transaction_data.id
                          OR p.in_transaction_id = transaction_data.id)
               )
             GROUP BY category_id",
        )
        .bind::<Nullable<BigInt>, _>(financial_account_id)
        .load(conn)?;

        let mut usage = std::collections::HashMap::new();
        for row in rows {
            usage.insert(
                row.category_id,
                CategoryUsageStats {
                    line_count: row.line_count,
                    spending_cents: row.spending_cents,
                    income_cents: row.income_cents,
                },
            );
        }
        Ok(usage)
    }

    /// Uncategorized statement-line totals (active statements only).
    pub fn uncategorized_usage(
        financial_account_id: Option<i64>,
    ) -> Result<CategoryUsageStats, diesel::result::Error> {
        use diesel::sql_query;
        use diesel::sql_types::{BigInt, Nullable};
        use diesel::QueryableByName;

        #[derive(QueryableByName)]
        struct UncategorizedUsageRow {
            #[diesel(sql_type = BigInt)]
            line_count: i64,
            #[diesel(sql_type = BigInt)]
            spending_cents: i64,
            #[diesel(sql_type = BigInt)]
            income_cents: i64,
        }

        let conn = &mut get_dbo();
        let row: UncategorizedUsageRow = sql_query(
            "SELECT
                COUNT(*)::bigint AS line_count,
                COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)::bigint AS spending_cents,
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::bigint AS income_cents
             FROM transaction_data
             WHERE deleted_at IS NULL
               AND category_id IS NULL
               AND EXISTS (
                   SELECT 1 FROM statement s
                   WHERE s.id = transaction_data.statement_id
                     AND s.deleted_at IS NULL
                     AND ($1::bigint IS NULL OR s.financial_account_id = $1)
               )
               AND NOT EXISTS (
                   SELECT 1 FROM account_transfer_pairs p
                   WHERE p.status = 'confirmed'
                     AND (p.out_transaction_id = transaction_data.id
                          OR p.in_transaction_id = transaction_data.id)
               )",
        )
        .bind::<Nullable<BigInt>, _>(financial_account_id)
        .get_result(conn)?;

        Ok(CategoryUsageStats {
            line_count: row.line_count,
            spending_cents: row.spending_cents,
            income_cents: row.income_cents,
        })
    }

    /// Counts non-deleted transactions on active statements.
    pub fn count() -> Result<i64, diesel::result::Error> {
        let conn = &mut get_dbo();
        filter_active_statement(
            transaction_data::table
                .filter(transaction_data::deleted_at.is_null())
                .into_boxed(),
            None,
        )
        .select(count_star())
        .get_result(conn)
    }

    // Example: Find transactions by category_id (non-deleted only)
    pub fn find_by_category_id(category_id: i32) -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        transaction_data::table
            .filter(transaction_data::category_id.eq(category_id))
            .filter(transaction_data::deleted_at.is_null()) // Filter out deleted
            .load(conn)
    }
}
