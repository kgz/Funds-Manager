use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use database::models::account_transfer::AccountTransfer;
use diesel::result::Error as DbError;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct TransfersQuery {
    pub account_id: Option<i64>,
}

#[derive(Deserialize, Debug)]
pub struct TransferPairPayload {
    pub out_transaction_id: i64,
    pub in_transaction_id: i64,
}

fn map_db_error(err: DbError) -> error::Error {
    eprintln!("Database Error: {:?}", err);
    match err {
        DbError::NotFound => error::ErrorBadRequest("Invalid transfer pair"),
        _ => error::ErrorInternalServerError("An internal server error occurred"),
    }
}

async fn list_confirmed() -> Result<impl Responder, actix_web::Error> {
    let data = web::block(AccountTransfer::list_confirmed)
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading transfers: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to load transfers")
        })?
        .map_err(|e| {
            eprintln!("Database error loading transfers: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to load transfers")
        })?;
    Ok(HttpResponse::Ok().json(data))
}

async fn list_suggestions(query: web::Query<TransfersQuery>) -> Result<impl Responder, actix_web::Error> {
    let account_id = query.account_id;
    let data = web::block(move || AccountTransfer::detect_suggestions(account_id))
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading transfer suggestions: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to load transfer suggestions")
        })?
        .map_err(|e| {
            eprintln!("Database error loading transfer suggestions: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to load transfer suggestions")
        })?;
    Ok(HttpResponse::Ok().json(data))
}

async fn confirm_transfer(payload: web::Json<TransferPairPayload>) -> Result<impl Responder, actix_web::Error> {
    let out_id = payload.out_transaction_id;
    let in_id = payload.in_transaction_id;
    let data = web::block(move || AccountTransfer::confirm_pair(out_id, in_id))
        .await
        .map_err(|e| {
            eprintln!("Blocking error confirming transfer: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to confirm transfer")
        })?
        .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(data))
}

async fn dismiss_transfer(payload: web::Json<TransferPairPayload>) -> Result<impl Responder, actix_web::Error> {
    let out_id = payload.out_transaction_id;
    let in_id = payload.in_transaction_id;
    let data = web::block(move || AccountTransfer::dismiss_suggestion(out_id, in_id))
        .await
        .map_err(|e| {
            eprintln!("Blocking error dismissing transfer: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to dismiss transfer")
        })?
        .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(data))
}

async fn unlink_transfer(path: web::Path<i64>) -> Result<impl Responder, actix_web::Error> {
    let id = path.into_inner();
    web::block(move || AccountTransfer::unlink(id))
        .await
        .map_err(|e| {
            eprintln!("Blocking error unlinking transfer: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to unlink transfer")
        })?
        .map_err(map_db_error)?;
    Ok(HttpResponse::NoContent().finish())
}

pub fn transfers_service() -> Scope {
    web::scope("/transfers")
        .route("", web::get().to(list_confirmed))
        .route("", web::post().to(confirm_transfer))
        .route("/suggestions", web::get().to(list_suggestions))
        .route("/dismiss", web::post().to(dismiss_transfer))
        .route("/{id}", web::delete().to(unlink_transfer))
}
