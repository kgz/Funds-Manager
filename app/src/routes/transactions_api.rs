use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use database::models::category::Category;
use database::models::transaction::Transaction;
use database::models::transaction_category_learn::{
    apply_suggestions_for_transaction_ids, recategorize_uncategorized_transactions,
    CategoryPredictor,
};
use diesel::result::Error as DbError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
    #[serde(default)]
    pub include_suggestions: bool,
}

#[derive(Serialize)]
pub struct TransactionListItem {
    #[serde(flatten)]
    pub transaction: Transaction,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested_category_id: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested_category_name: Option<String>,
}

#[derive(Serialize)]
pub struct PaginatedTransactions {
    pub items: Vec<TransactionListItem>,
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

fn category_name_map() -> Result<HashMap<i32, String>, DbError> {
    let mut names = HashMap::new();
    for category in Category::all(false)? {
        if let Ok(id) = i32::try_from(category.id) {
            names.insert(id, category.name);
        }
    }
    Ok(names)
}

fn attach_suggestions(
    items: Vec<Transaction>,
    predictor: &CategoryPredictor,
    names: &HashMap<i32, String>,
) -> Vec<TransactionListItem> {
    items
        .into_iter()
        .map(|transaction| {
            let suggested = predictor.predict(&transaction.description);
            let (suggested_category_id, suggested_category_name) = match suggested {
                Some(cid) if transaction.category_id != Some(cid) => {
                    let name = names.get(&cid).cloned();
                    if name.is_some() {
                        (Some(cid), name)
                    } else {
                        (None, None)
                    }
                }
                _ => (None, None),
            };
            TransactionListItem {
                transaction,
                suggested_category_id,
                suggested_category_name,
            }
        })
        .collect()
}

pub async fn get_transactions(
    query: web::Query<TransactionsQuery>,
) -> Result<impl Responder, actix_web::Error> {
    let page = query.page.unwrap_or(1);
    let per_page = query.per_page.unwrap_or(50);
    let search = query.search.clone();
    let uncategorized_only = query.uncategorized_only;
    let include_suggestions = query.include_suggestions;

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

    let list_items = if include_suggestions {
        let (predictor, names) = web::block(|| {
            let predictor = CategoryPredictor::load_from_db()?;
            let names = category_name_map()?;
            Ok::<_, DbError>((predictor, names))
        })
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading predictor: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to retrieve transactions")
        })?
        .map_err(|e: DbError| {
            eprintln!("Database error loading predictor: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to retrieve transactions")
        })?;
        attach_suggestions(items, &predictor, &names)
    } else {
        items
            .into_iter()
            .map(|transaction| TransactionListItem {
                transaction,
                suggested_category_id: None,
                suggested_category_name: None,
            })
            .collect()
    };

    Ok(HttpResponse::Ok().json(PaginatedTransactions {
        items: list_items,
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

#[derive(Deserialize, Debug)]
pub struct BulkPatchCategoriesBody {
    pub transaction_ids: Vec<i64>,
    pub category_id: Option<i32>,
}

#[derive(Serialize)]
struct BulkUpdateResponse {
    updated: usize,
}

async fn bulk_patch_categories(body: web::Json<BulkPatchCategoriesBody>) -> Result<impl Responder> {
    if body.transaction_ids.is_empty() {
        return Ok(HttpResponse::Ok().json(BulkUpdateResponse { updated: 0 }));
    }
    if let Some(cid) = body.category_id {
        let cid_i64 = i64::from(cid);
        Category::find(cid_i64, false)
            .map_err(map_db_error)?
            .ok_or_else(|| error::ErrorBadRequest("Unknown category"))?;
    }
    let ids = body.transaction_ids.clone();
    let category_id = body.category_id;
    let updated = web::block(move || Transaction::bulk_update_category(&ids, category_id))
        .await
        .map_err(|e| {
            eprintln!("Blocking error bulk updating categories: {:?}", e);
            error::ErrorInternalServerError("Failed to update categories")
        })?
        .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(BulkUpdateResponse { updated }))
}

#[derive(Deserialize, Debug)]
pub struct AcceptSuggestionsBody {
    pub transaction_ids: Vec<i64>,
}

#[derive(Serialize)]
struct RecategorizeResponse {
    updated: usize,
}

async fn post_accept_suggestions(body: web::Json<AcceptSuggestionsBody>) -> Result<impl Responder> {
    let ids = body.transaction_ids.clone();
    let updated = web::block(move || apply_suggestions_for_transaction_ids(&ids))
        .await
        .map_err(|e| {
            eprintln!("Blocking error accepting suggestions: {:?}", e);
            error::ErrorInternalServerError("Failed to accept suggestions")
        })?
        .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(RecategorizeResponse { updated }))
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
        .route("/categories", web::patch().to(bulk_patch_categories))
        .route("/accept-suggestions", web::post().to(post_accept_suggestions))
        .route("/{id}/category", web::patch().to(patch_transaction_category))
}
