use crate::models::financial_account::FinancialAccount;
use crate::models::transaction::Transaction;
use crate::modules::database::get_dbo;
use crate::schema::statement;
use chrono::{Datelike, Months, NaiveDate, NaiveDateTime, Utc};
use diesel::dsl::count_star;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};

#[derive(Queryable, Selectable, Debug, Serialize, Deserialize, Clone, AsChangeset)]
#[diesel(table_name = statement)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Statement {
    pub id: i64,
    pub date: NaiveDate,
    pub account_id: String,
    pub opening_balance: i32,
    pub closing_balance: i32,
    pub deleted_at: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub financial_account_id: Option<i64>,
    pub period_start: Option<NaiveDate>,
    pub period_end: Option<NaiveDate>,
}

#[derive(Insertable)]
#[diesel(table_name = statement)]
pub struct NewStatement {
    pub date: NaiveDate,
    pub account_id: String,
    pub opening_balance: i32,
    pub closing_balance: i32,
    pub deleted_at: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub financial_account_id: Option<i64>,
    pub period_start: Option<NaiveDate>,
    pub period_end: Option<NaiveDate>,
}

#[derive(Debug, Serialize, Clone, PartialEq, Eq)]
pub struct MissingStatementPeriod {
    pub account_label: String,
    pub period: String,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
enum AccountScope {
    Linked(i64),
    Legacy(String),
}

impl Statement {
    /// All rows including soft-deleted (for migrations / admin tooling).
    pub fn all() -> Result<Vec<Statement>, diesel::result::Error> {
        let conn = &mut get_dbo();
        statement::table.load(conn)
    }

    /// Statements that are not soft-deleted (normal app lists).
    pub fn all_active() -> Result<Vec<Statement>, diesel::result::Error> {
        let conn = &mut get_dbo();
        statement::table
            .filter(statement::deleted_at.is_null())
            .load(conn)
    }

    /// Finds a statement by its ID, excluding deleted statements.
    pub fn find(id: i64) -> Result<Option<Statement>, diesel::result::Error> {
        let conn = &mut get_dbo();
        statement::table
            .filter(statement::id.eq(id))
            .filter(statement::deleted_at.is_null())
            .first::<Statement>(conn)
            .optional()
    }

    /// Finds statements by account ID and date, excluding deleted statements.
    pub fn find_by_account_id(
        account_id: &str,
        date: &NaiveDate,
    ) -> Result<Vec<Statement>, diesel::result::Error> {
        let conn = &mut get_dbo();
        statement::table
            .filter(statement::account_id.eq(account_id))
            .filter(statement::date.eq(date))
            .filter(statement::deleted_at.is_null())
            .load(conn)
    }

    /// Inserts a new statement into the database.
    pub fn insert(
        date: NaiveDate,
        account_id: String,
        opening_balance: i32,
        financial_account_id: i64,
        period_start: NaiveDate,
        period_end: NaiveDate,
    ) -> Result<Statement, diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();
        let new_statement = NewStatement {
            date,
            account_id,
            opening_balance,
            closing_balance: 0,
            deleted_at: None,
            created_at: now,
            financial_account_id: Some(financial_account_id),
            period_start: Some(period_start),
            period_end: Some(period_end),
        };
        diesel::insert_into(statement::table)
            .values(&new_statement)
            .returning(Statement::as_returning())
            .get_result(conn)
    }

