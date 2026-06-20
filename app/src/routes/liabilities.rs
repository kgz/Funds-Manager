use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use database::models::financial_account::FinancialAccount;
use database::models::liabilities::{
    is_valid_frequency, is_valid_kind, is_valid_rate_type, Liability, LiabilityChanges,
    LiabilityInput,
};
use diesel::result::Error as DbError;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct CreateLiabilityPayload {
    pub name: String,
    pub kind: String,
    pub lender: Option<String>,
    pub balance_cents: i64,
    pub credit_limit_cents: Option<i64>,
    pub original_amount_cents: Option<i64>,
    pub interest_rate_bps: Option<i32>,
    pub rate_type: Option<String>,
    pub repayment_cents: Option<i64>,
    pub repayment_frequency: Option<String>,
    pub term_months: Option<i32>,
    pub financial_account_id: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct UpdateLiabilityPayload {
    pub name: Option<String>,
    pub kind: Option<String>,
    pub lender: Option<Option<String>>,
    pub balance_cents: Option<i64>,
    pub credit_limit_cents: Option<Option<i64>>,
    pub original_amount_cents: Option<Option<i64>>,
    pub interest_rate_bps: Option<Option<i32>>,
    pub rate_type: Option<Option<String>>,
    pub repayment_cents: Option<Option<i64>>,
    pub repayment_frequency: Option<Option<String>>,
    pub term_months: Option<Option<i32>>,
    pub financial_account_id: Option<Option<i64>>,
    pub notes: Option<Option<String>>,
}

fn map_db_error(err: DbError) -> error::Error {
    eprintln!("Database Error: {:?}", err);
    match err {
        DbError::NotFound => error::ErrorNotFound("Liability not found"),
        _ => error::ErrorInternalServerError("An internal server error occurred"),
    }
}

fn validate_kind(kind: &str) -> Result<(), error::Error> {
    if !is_valid_kind(kind) {
        return Err(error::ErrorBadRequest(
            "kind must be one of: home_loan, car_loan, personal_loan, credit_card, bnpl, hecs, other",
        ));
    }
    Ok(())
}

fn validate_rate_type(value: &str) -> Result<(), error::Error> {
    if !is_valid_rate_type(value) {
        return Err(error::ErrorBadRequest("rate_type must be fixed or variable"));
    }
    Ok(())
}

fn validate_frequency(value: &str) -> Result<(), error::Error> {
    if !is_valid_frequency(value) {
        return Err(error::ErrorBadRequest(
            "repayment_frequency must be weekly, fortnightly, or monthly",
        ));
    }
    Ok(())
}

fn require_non_negative(value: i64, field: &str) -> Result<(), error::Error> {
    if value < 0 {
        return Err(error::ErrorBadRequest(format!("{field} must not be negative")));
    }
    Ok(())
}

fn require_non_negative_i32(value: i32, field: &str) -> Result<(), error::Error> {
    if value < 0 {
        return Err(error::ErrorBadRequest(format!("{field} must not be negative")));
    }
    Ok(())
}

fn ensure_account_exists(account_id: i64) -> Result<(), error::Error> {
    let found = FinancialAccount::find(account_id).map_err(map_db_error)?;
    if found.is_none() {
        return Err(error::ErrorBadRequest("financial_account_id does not exist"));
    }
    Ok(())
}

fn clean_optional(value: Option<&String>) -> Option<&str> {
    value
        .map(|raw| raw.trim())
        .filter(|trimmed| !trimmed.is_empty())
}

async fn list_liabilities() -> Result<impl Responder, error::Error> {
    let response = Liability::list_with_total().map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(response))
}

