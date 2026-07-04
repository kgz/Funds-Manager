use crate::models::category::Category;
use crate::models::planned_spending::{PlannedSpending, PlannedSpendingListItem};
use crate::models::transaction::ACTIVE_STATEMENT_WHERE;
use crate::modules::database::get_dbo;
use crate::schema::{
    planned_spending, planned_spending_dismissed_matches, planned_spending_links,
    transaction_data,
};
use chrono::{NaiveDate, NaiveDateTime, Utc};
use diesel::prelude::*;
use diesel::sql_query;
use diesel::sql_types::{BigInt, Date, Integer, Nullable, Text, Timestamp};
use diesel::QueryableByName;
use serde::Serialize;

pub const MAX_DAY_VARIANCE: i64 = 7;
pub const MAX_AMOUNT_ABS_CENTS: i64 = 500;
pub const MAX_AMOUNT_PCT: f64 = 0.05;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct PlannedMatchTransaction {
    pub id: i64,
    pub description: String,
    pub amount: i32,
    pub transaction_date: String,
    pub category_id: Option<i32>,
    pub account_label: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct PlannedMatchSuggestion {
    pub planned: PlannedSpending,
    pub transaction: PlannedMatchTransaction,
    pub date_variance_days: i64,
    pub amount_variance_cents: i32,
    pub reasons: Vec<String>,
}

#[derive(QueryableByName, Debug, Clone)]
struct CandidateRow {
    #[diesel(sql_type = BigInt)]
    id: i64,
    #[diesel(sql_type = Text)]
    description: String,
    #[diesel(sql_type = Integer)]
    amount: i32,
    #[diesel(sql_type = Timestamp)]
    transaction_date: NaiveDateTime,
    #[diesel(sql_type = Nullable<Integer>)]
    category_id: Option<i32>,
    #[diesel(sql_type = Text)]
    account_label: String,
}

pub fn amount_within_tolerance(planned_cents: i32, actual_cents: i32) -> bool {
    if planned_cents == 0 || actual_cents == 0 {
        return false;
    }
    if planned_cents.signum() != actual_cents.signum() {
        return false;
    }
    let diff = (planned_cents - actual_cents).unsigned_abs();
    let pct_tol = ((planned_cents.unsigned_abs() as f64) * MAX_AMOUNT_PCT).round() as u32;
    let allowed = MAX_AMOUNT_ABS_CENTS.max(i64::from(pct_tol)) as u32;
    diff <= allowed
}

pub fn categories_compatible(
    planned_category_id: Option<i64>,
    transaction_category_id: Option<i32>,
) -> Result<bool, diesel::result::Error> {
    match (planned_category_id, transaction_category_id) {
        (None, _) | (_, None) => Ok(true),
        (Some(planned_id), Some(txn_id)) if planned_id == i64::from(txn_id) => Ok(true),
        (Some(planned_id), Some(txn_id)) => {
            let txn_id = i64::from(txn_id);
            Ok(
                Category::is_descendant_of(txn_id, planned_id)?
                    || Category::is_descendant_of(planned_id, txn_id)?,
            )
        }
    }
}

fn tokenize_for_match(text: &str) -> Vec<String> {
    text.to_ascii_lowercase()
        .split(|ch: char| !ch.is_ascii_alphanumeric())
        .filter(|token| token.len() >= 4)
        .map(str::to_string)
        .collect()
}

pub fn text_signals_match(planned: &PlannedSpending, description: &str) -> bool {
    let mut tokens = tokenize_for_match(&planned.name);
    if let Some(notes) = &planned.notes {
        tokens.extend(tokenize_for_match(notes));
    }
    if tokens.is_empty() {
        return false;
    }
    let haystack = description.to_ascii_lowercase();
    tokens.iter().any(|token| haystack.contains(token))
}

fn score_candidate(
    planned: &PlannedSpending,
    linked_total_cents: i32,
    candidate: &CandidateRow,
) -> Result<Option<(i64, Vec<String>)>, diesel::result::Error> {
    let txn_date = candidate.transaction_date.date();
    let day_variance = (txn_date - planned.start_date).num_days().abs();
    if day_variance > MAX_DAY_VARIANCE {
        return Ok(None);
    }

    let remaining_cents = planned.amount_cents - linked_total_cents;
    if remaining_cents == 0 {
        return Ok(None);
    }

    let amount_kind = match amount_matches_remaining(remaining_cents, candidate.amount) {
        Some(kind) => kind,
        None => return Ok(None),
    };

    let _amount_variance = (remaining_cents - candidate.amount).abs();
    let mut reasons = Vec::new();
    let mut score = 0i64;

    match amount_kind {
        "exact_remaining" => {
            reasons.push("exact_amount".to_string());
            score += 100;
        }
        "partial_payment" => {
            reasons.push("partial_payment".to_string());
            score += 75;
        }
        _ => {
            reasons.push("amount_within_tolerance".to_string());
            score += 60;
        }
    }

    if day_variance == 0 {
        reasons.push("exact_date".to_string());
        score += 50;
    } else {
        reasons.push("date_within_tolerance".to_string());
        score += 30 - day_variance;
    }

    if categories_compatible(planned.category_id, candidate.category_id)? {
        if planned.category_id.is_some() && candidate.category_id.is_some() {
            reasons.push("category_match".to_string());
            score += 20;
        }
    } else {
        return Ok(None);
    }

    if text_signals_match(planned, &candidate.description) {
        reasons.push("description_match".to_string());
        score += 15;
    }

    score += (MAX_DAY_VARIANCE - day_variance) * 2;
    Ok(Some((score, reasons)))
}

pub fn amount_matches_remaining(
    remaining_cents: i32,
    candidate_cents: i32,
) -> Option<&'static str> {
    if remaining_cents == 0 {
        return None;
    }
    if remaining_cents.signum() != candidate_cents.signum() {
        return None;
    }
    if amount_within_tolerance(remaining_cents, candidate_cents) {
        return Some("exact_remaining");
    }
    if candidate_cents.abs() < remaining_cents.abs() {
        return Some("partial_payment");
    }
    None
}