    /// Updates the closing balance of a statement.
    pub fn update_closing_balance(
        id: i64,
        closing_balance: i32,
    ) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        diesel::update(statement::table.filter(statement::id.eq(id)))
            .set(statement::closing_balance.eq(closing_balance))
            .execute(conn)?;
        Ok(())
    }

    pub fn list_paginated(
        page: i64,
        per_page: i64,
        financial_account_id: Option<i64>,
    ) -> Result<(Vec<Statement>, i64), diesel::result::Error> {
        let conn = &mut get_dbo();
        let page = page.max(1);
        let per_page = per_page.clamp(1, 200);
        let offset = (page - 1) * per_page;

        let mut count_query = statement::table
            .filter(statement::deleted_at.is_null())
            .into_boxed();
        let mut items_query = statement::table
            .filter(statement::deleted_at.is_null())
            .into_boxed();

        if let Some(account_id) = financial_account_id {
            count_query = count_query.filter(statement::financial_account_id.eq(account_id));
            items_query = items_query.filter(statement::financial_account_id.eq(account_id));
        }

        let total: i64 = count_query.select(count_star()).get_result(conn)?;

        let items = items_query
            .order((statement::date.desc(), statement::id.desc()))
            .limit(per_page)
            .offset(offset)
            .select(Statement::as_select())
            .load(conn)?;

        Ok((items, total))
    }

    /// Month labels (e.g. "Feb 2024") for gaps between active statement periods, per account.
    pub fn missing_periods(
        financial_account_id: Option<i64>,
    ) -> Result<Vec<MissingStatementPeriod>, diesel::result::Error> {
        let conn = &mut get_dbo();

        let mut query = statement::table
            .filter(statement::deleted_at.is_null())
            .into_boxed();

        if let Some(account_id) = financial_account_id {
            query = query.filter(statement::financial_account_id.eq(account_id));
        }

        let rows: Vec<(Option<i64>, String, NaiveDate, Option<NaiveDate>, Option<NaiveDate>)> =
            query
                .select((
                    statement::financial_account_id,
                    statement::account_id,
                    statement::date,
                    statement::period_start,
                    statement::period_end,
                ))
                .load(conn)?;

        let label_by_id: HashMap<i64, String> = FinancialAccount::all_active()?
            .into_iter()
            .map(|account| (account.id, account.display_name))
            .collect();

        let mut ranges_by_account: BTreeMap<AccountScope, Vec<(NaiveDate, NaiveDate)>> =
            BTreeMap::new();

        for (linked_id, account_id, date, period_start, period_end) in rows {
            let scope = match linked_id {
                Some(id) => AccountScope::Linked(id),
                None => AccountScope::Legacy(account_id),
            };
            let start = period_start.unwrap_or_else(|| start_of_month(date));
            let end = period_end.unwrap_or(date);
            ranges_by_account
                .entry(scope)
                .or_default()
                .push((start, end));
        }

        let mut missing = Vec::new();

        for (scope, ranges) in ranges_by_account {
            let account_label = match scope {
                AccountScope::Linked(id) => label_by_id
                    .get(&id)
                    .cloned()
                    .unwrap_or_else(|| format!("Account {id}")),
                AccountScope::Legacy(account_id) => account_id,
            };

            for period in missing_month_labels_for_ranges(&ranges, Utc::now().date_naive()) {
                missing.push(MissingStatementPeriod {
                    account_label: account_label.clone(),
                    period,
                });
            }
        }

        missing.sort_by(|left, right| {
            left.account_label
                .cmp(&right.account_label)
                .then_with(|| parse_period_label(&left.period).cmp(&parse_period_label(&right.period)))
        });

        Ok(missing)
    }

    /// Soft-deletes a statement and its transactions. Idempotent: unknown id → `NotFound`; already deleted → `Ok`.
    pub fn delete(id: i64) -> Result<(), diesel::result::Error> {
        if let Ok(statement_id) = i32::try_from(id) {
            Transaction::soft_delete_for_statement(statement_id)?;
        }

        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();
        let rows = diesel::update(
            statement::table
                .filter(statement::id.eq(id))
                .filter(statement::deleted_at.is_null()),
        )
        .set(statement::deleted_at.eq(now))
        .execute(conn)?;
        if rows > 0 {
            return Ok(());
        }
        let still_exists: i64 = statement::table
            .filter(statement::id.eq(id))
            .select(count_star())
            .get_result(conn)?;
        if still_exists > 0 {
            return Ok(());
        }
        Err(diesel::result::Error::NotFound)
    }
}

