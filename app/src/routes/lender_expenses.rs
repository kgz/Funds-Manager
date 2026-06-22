use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use chrono::NaiveDate;
use database::models::lender_expense::{self, set_category_lender_mapping};
use diesel::result::Error as DbError;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct LenderExpenseSummaryQuery {
    pub start_date: String,
    pub end_date: String,
    pub account_id: Option<i64>,
}

#[derive(Deserialize, Debug)]
pub struct UpsertCategoryLenderMappingPayload {
    pub category_id: i64,
    pub bucket_key: Option<String>,
}

fn parse_date(value: &str) -> Result<NaiveDate, actix_web::Error> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| {
        actix_web::error::ErrorBadRequest("Dates must be YYYY-MM-DD")
    })
}

fn map_db_error(err: DbError) -> error::Error {
    eprintln!("Database Error: {:?}", err);
    match err {
        DbError::NotFound => error::ErrorNotFound("Lender expense resource not found"),
        DbError::DatabaseError(diesel::result::DatabaseErrorKind::ForeignKeyViolation, _) => {
            error::ErrorBadRequest("Invalid category or bucket")
        }
        _ => error::ErrorInternalServerError("An internal server error occurred"),
    }
}

async fn list_buckets() -> Result<impl Responder, actix_web::Error> {
    let data = web::block(lender_expense::LenderExpenseBucket::all)
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading lender buckets: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to load lender buckets")
        })?
        .map_err(|e| {
            eprintln!("Database error loading lender buckets: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to load lender buckets")
        })?;
    Ok(HttpResponse::Ok().json(data))
}

async fn list_mappings() -> Result<impl Responder, actix_web::Error> {
    let data = web::block(lender_expense::list_category_mappings)
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading lender mappings: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to load lender mappings")
        })?
        .map_err(|e| {
            eprintln!("Database error loading lender mappings: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to load lender mappings")
        })?;
    Ok(HttpResponse::Ok().json(data))
}

async fn upsert_mapping(
    body: web::Json<UpsertCategoryLenderMappingPayload>,
) -> Result<impl Responder, actix_web::Error> {
    let payload = body.into_inner();
    let category_id = payload.category_id;
    let bucket_key = payload.bucket_key;
    web::block(move || set_category_lender_mapping(category_id, bucket_key.as_deref()))
        .await
        .map_err(|e| {
            eprintln!("Blocking error upserting lender mapping: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to save lender mapping")
        })?
        .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "ok": true })))
}

async fn get_summary(
    query: web::Query<LenderExpenseSummaryQuery>,
) -> Result<impl Responder, actix_web::Error> {
    let start = parse_date(&query.start_date)?;
    let end = parse_date(&query.end_date)?;
    if end < start {
        return Err(actix_web::error::ErrorBadRequest(
            "end_date must be on or after start_date",
        ));
    }
    let account_id = query.account_id;
    let data = web::block(move || lender_expense::expense_summary(start, end, account_id))
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading lender expense summary: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to load lender expense summary")
        })?
        .map_err(|e| {
            eprintln!("Database error loading lender expense summary: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to load lender expense summary")
        })?;
    Ok(HttpResponse::Ok().json(data))
}

async fn get_bucket_breakdown(
    path: web::Path<String>,
    query: web::Query<LenderExpenseSummaryQuery>,
) -> Result<impl Responder, actix_web::Error> {
    let bucket_key = path.into_inner();
    let start = parse_date(&query.start_date)?;
    let end = parse_date(&query.end_date)?;
    if end < start {
        return Err(actix_web::error::ErrorBadRequest(
            "end_date must be on or after start_date",
        ));
    }
    let account_id = query.account_id;
    let data = web::block(move || {
        lender_expense::bucket_breakdown(&bucket_key, start, end, account_id)
    })
    .await
    .map_err(|e| {
        eprintln!("Blocking error loading lender bucket breakdown: {:?}", e);
        actix_web::error::ErrorInternalServerError("Failed to load bucket breakdown")
    })?
    .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(data))
}

pub fn lender_expenses_service() -> Scope {
    web::scope("/lender-expenses")
        .route("/buckets/{bucket_key}/breakdown", web::get().to(get_bucket_breakdown))
        .route("/buckets", web::get().to(list_buckets))
        .route("/mappings", web::get().to(list_mappings))
        .route("/mappings", web::put().to(upsert_mapping))
        .route("/summary", web::get().to(get_summary))
}