fn unresolved_planned_items() -> Result<Vec<PlannedSpending>, diesel::result::Error> {
    let conn = &mut get_dbo();
    planned_spending::table
        .filter(planned_spending::deleted_at.is_null())
        .filter(planned_spending::resolved_at.is_null())
        .order((
            planned_spending::start_date.asc(),
            planned_spending::name.asc(),
            planned_spending::id.asc(),
        ))
        .select(PlannedSpending::as_select())
        .load(conn)
}

fn dismissed_pairs() -> Result<Vec<(i64, i64)>, diesel::result::Error> {
    let conn = &mut get_dbo();
    planned_spending_dismissed_matches::table
        .select((
            planned_spending_dismissed_matches::planned_spending_id,
            planned_spending_dismissed_matches::transaction_id,
        ))
        .load(conn)
}

#[derive(QueryableByName, Debug, Clone)]
struct LinkedTransactionRow {
    #[diesel(sql_type = BigInt)]
    planned_spending_id: i64,
    #[diesel(sql_type = BigInt)]
    id: i64,
    #[diesel(sql_type = Text)]
    description: String,
    #[diesel(sql_type = Integer)]
    amount: i32,
    #[diesel(sql_type = Timestamp)]
    transaction_date: NaiveDateTime,
    #[diesel(sql_type = Nullable<Integer>)]
    category_id: Option<i32>,
    #[diesel(sql_type = Text)]
    account_label: String,
}

fn linked_transaction_ids() -> Result<Vec<i64>, diesel::result::Error> {
    let conn = &mut get_dbo();
    planned_spending_links::table
        .select(planned_spending_links::transaction_id)
        .load(conn)
}