fn missing_month_labels_for_ranges(
    ranges: &[(NaiveDate, NaiveDate)],
    as_of: NaiveDate,
) -> Vec<String> {
    if ranges.is_empty() {
        return Vec::new();
    }

    let mut covered = HashSet::new();
    for &(start, end) in ranges {
        for month in months_in_range(start, end) {
            covered.insert(month);
        }
    }

    let Some(earliest) = ranges.iter().map(|(start, _)| *start).min() else {
        return Vec::new();
    };

    let mut missing = Vec::new();
    let mut cursor = start_of_month(earliest);
    let now_start = start_of_month(as_of);

    while cursor < now_start {
        if !covered.contains(&cursor) {
            missing.push(month_label(cursor));
        }
        cursor = match cursor.checked_add_months(Months::new(1)) {
            Some(d) => d,
            None => break,
        };
    }

    missing
}

fn months_in_range(start: NaiveDate, end: NaiveDate) -> Vec<NaiveDate> {
    let mut months = Vec::new();
    let mut cursor = start_of_month(start);
    let end_month = start_of_month(end);

    while cursor <= end_month {
        months.push(cursor);
        cursor = match cursor.checked_add_months(Months::new(1)) {
            Some(d) => d,
            None => break,
        };
    }

    months
}

fn start_of_month(d: NaiveDate) -> NaiveDate {
    NaiveDate::from_ymd_opt(d.year(), d.month(), 1).unwrap_or(d)
}

fn month_label(d: NaiveDate) -> String {
    d.format("%b %Y").to_string()
}

fn parse_period_label(label: &str) -> NaiveDate {
    NaiveDate::parse_from_str(label, "%b %Y")
        .map(start_of_month)
        .unwrap_or_else(|_| NaiveDate::from_ymd_opt(1970, 1, 1).expect("epoch"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn multi_month_statement_covers_intermediate_months() {
        let ranges = [(
            NaiveDate::from_ymd_opt(2024, 12, 20).unwrap(),
            NaiveDate::from_ymd_opt(2025, 6, 19).unwrap(),
        )];

        let missing = missing_month_labels_for_ranges(
            &ranges,
            NaiveDate::from_ymd_opt(2025, 6, 19).unwrap(),
        );
        assert!(missing.is_empty());
    }

    #[test]
    fn gap_between_multi_month_statements_is_flagged() {
        let ranges = [
            (
                NaiveDate::from_ymd_opt(2024, 12, 27).unwrap(),
                NaiveDate::from_ymd_opt(2025, 6, 19).unwrap(),
            ),
            (
                NaiveDate::from_ymd_opt(2025, 12, 27).unwrap(),
                NaiveDate::from_ymd_opt(2026, 6, 18).unwrap(),
            ),
        ];

        let missing = missing_month_labels_for_ranges(
            &ranges,
            NaiveDate::from_ymd_opt(2026, 6, 22).unwrap(),
        );
        assert_eq!(
            missing,
            vec![
                "Jul 2025".to_string(),
                "Aug 2025".to_string(),
                "Sep 2025".to_string(),
                "Oct 2025".to_string(),
                "Nov 2025".to_string(),
            ]
        );
    }

    #[test]
    fn monthly_statements_with_gap_flag_missing_month() {
        let ranges = [
            (
                NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
                NaiveDate::from_ymd_opt(2024, 1, 31).unwrap(),
            ),
            (
                NaiveDate::from_ymd_opt(2024, 3, 1).unwrap(),
                NaiveDate::from_ymd_opt(2024, 3, 31).unwrap(),
            ),
        ];

        let missing = missing_month_labels_for_ranges(
            &ranges,
            NaiveDate::from_ymd_opt(2024, 3, 31).unwrap(),
        );
        assert_eq!(missing, vec!["Feb 2024".to_string()]);
    }
}
