use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use chrono::NaiveDate;
use database::models::planned_spending::{PlannedSpending, PlannedSpendingChanges};
use database::models::planned_spending_match;
use diesel::result::Error as DbError;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct PlannedSpendingListQuery {
    pub from: Option<String>,
    pub to: Option<String>,
    #[serde(default)]
    pub include_resolved: bool,
}

#[derive(Deserialize, Debug)]
pub struct LinkCandidatesQuery {
    pub search: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct ResolvePlannedMatchPayload {
    pub transaction_id: Option<i64>,
    pub action: String,
}

#[derive(Deserialize, Debug)]
pub struct CreatePlannedSpendingPayload {
    pub name: String,
    pub amount_cents: i32,
    pub start_date: String,
    pub end_date: Option<String>,
    pub category_id: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct UpdatePlannedSpendingPayload {
    pub name: Option<String>,
    pub amount_cents: Option<i32>,
    pub start_date: Option<String>,
    pub end_date: Option<Option<String>>,
    pub category_id: Option<Option<i64>>,
    pub notes: Option<Option<String>>,
}

fn map_db_error(err: DbError) -> error::Error {
    eprintln!("Database Error: {:?}", err);
    match err {
        DbError::NotFound => error::ErrorNotFound("Planned spending item not found"),
        _ => error::ErrorInternalServerError("An internal server error occurred"),
    }
}

fn parse_date(value: &str, field: &str) -> Result<NaiveDate, error::Error> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| {
        error::ErrorBadRequest(format!("Invalid {field}; use YYYY-MM-DD"))
    })
}

fn parse_optional_date(
    value: Option<&String>,
    field: &str,
) -> Result<Option<NaiveDate>, error::Error> {
    match value {
        None => Ok(None),
        Some(raw) => parse_date(raw, field).map(Some),
    }
}

fn validate_amount(amount_cents: i32) -> Result<(), error::Error> {
    if amount_cents == 0 {
        return Err(error::ErrorBadRequest("amount_cents must be non-zero"));
    }
    Ok(())
}

fn validate_date_order(
    start_date: NaiveDate,
    end_date: Option<NaiveDate>,
) -> Result<(), error::Error> {
    if let Some(end) = end_date {
        if end < start_date {
            return Err(error::ErrorBadRequest(
                "end_date must be on or after start_date",
            ));
        }
    }
    Ok(())
}

async fn list_planned_spending(
    query: web::Query<PlannedSpendingListQuery>,
) -> Result<impl Responder, error::Error> {
    let range_start = match query.from.as_deref() {
        Some(value) => Some(parse_date(value, "from")?),
        None => None,
    };
    let range_end = match query.to.as_deref() {
        Some(value) => Some(parse_date(value, "to")?),
        None => None,
    };
    if let (Some(start), Some(end)) = (range_start, range_end) {
        if start > end {
            return Err(error::ErrorBadRequest("from must be on or before to"));
        }
    }
    let response = PlannedSpending::list_with_total(
        range_start,
        range_end,
        query.include_resolved,
    )
    .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(response))
}

async fn list_match_suggestions() -> Result<impl Responder, error::Error> {
    let suggestions = web::block(planned_spending_match::detect_suggestions)
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading planned match suggestions: {:?}", e);
            error::ErrorInternalServerError("Failed to load planned match suggestions")
        })?
        .map_err(|e| {
            eprintln!("Database error loading planned match suggestions: {}", e);
            error::ErrorInternalServerError("Failed to load planned match suggestions")
        })?;
    Ok(HttpResponse::Ok().json(suggestions))
}

async fn match_suggestion_count() -> Result<impl Responder, error::Error> {
    let count = web::block(planned_spending_match::suggestion_count)
        .await
        .map_err(|e| {
            eprintln!("Blocking error counting planned match suggestions: {:?}", e);
            error::ErrorInternalServerError("Failed to count planned match suggestions")
        })?
        .map_err(|e| {
            eprintln!("Database error counting planned match suggestions: {}", e);
            error::ErrorInternalServerError("Failed to count planned match suggestions")
        })?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "count": count })))
}

