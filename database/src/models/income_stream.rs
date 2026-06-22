use chrono::{Datelike, NaiveDate, NaiveDateTime, Utc};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::models::recurring_detection::{detect_recurring_income, RecurringCandidate, SlimTransaction};
use crate::models::transaction::{filter_active_statement, EXCLUDE_CONFIRMED_TRANSFERS};
use crate::modules::database::get_dbo;
use crate::schema::{income_stream_profiles, transaction_data};

#[derive(Queryable, Selectable, Debug, Clone, Serialize, Deserialize)]
#[diesel(table_name = income_stream_profiles)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct IncomeStreamProfile {
    pub stream_key: String,
    pub display_label: Option<String>,
    pub is_primary: bool,
    pub is_confirmed: bool,
    pub gross_monthly_dollars: Option<f64>,
    pub merged_into_key: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = income_stream_profiles)]
pub struct NewIncomeStreamProfile<'a> {
    pub stream_key: &'a str,
    pub display_label: Option<&'a str>,
    pub is_primary: bool,
    pub is_confirmed: bool,
    pub gross_monthly_dollars: Option<f64>,
    pub merged_into_key: Option<&'a str>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IncomeStreamSummary {
    pub stream_key: String,
    pub label: String,
    pub source_label: String,
    pub frequency: String,
    pub average_amount_dollars: f64,
    pub estimated_monthly_dollars: f64,
    pub min_amount_dollars: f64,
    pub max_amount_dollars: f64,
    pub months_observed: i32,
    pub occurrences: i32,
    pub first_date: String,
    pub last_date: String,
    pub confidence: i32,
    pub is_irregular: bool,
    pub is_primary: bool,
    pub is_confirmed: bool,
    pub gross_monthly_dollars: Option<f64>,
    pub estimated_yearly_ex_gst_dollars: f64,
    pub estimated_yearly_inc_gst_dollars: f64,
    pub gross_yearly_ex_gst_dollars: Option<f64>,
    pub gross_yearly_inc_gst_dollars: Option<f64>,
    pub merged_into_key: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IncomeSummaryResponse {
    pub streams: Vec<IncomeStreamSummary>,
    pub total_monthly_dollars: f64,
    pub total_yearly_ex_gst_dollars: f64,
    pub total_yearly_inc_gst_dollars: f64,
    pub primary_stream_key: Option<String>,
}

const AU_GST_RATE: f64 = 0.1;

fn round2(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}

fn yearly_gst_from_monthly(monthly: f64) -> (f64, f64) {
    let ex = round2(monthly * 12.0);
    let inc = round2(ex * (1.0 + AU_GST_RATE));
    (ex, inc)
}

fn optional_yearly_gst_from_monthly(monthly: Option<f64>) -> (Option<f64>, Option<f64>) {
    match monthly {
        Some(value) => {
            let (ex, inc) = yearly_gst_from_monthly(value);
            (Some(ex), Some(inc))
        }
        None => (None, None),
    }
}

fn parse_iso_date(value: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").ok()
}

fn months_observed(first_date: &str, last_date: &str) -> i32 {
    let Some(first) = parse_iso_date(first_date) else {
        return 0;
    };
    let Some(last) = parse_iso_date(last_date) else {
        return 0;
    };
    if last < first {
        return 0;
    }
    (last.year() - first.year()) * 12 + (last.month() as i32 - first.month() as i32) + 1
}

fn is_irregular(candidate: &RecurringCandidate) -> bool {
    if candidate.confidence < 55 {
        return true;
    }
    if candidate.cadence_label.starts_with('~') {
        return true;
    }
    if candidate.typical_amount_dollars <= 0.0 {
        return false;
    }
    let spread =
        (candidate.max_amount_dollars - candidate.min_amount_dollars) / candidate.typical_amount_dollars;
    spread > 0.25
}

impl IncomeStreamProfile {
    pub fn all() -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        income_stream_profiles::table
            .order(income_stream_profiles::stream_key.asc())
            .select(Self::as_select())
            .load(conn)
    }

    pub fn upsert(
        stream_key: &str,
        display_label: Option<Option<String>>,
        is_primary: Option<bool>,
        is_confirmed: Option<bool>,
        gross_monthly_dollars: Option<Option<f64>>,
        merged_into_key: Option<Option<String>>,
    ) -> Result<Self, diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();

        if is_primary == Some(true) {
            diesel::update(income_stream_profiles::table)
                .set(income_stream_profiles::is_primary.eq(false))
                .execute(conn)?;
        }

        let existing: Option<Self> = income_stream_profiles::table
            .filter(income_stream_profiles::stream_key.eq(stream_key))
            .select(Self::as_select())
            .first(conn)
            .optional()?;

        if let Some(row) = existing {
            let display_label = match display_label {
                None => row.display_label,
                Some(value) => value,
            };
            let is_primary = is_primary.unwrap_or(row.is_primary);
            let is_confirmed = is_confirmed.unwrap_or(row.is_confirmed);
            let gross_monthly_dollars = match gross_monthly_dollars {
                None => row.gross_monthly_dollars,
                Some(value) => value,
            };
            let merged_into_key = match merged_into_key {
                None => row.merged_into_key,
                Some(value) => value,
            };

            diesel::update(income_stream_profiles::table.filter(income_stream_profiles::stream_key.eq(stream_key)))
                .set((
                    income_stream_profiles::display_label.eq(display_label),
                    income_stream_profiles::is_primary.eq(is_primary),
                    income_stream_profiles::is_confirmed.eq(is_confirmed),
                    income_stream_profiles::gross_monthly_dollars.eq(gross_monthly_dollars),
                    income_stream_profiles::merged_into_key.eq(merged_into_key),
                    income_stream_profiles::updated_at.eq(now),
                ))
                .execute(conn)?;
        } else {
            let row = NewIncomeStreamProfile {
                stream_key,
                display_label: display_label.as_ref().and_then(|v| v.as_deref()),
                is_primary: is_primary.unwrap_or(false),
                is_confirmed: is_confirmed.unwrap_or(false),
                gross_monthly_dollars: gross_monthly_dollars.and_then(|v| v),
                merged_into_key: merged_into_key.as_ref().and_then(|v| v.as_deref()),
                created_at: now,
                updated_at: now,
            };
            diesel::insert_into(income_stream_profiles::table)
                .values(&row)
                .execute(conn)?;
        }

        income_stream_profiles::table
            .filter(income_stream_profiles::stream_key.eq(stream_key))
            .select(Self::as_select())
            .first(conn)
    }
}

