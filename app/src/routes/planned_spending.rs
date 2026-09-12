use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use chrono::NaiveDate;
use database::models::planned_spending::{
    is_cashflow_kind, is_valid_plan_kind, InsertPlannedSpending, PlannedSpending,
    PlannedSpendingChanges, PLAN_KIND_CASHFLOW, PLAN_KIND_LOAN_REDRAW, PLAN_KIND_LOAN_REFINANCE,
    PLAN_KIND_LOAN_REPAYMENT_CHANGE,
};
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
    #[serde(default = "default_plan_kind")]
    pub plan_kind: String,
    pub liability_id: Option<i64>,
    pub financial_account_id: Option<i64>,
    pub new_liability_name: Option<String>,
    pub interest_rate_bps: Option<i32>,
    pub repayment_cents: Option<i64>,
}

fn default_plan_kind() -> String {
    PLAN_KIND_CASHFLOW.to_string()
}

#[derive(Deserialize, Debug)]
pub struct UpdatePlannedSpendingPayload {
    pub name: Option<String>,
    pub amount_cents: Option<i32>,
    pub start_date: Option<String>,
    pub end_date: Option<Option<String>>,
    pub category_id: Option<Option<i64>>,
    pub notes: Option<Option<String>>,
    pub plan_kind: Option<String>,
    pub liability_id: Option<Option<i64>>,
    pub financial_account_id: Option<Option<i64>>,
    pub new_liability_name: Option<Option<String>>,
    pub interest_rate_bps: Option<Option<i32>>,
    pub repayment_cents: Option<Option<i64>>,
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

fn validate_plan_fields(
    plan_kind: &str,
    amount_cents: i32,
    category_id: Option<i64>,
    liability_id: Option<i64>,
    financial_account_id: Option<i64>,
    new_liability_name: Option<&str>,
    interest_rate_bps: Option<i32>,
    repayment_cents: Option<i64>,
) -> Result<(), error::Error> {
    if !is_valid_plan_kind(plan_kind) {
        return Err(error::ErrorBadRequest(
            "plan_kind must be cashflow, loan_redraw, loan_refinance, or loan_repayment_change",
        ));
    }
    validate_amount(amount_cents)?;
    if let Some(bps) = interest_rate_bps {
        if bps < 0 {
            return Err(error::ErrorBadRequest("interest_rate_bps must be >= 0"));
        }
    }
    if let Some(repay) = repayment_cents {
        if repay < 0 {
            return Err(error::ErrorBadRequest("repayment_cents must be >= 0"));
        }
    }

    match plan_kind {
        PLAN_KIND_CASHFLOW => Ok(()),
        PLAN_KIND_LOAN_REDRAW => {
            if liability_id.is_none() {
                return Err(error::ErrorBadRequest(
                    "liability_id is required for loan_redraw",
                ));
            }
            if financial_account_id.is_none() {
                return Err(error::ErrorBadRequest(
                    "financial_account_id is required for loan_redraw",
                ));
            }
            if amount_cents < 0 {
                return Err(error::ErrorBadRequest(
                    "loan_redraw amount_cents must be positive",
                ));
            }
            let _ = category_id;
            Ok(())
        }
        PLAN_KIND_LOAN_REFINANCE => {
            if liability_id.is_none() {
                return Err(error::ErrorBadRequest(
                    "liability_id is required for loan_refinance",
                ));
            }
            let name = new_liability_name.map(str::trim).filter(|v| !v.is_empty());
            if name.is_none() {
                return Err(error::ErrorBadRequest(
                    "new_liability_name is required for loan_refinance",
                ));
            }
            Ok(())
        }
        PLAN_KIND_LOAN_REPAYMENT_CHANGE => {
            if liability_id.is_none() {
                return Err(error::ErrorBadRequest(
                    "liability_id is required for loan_repayment_change",
                ));
            }
            if repayment_cents.is_none() {
                return Err(error::ErrorBadRequest(
                    "repayment_cents is required for loan_repayment_change",
                ));
            }
            Ok(())
        }
        _ => Err(error::ErrorBadRequest("invalid plan_kind")),
    }
}

fn require_cashflow_plan(id: i64) -> Result<PlannedSpending, error::Error> {
    let item = PlannedSpending::find_active(id)
        .map_err(map_db_error)?
        .ok_or_else(|| error::ErrorNotFound("Planning item not found"))?;
    if !is_cashflow_kind(&item.plan_kind) {
        return Err(error::ErrorBadRequest(
            "Match and link actions are only available for cashflow plans",
        ));
    }
    Ok(item)
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
    require_cashflow_plan(planned_id)?;
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
    let plan_kind = data.plan_kind.trim();
    let new_liability_name = data
        .new_liability_name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    validate_plan_fields(
        plan_kind,
        data.amount_cents,
        data.category_id,
        data.liability_id,
        data.financial_account_id,
        new_liability_name,
        data.interest_rate_bps,
        data.repayment_cents,
    )?;
    let start_date = parse_date(&data.start_date, "start_date")?;
    let end_date = parse_optional_date(data.end_date.as_ref(), "end_date")?;
    validate_date_order(start_date, end_date)?;
    let notes = data
        .notes
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());

