use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use database::models::broker_report::{
    BrokerReportAnnotation, BrokerReportShare, PublicBrokerReportResponse, ReportRedaction,
};
use diesel::result::Error as DbError;
use serde::Deserialize;

fn map_db_error(err: DbError) -> error::Error {
    eprintln!("Database Error: {:?}", err);
    match err {
        DbError::NotFound => error::ErrorNotFound("Not found"),
        _ => error::ErrorInternalServerError("An internal server error occurred"),
    }
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreateSharePayload {
    #[serde(default)]
    pub hide_account_numbers: Option<bool>,
    #[serde(default)]
    pub hidden_merchant_patterns: Vec<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreateAnnotationPayload {
    pub transaction_id: i64,
    pub note: String,
    #[serde(default)]
    pub exclude_from_analysis: bool,
}

fn redaction_from_payload(payload: &CreateSharePayload) -> ReportRedaction {
    ReportRedaction {
        hide_account_numbers: payload.hide_account_numbers.unwrap_or(true),
        hidden_merchant_patterns: payload
            .hidden_merchant_patterns
            .iter()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .collect(),
    }
}

async fn list_shares(path: web::Path<i64>) -> Result<impl Responder, error::Error> {
    let snapshot_id = path.into_inner();
    let items = web::block(move || {
        BrokerReportShare::list_active_for_snapshot(snapshot_id)
            .map(|rows| rows.iter().map(BrokerReportShare::to_list_item).collect::<Vec<_>>())
    })
    .await
    .map_err(|e| {
        eprintln!("Blocking error listing shares: {:?}", e);
        error::ErrorInternalServerError("Failed to list shares")
    })?
    .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(items))
}

async fn create_share(
    path: web::Path<i64>,
    payload: web::Json<CreateSharePayload>,
) -> Result<impl Responder, error::Error> {
    let snapshot_id = path.into_inner();
    let redaction = redaction_from_payload(&payload);
    let share = web::block(move || BrokerReportShare::create(snapshot_id, &redaction))
        .await
        .map_err(|e| {
            eprintln!("Blocking error creating share: {:?}", e);
            error::ErrorInternalServerError("Failed to create share")
        })?
        .map_err(map_db_error)?;
    Ok(HttpResponse::Created().json(share.to_list_item()))
}

async fn revoke_share(path: web::Path<(i64, i64)>) -> Result<impl Responder, error::Error> {
    let (snapshot_id, share_id) = path.into_inner();
    web::block(move || BrokerReportShare::revoke(snapshot_id, share_id))
        .await
        .map_err(|e| {
            eprintln!("Blocking error revoking share: {:?}", e);
            error::ErrorInternalServerError("Failed to revoke share")
        })?
        .map_err(map_db_error)?;
    Ok(HttpResponse::NoContent().finish())
}

async fn list_annotations(path: web::Path<i64>) -> Result<impl Responder, error::Error> {
    let snapshot_id = path.into_inner();
    let items = web::block(move || BrokerReportAnnotation::list_for_snapshot(snapshot_id))
        .await
        .map_err(|e| {
            eprintln!("Blocking error listing annotations: {:?}", e);
            error::ErrorInternalServerError("Failed to list annotations")
        })?
        .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(items))
}

async fn create_annotation(
    path: web::Path<i64>,
    payload: web::Json<CreateAnnotationPayload>,
) -> Result<impl Responder, error::Error> {
    let snapshot_id = path.into_inner();
    if payload.note.trim().is_empty() {
        return Err(error::ErrorBadRequest("note is required"));
    }
    let transaction_id = payload.transaction_id;
    let note = payload.note.clone();
    let exclude = payload.exclude_from_analysis;
    let item = web::block(move || {
        BrokerReportAnnotation::create(snapshot_id, transaction_id, &note, exclude)
    })
    .await
    .map_err(|e| {
        eprintln!("Blocking error creating annotation: {:?}", e);
        error::ErrorInternalServerError("Failed to create annotation")
    })?
    .map_err(map_db_error)?;
    Ok(HttpResponse::Created().json(item))
}

async fn delete_annotation(path: web::Path<(i64, i64)>) -> Result<impl Responder, error::Error> {
    let (snapshot_id, annotation_id) = path.into_inner();
    web::block(move || BrokerReportAnnotation::soft_delete(snapshot_id, annotation_id))
        .await
        .map_err(|e| {
            eprintln!("Blocking error deleting annotation: {:?}", e);
            error::ErrorInternalServerError("Failed to delete annotation")
        })?
        .map_err(map_db_error)?;
    Ok(HttpResponse::NoContent().finish())
}

async fn get_public_report(path: web::Path<String>) -> Result<impl Responder, error::Error> {
    let token = path.into_inner();
    let report = web::block(move || database::models::broker_report::public_report_by_token(&token))
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading public report: {:?}", e);
            error::ErrorInternalServerError("Failed to load report")
        })?
        .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(report))
}

pub fn snapshot_shares_scope() -> Scope {
    web::scope("/{snapshot_id}/shares")
        .route("", web::get().to(list_shares))
        .route("", web::post().to(create_share))
        .route("/{share_id}", web::delete().to(revoke_share))
}

pub fn snapshot_annotations_scope() -> Scope {
    web::scope("/{snapshot_id}/annotations")
        .route("", web::get().to(list_annotations))
        .route("", web::post().to(create_annotation))
        .route("/{annotation_id}", web::delete().to(delete_annotation))
}

pub fn public_broker_reports_service() -> Scope {
    web::scope("/public/broker-reports").route("/{token}", web::get().to(get_public_report))
}
