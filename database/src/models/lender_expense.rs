use chrono::{Datelike, NaiveDate, NaiveDateTime, Utc};
use diesel::prelude::*;
use diesel::sql_query;
use diesel::sql_types::{BigInt, Date, Integer, Nullable};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::models::category::Category;
use crate::modules::database::get_dbo;
use crate::schema::{
    category_lender_exclusions, category_lender_mappings, lender_expense_buckets,
};

#[derive(Queryable, Selectable, Debug, Clone, Serialize, Deserialize)]
#[diesel(table_name = lender_expense_buckets)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct LenderExpenseBucket {
    pub bucket_key: String,
    pub label: String,
    pub sort_order: i32,
}

#[derive(Queryable, Selectable, Debug, Clone, Serialize, Deserialize)]
#[diesel(table_name = category_lender_mappings)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct CategoryLenderMapping {
    pub category_id: i64,
    pub bucket_key: String,
    pub updated_at: NaiveDateTime,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = category_lender_mappings)]
pub struct NewCategoryLenderMapping<'a> {
    pub category_id: i64,
    pub bucket_key: &'a str,
    pub updated_at: NaiveDateTime,
}

#[derive(Queryable, Selectable, Debug, Clone, Serialize, Deserialize)]
#[diesel(table_name = category_lender_exclusions)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct CategoryLenderExclusion {
    pub category_id: i64,
    pub updated_at: NaiveDateTime,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = category_lender_exclusions)]
