use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;
use diesel::OptionalExtension;
use diesel::sql_query;
use diesel::dsl::count_star;
use diesel::pg::Pg;
use diesel::pg::sql_types::Array;
use diesel::sql_types::{BigInt, Date, Integer, Nullable, Text};
use serde::Serialize;
use std::collections::HashMap;

use crate::models::category::Category;
use crate::models::transaction::{filter_active_statement, ACTIVE_STATEMENT_WHERE};
use crate::models::description_key::canonical_expense_group_key;
use crate::models::recurring_detection::{
    detect_recurring_expenses, detect_recurring_income, RecurringCandidate, SlimTransaction,
};
use crate::models::transaction::Transaction;
use crate::modules::database::get_dbo;
use crate::schema::transaction_data;

#[derive(Debug, Clone, Copy)]
pub struct AnalyticsScope {
    pub start: Option<NaiveDate>,
    pub end: Option<NaiveDate>,
    pub financial_account_id: Option<i64>,
}

fn apply_date_scope(
    query: transaction_data::BoxedQuery<'_, Pg>,
    scope: AnalyticsScope,
) -> transaction_data::BoxedQuery<'_, Pg> {
    let mut query = filter_active_statement(query, scope.financial_account_id);
    if let Some(start_date) = scope.start {
        query = query.filter(
            transaction_data::transaction_date
                .ge(start_date.and_hms_opt(0, 0, 0).expect("midnight")),
        );
    }
    if let Some(end_date) = scope.end {
        if let Some(end_exclusive) = end_date.succ_opt().and_then(|d| d.and_hms_opt(0, 0, 0)) {
            query = query.filter(transaction_data::transaction_date.lt(end_exclusive));
        }
    }
    query
}

const ANALYTICS_SCOPE_WHERE: &str = "
  AND ($SCOPE_START::date IS NULL OR transaction_date::date >= $SCOPE_START)
  AND ($SCOPE_END::date IS NULL OR transaction_date::date <= $SCOPE_END)
  AND ($SCOPE_ACCOUNT::bigint IS NULL OR EXISTS (
      SELECT 1 FROM statement s2
      WHERE s2.id = transaction_data.statement_id
        AND s2.deleted_at IS NULL
        AND s2.financial_account_id = $SCOPE_ACCOUNT
  ))";

