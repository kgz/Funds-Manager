use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use database::models::category::Category;
use database::models::transaction::Transaction;
use database::models::transaction_category_learn::recategorize_uncategorized_transactions;
use diesel::result::Error as DbError;
use serde::{Deserialize, Serialize};

fn map_db_error(e: DbError) -> error::Error {
    eprintln!("Database Error: {:?}", e);
    match e {
        DbError::NotFound => error::ErrorNotFound("Transaction not found"),
        _ => error::ErrorInternalServerError("An internal server error occurred"),
    }
}

#[derive(Deserialize, Debug)]
pub struct TransactionsQuery {
    pub page: Option<i64>,
    #[serde(default)]
    pub per_page: Option<i64>,
    pub search: Option<String>,
    #[serde(default)]
    pub uncategorized_only: bool,
}

#[derive(Serialize)]
pub struct PaginatedTransactions {
    pub items: Vec<Transaction>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

fn total_pages(total: i64, per_page: i64) -> i64 {
    if total <= 0 {
        return 0;
    }
    (total + per_page - 1) / per_page
}

pub async fn get_transactions(
    query: web::Query<TransactionsQuery>,
) -> Result<impl Responder, actix_web::Error> {
    let page = query.page.unwrap_or(1);
    let per_page = query.per_page.unwrap_or(50);
    let search = query.search.clone();
    let uncategorized_only = query.uncategorized_only;

    let (items, total) = web::block(move || {
        Transaction::list_paginated(
            page,
            per_page,
            search.as_deref(),
            uncategorized_only,
        )
    })
    .await
    .map_err(|e| {
        eprintln!("Blocking error fetching transactions: {:?}", e);
        actix_web::error::ErrorInternalServerError("Failed to retrieve transactions")
    })?
    .map_err(|e| {
        eprintln!("Database error fetching transactions: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to retrieve transactions")
    })?;

    Ok(HttpResponse::Ok().json(PaginatedTransactions {
        items,
        total,
        page,
        per_page,
        total_pages: total_pages(total, per_page),
    }))
}

#[derive(Deserialize, Debug)]
pub struct PatchTransactionCategoryBody {
    pub category_id: Option<i32>,
}

async fn patch_transaction_category(
    path: web::Path<i64>,
    body: web::Json<PatchTransactionCategoryBody>,
) -> Result<impl Responder> {
    let id = path.into_inner();
    if let Some(cid) = body.category_id {
        let cid = i64::from(cid);
        Category::find(cid, false)
            .map_err(map_db_error)?
            .ok_or_else(|| error::ErrorBadRequest("Unknown category"))?;
    }
    let updated = Transaction::update_category(id, body.category_id).map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(updated))
}

#[derive(Serialize)]
struct RecategorizeResponse {
    updated: usize,
}

async fn post_recategorize_uncategorized() -> Result<impl Responder> {
    let updated = recategorize_uncategorized_transactions().map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(RecategorizeResponse { updated }))
}

pub fn transactions_service() -> Scope {
    web::scope("/transactions")
        .route("", web::get().to(get_transactions))
        .route(
            "/recategorize-uncategorized",
            web::post().to(post_recategorize_uncategorized),
        )
        .route("/{id}/category", web::patch().to(patch_transaction_category))
}
