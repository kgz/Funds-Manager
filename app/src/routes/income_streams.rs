use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use database::models::income_stream::{self, IncomeStreamProfile};
use diesel::result::Error as DbError;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct IncomeStreamsQuery {
    #[serde(default = "default_min_occurrences")]
    pub min_occurrences: i32,
    pub account_id: Option<i64>,
}

fn default_min_occurrences() -> i32 {
    3
}

#[derive(Deserialize, Debug)]
pub struct UpsertIncomeStreamProfilePayload {
    pub stream_key: String,
    pub display_label: Option<String>,
    pub is_primary: Option<bool>,
    pub is_confirmed: Option<bool>,
    pub gross_monthly_dollars: Option<f64>,
    pub merged_into_key: Option<String>,
}

fn map_db_error(err: DbError) -> error::Error {
    eprintln!("Database Error: {:?}", err);
    match err {
        DbError::NotFound => error::ErrorNotFound("Income stream profile not found"),
        _ => error::ErrorInternalServerError("An internal server error occurred"),
    }
}

async fn get_income_summary(query: web::Query<IncomeStreamsQuery>) -> Result<impl Responder, actix_web::Error> {
    let min_occurrences = query.min_occurrences;
    let account_id = query.account_id;
    let data = web::block(move || income_stream::income_summary(min_occurrences, account_id))
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading income summary: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to load income summary")
        })?
        .map_err(|e| {
            eprintln!("Database error loading income summary: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to load income summary")
        })?;
    Ok(HttpResponse::Ok().json(data))
}

async fn upsert_income_stream_profile(
    body: web::Json<UpsertIncomeStreamProfilePayload>,
) -> Result<impl Responder, actix_web::Error> {
    let payload = body.into_inner();
    let stream_key = payload.stream_key.clone();
    let profile = web::block(move || {
        IncomeStreamProfile::upsert(
            &stream_key,
            payload.display_label.as_ref().map(|label| Some(label.clone())),
            payload.is_primary,
            payload.is_confirmed,
            payload.gross_monthly_dollars.map(Some),
            payload.merged_into_key.as_ref().map(|key| Some(key.clone())),
        )
    })
    .await
    .map_err(|e| {
        eprintln!("Blocking error upserting income stream profile: {:?}", e);
        actix_web::error::ErrorInternalServerError("Failed to save income stream profile")
    })?
    .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(profile))
}

pub fn income_streams_service() -> Scope {
    web::scope("/income-streams")
        .route("", web::get().to(get_income_summary))
        .route("/profiles", web::put().to(upsert_income_stream_profile))
}