fn load_linked_transactions_for_planned_ids(
    planned_ids: &[i64],
) -> Result<std::collections::HashMap<i64, Vec<PlannedMatchTransaction>>, diesel::result::Error> {
    if planned_ids.is_empty() {
        return Ok(std::collections::HashMap::new());
    }
    let conn = &mut get_dbo();
    let rows: Vec<LinkedTransactionRow> = sql_query(
        r#"
        SELECT
            l.planned_spending_id,
            t.id,
            t.description,
            t.amount,
            t.transaction_date,
            t.category_id,
            COALESCE(fa.display_name, fa.bank_name, s.account_id) AS account_label
        FROM planned_spending_links l
        INNER JOIN transaction_data t ON t.id = l.transaction_id AND t.deleted_at IS NULL
        INNER JOIN statement s ON s.id = t.statement_id AND s.deleted_at IS NULL
        LEFT JOIN financial_accounts fa
            ON fa.id = s.financial_account_id AND fa.deleted_at IS NULL
        WHERE l.planned_spending_id = ANY($1)
        ORDER BY l.planned_spending_id ASC, t.transaction_date ASC, t.id ASC
        "#,
    )
    .bind::<diesel::sql_types::Array<diesel::sql_types::BigInt>, _>(planned_ids)
    .load(conn)?;

    let mut map: std::collections::HashMap<i64, Vec<PlannedMatchTransaction>> =
        std::collections::HashMap::new();
    for row in rows {
        let txn_date = row.transaction_date.date();
        map.entry(row.planned_spending_id)
            .or_default()
            .push(PlannedMatchTransaction {
                id: row.id,
                description: row.description,
                amount: row.amount,
                transaction_date: txn_date.format("%Y-%m-%d").to_string(),
                category_id: row.category_id,
                account_label: row.account_label,
            });
    }
    Ok(map)
}

pub fn enrich_list_items(
    items: Vec<PlannedSpending>,
) -> Result<Vec<PlannedSpendingListItem>, diesel::result::Error> {
    if items.is_empty() {
        return Ok(Vec::new());
    }
    let ids: Vec<i64> = items.iter().map(|item| item.id).collect();
    let links_by_planned = load_linked_transactions_for_planned_ids(&ids)?;
    Ok(items
        .into_iter()
        .map(|item| {
            let linked_transactions = links_by_planned
                .get(&item.id)
                .cloned()
                .unwrap_or_default();
            let linked_total_cents = linked_transactions.iter().map(|txn| txn.amount).sum();
            PlannedSpendingListItem {
                item,
                linked_transactions,
                linked_total_cents,
            }
        })
        .collect())
}

fn load_candidates(
    range_start: NaiveDate,
    range_end: NaiveDate,
) -> Result<Vec<CandidateRow>, diesel::result::Error> {
    let conn = &mut get_dbo();
    sql_query(
        r#"
        SELECT
            t.id,
            t.description,
            t.amount,
            t.transaction_date,
            t.category_id,
            COALESCE(fa.display_name, fa.bank_name, s.account_id) AS account_label
        FROM transaction_data t
        INNER JOIN statement s
            ON s.id = t.statement_id
           AND s.deleted_at IS NULL
        LEFT JOIN financial_accounts fa
            ON fa.id = s.financial_account_id
           AND fa.deleted_at IS NULL
        WHERE t.deleted_at IS NULL
          AND t.transaction_date::date >= $1
          AND t.transaction_date::date <= $2
          AND EXISTS (
              SELECT 1 FROM statement s2
              WHERE s2.id = t.statement_id AND s2.deleted_at IS NULL
          )
        ORDER BY t.transaction_date DESC, t.id DESC
        "#,
    )
    .bind::<Date, _>(range_start)
    .bind::<Date, _>(range_end)
    .load(conn)
}