pub struct NewCategoryLenderExclusion {
    pub category_id: i64,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CategoryLenderMappingRow {
    pub category_id: i64,
    pub category_name: String,
    pub bucket_key: Option<String>,
    pub bucket_label: Option<String>,
    pub default_bucket_key: Option<String>,
    pub is_override: bool,
    pub is_excluded: bool,
    pub is_manual_exclude: bool,
    pub auto_exclude_reason: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LenderExpenseBucketSummary {
    pub bucket_key: String,
    pub label: String,
    pub total_dollars: f64,
    pub monthly_average_dollars: f64,
    pub transaction_count: i32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LenderExpenseUnmappedSummary {
    pub total_dollars: f64,
    pub monthly_average_dollars: f64,
    pub transaction_count: i32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LenderExpenseBucketCategoryLine {
    pub category_id: Option<i64>,
    pub category_path: String,
    pub category_colour: Option<String>,
    pub total_dollars: f64,
    pub monthly_average_dollars: f64,
    pub transaction_count: i32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LenderExpenseBucketBreakdownResponse {
    pub bucket_key: String,
    pub label: String,
    pub start_date: String,
    pub end_date: String,
    pub months_in_range: i32,
    pub total_dollars: f64,
    pub monthly_average_dollars: f64,
    pub transaction_count: i32,
    pub categories: Vec<LenderExpenseBucketCategoryLine>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LenderExpenseSummaryResponse {
    pub start_date: String,
    pub end_date: String,
    pub months_in_range: i32,
    pub buckets: Vec<LenderExpenseBucketSummary>,
    pub unmapped: LenderExpenseUnmappedSummary,
    pub excluded: LenderExpenseUnmappedSummary,
    pub total_monthly_dollars: f64,
    pub all_debits_monthly_dollars: f64,
}

#[derive(QueryableByName, Debug)]
struct ExpenseAggRow {
    #[diesel(sql_type = Nullable<Integer>)]
    category_id: Option<i32>,
    #[diesel(sql_type = BigInt)]
    total_cents: i64,
    #[diesel(sql_type = BigInt)]
    transaction_count: i64,
}

fn round2(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}

fn cents_to_dollars(cents: i64) -> f64 {
    round2(cents as f64 / 100.0)
}

pub fn is_income_like_category(name: &str) -> bool {
    let n = name.to_lowercase();
    n.contains("income")
        || n.contains("salary")
        || n.contains("wage")
        || n.contains("payroll")
        || n.contains("refund")
}

pub fn is_debt_like_category(name: &str) -> bool {
    let n = name.to_lowercase();
    n.contains("loan")
        || n.contains("mortgage")
        || n.contains("bnpl")
        || n.contains("hecs")
        || (n.contains("repayment") && !n.contains("insur"))
}

pub fn auto_exclude_reason_for_category(name: &str) -> Option<&'static str> {
    if is_income_like_category(name) {
        return Some("income");
    }
    if is_debt_like_category(name) {
        return Some("debt");
    }
    None
}

pub fn default_bucket_for_category(name: &str) -> Option<&'static str> {
    if auto_exclude_reason_for_category(name).is_some() {
        return None;
    }
    let n = name.to_lowercase();
    if n.contains("food") || n.contains("groc") {
        return Some("groceries");
    }
    if n.contains("util") || n.contains("phone") || n.contains("internet") || n.contains("telstra")
    {
        return Some("utilities");
    }
    if n.contains("transport") || n.contains("fuel") || n.contains("motor") || n.contains("rego") {
        return Some("transport");
    }
    if n.contains("insur") {
        return Some("insurance");
    }
    if n.contains("child") || n.contains("school") || n.contains("education") {
        return Some("childcare_education");
    }
    if n.contains("health") || n.contains("medical") || n.contains("chemist") || n.contains("dental")
    {
        return Some("healthcare");
    }
    if n.contains("housing") || n.contains("rent") || n.contains("rates") || n.contains("strata") {
        return Some("housing");
    }
    if n.contains("entertain") || n.contains("subscription") || n.contains("stream") {
        return Some("recreation");
    }
    if n.contains("shop") || n.contains("cloth") || n.contains("personal") || n.contains("hair") {
        return Some("clothing_personal");
    }
    if n.contains("pet") {
        return Some("other");
    }
    Some("other")
}

fn months_in_range(start: NaiveDate, end: NaiveDate) -> i32 {
    if end < start {
        return 0;
    }
    (end.year() - start.year()) * 12 + (end.month() as i32 - start.month() as i32) + 1
}

impl LenderExpenseBucket {
    pub fn all() -> Result<Vec<LenderExpenseBucket>, diesel::result::Error> {
        let conn = &mut get_dbo();
        lender_expense_buckets::table
            .order(lender_expense_buckets::sort_order.asc())
            .select(LenderExpenseBucket::as_select())
            .load(conn)
    }
}

impl CategoryLenderMapping {
    pub fn upsert(category_id: i64, bucket_key: &str) -> Result<CategoryLenderMapping, diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();
        diesel::insert_into(category_lender_mappings::table)
            .values(NewCategoryLenderMapping {
                category_id,
                bucket_key,
                updated_at: now,
            })
            .on_conflict(category_lender_mappings::category_id)
            .do_update()
            .set((
                category_lender_mappings::bucket_key.eq(bucket_key),
                category_lender_mappings::updated_at.eq(now),
            ))
            .returning(CategoryLenderMapping::as_returning())
            .get_result(conn)
    }

    fn delete_for_category(category_id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        diesel::delete(category_lender_mappings::table.filter(
            category_lender_mappings::category_id.eq(category_id),
        ))
        .execute(conn)?;
        Ok(())
    }

    fn all_by_category() -> Result<HashMap<i64, String>, diesel::result::Error> {
        let conn = &mut get_dbo();
        let rows: Vec<CategoryLenderMapping> = category_lender_mappings::table
            .select(CategoryLenderMapping::as_select())
            .load(conn)?;
        Ok(rows
            .into_iter()
            .map(|row| (row.category_id, row.bucket_key))
            .collect())
    }
}

impl CategoryLenderExclusion {
    pub fn mark(category_id: i64) -> Result<CategoryLenderExclusion, diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();
        diesel::insert_into(category_lender_exclusions::table)
            .values(NewCategoryLenderExclusion {
                category_id,
                updated_at: now,
            })
            .on_conflict(category_lender_exclusions::category_id)
            .do_update()
            .set(category_lender_exclusions::updated_at.eq(now))
            .returning(CategoryLenderExclusion::as_returning())
            .get_result(conn)
    }

    fn clear(category_id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        diesel::delete(category_lender_exclusions::table.filter(
            category_lender_exclusions::category_id.eq(category_id),
        ))
        .execute(conn)?;
        Ok(())
    }

    fn all_category_ids() -> Result<HashMap<i64, ()>, diesel::result::Error> {
        let conn = &mut get_dbo();
        let rows: Vec<CategoryLenderExclusion> = category_lender_exclusions::table
            .select(CategoryLenderExclusion::as_select())
            .load(conn)?;
        Ok(rows.into_iter().map(|row| (row.category_id, ())).collect())
    }
}

pub fn set_category_lender_mapping(
    category_id: i64,
    bucket_key: Option<&str>,
) -> Result<(), diesel::result::Error> {
    match bucket_key {
        Some(key) => {
            CategoryLenderExclusion::clear(category_id)?;
            CategoryLenderMapping::upsert(category_id, key)?;
        }
        None => {
            CategoryLenderMapping::delete_for_category(category_id)?;
            CategoryLenderExclusion::mark(category_id)?;
        }
    }
    Ok(())
}

pub fn list_category_mappings() -> Result<Vec<CategoryLenderMappingRow>, diesel::result::Error> {
    let buckets = LenderExpenseBucket::all()?;
    let bucket_labels: HashMap<String, String> = buckets
        .into_iter()
        .map(|bucket| (bucket.bucket_key, bucket.label))
        .collect();
    let overrides = CategoryLenderMapping::all_by_category()?;
    let exclusions = CategoryLenderExclusion::all_category_ids()?;
    let categories = Category::all(false)?;

    let mut rows = Vec::new();
    for category in categories {
        let default_bucket_key = default_bucket_for_category(&category.name).map(str::to_string);
        let is_manual_exclude = exclusions.contains_key(&category.id);
        let override_key = overrides.get(&category.id).cloned();
        let is_excluded = is_manual_exclude
            || (default_bucket_key.is_none() && override_key.is_none());
        let auto_exclude_reason = if is_excluded && !is_manual_exclude {
            auto_exclude_reason_for_category(&category.name).map(str::to_string)
        } else {
            None
        };
        let bucket_key = if is_excluded {
            None
        } else {
            override_key.clone().or(default_bucket_key.clone())
        };
        let bucket_label = bucket_key
            .as_ref()
            .and_then(|key| bucket_labels.get(key))
            .cloned();
        rows.push(CategoryLenderMappingRow {
            category_id: category.id,
            category_name: category.name,
            bucket_key,
            bucket_label,
            default_bucket_key,
            is_override: override_key.is_some(),
            is_excluded,
            is_manual_exclude,
            auto_exclude_reason,
        });
    }
    rows.sort_by(|left, right| left.category_name.cmp(&right.category_name));
    Ok(rows)
}

pub fn resolve_category_bucket_for_name(
    category_name: &str,
    override_key: Option<&str>,
    manually_excluded: bool,
) -> Option<String> {
    if manually_excluded {
        return None;
    }
    if let Some(key) = override_key {
        return Some(key.to_string());
    }
    default_bucket_for_category(category_name).map(str::to_string)
}

fn resolved_bucket_map(
    categories: &[Category],
    overrides: &HashMap<i64, String>,
    exclusions: &HashMap<i64, ()>,
) -> HashMap<i64, Option<String>> {
    categories
        .iter()
        .map(|category| {
            (
                category.id,
                resolve_category_bucket_for_name(
                    &category.name,
                    overrides.get(&category.id).map(String::as_str),
                    exclusions.contains_key(&category.id),
                ),
            )
        })
        .collect()
}

fn category_path(category_id: i64, by_id: &HashMap<i64, Category>) -> String {
    let Some(mut current) = by_id.get(&category_id) else {
        return format!("Unknown category ({category_id})");
    };
    let mut names = vec![current.name.clone()];
    while let Some(parent_id) = current.parent_category_id {
        let Some(parent) = by_id.get(&parent_id) else {
            break;
        };
        names.insert(0, parent.name.clone());
        current = parent;
    }
    names.join(" › ")
}

fn load_expense_agg_rows(
    start: NaiveDate,
    end: NaiveDate,
    financial_account_id: Option<i64>,
) -> Result<Vec<ExpenseAggRow>, diesel::result::Error> {
    let conn = &mut get_dbo();
    sql_query(
        r#"
        SELECT category_id, SUM(ABS(amount))::bigint AS total_cents, COUNT(*)::bigint AS transaction_count
        FROM transaction_data
        WHERE deleted_at IS NULL
          AND amount < 0
          AND EXISTS (SELECT 1 FROM statement s WHERE s.id = transaction_data.statement_id AND s.deleted_at IS NULL)
          AND ($3::bigint IS NULL OR EXISTS (
              SELECT 1 FROM statement s2
              WHERE s2.id = transaction_data.statement_id
                AND s2.deleted_at IS NULL
                AND s2.financial_account_id = $3
          ))
          AND transaction_date::date >= $1
          AND transaction_date::date <= $2
          AND NOT EXISTS (
              SELECT 1 FROM account_transfer_pairs p
              WHERE p.status = 'confirmed'
                AND (p.out_transaction_id = transaction_data.id OR p.in_transaction_id = transaction_data.id)
          )
        GROUP BY category_id
        "#,
    )
    .bind::<Date, _>(start)
    .bind::<Date, _>(end)
    .bind::<Nullable<BigInt>, _>(financial_account_id)
    .load(conn)
}

fn bucket_label_for_key(
    bucket_key: &str,
    buckets: &[LenderExpenseBucket],
) -> Result<String, diesel::result::Error> {
    if bucket_key == "unmapped" {
        return Ok("Unmapped / uncategorised".to_string());
    }
    if bucket_key == "excluded" {
        return Ok("Excluded".to_string());
    }
    buckets
        .iter()
        .find(|bucket| bucket.bucket_key == bucket_key)
        .map(|bucket| bucket.label.clone())
        .ok_or(diesel::result::Error::NotFound)
}

pub fn bucket_breakdown(
    bucket_key: &str,
    start: NaiveDate,
    end: NaiveDate,
    financial_account_id: Option<i64>,
) -> Result<LenderExpenseBucketBreakdownResponse, diesel::result::Error> {
    let buckets = LenderExpenseBucket::all()?;
    let label = bucket_label_for_key(bucket_key, &buckets)?;
    let categories = Category::all(false)?;
    let all_categories = Category::all(true)?;
    let by_id: HashMap<i64, Category> = all_categories
        .iter()
        .map(|c| (c.id, c.clone()))
        .collect();
    let overrides = CategoryLenderMapping::all_by_category()?;
    let exclusions = CategoryLenderExclusion::all_category_ids()?;
    let resolved = resolved_bucket_map(&categories, &overrides, &exclusions);
    let months = months_in_range(start, end).max(1);
    let rows = load_expense_agg_rows(start, end, financial_account_id)?;

    let mut lines: HashMap<String, (Option<i64>, Option<String>, i64, i64)> = HashMap::new();

    for row in rows {
        let count = row.transaction_count;
        let cents = row.total_cents;
        let resolved_bucket = match row.category_id.map(i64::from) {
            None => {
                if bucket_key == "unmapped" {
                    Some("unmapped")
                } else {
                    None
                }
            }
            Some(category_id) => match resolved.get(&category_id) {
                None => {
                    if bucket_key == "unmapped" {
                        Some("unmapped")
                    } else {
                        None
                    }
                }
                Some(None) => {
                    if bucket_key == "excluded" {
                        Some("excluded")
                    } else {
                        None
                    }
                }
                Some(Some(key)) => {
                    if key == bucket_key {
                        Some(key.as_str())
                    } else {
                        None
                    }
                }
            },
        };

        if resolved_bucket.is_none() {
            continue;
        }

        let line_key = row
            .category_id
            .map(i64::from)
            .map(|id| id.to_string())
            .unwrap_or_else(|| "uncategorised".to_string());
        let category_id = row.category_id.map(i64::from);
        let colour = category_id.and_then(|id| by_id.get(&id).and_then(|c| c.colour.clone()));
        let entry = lines.entry(line_key).or_insert((category_id, colour, 0, 0));
        entry.2 += cents;
        entry.3 += count;
    }

    let mut category_lines: Vec<LenderExpenseBucketCategoryLine> = lines
        .into_iter()
        .map(|(key, (category_id, colour, cents, count))| {
            let category_path = if key == "uncategorised" {
                "Uncategorised".to_string()
            } else if let Some(id) = category_id {
                category_path(id, &by_id)
            } else {
                "Uncategorised".to_string()
            };
            let total_dollars = cents_to_dollars(cents);
            LenderExpenseBucketCategoryLine {
                category_id,
                category_path,
                category_colour: colour,
                total_dollars,
                monthly_average_dollars: round2(total_dollars / months as f64),
                transaction_count: i32::try_from(count).unwrap_or(i32::MAX),
            }
        })
        .collect();

    category_lines.sort_by(|left, right| {
        right
            .total_dollars
            .partial_cmp(&left.total_dollars)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| left.category_path.cmp(&right.category_path))
    });

    let total_cents: i64 = category_lines
        .iter()
        .map(|line| (line.total_dollars * 100.0).round() as i64)
        .sum();
    let total_dollars = cents_to_dollars(total_cents);
    let transaction_count: i64 = category_lines
        .iter()
        .map(|line| i64::from(line.transaction_count))
        .sum();

    Ok(LenderExpenseBucketBreakdownResponse {
        bucket_key: bucket_key.to_string(),
        label,
        start_date: start.to_string(),
        end_date: end.to_string(),
        months_in_range: months,
        total_dollars,
        monthly_average_dollars: round2(total_dollars / months as f64),
        transaction_count: i32::try_from(transaction_count).unwrap_or(i32::MAX),
        categories: category_lines,
    })
}

pub fn expense_summary(
    start: NaiveDate,
    end: NaiveDate,
    financial_account_id: Option<i64>,
) -> Result<LenderExpenseSummaryResponse, diesel::result::Error> {
    let buckets = LenderExpenseBucket::all()?;
    let categories = Category::all(false)?;
    let overrides = CategoryLenderMapping::all_by_category()?;
    let exclusions = CategoryLenderExclusion::all_category_ids()?;
    let resolved = resolved_bucket_map(&categories, &overrides, &exclusions);
    let months = months_in_range(start, end).max(1);

    let rows = load_expense_agg_rows(start, end, financial_account_id)?;

    let mut bucket_totals: HashMap<String, (i64, i64)> = HashMap::new();
    let mut unmapped_cents = 0_i64;
    let mut unmapped_count = 0_i64;
    let mut excluded_cents = 0_i64;
    let mut excluded_count = 0_i64;

    for row in rows {
        let count = row.transaction_count;
        let cents = row.total_cents;
        let Some(category_id) = row.category_id.map(i64::from) else {
            unmapped_cents += cents;
            unmapped_count += count;
            continue;
        };
        match resolved.get(&category_id) {
            None => {
                // Deleted or unknown category — still counts as spending, roll into unmapped.
                unmapped_cents += cents;
                unmapped_count += count;
            }
            Some(None) => {
                excluded_cents += cents;
                excluded_count += count;
            }
            Some(Some(bucket_key)) => {
                let entry = bucket_totals.entry(bucket_key.clone()).or_insert((0, 0));
                entry.0 += cents;
                entry.1 += count;
            }
        }
    }

    let mut bucket_summaries = Vec::new();
    let mut total_monthly = 0.0_f64;
    for bucket in buckets {
        let (cents, count) = bucket_totals
            .get(&bucket.bucket_key)
            .copied()
            .unwrap_or((0, 0));
        let total_dollars = cents_to_dollars(cents);
        let monthly_average_dollars = round2(total_dollars / months as f64);
        total_monthly += monthly_average_dollars;
        bucket_summaries.push(LenderExpenseBucketSummary {
            bucket_key: bucket.bucket_key,
            label: bucket.label,
            total_dollars,
            monthly_average_dollars,
            transaction_count: i32::try_from(count).unwrap_or(i32::MAX),
        });
    }

    let unmapped_total = cents_to_dollars(unmapped_cents);
    let unmapped_monthly = round2(unmapped_total / months as f64);
    total_monthly += unmapped_monthly;

    let excluded_total = cents_to_dollars(excluded_cents);
    let excluded_monthly = round2(excluded_total / months as f64);
    let all_debits_monthly = round2(total_monthly + excluded_monthly);

    Ok(LenderExpenseSummaryResponse {
        start_date: start.to_string(),
        end_date: end.to_string(),
        months_in_range: months,
        buckets: bucket_summaries,
        unmapped: LenderExpenseUnmappedSummary {
            total_dollars: unmapped_total,
            monthly_average_dollars: unmapped_monthly,
            transaction_count: i32::try_from(unmapped_count).unwrap_or(i32::MAX),
        },
        excluded: LenderExpenseUnmappedSummary {
            total_dollars: excluded_total,
            monthly_average_dollars: excluded_monthly,
            transaction_count: i32::try_from(excluded_count).unwrap_or(i32::MAX),
        },
        total_monthly_dollars: round2(total_monthly),
        all_debits_monthly_dollars: all_debits_monthly,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        auto_exclude_reason_for_category, default_bucket_for_category,
        is_debt_like_category, resolve_category_bucket_for_name,
    };

    #[test]
    fn default_bucket_maps_food_to_groceries() {
        assert_eq!(default_bucket_for_category("food"), Some("groceries"));
    }

    #[test]
    fn default_bucket_excludes_income() {
        assert_eq!(default_bucket_for_category("income"), None);
        assert_eq!(auto_exclude_reason_for_category("Salary"), Some("income"));
    }

    #[test]
    fn default_bucket_excludes_debt_categories() {
        assert_eq!(default_bucket_for_category("Home loan"), None);
        assert_eq!(default_bucket_for_category("Car loan repayment"), None);
        assert!(is_debt_like_category("Home loan"));
        assert_eq!(auto_exclude_reason_for_category("Home loan"), Some("debt"));
        assert_eq!(
            resolve_category_bucket_for_name("Home loan", None, false),
            None
        );
    }

    #[test]
    fn manual_exclude_overrides_default_debt_bucket() {
        assert_eq!(
            resolve_category_bucket_for_name("Home loan", None, true),
            None
        );
    }

    #[test]
    fn bucket_override_wins_when_not_manually_excluded() {
        assert_eq!(
            resolve_category_bucket_for_name("Home loan", Some("housing"), false),
            Some("housing".to_string())
        );
    }
}