async fn create_liability(
    payload: web::Json<CreateLiabilityPayload>,
) -> Result<impl Responder, error::Error> {
    let data = payload.into_inner();

    let name = data.name.trim();
    if name.is_empty() {
        return Err(error::ErrorBadRequest("name is required"));
    }
    let kind = data.kind.trim();
    validate_kind(kind)?;
    require_non_negative(data.balance_cents, "balance_cents")?;
    if let Some(value) = data.credit_limit_cents {
        require_non_negative(value, "credit_limit_cents")?;
    }
    if let Some(value) = data.original_amount_cents {
        require_non_negative(value, "original_amount_cents")?;
    }
    if let Some(value) = data.repayment_cents {
        require_non_negative(value, "repayment_cents")?;
    }
    if let Some(value) = data.interest_rate_bps {
        require_non_negative_i32(value, "interest_rate_bps")?;
    }
    if let Some(value) = data.term_months {
        require_non_negative_i32(value, "term_months")?;
    }

    let rate_type = clean_optional(data.rate_type.as_ref());
    if let Some(value) = rate_type {
        validate_rate_type(value)?;
    }
    let repayment_frequency = clean_optional(data.repayment_frequency.as_ref());
    if let Some(value) = repayment_frequency {
        validate_frequency(value)?;
    }
    if let Some(account_id) = data.financial_account_id {
        ensure_account_exists(account_id)?;
    }

    let input = LiabilityInput {
        name,
        kind,
        lender: clean_optional(data.lender.as_ref()),
        balance_cents: data.balance_cents,
        credit_limit_cents: data.credit_limit_cents,
        original_amount_cents: data.original_amount_cents,
        interest_rate_bps: data.interest_rate_bps,
        rate_type,
        repayment_cents: data.repayment_cents,
        repayment_frequency,
        term_months: data.term_months,
        financial_account_id: data.financial_account_id,
        notes: clean_optional(data.notes.as_ref()),
    };

    let row = Liability::insert(input).map_err(map_db_error)?;
    Ok(HttpResponse::Created().json(row))
}

fn nullable_text(value: &Option<Option<String>>) -> Option<Option<&str>> {
    match value {
        None => None,
        Some(None) => Some(None),
        Some(Some(raw)) => {
            let trimmed = raw.trim();
            Some(if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            })
        }
    }
}

async fn update_liability(
    path: web::Path<i64>,
    payload: web::Json<UpdateLiabilityPayload>,
) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    let data = payload.into_inner();

    Liability::find_active(id)
        .map_err(map_db_error)?
        .ok_or_else(|| error::ErrorNotFound("Liability not found"))?;

    let name = match data.name.as_deref().map(str::trim) {
        Some("") => return Err(error::ErrorBadRequest("name is required")),
        Some(value) => Some(value),
        None => None,
    };

    let kind = match data.kind.as_deref().map(str::trim) {
        Some(value) => {
            validate_kind(value)?;
            Some(value)
        }
        None => None,
    };

    if let Some(value) = data.balance_cents {
        require_non_negative(value, "balance_cents")?;
    }
    if let Some(Some(value)) = data.credit_limit_cents {
        require_non_negative(value, "credit_limit_cents")?;
    }
    if let Some(Some(value)) = data.original_amount_cents {
        require_non_negative(value, "original_amount_cents")?;
    }
    if let Some(Some(value)) = data.repayment_cents {
        require_non_negative(value, "repayment_cents")?;
    }
    if let Some(Some(value)) = data.interest_rate_bps {
        require_non_negative_i32(value, "interest_rate_bps")?;
    }
    if let Some(Some(value)) = data.term_months {
        require_non_negative_i32(value, "term_months")?;
    }

    let rate_type = nullable_text(&data.rate_type);
    if let Some(Some(value)) = rate_type {
        validate_rate_type(value)?;
    }
    let repayment_frequency = nullable_text(&data.repayment_frequency);
    if let Some(Some(value)) = repayment_frequency {
        validate_frequency(value)?;
    }
    if let Some(Some(account_id)) = data.financial_account_id {
        ensure_account_exists(account_id)?;
    }

    let changes = LiabilityChanges {
        name,
        kind,
        lender: nullable_text(&data.lender),
        balance_cents: data.balance_cents,
        credit_limit_cents: data.credit_limit_cents,
        original_amount_cents: data.original_amount_cents,
        interest_rate_bps: data.interest_rate_bps,
        rate_type,
        repayment_cents: data.repayment_cents,
        repayment_frequency,
        term_months: data.term_months,
        financial_account_id: data.financial_account_id,
        notes: nullable_text(&data.notes),
    };

    let row = Liability::update(id, changes).map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(row))
}

async fn delete_liability(path: web::Path<i64>) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    Liability::soft_delete(id).map_err(map_db_error)?;
    Ok(HttpResponse::NoContent().finish())
}

pub fn liabilities_service() -> Scope {
    web::scope("/liabilities")
        .route("", web::get().to(list_liabilities))
        .route("", web::post().to(create_liability))
        .route("/{id}", web::put().to(update_liability))
        .route("/{id}", web::delete().to(delete_liability))
}