pub fn detect_suggestions() -> Result<Vec<PlannedMatchSuggestion>, diesel::result::Error> {
    let planned_items = unresolved_planned_items()?;
    if planned_items.is_empty() {
        return Ok(Vec::new());
    }

    let dismissed = dismissed_pairs()?;
    let dismissed_set: std::collections::HashSet<(i64, i64)> = dismissed.into_iter().collect();
    let used_transactions: std::collections::HashSet<i64> =
        linked_transaction_ids()?.into_iter().collect();
    let planned_ids: Vec<i64> = planned_items.iter().map(|item| item.id).collect();
    let links_by_planned = load_linked_transactions_for_planned_ids(&planned_ids)?;

    let min_date = planned_items
        .iter()
        .map(|item| item.start_date)
        .min()
        .expect("non-empty")
        - chrono::Duration::days(MAX_DAY_VARIANCE);
    let max_date = planned_items
        .iter()
        .map(|item| item.start_date)
        .max()
        .expect("non-empty")
        + chrono::Duration::days(MAX_DAY_VARIANCE);

    let candidates = load_candidates(min_date, max_date)?;

    let mut suggestions = Vec::new();
    for planned in planned_items {
        let linked_transactions = links_by_planned
            .get(&planned.id)
            .cloned()
            .unwrap_or_default();
        let linked_total_cents: i32 = linked_transactions.iter().map(|txn| txn.amount).sum();
        if linked_total_cents != 0
            && amount_within_tolerance(planned.amount_cents, linked_total_cents)
        {
            continue;
        }
        let linked_ids: std::collections::HashSet<i64> =
            linked_transactions.iter().map(|txn| txn.id).collect();

        let mut best: Option<(CandidateRow, i64, Vec<String>)> = None;
        for candidate in &candidates {
            if used_transactions.contains(&candidate.id) || linked_ids.contains(&candidate.id) {
                continue;
            }
            if dismissed_set.contains(&(planned.id, candidate.id)) {
                continue;
            }
            let Some((score, reasons)) =
                score_candidate(&planned, linked_total_cents, candidate)?
            else {
                continue;
            };
            let replace = match &best {
                None => true,
                Some((current, current_score, _)) => {
                    score > *current_score || (score == *current_score && candidate.id > current.id)
                }
            };
            if replace {
                best = Some((candidate.clone(), score, reasons));
            }
        }

        let Some((candidate, _, reasons)) = best else {
            continue;
        };

        let txn_date = candidate.transaction_date.date();
        let remaining_cents = planned.amount_cents - linked_total_cents;
        suggestions.push(PlannedMatchSuggestion {
            planned: planned.clone(),
            transaction: PlannedMatchTransaction {
                id: candidate.id,
                description: candidate.description.clone(),
                amount: candidate.amount,
                transaction_date: txn_date.format("%Y-%m-%d").to_string(),
                category_id: candidate.category_id,
                account_label: candidate.account_label.clone(),
            },
            date_variance_days: (txn_date - planned.start_date).num_days().abs(),
            amount_variance_cents: (remaining_cents - candidate.amount).abs(),
            reasons,
        });
    }

    suggestions.sort_by(|left, right| {
        right
            .planned
            .start_date
            .cmp(&left.planned.start_date)
            .then_with(|| left.planned.name.cmp(&right.planned.name))
    });

    Ok(suggestions)
}

pub fn suggestion_count() -> Result<i64, diesel::result::Error> {
    Ok(i64::try_from(detect_suggestions()?.len()).unwrap_or(i64::MAX))
}

pub fn link_transaction(
    planned_id: i64,
    transaction_id: i64,
) -> Result<PlannedSpendingListItem, diesel::result::Error> {
    let conn = &mut get_dbo();
    let planned = planned_spending::table
        .filter(planned_spending::id.eq(planned_id))
        .filter(planned_spending::deleted_at.is_null())
        .filter(planned_spending::resolved_at.is_null())
        .select(PlannedSpending::as_select())
        .first(conn)
        .optional()?
        .ok_or(diesel::result::Error::NotFound)?;

    transaction_data::table
        .filter(transaction_data::id.eq(transaction_id))
        .filter(transaction_data::deleted_at.is_null())
        .filter(diesel::dsl::sql::<diesel::sql_types::Bool>(ACTIVE_STATEMENT_WHERE))
        .select(transaction_data::id)
        .first::<i64>(conn)
        .optional()?
        .ok_or(diesel::result::Error::NotFound)?;

    let existing_planned: Option<i64> = planned_spending_links::table
        .filter(planned_spending_links::transaction_id.eq(transaction_id))
        .select(planned_spending_links::planned_spending_id)
        .first(conn)
        .optional()?;
    if let Some(other_planned_id) = existing_planned {
        if other_planned_id != planned_id {
            return Err(diesel::result::Error::DatabaseError(
                diesel::result::DatabaseErrorKind::UniqueViolation,
                Box::new("transaction already linked to another planned item".to_string()),
            ));
        }
        return enrich_list_items(vec![planned])
            .and_then(|items| items.into_iter().next().ok_or(diesel::result::Error::NotFound));
    }

    diesel::insert_into(planned_spending_links::table)
        .values((
            planned_spending_links::planned_spending_id.eq(planned_id),
            planned_spending_links::transaction_id.eq(transaction_id),
            planned_spending_links::linked_at.eq(Utc::now().naive_utc()),
        ))
        .execute(conn)?;

    enrich_list_items(vec![planned])
        .and_then(|items| items.into_iter().next().ok_or(diesel::result::Error::NotFound))
}

