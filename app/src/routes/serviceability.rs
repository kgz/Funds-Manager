use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use chrono::NaiveDate;
use database::models::serviceability::{self, DEFAULT_RATE_BUFFER_BPS};
use diesel::result::Error as DbError;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct ServiceabilitySummaryQuery {
    pub start_date: String,
    pub end_date: String,
    pub account_id: Option<i64>,
    pub rate_buffer_bps: Option<i32>,
    #[serde(default = "default_min_occurrences")]
    pub min_occurrences: i32,
}

fn default_min_occurrences() -> i32 {
    3
}

fn map_db_error(err: DbError) -> error::Error {
    eprintln!("Database Error: {:?}", err);
    error::ErrorInternalServerError("An internal server error occurred")
}

fn parse_date(value: &str, field: &str) -> Result<NaiveDate, error::Error> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| {
        error::ErrorBadRequest(format!("Invalid {field}; use YYYY-MM-DD"))
    })
}

async fn get_serviceability_summary(
    query: web::Query<ServiceabilitySummaryQuery>,
) -> Result<impl Responder, error::Error> {
    let start = parse_date(&query.start_date, "start_date")?;
    let end = parse_date(&query.end_date, "end_date")?;
    if start > end {
        return Err(error::ErrorBadRequest(
            "start_date must be on or before end_date",
        ));
    }
    let rate_buffer_bps = query.rate_buffer_bps.unwrap_or(DEFAULT_RATE_BUFFER_BPS);
    if rate_buffer_bps < 0 || rate_buffer_bps > 2_000 {
        return Err(error::ErrorBadRequest(
            "rate_buffer_bps must be between 0 and 2000",
        ));
    }
    let account_id = query.account_id;
    let min_occurrences = query.min_occurrences;
    let summary = web::block(move || {
        serviceability::serviceability_summary(
            start,
            end,
            account_id,
            rate_buffer_bps,
            min_occurrences,
        )
    })
    .await
    .map_err(|e| {
        eprintln!("Blocking error loading serviceability summary: {:?}", e);
        error::ErrorInternalServerError("Failed to load serviceability summary")
    })?
    .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(summary))
}

pub fn serviceability_service() -> Scope {
    web::scope("/serviceability").route("/summary", web::get().to(get_serviceability_summary))
}
