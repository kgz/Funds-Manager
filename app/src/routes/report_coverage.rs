use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use chrono::NaiveDate;
use database::models::report_coverage;
use diesel::result::Error as DbError;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct ReportCoverageSummaryQuery {
    pub start_date: String,
    pub end_date: String,
    pub account_id: Option<i64>,
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

async fn get_report_coverage_summary(
    query: web::Query<ReportCoverageSummaryQuery>,
) -> Result<impl Responder, error::Error> {
    let start = parse_date(&query.start_date, "start_date")?;
    let end = parse_date(&query.end_date, "end_date")?;
    if start > end {
        return Err(error::ErrorBadRequest(
            "start_date must be on or before end_date",
        ));
    }
    let account_id = query.account_id;
    let summary = web::block(move || report_coverage::coverage_summary(start, end, account_id))
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading report coverage: {:?}", e);
            error::ErrorInternalServerError("Failed to load report coverage")
        })?
        .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(summary))
}

pub fn report_coverage_service() -> Scope {
    web::scope("/report-coverage").route("/summary", web::get().to(get_report_coverage_summary))
}