pub fn mark_complete(planned_id: i64) -> Result<PlannedSpending, diesel::result::Error> {
    let conn = &mut get_dbo();
    let updated = diesel::update(
        planned_spending::table
            .filter(planned_spending::id.eq(planned_id))
            .filter(planned_spending::deleted_at.is_null())
            .filter(planned_spending::resolved_at.is_null()),
    )
    .set(planned_spending::resolved_at.eq(Some(Utc::now().naive_utc())))
    .execute(conn)?;
    if updated == 0 {
        return Err(diesel::result::Error::NotFound);
    }
    planned_spending::table
        .filter(planned_spending::id.eq(planned_id))
        .select(PlannedSpending::as_select())
        .first(conn)
}

pub fn unlink_transaction(planned_id: i64, transaction_id: i64) -> Result<(), diesel::result::Error> {
    let conn = &mut get_dbo();
    let planned_exists = planned_spending::table
        .filter(planned_spending::id.eq(planned_id))
        .filter(planned_spending::deleted_at.is_null())
        .filter(planned_spending::resolved_at.is_null())
        .select(planned_spending::id)
        .first::<i64>(conn)
        .optional()?;
    if planned_exists.is_none() {
        return Err(diesel::result::Error::NotFound);
    }

    let deleted = diesel::delete(
        planned_spending_links::table
            .filter(planned_spending_links::planned_spending_id.eq(planned_id))
            .filter(planned_spending_links::transaction_id.eq(transaction_id)),
    )
    .execute(conn)?;
    if deleted == 0 {
        return Err(diesel::result::Error::NotFound);
    }
    Ok(())
}

pub fn confirm_match(
    planned_id: i64,
    transaction_id: i64,
) -> Result<PlannedSpendingListItem, diesel::result::Error> {
    link_transaction(planned_id, transaction_id)
}

pub fn dismiss_match(planned_id: i64, transaction_id: i64) -> Result<(), diesel::result::Error> {
    let conn = &mut get_dbo();
    let planned_exists = planned_spending::table
        .filter(planned_spending::id.eq(planned_id))
        .filter(planned_spending::deleted_at.is_null())
        .filter(planned_spending::resolved_at.is_null())
        .select(planned_spending::id)
        .first::<i64>(conn)
        .optional()?;
    if planned_exists.is_none() {
        return Err(diesel::result::Error::NotFound);
    }

    diesel::insert_into(planned_spending_dismissed_matches::table)
        .values((
            planned_spending_dismissed_matches::planned_spending_id.eq(planned_id),
            planned_spending_dismissed_matches::transaction_id.eq(transaction_id),
            planned_spending_dismissed_matches::dismissed_at.eq(Utc::now().naive_utc()),
        ))
        .on_conflict((
            planned_spending_dismissed_matches::planned_spending_id,
            planned_spending_dismissed_matches::transaction_id,
        ))
        .do_nothing()
        .execute(conn)?;
    Ok(())
}

pub const LINK_CANDIDATE_DAY_WINDOW: i64 = 30;
pub const LINK_CANDIDATE_LIMIT: i64 = 50;

fn like_pattern(term: &str) -> String {
    let escaped = term
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_");
    format!("%{escaped}%")
}