fn build_scope_where(start_param: &str, end_param: &str, account_param: &str) -> String {
    ANALYTICS_SCOPE_WHERE
        .replace("$SCOPE_START", start_param)
        .replace("$SCOPE_END", end_param)
        .replace("$SCOPE_ACCOUNT", account_param)
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MonthlySummaryRow {
    pub month: String,
    pub spending: f64,
    pub receiving: f64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CategoryTotalRow {
    pub group_key: String,
    pub category_id: Option<i64>,
    pub name: String,
    pub colour: Option<String>,
    pub value: f64,
    pub percent: f64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BalancePoint {
    pub date: String,
    pub balance: f64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BalanceStackAccount {
    pub account_key: String,
    pub account_id: Option<i64>,
    pub label: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BalanceStackRow {
    pub date: String,
    pub total: f64,
    pub values: HashMap<String, f64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BalanceStackChart {
    pub accounts: Vec<BalanceStackAccount>,
    pub rows: Vec<BalanceStackRow>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DashboardKpiSummary {
    pub spending: f64,
    pub income: f64,
    pub net: f64,
    pub balance: Option<f64>,
}

#[derive(QueryableByName, Debug)]
struct KpiTotalsRow {
    #[diesel(sql_type = BigInt)]
    spending_cents: i64,
    #[diesel(sql_type = BigInt)]
    income_cents: i64,
}

#[derive(QueryableByName, Debug)]
struct KpiBalanceRow {
    #[diesel(sql_type = BigInt)]
    balance: i64,
}

#[derive(QueryableByName, Debug)]
struct BalanceRow {
    #[diesel(sql_type = Date)]
    day: NaiveDate,
    #[diesel(sql_type = BigInt)]
    balance: i64,
}

#[derive(QueryableByName, Debug)]
struct BalanceAccountRow {
    #[diesel(sql_type = Date)]
    day: NaiveDate,
    #[diesel(sql_type = BigInt)]
    account_scope: i64,
    #[diesel(sql_type = Text)]
    account_label: String,
    #[diesel(sql_type = BigInt)]
    balance_cents: i64,
}

fn account_stack_key(account_scope: i64) -> String {
    format!("a_{account_scope}")
}

fn build_balance_stack(
    rows: Vec<BalanceAccountRow>,
) -> BalanceStackChart {
    let mut account_meta: HashMap<String, BalanceStackAccount> = HashMap::new();
    let mut by_day: HashMap<NaiveDate, HashMap<String, f64>> = HashMap::new();

    for row in rows {
        let key = account_stack_key(row.account_scope);
        let account_id = if row.account_scope > 0 {
            Some(row.account_scope)
        } else {
            None
        };
        account_meta.entry(key.clone()).or_insert(BalanceStackAccount {
            account_key: key.clone(),
            account_id,
            label: row.account_label.clone(),
        });
        by_day
            .entry(row.day)
            .or_default()
            .insert(key, round2(cents_to_dollars(row.balance_cents)));
    }

    let mut accounts: Vec<BalanceStackAccount> = account_meta.into_values().collect();
    accounts.sort_by(|left, right| left.label.cmp(&right.label));

    let mut stack_rows: Vec<BalanceStackRow> = by_day
        .into_iter()
        .map(|(day, values)| {
            let total = round2(values.values().copied().sum());
            BalanceStackRow {
                date: day.to_string(),
                total,
                values,
            }
        })
        .collect();
    stack_rows.sort_by(|left, right| left.date.cmp(&right.date));

    BalanceStackChart {
        accounts,
        rows: stack_rows,
    }
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DashboardAnalytics {
    pub monthly_summary: Vec<MonthlySummaryRow>,
    pub spending_by_category: Vec<CategoryTotalRow>,
    pub income_by_category: Vec<CategoryTotalRow>,
    pub balance_series: Vec<BalancePoint>,
    pub balance_stack: BalanceStackChart,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SubBreakdownRow {
    pub key: String,
    pub label_sample: String,
    pub spending: f64,
    pub income: f64,
    pub count: i32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ParentBreakdownRow {
    pub section_key: String,
    pub category_id: Option<i64>,
    pub label: String,
    pub colour: Option<String>,
    pub spending: f64,
    pub income: f64,
    pub txn_count: i32,
    pub sub_rows: Vec<SubBreakdownRow>,
}

#[derive(QueryableByName, Debug)]
struct MonthlyRow {
    #[diesel(sql_type = Text)]
    month_label: String,
    #[diesel(sql_type = BigInt)]
    spending_cents: i64,
    #[diesel(sql_type = BigInt)]
    receiving_cents: i64,
}

fn sum_latest_balances_cents(
    conn: &mut impl diesel::connection::LoadConnection<Backend = diesel::pg::Pg>,
    end: Option<NaiveDate>,
    financial_account_id: Option<i64>,
) -> Result<Option<i64>, diesel::result::Error> {
    let row = sql_query(
        r#"
        SELECT COALESCE(SUM(latest.balance), 0)::bigint AS balance
        FROM (
            SELECT DISTINCT ON (COALESCE(s.financial_account_id, -s.id))
                td.balance::bigint AS balance
            FROM transaction_data td
            INNER JOIN statement s ON s.id = td.statement_id AND s.deleted_at IS NULL
            WHERE td.deleted_at IS NULL
              AND ($2::bigint IS NULL OR s.financial_account_id = $2)
              AND ($1::date IS NULL OR td.transaction_date::date <= $1)
            ORDER BY COALESCE(s.financial_account_id, -s.id), td.transaction_date DESC, td.id DESC
        ) latest
        "#,
    )
    .bind::<Nullable<Date>, _>(end)
    .bind::<Nullable<BigInt>, _>(financial_account_id)
    .get_result::<KpiBalanceRow>(conn)?;

    if row.balance == 0 {
        let has_any = sql_query(
            r#"
            SELECT 1 AS balance
            FROM transaction_data td
            INNER JOIN statement s ON s.id = td.statement_id AND s.deleted_at IS NULL
            WHERE td.deleted_at IS NULL
              AND ($2::bigint IS NULL OR s.financial_account_id = $2)
              AND ($1::date IS NULL OR td.transaction_date::date <= $1)
            LIMIT 1
            "#,
        )
        .bind::<Nullable<Date>, _>(end)
        .bind::<Nullable<BigInt>, _>(financial_account_id)
        .get_result::<KpiBalanceRow>(conn)
        .optional()?;
        if has_any.is_none() {
            return Ok(None);
        }
    }

    Ok(Some(row.balance))
}

#[derive(QueryableByName, Debug)]
struct SlimTxnRow {
    #[diesel(sql_type = Nullable<Integer>)]
    category_id: Option<i32>,
    #[diesel(sql_type = Text)]
    description: String,
    #[diesel(sql_type = Integer)]
    amount: i32,
}

fn cents_to_dollars(cents: i64) -> f64 {
    (cents as f64) / 100.0
}

fn round2(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}

fn category_group_id(tx_category_id: Option<i32>, categories: &[Category], group_by_parent: bool) -> String {
    let Some(cid) = tx_category_id else {
        return "unknown".to_string();
    };
    let cid_i64 = i64::from(cid);
    let Some(cat) = categories.iter().find(|c| c.id == cid_i64) else {
        return "unknown".to_string();
    };
    if group_by_parent {
        if let Some(parent_id) = cat.parent_category_id {
            return parent_id.to_string();
        }
    }
    cid_i64.to_string()
}

fn category_display(
    group_key: &str,
    categories: &[Category],
) -> (Option<i64>, String, Option<String>) {
    if group_key == "unknown" {
        return (None, "Unknown".to_string(), None);
    }
    let Ok(id) = group_key.parse::<i64>() else {
        return (None, "Unknown".to_string(), None);
    };
    let Some(cat) = categories.iter().find(|c| c.id == id) else {
        return (Some(id), "Unknown".to_string(), None);
    };
    (Some(id), cat.name.clone(), cat.colour.clone())
}

pub fn dashboard_kpis(
    start: Option<NaiveDate>,
    end: Option<NaiveDate>,
    financial_account_id: Option<i64>,
) -> Result<DashboardKpiSummary, diesel::result::Error> {
    let conn = &mut get_dbo();

    let totals: KpiTotalsRow = sql_query(
        r#"
        SELECT
            COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)::bigint AS spending_cents,
            COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::bigint AS income_cents
        FROM transaction_data
        WHERE deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM statement s WHERE s.id = transaction_data.statement_id AND s.deleted_at IS NULL)
          AND ($3::bigint IS NULL OR EXISTS (
              SELECT 1 FROM statement s2
              WHERE s2.id = transaction_data.statement_id
                AND s2.deleted_at IS NULL
                AND s2.financial_account_id = $3
          ))
          AND ($1::date IS NULL OR transaction_date::date >= $1)
          AND ($2::date IS NULL OR transaction_date::date <= $2)
        "#,
    )
    .bind::<Nullable<Date>, _>(start)
    .bind::<Nullable<Date>, _>(end)
    .bind::<Nullable<BigInt>, _>(financial_account_id)
    .get_result(conn)?;

    let spending = round2(cents_to_dollars(totals.spending_cents));
    let income = round2(cents_to_dollars(totals.income_cents));

    let balance = sum_latest_balances_cents(conn, end, financial_account_id)?
        .map(|cents| round2(cents_to_dollars(cents)));

    Ok(DashboardKpiSummary {
        spending,
        income,
        net: round2(income - spending),
        balance,
    })
}

pub fn dashboard(
    group_by_parent: bool,
    start: Option<NaiveDate>,
    end: Option<NaiveDate>,
    financial_account_id: Option<i64>,
) -> Result<DashboardAnalytics, diesel::result::Error> {
    let conn = &mut get_dbo();
    let categories = Category::all(false)?;

    let monthly_rows: Vec<MonthlyRow> = sql_query(
        r#"
        SELECT
            to_char(date_trunc('month', transaction_date), 'Mon YYYY') AS month_label,
            COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)::bigint AS spending_cents,
            COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::bigint AS receiving_cents
        FROM transaction_data
        WHERE deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM statement s WHERE s.id = transaction_data.statement_id AND s.deleted_at IS NULL)
          AND ($3::bigint IS NULL OR EXISTS (
              SELECT 1 FROM statement s2
              WHERE s2.id = transaction_data.statement_id
                AND s2.deleted_at IS NULL
                AND s2.financial_account_id = $3
          ))
          AND ($1::date IS NULL OR transaction_date::date >= $1)
          AND ($2::date IS NULL OR transaction_date::date <= $2)
        GROUP BY date_trunc('month', transaction_date)
        ORDER BY date_trunc('month', transaction_date)
        "#,
    )
    .bind::<Nullable<Date>, _>(start)
    .bind::<Nullable<Date>, _>(end)
    .bind::<Nullable<BigInt>, _>(financial_account_id)
    .load(conn)?;

    let monthly_summary: Vec<MonthlySummaryRow> = monthly_rows
        .into_iter()
        .map(|r| MonthlySummaryRow {
            month: r.month_label,
            spending: cents_to_dollars(r.spending_cents),
            receiving: cents_to_dollars(r.receiving_cents),
        })
        .collect();

    let balance_rows: Vec<BalanceRow> = sql_query(
        r#"
        WITH balance_tx AS (
            SELECT
                td.transaction_date::date AS day,
                td.balance::bigint AS balance,
                td.transaction_date,
                td.id,
                COALESCE(s.financial_account_id, -s.id) AS account_scope
            FROM transaction_data td
            INNER JOIN statement s ON s.id = td.statement_id AND s.deleted_at IS NULL
            WHERE td.deleted_at IS NULL
              AND ($3::bigint IS NULL OR s.financial_account_id = $3)
              AND ($2::date IS NULL OR td.transaction_date::date <= $2)
        ),
        days AS (
            SELECT DISTINCT day FROM balance_tx
            WHERE ($1::date IS NULL OR day >= $1)
        )
        SELECT
            d.day,
            COALESCE((
                SELECT SUM(latest.balance)::bigint
                FROM (
                    SELECT DISTINCT ON (f.account_scope)
                        f.balance
                    FROM balance_tx f
                    WHERE f.day <= d.day
                    ORDER BY f.account_scope, f.transaction_date DESC, f.id DESC
                ) latest
            ), 0)::bigint AS balance
        FROM days d
        ORDER BY d.day
        "#,
    )
    .bind::<Nullable<Date>, _>(start)
    .bind::<Nullable<Date>, _>(end)
    .bind::<Nullable<BigInt>, _>(financial_account_id)
    .load(conn)?;

    let balance_series: Vec<BalancePoint> = balance_rows
        .into_iter()
        .map(|r| BalancePoint {
            date: r.day.to_string(),
            balance: cents_to_dollars(r.balance),
        })
        .collect();

    let balance_account_rows: Vec<BalanceAccountRow> = sql_query(
        r#"
        WITH balance_tx AS (
            SELECT
                td.transaction_date::date AS day,
                td.balance::bigint AS balance,
                td.transaction_date,
                td.id,
                COALESCE(s.financial_account_id, -s.id) AS account_scope,
                COALESCE(fa.display_name, 'Account ' || COALESCE(s.financial_account_id, -s.id)) AS account_label
            FROM transaction_data td
            INNER JOIN statement s ON s.id = td.statement_id AND s.deleted_at IS NULL
            LEFT JOIN financial_accounts fa ON fa.id = s.financial_account_id AND fa.deleted_at IS NULL
            WHERE td.deleted_at IS NULL
              AND ($3::bigint IS NULL OR s.financial_account_id = $3)
              AND ($2::date IS NULL OR td.transaction_date::date <= $2)
        ),
        days AS (
            SELECT DISTINCT day FROM balance_tx
            WHERE ($1::date IS NULL OR day >= $1)
        ),
        account_scopes AS (
            SELECT DISTINCT account_scope, account_label FROM balance_tx
        ),
        grid AS (
            SELECT d.day, a.account_scope, a.account_label
            FROM days d
            CROSS JOIN account_scopes a
        )
        SELECT
            g.day,
            g.account_scope,
            g.account_label,
            COALESCE((
                SELECT f.balance
                FROM balance_tx f
                WHERE f.account_scope = g.account_scope
                  AND f.day <= g.day
                ORDER BY f.transaction_date DESC, f.id DESC
                LIMIT 1
            ), 0)::bigint AS balance_cents
        FROM grid g
        ORDER BY g.day, g.account_scope
        "#,
    )
    .bind::<Nullable<Date>, _>(start)
    .bind::<Nullable<Date>, _>(end)
    .bind::<Nullable<BigInt>, _>(financial_account_id)
    .load(conn)?;

    let balance_stack = build_balance_stack(balance_account_rows);

    let mut category_query = filter_active_statement(
        transaction_data::table
            .filter(transaction_data::deleted_at.is_null())
            .into_boxed(),
        financial_account_id,
    );
    if let Some(start_date) = start {
        category_query = category_query.filter(
            transaction_data::transaction_date.ge(start_date.and_hms_opt(0, 0, 0).expect("midnight")),
        );
    }
    if let Some(end_date) = end {
        if let Some(end_exclusive) = end_date.succ_opt().and_then(|d| d.and_hms_opt(0, 0, 0)) {
            category_query =
                category_query.filter(transaction_data::transaction_date.lt(end_exclusive));
        }
    }
    let slim: Vec<(Option<i32>, i32)> = category_query
        .select((transaction_data::category_id, transaction_data::amount))
        .load(conn)?;

    let mut spending: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    let mut income: std::collections::HashMap<String, i64> = std::collections::HashMap::new();

    for (category_id, amount) in slim {
        let key = category_group_id(category_id, &categories, group_by_parent);
        if amount < 0 {
            *spending.entry(key).or_insert(0) += amount.abs() as i64;
        } else if amount > 0 {
            *income.entry(key).or_insert(0) += i64::from(amount);
        }
    }

    let total_spending: i64 = spending.values().sum();
    let total_income: i64 = income.values().sum();

    let mut spending_by_category: Vec<CategoryTotalRow> = spending
        .into_iter()
        .map(|(group_key, cents)| {
            let (category_id, name, colour) = category_display(&group_key, &categories);
            let value = cents_to_dollars(cents);
            let percent = if total_spending > 0 {
                round2((cents as f64 / total_spending as f64) * 1000.0) / 10.0
            } else {
                0.0
            };
            CategoryTotalRow {
                group_key,
                category_id,
                name,
                colour,
                value: round2(value),
                percent,
            }
        })
        .collect();
    spending_by_category.sort_by(|a, b| b.value.partial_cmp(&a.value).unwrap_or(std::cmp::Ordering::Equal));

    let income_by_category: Vec<CategoryTotalRow> = income
        .into_iter()
        .map(|(group_key, cents)| {
            let (category_id, name, colour) = category_display(&group_key, &categories);
            let value = cents_to_dollars(cents);
            let percent = if total_income > 0 {
                round2((cents as f64 / total_income as f64) * 1000.0) / 10.0
            } else {
                0.0
            };
            CategoryTotalRow {
                group_key,
                category_id,
                name,
                colour,
                value: round2(value),
                percent,
            }
        })
        .collect();

    Ok(DashboardAnalytics {
        monthly_summary,
        spending_by_category,
        income_by_category,
        balance_series,
        balance_stack,
    })
}

pub fn breakdown(
    start: NaiveDate,
    end: NaiveDate,
    financial_account_id: Option<i64>,
) -> Result<Vec<ParentBreakdownRow>, diesel::result::Error> {
    let conn = &mut get_dbo();
    let categories = Category::all(false)?;

    let rows: Vec<SlimTxnRow> = sql_query(
        r#"
        SELECT category_id, description, amount
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

    let mut by_cat: std::collections::HashMap<String, Vec<(String, i32)>> = std::collections::HashMap::new();
    for row in rows {
        let section_key = match row.category_id {
            Some(id) => id.to_string(),
            None => "__uncat__".to_string(),
        };
        by_cat
            .entry(section_key)
            .or_default()
            .push((row.description, row.amount));
    }

    let mut parents = Vec::new();
    for (section_key, txs) in by_cat {
        let category_id = if section_key == "__uncat__" {
            None
        } else {
            section_key
                .parse::<i64>()
                .ok()
                .or_else(|| section_key.parse::<i32>().ok().map(i64::from))
        };
        let cat = category_id.and_then(|id| categories.iter().find(|c| c.id == id));
        let label = match category_id {
            None => "Uncategorized".to_string(),
            Some(id) => cat
                .map(|c| c.name.clone())
                .unwrap_or_else(|| format!("Category {id}")),
        };
        let colour = cat.and_then(|c| c.colour.clone());

        let mut sub_map: std::collections::HashMap<
            String,
            (String, f64, f64, i32),
        > = std::collections::HashMap::new();
        let mut cat_spending = 0.0f64;
        let mut cat_income = 0.0f64;

        for (description, amount) in txs {
            let dollars = (amount.abs() as f64) / 100.0;
            if amount < 0 {
                cat_spending += dollars;
            } else if amount > 0 {
                cat_income += dollars;
            }
            let gk = canonical_expense_group_key(&description);
            let sub = sub_map.entry(gk).or_insert_with(|| {
                (description.clone(), 0.0, 0.0, 0)
            });
            sub.3 += 1;
            if amount < 0 {
                sub.1 += dollars;
            } else if amount > 0 {
                sub.2 += dollars;
            }
        }

        let mut sub_rows: Vec<SubBreakdownRow> = sub_map
            .into_iter()
            .map(|(key, (sample, spending, income, count))| SubBreakdownRow {
                key,
                label_sample: sample,
                spending: round2(spending),
                income: round2(income),
                count,
            })
            .collect();
        sub_rows.sort_by(|a, b| {
            let b_vol = b.spending + b.income;
            let a_vol = a.spending + a.income;
            b_vol
                .partial_cmp(&a_vol)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then(a.label_sample.cmp(&b.label_sample))
        });

        parents.push(ParentBreakdownRow {
            section_key,
            category_id,
            label,
            colour,
            spending: round2(cat_spending),
            income: round2(cat_income),
            txn_count: sub_rows.iter().map(|s| s.count).sum(),
            sub_rows,
        });
    }

    Ok(parents)
}

pub fn recurring(
    min_occurrences: i32,
    financial_account_id: Option<i64>,
) -> Result<Vec<RecurringCandidate>, diesel::result::Error> {
    let conn = &mut get_dbo();
    let rows: Vec<(String, i32, NaiveDateTime, Option<i32>)> = filter_active_statement(
        transaction_data::table
            .filter(transaction_data::deleted_at.is_null())
            .into_boxed(),
        financial_account_id,
    )
    .select((
        transaction_data::description,
        transaction_data::amount,
        transaction_data::transaction_date,
        transaction_data::category_id,
    ))
    .load(conn)?;

    let slim: Vec<SlimTransaction> = rows
        .into_iter()
        .map(|(description, amount, transaction_date, category_id)| SlimTransaction {
            description,
            amount,
            transaction_date: transaction_date.date(),
            category_id,
        })
        .collect();

    let mut out = detect_recurring_expenses(&slim, min_occurrences);
    out.extend(detect_recurring_income(&slim, min_occurrences));
    Ok(out)
}

fn matching_category_ids_single(
    group_key: &str,
    group_by_parent: bool,
    categories: &[Category],
) -> Option<Vec<i32>> {
    if group_key == "unknown" {
        return None;
    }
    let id = group_key.parse::<i64>().ok()?;
    if group_by_parent {
        let mut ids = vec![id];
        for cat in categories {
            if cat.parent_category_id == Some(id) {
                ids.push(cat.id);
            }
        }
        Some(
            ids.into_iter()
                .filter_map(|v| i32::try_from(v).ok())
                .collect(),
        )
    } else {
        i32::try_from(id).ok().map(|v| vec![v])
    }
}

enum CategoryDrilldownFilter {
    UncategorizedOnly,
    CategoryIds(Vec<i32>),
    UncategorizedOrCategoryIds(Vec<i32>),
}

fn category_drilldown_filter(
    group_key: &str,
    group_by_parent: bool,
    categories: &[Category],
) -> CategoryDrilldownFilter {
    if group_key == "unknown" {
        return CategoryDrilldownFilter::UncategorizedOnly;
    }

    if group_key.contains(',') {
        let mut ids = Vec::new();
        let mut include_uncategorized = false;
        for part in group_key.split(',') {
            let part = part.trim();
            if part == "unknown" {
                include_uncategorized = true;
                continue;
            }
            if let Some(part_ids) = matching_category_ids_single(part, group_by_parent, categories) {
                ids.extend(part_ids);
            }
        }
        ids.sort_unstable();
        ids.dedup();
        if include_uncategorized {
            if ids.is_empty() {
                return CategoryDrilldownFilter::UncategorizedOnly;
            }
            return CategoryDrilldownFilter::UncategorizedOrCategoryIds(ids);
        }
        if ids.is_empty() {
            return CategoryDrilldownFilter::UncategorizedOnly;
        }
        return CategoryDrilldownFilter::CategoryIds(ids);
    }

    match matching_category_ids_single(group_key, group_by_parent, categories) {
        None => CategoryDrilldownFilter::UncategorizedOnly,
        Some(ids) if ids.is_empty() => CategoryDrilldownFilter::UncategorizedOnly,
        Some(ids) => CategoryDrilldownFilter::CategoryIds(ids),
    }
}

fn apply_category_drilldown_filter<'a>(
    query: transaction_data::BoxedQuery<'a, Pg>,
    filter: &CategoryDrilldownFilter,
) -> transaction_data::BoxedQuery<'a, Pg> {
    match filter {
        CategoryDrilldownFilter::UncategorizedOnly => {
            query.filter(transaction_data::category_id.is_null())
        }
        CategoryDrilldownFilter::CategoryIds(ids) => {
            query.filter(transaction_data::category_id.eq_any(ids.clone()))
        }
        CategoryDrilldownFilter::UncategorizedOrCategoryIds(ids) => query.filter(
            transaction_data::category_id
                .is_null()
                .or(transaction_data::category_id.eq_any(ids.clone())),
        ),
    }
}

fn matching_category_ids(
    group_key: &str,
    group_by_parent: bool,
    categories: &[Category],
) -> Option<Vec<i32>> {
    match category_drilldown_filter(group_key, group_by_parent, categories) {
        CategoryDrilldownFilter::UncategorizedOnly => None,
        CategoryDrilldownFilter::CategoryIds(ids) => Some(ids),
        CategoryDrilldownFilter::UncategorizedOrCategoryIds(ids) => Some(ids),
    }
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SpendingNameRow {
    pub name: String,
    pub total_dollars: f64,
    pub count: i32,
}

#[derive(QueryableByName, Debug)]
struct SpendingNameAggRow {
    #[diesel(sql_type = Text)]
    name: String,
    #[diesel(sql_type = BigInt)]
    total_cents: i64,
    #[diesel(sql_type = Integer)]
    count: i32,
}

const SPENDING_NAME_GROUP_EXPR: &str =
    "CASE WHEN TRIM(description) = '' THEN '(no description)' ELSE TRIM(description) END";

pub fn spending_drilldown_by_name(
    group_key: &str,
    group_by_parent: bool,
    scope: AnalyticsScope,
) -> Result<Vec<SpendingNameRow>, diesel::result::Error> {
    let conn = &mut get_dbo();
    let categories = Category::all(false)?;
    let category_filter = category_drilldown_filter(group_key, group_by_parent, &categories);
    let scope_sql = build_scope_where("$1", "$2", "$3");

    let rows: Vec<SpendingNameAggRow> = match category_filter {
        CategoryDrilldownFilter::UncategorizedOnly => sql_query(&format!(
            r#"
            SELECT {SPENDING_NAME_GROUP_EXPR} AS name,
                   COALESCE(SUM(ABS(amount)), 0)::bigint AS total_cents,
                   COUNT(*)::integer AS count
            FROM transaction_data
            WHERE deleted_at IS NULL
              AND amount < 0
              AND {ACTIVE_STATEMENT_WHERE}
              AND category_id IS NULL
              {scope_sql}
            GROUP BY {SPENDING_NAME_GROUP_EXPR}
            ORDER BY total_cents DESC
            "#
        ))
        .bind::<Nullable<Date>, _>(scope.start)
        .bind::<Nullable<Date>, _>(scope.end)
        .bind::<Nullable<BigInt>, _>(scope.financial_account_id)
        .load(conn)?,
        CategoryDrilldownFilter::CategoryIds(ids) if ids.is_empty() => return Ok(Vec::new()),
        CategoryDrilldownFilter::CategoryIds(ids) => {
            let scope_sql = build_scope_where("$2", "$3", "$4");
            sql_query(&format!(
            r#"
            SELECT {SPENDING_NAME_GROUP_EXPR} AS name,
                   COALESCE(SUM(ABS(amount)), 0)::bigint AS total_cents,
                   COUNT(*)::integer AS count
            FROM transaction_data
            WHERE deleted_at IS NULL
              AND amount < 0
              AND {ACTIVE_STATEMENT_WHERE}
              AND category_id = ANY($1)
              {scope_sql}
            GROUP BY {SPENDING_NAME_GROUP_EXPR}
            ORDER BY total_cents DESC
            "#
        ))
        .bind::<Array<Integer>, _>(ids)
        .bind::<Nullable<Date>, _>(scope.start)
        .bind::<Nullable<Date>, _>(scope.end)
        .bind::<Nullable<BigInt>, _>(scope.financial_account_id)
        .load(conn)?
        }
        CategoryDrilldownFilter::UncategorizedOrCategoryIds(ids) => {
            let scope_sql = build_scope_where("$2", "$3", "$4");
            sql_query(&format!(
            r#"
            SELECT {SPENDING_NAME_GROUP_EXPR} AS name,
                   COALESCE(SUM(ABS(amount)), 0)::bigint AS total_cents,
                   COUNT(*)::integer AS count
            FROM transaction_data
            WHERE deleted_at IS NULL
              AND amount < 0
              AND {ACTIVE_STATEMENT_WHERE}
              AND (category_id IS NULL OR category_id = ANY($1))
              {scope_sql}
            GROUP BY {SPENDING_NAME_GROUP_EXPR}
            ORDER BY total_cents DESC
            "#
        ))
        .bind::<Array<Integer>, _>(ids)
        .bind::<Nullable<Date>, _>(scope.start)
        .bind::<Nullable<Date>, _>(scope.end)
        .bind::<Nullable<BigInt>, _>(scope.financial_account_id)
        .load(conn)?
        }
    };

    Ok(rows
        .into_iter()
        .map(|r| SpendingNameRow {
            name: r.name,
            total_dollars: round2(cents_to_dollars(r.total_cents)),
            count: r.count,
        })
        .collect())
}

pub fn spending_drilldown(
    group_key: &str,
    group_by_parent: bool,
    page: i64,
    per_page: i64,
    scope: AnalyticsScope,
) -> Result<(Vec<Transaction>, i64), diesel::result::Error> {
    let conn = &mut get_dbo();
    let categories = Category::all(false)?;
    let page = page.max(1);
    let per_page = per_page.clamp(1, 200);
    let offset = (page - 1) * per_page;

    let category_filter = category_drilldown_filter(group_key, group_by_parent, &categories);

    let count_query = apply_category_drilldown_filter(
        apply_date_scope(
        transaction_data::table
            .filter(transaction_data::deleted_at.is_null())
            .filter(transaction_data::amount.lt(0))
            .into_boxed(),
        scope,
        ),
        &category_filter,
    );

    let items_query = apply_category_drilldown_filter(
        apply_date_scope(
        transaction_data::table
            .filter(transaction_data::deleted_at.is_null())
            .filter(transaction_data::amount.lt(0))
            .into_boxed(),
        scope,
        ),
        &category_filter,
    );

    if let CategoryDrilldownFilter::CategoryIds(ids) | CategoryDrilldownFilter::UncategorizedOrCategoryIds(ids) = &category_filter {
        if ids.is_empty() {
            return Ok((Vec::new(), 0));
        }
    }

    let total: i64 = count_query.select(count_star()).get_result(conn)?;

    let items = items_query
        .order((
            transaction_data::transaction_date.desc(),
            transaction_data::id.desc(),
        ))
        .limit(per_page)
        .offset(offset)
        .select(Transaction::as_select())
        .load(conn)?;

    Ok((items, total))
}

pub fn income_drilldown_by_name(
    group_key: &str,
    group_by_parent: bool,
    scope: AnalyticsScope,
) -> Result<Vec<SpendingNameRow>, diesel::result::Error> {
    let conn = &mut get_dbo();
    let categories = Category::all(false)?;
    let category_filter = category_drilldown_filter(group_key, group_by_parent, &categories);
    let scope_sql = build_scope_where("$1", "$2", "$3");

    let rows: Vec<SpendingNameAggRow> = match category_filter {
        CategoryDrilldownFilter::UncategorizedOnly => sql_query(&format!(
            r#"
            SELECT {SPENDING_NAME_GROUP_EXPR} AS name,
                   COALESCE(SUM(amount), 0)::bigint AS total_cents,
                   COUNT(*)::integer AS count
            FROM transaction_data
            WHERE deleted_at IS NULL
              AND amount > 0
              AND {ACTIVE_STATEMENT_WHERE}
              AND category_id IS NULL
              {scope_sql}
            GROUP BY {SPENDING_NAME_GROUP_EXPR}
            ORDER BY total_cents DESC
            "#
        ))
        .bind::<Nullable<Date>, _>(scope.start)
        .bind::<Nullable<Date>, _>(scope.end)
        .bind::<Nullable<BigInt>, _>(scope.financial_account_id)
        .load(conn)?,
        CategoryDrilldownFilter::CategoryIds(ids) if ids.is_empty() => return Ok(Vec::new()),
        CategoryDrilldownFilter::CategoryIds(ids) => {
            let scope_sql = build_scope_where("$2", "$3", "$4");
            sql_query(&format!(
            r#"
            SELECT {SPENDING_NAME_GROUP_EXPR} AS name,
                   COALESCE(SUM(amount), 0)::bigint AS total_cents,
                   COUNT(*)::integer AS count
            FROM transaction_data
            WHERE deleted_at IS NULL
              AND amount > 0
              AND {ACTIVE_STATEMENT_WHERE}
              AND category_id = ANY($1)
              {scope_sql}
            GROUP BY {SPENDING_NAME_GROUP_EXPR}
            ORDER BY total_cents DESC
            "#
        ))
        .bind::<Array<Integer>, _>(ids)
        .bind::<Nullable<Date>, _>(scope.start)
        .bind::<Nullable<Date>, _>(scope.end)
        .bind::<Nullable<BigInt>, _>(scope.financial_account_id)
        .load(conn)?
        }
        CategoryDrilldownFilter::UncategorizedOrCategoryIds(ids) => {
            let scope_sql = build_scope_where("$2", "$3", "$4");
            sql_query(&format!(
            r#"
            SELECT {SPENDING_NAME_GROUP_EXPR} AS name,
                   COALESCE(SUM(amount), 0)::bigint AS total_cents,
                   COUNT(*)::integer AS count
            FROM transaction_data
            WHERE deleted_at IS NULL
              AND amount > 0
              AND {ACTIVE_STATEMENT_WHERE}
              AND (category_id IS NULL OR category_id = ANY($1))
              {scope_sql}
            GROUP BY {SPENDING_NAME_GROUP_EXPR}
            ORDER BY total_cents DESC
            "#
        ))
        .bind::<Array<Integer>, _>(ids)
        .bind::<Nullable<Date>, _>(scope.start)
        .bind::<Nullable<Date>, _>(scope.end)
        .bind::<Nullable<BigInt>, _>(scope.financial_account_id)
        .load(conn)?
        }
    };

    Ok(rows
        .into_iter()
        .map(|r| SpendingNameRow {
            name: r.name,
            total_dollars: round2(cents_to_dollars(r.total_cents)),
            count: r.count,
        })
        .collect())
}

pub fn income_drilldown(
    group_key: &str,
    group_by_parent: bool,
    page: i64,
    per_page: i64,
    scope: AnalyticsScope,
) -> Result<(Vec<Transaction>, i64), diesel::result::Error> {
    let conn = &mut get_dbo();
    let categories = Category::all(false)?;
    let page = page.max(1);
    let per_page = per_page.clamp(1, 200);
    let offset = (page - 1) * per_page;

    let category_filter = category_drilldown_filter(group_key, group_by_parent, &categories);

    let count_query = apply_category_drilldown_filter(
        apply_date_scope(
        transaction_data::table
            .filter(transaction_data::deleted_at.is_null())
            .filter(transaction_data::amount.gt(0))
            .into_boxed(),
        scope,
        ),
        &category_filter,
    );

    let items_query = apply_category_drilldown_filter(
        apply_date_scope(
        transaction_data::table
            .filter(transaction_data::deleted_at.is_null())
            .filter(transaction_data::amount.gt(0))
            .into_boxed(),
        scope,
        ),
        &category_filter,
    );

    if let CategoryDrilldownFilter::CategoryIds(ids) | CategoryDrilldownFilter::UncategorizedOrCategoryIds(ids) = &category_filter {
        if ids.is_empty() {
            return Ok((Vec::new(), 0));
        }
    }

    let total: i64 = count_query.select(count_star()).get_result(conn)?;

    let items = items_query
        .order((
            transaction_data::transaction_date.desc(),
            transaction_data::id.desc(),
        ))
        .limit(per_page)
        .offset(offset)
        .select(Transaction::as_select())
        .load(conn)?;

    Ok((items, total))
}
