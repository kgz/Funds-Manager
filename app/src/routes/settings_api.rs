use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use database::modules::app_config::{
    active_database_url_source, config_file_path, local_storage_backend_available,
    mask_database_url, runtime_storage_mode, test_postgres_connection, AppConfig, DatabaseUrlSource,
    StorageMode,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageSettingsResponse {
    configured_storage_mode: &'static str,
    runtime_storage_mode: &'static str,
    database_url: Option<String>,
    database_url_source: &'static str,
    sqlite_path: String,
    config_file_path: String,
    local_storage_available: bool,
    requires_restart: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StorageUpdatePayload {
    storage_mode: Option<String>,
    database_url: Option<String>,
    sqlite_path: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StorageTestPayload {
    database_url: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageUpdateResponse {
    ok: bool,
    message: String,
    requires_restart: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageTestResponse {
    ok: bool,
    message: String,
}

fn source_label(source: DatabaseUrlSource) -> &'static str {
    match source {
        DatabaseUrlSource::Config => "config",
        DatabaseUrlSource::Environment => "environment",
    }
}

fn resolve_display_database_url(config: &AppConfig) -> Option<String> {
    if let Some(url) = config.configured_postgres_url() {
        return Some(mask_database_url(&url));
    }
    std::env::var("DATABASE_URL")
        .ok()
        .filter(|url| !url.trim().is_empty())
        .map(|url| mask_database_url(&url))
}

async fn get_storage_settings() -> impl Responder {
    let config = AppConfig::load();
    let database_url = resolve_display_database_url(&config);

    HttpResponse::Ok().json(StorageSettingsResponse {
        configured_storage_mode: config.storage_mode.as_str(),
        runtime_storage_mode: runtime_storage_mode().as_str(),
        database_url,
        database_url_source: source_label(active_database_url_source()),
        sqlite_path: config.local.sqlite_path.display().to_string(),
        config_file_path: config_file_path().display().to_string(),
        local_storage_available: local_storage_backend_available(),
        requires_restart: false,
    })
}

async fn update_storage_settings(payload: web::Json<StorageUpdatePayload>) -> Result<impl Responder> {
    let mut config = AppConfig::load();
    let mut requires_restart = false;

    if let Some(mode) = &payload.storage_mode {
        let parsed = StorageMode::parse(mode).ok_or_else(|| {
            error::ErrorBadRequest("storage_mode must be postgres or local")
        })?;
        if config.storage_mode != parsed {
            config.storage_mode = parsed;
            requires_restart = true;
        }
    }

    if let Some(url) = &payload.database_url {
        let trimmed = url.trim();
        if trimmed.is_empty() {
            config.postgres.url = None;
        } else {
            config.postgres.url = Some(trimmed.to_string());
            config.storage_mode = StorageMode::Postgres;
            requires_restart = true;
        }
    }

    if let Some(path) = &payload.sqlite_path {
        let trimmed = path.trim();
        if trimmed.is_empty() {
            config.local.sqlite_path = database::modules::app_config::default_sqlite_path();
        } else {
            config.local.sqlite_path = std::path::PathBuf::from(trimmed);
        }
        requires_restart = true;
    }

    config.save().map_err(|message| error::ErrorInternalServerError(message))?;

    let message = if requires_restart {
        "Settings saved. Restart the app to apply database connection changes.".to_string()
    } else {
        "Settings saved.".to_string()
    };

    Ok(HttpResponse::Ok().json(StorageUpdateResponse {
        ok: true,
        message,
        requires_restart,
    }))
}

async fn test_storage_connection(payload: web::Json<StorageTestPayload>) -> Result<impl Responder> {
    let url = if let Some(url) = payload
        .database_url
        .as_ref()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        url
    } else {
        let config = AppConfig::load();
        config
            .configured_postgres_url()
            .or_else(|| std::env::var("DATABASE_URL").ok())
            .ok_or_else(|| error::ErrorBadRequest("No database URL to test"))?
    };

    match web::block(move || test_postgres_connection(&url)).await {
        Ok(Ok(())) => Ok(HttpResponse::Ok().json(StorageTestResponse {
            ok: true,
            message: "Connection successful.".to_string(),
        })),
        Ok(Err(message)) => Ok(HttpResponse::Ok().json(StorageTestResponse {
            ok: false,
            message,
        })),
        Err(_) => Err(error::ErrorInternalServerError("Connection test failed")),
    }
}

pub fn settings_service() -> Scope {
    web::scope("/settings")
        .route("/storage", web::get().to(get_storage_settings))
        .route("/storage", web::put().to(update_storage_settings))
        .route("/storage/test", web::post().to(test_storage_connection))
}