pub fn link_candidates(
    planned_id: i64,
    search: Option<&str>,
) -> Result<Vec<PlannedMatchTransaction>, diesel::result::Error> {
    let conn = &mut get_dbo();
    let planned = planned_spending::table
        .filter(planned_spending::id.eq(planned_id))
        .filter(planned_spending::deleted_at.is_null())
        .filter(planned_spending::resolved_at.is_null())
        .select(PlannedSpending::as_select())
        .first(conn)
        .optional()?;
    let Some(planned) = planned else {
        return Ok(Vec::new());
    };

    let linked_map = load_linked_transactions_for_planned_ids(&[planned_id])?;
    let linked_total_cents: i32 = linked_map
        .get(&planned_id)
        .map(|txns| txns.iter().map(|txn| txn.amount).sum())
        .unwrap_or(0);
    let remaining_cents = planned.amount_cents - linked_total_cents;

    let range_start = planned.start_date - chrono::Duration::days(LINK_CANDIDATE_DAY_WINDOW);
    let range_end = planned.start_date + chrono::Duration::days(LINK_CANDIDATE_DAY_WINDOW);
    let search_pattern = search
        .map(str::trim)
        .filter(|term| !term.is_empty())
        .map(like_pattern);

    let rows: Vec<CandidateRow> = sql_query(
        r#"
        SELECT
            t.id,
            t.description,
            t.amount,
            t.transaction_date,
            t.category_id,
            COALESCE(fa.display_name, fa.bank_name, s.account_id) AS account_label
        FROM transaction_data t
        INNER JOIN statement s
            ON s.id = t.statement_id
           AND s.deleted_at IS NULL
        LEFT JOIN financial_accounts fa
            ON fa.id = s.financial_account_id
           AND fa.deleted_at IS NULL
        WHERE t.deleted_at IS NULL
          AND t.transaction_date::date >= $1
          AND t.transaction_date::date <= $2
          AND (
              ($3 < 0 AND t.amount < 0)
              OR ($3 > 0 AND t.amount > 0)
          )
          AND NOT EXISTS (
              SELECT 1 FROM planned_spending_links l
              WHERE l.transaction_id = t.id
          )
          AND ($5::text IS NULL OR t.description ILIKE $5)
        ORDER BY
            ABS((t.transaction_date::date - $6)) ASC,
            ABS(t.amount - $3) ASC,
            t.id DESC
        LIMIT $7
        "#,
    )
    .bind::<Date, _>(range_start)
    .bind::<Date, _>(range_end)
    .bind::<Integer, _>(remaining_cents)
    .bind::<BigInt, _>(planned_id)
    .bind::<Nullable<Text>, _>(search_pattern)
    .bind::<Date, _>(planned.start_date)
    .bind::<BigInt, _>(LINK_CANDIDATE_LIMIT)
    .load(conn)?;

    Ok(rows
        .into_iter()
        .map(|row| {
            let txn_date = row.transaction_date.date();
            PlannedMatchTransaction {
                id: row.id,
                description: row.description,
                amount: row.amount,
                transaction_date: txn_date.format("%Y-%m-%d").to_string(),
                category_id: row.category_id,
                account_label: row.account_label,
            }
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::{amount_matches_remaining, amount_within_tolerance, text_signals_match};
    use crate::models::planned_spending::PlannedSpending;
    use chrono::NaiveDate;

    fn sample_planned(name: &str, notes: Option<&str>) -> PlannedSpending {
        PlannedSpending {
            id: 1,
            name: name.to_string(),
            amount_cents: -157_500,
            start_date: NaiveDate::from_ymd_opt(2026, 5, 27).expect("date"),
            end_date: None,
            category_id: Some(4),
            notes: notes.map(str::to_string),
            created_at: chrono::NaiveDate::from_ymd_opt(2026, 1, 1)
                .expect("date")
                .and_hms_opt(0, 0, 0)
                .expect("time"),
            deleted_at: None,
            resolved_at: None,
        }
    }

    #[test]
    fn exact_amount_within_tolerance() {
        assert!(amount_within_tolerance(-157_500, -157_500));
    }

    #[test]
    fn five_dollar_variance_allowed() {
        assert!(amount_within_tolerance(-100_00, -104_00));
        assert!(!amount_within_tolerance(-100_00, -106_00));
    }

    #[test]
    fn opposite_sign_rejected() {
        assert!(!amount_within_tolerance(-100_00, 100_00));
    }

    #[test]
    fn description_token_match() {
        let planned = sample_planned(
            "Car - Tyres (4)",
            Some("MRTP Group — front + RH rear"),
        );
        assert!(text_signals_match(
            &planned,
            "VISA PURCHASE MRTPGROUPPTY LTD 5041"
        ));
    }

    #[test]
    fn partial_payment_matches_remaining() {
        assert_eq!(
            amount_matches_remaining(-100_00, -40_00),
            Some("partial_payment")
        );
    }

    #[test]
    fn full_remaining_payment_matches() {
        assert_eq!(
            amount_matches_remaining(-100_00, -100_00),
            Some("exact_remaining")
        );
    }
}
