use crate::models::financial_account::FinancialAccount;
use crate::models::transaction::Transaction;
use crate::modules::database::get_dbo;
use crate::schema::statement;
use chrono::{Datelike, Months, NaiveDate, NaiveDateTime, Utc};
use diesel::dsl::count_star;
use diesel::pg::Pg;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};

fn sort_descending(sort_dir: Option<&str>) -> bool {
    !matches!(sort_dir, Some(direction) if direction.eq_ignore_ascii_case("asc"))
}

fn apply_statement_list_order<'a>(
    query: statement::BoxedQuery<'a, Pg>,
    sort_by: Option<&str>,
    sort_dir: Option<&str>,
) -> statement::BoxedQuery<'a, Pg> {
    let descending = sort_descending(sort_dir);
    match sort_by.unwrap_or("date") {
        "id" => {
            if descending {
                query.order(statement::id.desc())
            } else {
                query.order(statement::id.asc())
            }
        }
        "closing_balance" => {
            let direction = if descending { "DESC" } else { "ASC" };
            query
                .order(diesel::dsl::sql::<diesel::sql_types::Integer>(&format!(
                    "(statement.closing_balance - statement.opening_balance) {direction}"
                )))
                .then_order_by(statement::id.desc())
        }
        "account" | "financial_account" => {
            let direction = if descending { "DESC" } else { "ASC" };
            query
                .order(diesel::dsl::sql::<diesel::sql_types::Text>(&format!(
                    "(SELECT COALESCE(fa.display_name, fa.bank_name, statement.account_id) FROM financial_accounts fa WHERE fa.id = statement.financial_account_id) {direction}"
                )))
                .then_order_by(statement::id.desc())
        }
        _ => {
            if descending {
                query.order((statement::date.desc(), statement::id.desc()))
            } else {
                query.order((statement::date.asc(), statement::id.desc()))
            }
        }
    }
}

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
        sort_by: Option<&str>,
        sort_dir: Option<&str>,
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

        let items = apply_statement_list_order(items_query, sort_by, sort_dir)
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
        let as_of = Utc::now().date_naive();

        for (scope, ranges) in ranges_by_account {
            let account_label = match scope {
                AccountScope::Linked(id) => label_by_id
                    .get(&id)
                    .cloned()
                    .unwrap_or_else(|| format!("Account {id}")),
                AccountScope::Legacy(account_id) => account_id,
            };

            let Some(earliest) = ranges.iter().map(|(start, _)| *start).min() else {
                continue;
            };

            let coverage = statement_coverage_in_window(
                &ranges,
                earliest,
                missing_periods_window_end(as_of),
            );

            if coverage.sufficient {
                continue;
            }

            if coverage.multi_month_cadence && !coverage.gap_ranges.is_empty() {
                for gap in coverage.gap_ranges {
                    missing.push(MissingStatementPeriod {
                        account_label: account_label.clone(),
                        period: format!("{} to {}", gap.start_date, gap.end_date),
                    });
                }
                continue;
            }

            for period in coverage.missing_months {
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

pub const STATEMENT_RANGE_JOIN_DAYS: i64 = 7;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StatementCoverageResult {
    pub missing_months: Vec<String>,
    pub gap_ranges: Vec<StatementCoverageGap>,
    pub multi_month_cadence: bool,
    pub sufficient: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatementCoverageGap {
    pub start_date: String,
    pub end_date: String,
}

pub fn gap_days_between(last_end: NaiveDate, next_start: NaiveDate) -> i64 {
    if next_start <= last_end {
        return 0;
    }
    next_start.signed_duration_since(last_end).num_days() - 1
}

pub fn merge_statement_ranges(
    ranges: &[(NaiveDate, NaiveDate)],
    join_gap_days: i64,
) -> Vec<(NaiveDate, NaiveDate)> {
    if ranges.is_empty() {
        return Vec::new();
    }

    let mut sorted: Vec<(NaiveDate, NaiveDate)> = ranges.to_vec();
    sorted.sort_by_key(|(start, _)| *start);

    let mut merged = vec![sorted[0]];
    for (start, end) in sorted.into_iter().skip(1) {
        let (_, last_end) = merged
            .last_mut()
            .expect("merged ranges should not be empty");
        if gap_days_between(*last_end, start) <= join_gap_days {
            if end > *last_end {
                *last_end = end;
            }
        } else {
            merged.push((start, end));
        }
    }

    merged
}

fn median_statement_span_days(ranges: &[(NaiveDate, NaiveDate)]) -> i32 {
    if ranges.is_empty() {
        return 30;
    }
    let mut spans: Vec<i64> = ranges
        .iter()
        .map(|(start, end)| end.signed_duration_since(*start).num_days())
        .filter(|days| *days >= 0)
        .collect();
    if spans.is_empty() {
        return 30;
    }
    spans.sort_unstable();
    let mid = spans.len() / 2;
    i32::try_from(spans[mid]).unwrap_or(30)
}

pub fn end_of_month(d: NaiveDate) -> NaiveDate {
    let month_start = start_of_month(d);
    month_start
        .checked_add_months(Months::new(1))
        .expect("next month")
        - chrono::Duration::days(1)
}

fn month_overlaps_merged_ranges(
    month: NaiveDate,
    merged: &[(NaiveDate, NaiveDate)],
    window_start: NaiveDate,
    window_end: NaiveDate,
) -> bool {
    let month_start = start_of_month(month);
    let month_end = end_of_month(month);
    let clip_start = month_start.max(window_start);
    let clip_end = month_end.min(window_end);
    if clip_start > clip_end {
        return true;
    }
    merged
        .iter()
        .any(|(range_start, range_end)| *range_start <= clip_end && *range_end >= clip_start)
}

fn uncovered_gaps_in_window(
    merged: &[(NaiveDate, NaiveDate)],
    window_start: NaiveDate,
    window_end: NaiveDate,
) -> Vec<(NaiveDate, NaiveDate)> {
    if window_end < window_start {
        return Vec::new();
    }

    let mut gaps = Vec::new();
    let mut cursor = window_start;

    if merged.is_empty() {
        return vec![(window_start, window_end)];
    }

    for &(range_start, range_end) in merged {
        if range_end < window_start {
            continue;
        }
        if range_start > window_end {
            break;
        }
        if range_start > cursor {
            let gap_end = range_start.pred_opt().unwrap_or(range_start);
            if gap_end >= cursor {
                gaps.push((cursor, gap_end));
            }
        }
        cursor = range_end
            .succ_opt()
            .unwrap_or(range_end)
            .max(cursor);
        if cursor > window_end {
            return gaps;
        }
    }

    if cursor <= window_end {
        gaps.push((cursor, window_end));
    }

    gaps
}

fn apply_trailing_grace(
    gaps: Vec<(NaiveDate, NaiveDate)>,
    merged: &[(NaiveDate, NaiveDate)],
    window_end: NaiveDate,
    median_span_days: i32,
) -> Vec<(NaiveDate, NaiveDate)> {
    if gaps.is_empty() || merged.is_empty() {
        return gaps;
    }

    let Some((_, last_end)) = merged.last() else {
        return gaps;
    };

    let grace_days = i64::from(median_span_days) + 14;
    gaps.into_iter()
        .filter(|(gap_start, gap_end)| {
            if *gap_end < window_end {
                return true;
            }
            if *gap_start <= *last_end {
                return true;
            }
            let gap_len = gap_end
                .signed_duration_since(*gap_start)
                .num_days()
                .max(0);
            gap_len > grace_days
        })
        .collect()
}

pub fn statement_coverage_in_window(
    ranges: &[(NaiveDate, NaiveDate)],
    window_start: NaiveDate,
    window_end: NaiveDate,
) -> StatementCoverageResult {
    let month_window_start = start_of_month(window_start);
    let month_window_end = start_of_month(window_end);
    if month_window_end < month_window_start {
        return StatementCoverageResult {
            missing_months: Vec::new(),
            gap_ranges: Vec::new(),
            multi_month_cadence: false,
            sufficient: true,
        };
    }

    let median_span = median_statement_span_days(ranges);
    let multi_month_cadence = median_span >= 45;
    let merged = merge_statement_ranges(ranges, STATEMENT_RANGE_JOIN_DAYS);
    let raw_gaps = uncovered_gaps_in_window(&merged, window_start, window_end);
    let gaps = if multi_month_cadence {
        apply_trailing_grace(raw_gaps, &merged, window_end, median_span)
    } else {
        raw_gaps
    };

    let mut missing = Vec::new();
    for month in months_in_range(month_window_start, month_window_end) {
        if !month_overlaps_merged_ranges(month, &merged, window_start, window_end) {
            missing.push(month_label(month));
        }
    }

    StatementCoverageResult {
        sufficient: gaps.is_empty(),
        missing_months: missing,
        gap_ranges: gaps
            .into_iter()
            .map(|(start, end)| StatementCoverageGap {
                start_date: start.to_string(),
                end_date: end.to_string(),
            })
            .collect(),
        multi_month_cadence,
    }
}

fn missing_periods_window_end(as_of: NaiveDate) -> NaiveDate {
    let prior_month = start_of_month(as_of)
        .checked_sub_months(Months::new(1))
        .unwrap_or_else(|| start_of_month(as_of));
    end_of_month(prior_month)
}

#[cfg(test)]
fn missing_month_labels_for_ranges(
    ranges: &[(NaiveDate, NaiveDate)],
    as_of: NaiveDate,
) -> Vec<String> {
    if ranges.is_empty() {
        return Vec::new();
    }

    let Some(earliest) = ranges.iter().map(|(start, _)| *start).min() else {
        return Vec::new();
    };

    statement_coverage_in_window(&ranges, earliest, missing_periods_window_end(as_of)).missing_months
}

pub fn missing_month_labels_in_window(
    ranges: &[(NaiveDate, NaiveDate)],
    window_start: NaiveDate,
    window_end: NaiveDate,
) -> Vec<String> {
    statement_coverage_in_window(ranges, window_start, window_end).missing_months
}

pub fn months_in_range(start: NaiveDate, end: NaiveDate) -> Vec<NaiveDate> {
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

pub fn start_of_month(d: NaiveDate) -> NaiveDate {
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
    fn banksa_week_handoff_between_half_year_statements_merges() {
        let ranges = [
            (
                NaiveDate::from_ymd_opt(2024, 12, 27).unwrap(),
                NaiveDate::from_ymd_opt(2025, 6, 19).unwrap(),
            ),
            (
                NaiveDate::from_ymd_opt(2025, 6, 20).unwrap(),
                NaiveDate::from_ymd_opt(2025, 12, 19).unwrap(),
            ),
            (
                NaiveDate::from_ymd_opt(2025, 12, 27).unwrap(),
                NaiveDate::from_ymd_opt(2026, 6, 18).unwrap(),
            ),
        ];

        assert_eq!(gap_days_between(
            NaiveDate::from_ymd_opt(2025, 12, 19).unwrap(),
            NaiveDate::from_ymd_opt(2025, 12, 27).unwrap(),
        ), 7);

        let coverage = statement_coverage_in_window(
            &ranges,
            NaiveDate::from_ymd_opt(2024, 12, 27).unwrap(),
            NaiveDate::from_ymd_opt(2026, 6, 18).unwrap(),
        );
        assert!(coverage.sufficient, "expected no gaps: {:?}", coverage.gap_ranges);
        assert!(coverage.gap_ranges.is_empty());
    }

    #[test]
    fn banksa_contiguous_half_year_missing_labels_empty() {
        let ranges = [
            (
                NaiveDate::from_ymd_opt(2024, 12, 20).unwrap(),
                NaiveDate::from_ymd_opt(2025, 6, 19).unwrap(),
            ),
            (
                NaiveDate::from_ymd_opt(2025, 6, 20).unwrap(),
                NaiveDate::from_ymd_opt(2025, 12, 19).unwrap(),
            ),
        ];

        let missing = missing_month_labels_for_ranges(
            &ranges,
            NaiveDate::from_ymd_opt(2025, 12, 31).unwrap(),
        );
        assert!(missing.is_empty());
    }

    #[test]
    fn banksa_contiguous_half_year_statements_have_no_interior_gaps() {
        let ranges = [
            (
                NaiveDate::from_ymd_opt(2024, 12, 20).unwrap(),
                NaiveDate::from_ymd_opt(2025, 6, 19).unwrap(),
            ),
            (
                NaiveDate::from_ymd_opt(2025, 6, 20).unwrap(),
                NaiveDate::from_ymd_opt(2025, 12, 19).unwrap(),
            ),
        ];

        let coverage = statement_coverage_in_window(
            &ranges,
            NaiveDate::from_ymd_opt(2025, 1, 1).unwrap(),
            NaiveDate::from_ymd_opt(2025, 12, 31).unwrap(),
        );
        assert!(coverage.sufficient);
        assert!(coverage.multi_month_cadence);
        assert!(coverage.missing_months.is_empty());
        assert!(coverage.gap_ranges.is_empty());
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
    fn missing_month_labels_in_window_respects_bounds() {
        let ranges = [(
            NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            NaiveDate::from_ymd_opt(2024, 3, 31).unwrap(),
        )];

        let missing = missing_month_labels_in_window(
            &ranges,
            NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            NaiveDate::from_ymd_opt(2024, 6, 30).unwrap(),
        );
        assert_eq!(
            missing,
            vec![
                "Apr 2024".to_string(),
                "May 2024".to_string(),
                "Jun 2024".to_string(),
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