pub fn income_summary(
    min_occurrences: i32,
    financial_account_id: Option<i64>,
) -> Result<IncomeSummaryResponse, diesel::result::Error> {
    let conn = &mut get_dbo();
    let rows: Vec<(String, i32, NaiveDateTime, Option<i32>)> = filter_active_statement(
        transaction_data::table
            .filter(transaction_data::deleted_at.is_null())
            .filter(diesel::dsl::sql::<diesel::sql_types::Bool>(
                EXCLUDE_CONFIRMED_TRANSFERS,
            ))
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

    let candidates = detect_recurring_income(&slim, min_occurrences);
    let profiles: HashMap<String, IncomeStreamProfile> = IncomeStreamProfile::all()?
        .into_iter()
        .map(|row| (row.stream_key.clone(), row))
        .collect();

    let mut streams: Vec<IncomeStreamSummary> = candidates
        .into_iter()
        .map(|candidate| {
            let stream_key = candidate.row_id.clone();
            let profile = profiles.get(&stream_key);
            let label = profile
                .and_then(|p| p.display_label.clone())
                .unwrap_or_else(|| candidate.label_sample.clone());
            let gross_monthly = profile.and_then(|p| p.gross_monthly_dollars);
            let (estimated_yearly_ex, estimated_yearly_inc) =
                yearly_gst_from_monthly(candidate.estimated_monthly_dollars);
            let (gross_yearly_ex, gross_yearly_inc) = optional_yearly_gst_from_monthly(gross_monthly);
            IncomeStreamSummary {
                stream_key: stream_key.clone(),
                label,
                source_label: candidate.label_sample.clone(),
                frequency: candidate.cadence_label.clone(),
                average_amount_dollars: candidate.typical_amount_dollars,
                estimated_monthly_dollars: candidate.estimated_monthly_dollars,
                min_amount_dollars: candidate.min_amount_dollars,
                max_amount_dollars: candidate.max_amount_dollars,
                months_observed: months_observed(&candidate.first_date, &candidate.last_date),
                occurrences: candidate.occurrences,
                first_date: candidate.first_date.clone(),
                last_date: candidate.last_date.clone(),
                confidence: candidate.confidence,
                is_irregular: is_irregular(&candidate),
                is_primary: profile.map(|p| p.is_primary).unwrap_or(false),
                is_confirmed: profile.map(|p| p.is_confirmed).unwrap_or(false),
                gross_monthly_dollars: gross_monthly,
                estimated_yearly_ex_gst_dollars: estimated_yearly_ex,
                estimated_yearly_inc_gst_dollars: estimated_yearly_inc,
                gross_yearly_ex_gst_dollars: gross_yearly_ex,
                gross_yearly_inc_gst_dollars: gross_yearly_inc,
                merged_into_key: profile.and_then(|p| p.merged_into_key.clone()),
            }
        })
        .filter(|stream| stream.merged_into_key.is_none())
        .collect();

    streams.sort_by(|left, right| {
        right
            .is_primary
            .cmp(&left.is_primary)
            .then(right.estimated_monthly_dollars.partial_cmp(&left.estimated_monthly_dollars).unwrap_or(std::cmp::Ordering::Equal))
            .then(left.label.cmp(&right.label))
    });

    let total_monthly_dollars = streams
        .iter()
        .map(|stream| stream.estimated_monthly_dollars)
        .sum::<f64>();
    let total_monthly_dollars = round2(total_monthly_dollars);
    let (total_yearly_ex_gst_dollars, total_yearly_inc_gst_dollars) =
        yearly_gst_from_monthly(total_monthly_dollars);
    let primary_stream_key = streams
        .iter()
        .find(|stream| stream.is_primary)
        .map(|stream| stream.stream_key.clone());

    Ok(IncomeSummaryResponse {
        streams,
        total_monthly_dollars,
        total_yearly_ex_gst_dollars,
        total_yearly_inc_gst_dollars,
        primary_stream_key,
    })
}
