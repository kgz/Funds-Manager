use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use chrono::{NaiveDate, Utc};
use database::models::report_snapshot::{CaptureInput, ReportSnapshot};
use database::models::serviceability::DEFAULT_RATE_BUFFER_BPS;
use diesel::result::Error as DbError;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreateReportSnapshotPayload {
    pub name: String,
    pub as_at: Option<String>,
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
    match err {
        DbError::NotFound => error::ErrorNotFound("Not found"),
        _ => error::ErrorInternalServerError("An internal server error occurred"),
    }
}

fn parse_date(value: &str, field: &str) -> Result<NaiveDate, error::Error> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| {
        error::ErrorBadRequest(format!("Invalid {field}; use YYYY-MM-DD"))
    })
}

fn validate_create(payload: &CreateReportSnapshotPayload) -> Result<CaptureInput, error::Error> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(error::ErrorBadRequest("name is required"));
    }
    if name.len() > 200 {
        return Err(error::ErrorBadRequest("name must be at most 200 characters"));
    }
    let start_date = parse_date(&payload.start_date, "startDate")?;
    let end_date = parse_date(&payload.end_date, "endDate")?;
    if start_date > end_date {
        return Err(error::ErrorBadRequest(
            "startDate must be on or before endDate",
        ));
    }
    let as_at = match payload.as_at.as_deref() {
        Some(value) => parse_date(value, "asAt")?,
        None => Utc::now().date_naive(),
    };
    let rate_buffer_bps = payload.rate_buffer_bps.unwrap_or(DEFAULT_RATE_BUFFER_BPS);
    if rate_buffer_bps < 0 || rate_buffer_bps > 2_000 {
        return Err(error::ErrorBadRequest(
            "rateBufferBps must be between 0 and 2000",
        ));
    }
    Ok(CaptureInput {
        name: name.to_string(),
        as_at,
        start_date,
        end_date,
        account_id: payload.account_id,
        rate_buffer_bps,
        min_occurrences: payload.min_occurrences,
    })
}

async fn list_report_snapshots() -> Result<impl Responder, error::Error> {
    let items = web::block(ReportSnapshot::list_active)
        .await
        .map_err(|e| {
            eprintln!("Blocking error listing report snapshots: {:?}", e);
            error::ErrorInternalServerError("Failed to list report snapshots")
        })?
        .map_err(map_db_error)?;
    let response: Vec<_> = items.iter().map(ReportSnapshot::to_list_item).collect();
    Ok(HttpResponse::Ok().json(response))
}

async fn get_report_snapshot(path: web::Path<i64>) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    let snapshot = web::block(move || ReportSnapshot::find_active(id))
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading report snapshot: {:?}", e);
            error::ErrorInternalServerError("Failed to load report snapshot")
        })?
        .map_err(map_db_error)?
        .ok_or_else(|| error::ErrorNotFound("Not found"))?;
    let detail = snapshot.to_detail().map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(detail))
}

async fn create_report_snapshot(
    payload: web::Json<CreateReportSnapshotPayload>,
) -> Result<impl Responder, error::Error> {
    let input = validate_create(&payload)?;
    let snapshot = web::block(move || ReportSnapshot::capture(input))
        .await
        .map_err(|e| {
            eprintln!("Blocking error creating report snapshot: {:?}", e);
            error::ErrorInternalServerError("Failed to create report snapshot")
        })?
        .map_err(map_db_error)?;
    let detail = snapshot.to_detail().map_err(map_db_error)?;
    Ok(HttpResponse::Created().json(detail))
}

async fn delete_report_snapshot(path: web::Path<i64>) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    web::block(move || ReportSnapshot::soft_delete(id))
        .await
        .map_err(|e| {
            eprintln!("Blocking error deleting report snapshot: {:?}", e);
            error::ErrorInternalServerError("Failed to delete report snapshot")
        })?
        .map_err(map_db_error)?;
    Ok(HttpResponse::NoContent().finish())
}

pub fn report_snapshots_service() -> Scope {
    web::scope("/report-snapshots")
        .route("", web::get().to(list_report_snapshots))
        .route("", web::post().to(create_report_snapshot))
        .service(crate::routes::broker_report::snapshot_shares_scope())
        .service(crate::routes::broker_report::snapshot_annotations_scope())
        .route("/{id}", web::get().to(get_report_snapshot))
        .route("/{id}", web::delete().to(delete_report_snapshot))
}
