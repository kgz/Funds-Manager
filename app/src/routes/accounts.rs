use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use database::models::financial_account::{
    FinancialAccount,
};
use diesel::result::Error as DbError;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct CreateAccountPayload {
    pub bank_name: String,
    pub display_name: String,
    pub account_number: String,
    pub parser_name: String,
    pub account_type: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct UpdateAccountPayload {
    pub bank_name: Option<String>,
    pub display_name: Option<String>,
    pub account_type: Option<Option<String>>,
}

#[derive(Deserialize, Debug)]
pub struct AccountsListQuery {
    #[serde(default)]
    with_stats: bool,
}

fn map_db_error(err: DbError) -> error::Error {
    eprintln!("Database Error: {:?}", err);
    match err {
        DbError::NotFound => error::ErrorNotFound("Account not found"),
        _ => error::ErrorInternalServerError("An internal server error occurred"),
    }
}

async fn list_accounts(
    query: web::Query<AccountsListQuery>,
) -> Result<impl Responder, error::Error> {
    if query.with_stats {
        let rows = FinancialAccount::all_active_with_stats().map_err(map_db_error)?;
        return Ok(HttpResponse::Ok().json(rows));
    }
    let rows = FinancialAccount::all_active().map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(rows))
}

async fn create_account(
    payload: web::Json<CreateAccountPayload>,
) -> Result<impl Responder, error::Error> {
    let account = FinancialAccount::insert(
        &payload.bank_name,
        &payload.display_name,
        &payload.account_number,
        &payload.parser_name,
        payload.account_type.as_deref(),
    )
    .map_err(map_db_error)?;
    Ok(HttpResponse::Created().json(account))
}

async fn update_account(
    path: web::Path<i64>,
    payload: web::Json<UpdateAccountPayload>,
) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    let account = FinancialAccount::update(
        id,
        payload.bank_name.clone(),
        payload.display_name.clone(),
        payload.account_type.clone(),
    )
    .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(account))
}

async fn delete_account(path: web::Path<i64>) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    FinancialAccount::delete(id).map_err(map_db_error)?;
    Ok(HttpResponse::NoContent().finish())
}

pub fn accounts_service() -> Scope {
    web::scope("/accounts")
        .route("", web::get().to(list_accounts))
        .route("", web::post().to(create_account))
        .route("/{id}", web::put().to(update_account))
        .route("/{id}", web::delete().to(delete_account))
}
