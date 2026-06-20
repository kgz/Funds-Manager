use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use chrono::NaiveDate;
use database::models::assets::{is_valid_kind, Asset, AssetChanges, AssetInput};
use database::models::liabilities::Liability;
use diesel::result::Error as DbError;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct CreateAssetPayload {
    pub name: String,
    pub kind: String,
    pub value_cents: i64,
    pub valued_at: Option<String>,
    pub value_source: Option<String>,
    pub liability_id: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct UpdateAssetPayload {
    pub name: Option<String>,
    pub kind: Option<String>,
    pub value_cents: Option<i64>,
    pub valued_at: Option<Option<String>>,
    pub value_source: Option<Option<String>>,
    pub liability_id: Option<Option<i64>>,
    pub notes: Option<Option<String>>,
}

fn map_db_error(err: DbError) -> error::Error {
    eprintln!("Database Error: {:?}", err);
    match err {
        DbError::NotFound => error::ErrorNotFound("Asset not found"),
        _ => error::ErrorInternalServerError("An internal server error occurred"),
    }
}

fn parse_date(value: &str) -> Result<NaiveDate, error::Error> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| error::ErrorBadRequest("Invalid valued_at; use YYYY-MM-DD"))
}

fn validate_kind(kind: &str) -> Result<(), error::Error> {
    if !is_valid_kind(kind) {
        return Err(error::ErrorBadRequest(
            "kind must be one of: property, vehicle, super, savings, investment, other",
        ));
    }
    Ok(())
}

fn ensure_liability_exists(liability_id: i64) -> Result<(), error::Error> {
    let found = Liability::find_active(liability_id).map_err(map_db_error)?;
    if found.is_none() {
        return Err(error::ErrorBadRequest("liability_id does not exist"));
    }
    Ok(())
}

fn clean_optional(value: Option<&String>) -> Option<&str> {
    value
        .map(|raw| raw.trim())
        .filter(|trimmed| !trimmed.is_empty())
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

async fn list_assets() -> Result<impl Responder, error::Error> {
    let response = Asset::list_with_total().map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(response))
}

async fn create_asset(
    payload: web::Json<CreateAssetPayload>,
) -> Result<impl Responder, error::Error> {
    let data = payload.into_inner();

    let name = data.name.trim();
    if name.is_empty() {
        return Err(error::ErrorBadRequest("name is required"));
    }
    let kind = data.kind.trim();
    validate_kind(kind)?;
    if data.value_cents < 0 {
        return Err(error::ErrorBadRequest("value_cents must not be negative"));
    }

    let valued_at = match data.valued_at.as_deref() {
        Some(value) => Some(parse_date(value)?),
        None => None,
    };
    if let Some(liability_id) = data.liability_id {
        ensure_liability_exists(liability_id)?;
    }

    let input = AssetInput {
        name,
        kind,
        value_cents: data.value_cents,
        valued_at,
        value_source: clean_optional(data.value_source.as_ref()),
        liability_id: data.liability_id,
        notes: clean_optional(data.notes.as_ref()),
    };

    let row = Asset::insert(input).map_err(map_db_error)?;
    Ok(HttpResponse::Created().json(row))
}

async fn update_asset(
    path: web::Path<i64>,
    payload: web::Json<UpdateAssetPayload>,
) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    let data = payload.into_inner();

    Asset::find_active(id)
        .map_err(map_db_error)?
        .ok_or_else(|| error::ErrorNotFound("Asset not found"))?;

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

    if let Some(value) = data.value_cents {
        if value < 0 {
            return Err(error::ErrorBadRequest("value_cents must not be negative"));
        }
    }

    let valued_at = match &data.valued_at {
        None => None,
        Some(None) => Some(None),
        Some(Some(value)) => Some(Some(parse_date(value)?)),
    };

    if let Some(Some(liability_id)) = data.liability_id {
        ensure_liability_exists(liability_id)?;
    }

    let changes = AssetChanges {
        name,
        kind,
        value_cents: data.value_cents,
        valued_at,
        value_source: nullable_text(&data.value_source),
        liability_id: data.liability_id,
        notes: nullable_text(&data.notes),
    };

    let row = Asset::update(id, changes).map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(row))
}

async fn delete_asset(path: web::Path<i64>) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    Asset::soft_delete(id).map_err(map_db_error)?;
    Ok(HttpResponse::NoContent().finish())
}

pub fn assets_service() -> Scope {
    web::scope("/assets")
        .route("", web::get().to(list_assets))
        .route("", web::post().to(create_asset))
        .route("/{id}", web::put().to(update_asset))
        .route("/{id}", web::delete().to(delete_asset))
}