async fn resolve_planned_match(
    path: web::Path<i64>,
    payload: web::Json<ResolvePlannedMatchPayload>,
) -> Result<impl Responder, error::Error> {
    let planned_id = path.into_inner();
    let data = payload.into_inner();
    match data.action.as_str() {
        "confirm" | "link" => {
            let transaction_id = data.transaction_id.ok_or_else(|| {
                error::ErrorBadRequest("transaction_id is required for link")
            })?;
            let row = web::block(move || {
                planned_spending_match::link_transaction(planned_id, transaction_id)
            })
            .await
            .map_err(|e| {
                eprintln!("Blocking error linking planned transaction: {:?}", e);
                error::ErrorInternalServerError("Failed to link planned transaction")
            })?
            .map_err(map_db_error)?;
            Ok(HttpResponse::Ok().json(row))
        }
        "complete" => {
            let row = web::block(move || planned_spending_match::mark_complete(planned_id))
                .await
                .map_err(|e| {
                    eprintln!("Blocking error completing planned item: {:?}", e);
                    error::ErrorInternalServerError("Failed to complete planned item")
                })?
                .map_err(map_db_error)?;
            Ok(HttpResponse::Ok().json(row))
        }
        "unlink" => {
            let transaction_id = data.transaction_id.ok_or_else(|| {
                error::ErrorBadRequest("transaction_id is required for unlink")
            })?;
            web::block(move || {
                planned_spending_match::unlink_transaction(planned_id, transaction_id)
            })
            .await
            .map_err(|e| {
                eprintln!("Blocking error unlinking planned transaction: {:?}", e);
                error::ErrorInternalServerError("Failed to unlink planned transaction")
            })?
            .map_err(map_db_error)?;
            Ok(HttpResponse::NoContent().finish())
        }
        "dismiss" => {
            let transaction_id = data.transaction_id.ok_or_else(|| {
                error::ErrorBadRequest("transaction_id is required for dismiss")
            })?;
            web::block(move || {
                planned_spending_match::dismiss_match(planned_id, transaction_id)
            })
            .await
            .map_err(|e| {
                eprintln!("Blocking error dismissing planned match: {:?}", e);
                error::ErrorInternalServerError("Failed to dismiss planned match")
            })?
            .map_err(map_db_error)?;
            Ok(HttpResponse::NoContent().finish())
        }
        _ => Err(error::ErrorBadRequest(
            "action must be link, confirm, dismiss, complete, or unlink",
        )),
    }
}

async fn create_planned_spending(
    payload: web::Json<CreatePlannedSpendingPayload>,
) -> Result<impl Responder, error::Error> {
    let data = payload.into_inner();
    let name = data.name.trim();
    if name.is_empty() {
        return Err(error::ErrorBadRequest("name is required"));
    }
    validate_amount(data.amount_cents)?;
    let start_date = parse_date(&data.start_date, "start_date")?;
    let end_date = parse_optional_date(data.end_date.as_ref(), "end_date")?;
    validate_date_order(start_date, end_date)?;
    let notes = data
        .notes
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());

    let row = PlannedSpending::insert(
        name,
        data.amount_cents,
        start_date,
        end_date,
        data.category_id,
        notes,
    )
    .map_err(map_db_error)?;
    Ok(HttpResponse::Created().json(row))
}

async fn update_planned_spending(
    path: web::Path<i64>,
    payload: web::Json<UpdatePlannedSpendingPayload>,
) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    let data = payload.into_inner();

    let existing = PlannedSpending::find_active(id)
        .map_err(map_db_error)?
        .ok_or_else(|| error::ErrorNotFound("Planned spending item not found"))?;

    if let Some(amount_cents) = data.amount_cents {
        validate_amount(amount_cents)?;
    }

    let start_date = match data.start_date.as_deref() {
        Some(value) => Some(parse_date(value, "start_date")?),
        None => None,
    };
    let end_date = match &data.end_date {
        Some(Some(value)) => Some(Some(parse_date(value, "end_date")?)),
        Some(None) => Some(None),
        None => None,
    };

    let next_start = start_date.unwrap_or(existing.start_date);
    let next_end = match end_date {
        Some(value) => value,
        None => existing.end_date,
    };
    validate_date_order(next_start, next_end)?;

    let notes = match &data.notes {
        None => None,
        Some(value) => Some(
            value
                .as_deref()
                .map(str::trim)
                .filter(|note| !note.is_empty()),
        ),
    };

    let changes = PlannedSpendingChanges {
        name: data
            .name
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty()),
        amount_cents: data.amount_cents,
        start_date,
        end_date,
        category_id: data.category_id,
        notes,
    };

    if changes.name == Some("") {
        return Err(error::ErrorBadRequest("name is required"));
    }

    let row = PlannedSpending::update(id, changes).map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(row))
}

async fn list_link_candidates(
    path: web::Path<i64>,
    query: web::Query<LinkCandidatesQuery>,
) -> Result<impl Responder, error::Error> {
    let planned_id = path.into_inner();
    let search = query.search.clone();
    let candidates = web::block(move || {
        planned_spending_match::link_candidates(
            planned_id,
            search.as_deref(),
        )
    })
    .await
    .map_err(|e| {
        eprintln!("Blocking error loading link candidates: {:?}", e);
        error::ErrorInternalServerError("Failed to load link candidates")
    })?
    .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(candidates))
}

async fn delete_planned_spending(path: web::Path<i64>) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    PlannedSpending::soft_delete(id).map_err(map_db_error)?;
    Ok(HttpResponse::NoContent().finish())
}

pub fn planned_spending_service() -> Scope {
    web::scope("/planned-spending")
        .route("/match-suggestions", web::get().to(list_match_suggestions))
        .route("/match-suggestions/count", web::get().to(match_suggestion_count))
        .route("", web::get().to(list_planned_spending))
        .route("", web::post().to(create_planned_spending))
        .route("/{id}/link-candidates", web::get().to(list_link_candidates))
        .route("/{id}/resolve-match", web::post().to(resolve_planned_match))
        .route("/{id}", web::put().to(update_planned_spending))
        .route("/{id}", web::delete().to(delete_planned_spending))
}