    let category_id = if is_cashflow_kind(plan_kind) {
        data.category_id
    } else {
        None
    };

    let row = PlannedSpending::insert(InsertPlannedSpending {
        name,
        amount_cents: data.amount_cents,
        start_date,
        end_date,
        category_id,
        notes,
        plan_kind,
        liability_id: data.liability_id,
        financial_account_id: data.financial_account_id,
        new_liability_name,
        interest_rate_bps: data.interest_rate_bps,
        repayment_cents: data.repayment_cents,
    })
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
        .ok_or_else(|| error::ErrorNotFound("Planning item not found"))?;

    let next_kind = data
        .plan_kind
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(existing.plan_kind.as_str());
    let next_amount = data.amount_cents.unwrap_or(existing.amount_cents);
    let next_liability = match data.liability_id {
        Some(value) => value,
        None => existing.liability_id,
    };
    let next_account = match data.financial_account_id {
        Some(value) => value,
        None => existing.financial_account_id,
    };
    let next_new_name = match &data.new_liability_name {
        Some(value) => value
            .as_deref()
            .map(str::trim)
            .filter(|note| !note.is_empty()),
        None => existing.new_liability_name.as_deref(),
    };
    let next_rate = match data.interest_rate_bps {
        Some(value) => value,
        None => existing.interest_rate_bps,
    };
    let next_repay = match data.repayment_cents {
        Some(value) => value,
        None => existing.repayment_cents,
    };
    let next_category = match data.category_id {
        Some(value) => value,
        None => existing.category_id,
    };

    validate_plan_fields(
        next_kind,
        next_amount,
        next_category,
        next_liability,
        next_account,
        next_new_name,
        next_rate,
        next_repay,
    )?;

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

    let owned_new_name = data.new_liability_name.clone();
    let changes = PlannedSpendingChanges {
        name: data
            .name
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty()),
        amount_cents: data.amount_cents,
        start_date,
        end_date,
        category_id: if is_cashflow_kind(next_kind) {
            data.category_id
        } else if data.plan_kind.is_some() {
            Some(None)
        } else {
            data.category_id
        },
        notes,
        plan_kind: data
            .plan_kind
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty()),
        liability_id: data.liability_id,
        financial_account_id: data.financial_account_id,
        new_liability_name: match &owned_new_name {
            None => None,
            Some(value) => Some(
                value
                    .as_deref()
                    .map(str::trim)
                    .filter(|note| !note.is_empty()),
            ),
        },
        interest_rate_bps: data.interest_rate_bps,
        repayment_cents: data.repayment_cents,
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
    require_cashflow_plan(planned_id)?;
    let search = query.search.clone();
    let candidates = web::block(move || {
        planned_spending_match::link_candidates(planned_id, search.as_deref())
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

fn planning_routes(scope: Scope) -> Scope {
    scope
        .route("/match-suggestions", web::get().to(list_match_suggestions))
        .route(
            "/match-suggestions/count",
            web::get().to(match_suggestion_count),
        )
        .route("", web::get().to(list_planned_spending))
        .route("", web::post().to(create_planned_spending))
        .route("/{id}/link-candidates", web::get().to(list_link_candidates))
        .route("/{id}/resolve-match", web::post().to(resolve_planned_match))
        .route("/{id}", web::put().to(update_planned_spending))
        .route("/{id}", web::delete().to(delete_planned_spending))
}

pub fn planned_spending_service() -> Scope {
    planning_routes(web::scope("/planned-spending"))
}

pub fn planning_service() -> Scope {
    planning_routes(web::scope("/planning"))
}
