use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use database::modules::app_config::{
    active_database_url_source, build_postgres_url_from_fields_with_fallback, config_file_path,
    current_postgres_parts, local_storage_backend_available, mask_database_url, parse_postgres_url,
    runtime_storage_mode, test_postgres_connection, AppConfig, DatabaseUrlSource, SavedConnection,
    StorageMode,
};
use database::modules::database::{
    active_database_url, list_migration_status, run_pending_migrations_now, swap_postgres_pool,
    MigrationStatusItem,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageSettingsResponse {
    configured_storage_mode: &'static str,
    runtime_storage_mode: &'static str,
    database_url: Option<String>,
    runtime_database_url: Option<String>,
    database_url_source: &'static str,
    pg_host: Option<String>,
    pg_port: Option<u16>,
    pg_database: Option<String>,
    pg_user: Option<String>,
    pg_has_password: bool,
    sqlite_path: String,
    config_file_path: String,
    local_storage_available: bool,
    requires_restart: bool,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct PostgresFields {
    pg_host: Option<String>,
    pg_port: Option<String>,
    pg_database: Option<String>,
    pg_user: Option<String>,
    pg_password: Option<String>,
}

impl PostgresFields {
    fn is_empty(&self) -> bool {
        self.pg_host.is_none()
            && self.pg_port.is_none()
            && self.pg_database.is_none()
            && self.pg_user.is_none()
            && self.pg_password.is_none()
    }

    fn build_url(&self) -> Result<String, String> {
        let config = AppConfig::load();
        self.build_url_with_config(&config)
    }

    fn build_url_with_config(&self, config: &AppConfig) -> Result<String, String> {
        self.build_url_with_connection(config, None)
    }

    fn build_url_with_connection(
        &self,
        config: &AppConfig,
        connection_id: Option<&str>,
    ) -> Result<String, String> {
        let fallback = connection_id
            .and_then(|id| config.connection_by_id(id).map(SavedConnection::to_parts))
            .or_else(|| config.password_fallback_parts());
        build_postgres_url_from_fields_with_fallback(
            fallback.as_ref(),
            self.pg_host.as_deref(),
            self.pg_port.as_deref(),
            self.pg_database.as_deref(),
            self.pg_user.as_deref(),
            self.pg_password.as_deref(),
        )
    }

    fn build_url_from_form_only(&self) -> Result<String, String> {
        build_postgres_url_from_fields_with_fallback(
            None,
            self.pg_host.as_deref(),
            self.pg_port.as_deref(),
            self.pg_database.as_deref(),
            self.pg_user.as_deref(),
            self.pg_password.as_deref(),
        )
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StorageUpdatePayload {
    storage_mode: Option<String>,
    database_url: Option<String>,
    connection_id: Option<String>,
    #[serde(flatten)]
    postgres: PostgresFields,
    sqlite_path: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StorageTestPayload {
    database_url: Option<String>,
    connection_id: Option<String>,
    #[serde(flatten)]
    postgres: PostgresFields,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StorageConnectPayload {
    database_url: Option<String>,
    connection_id: Option<String>,
    #[serde(flatten)]
    postgres: PostgresFields,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SavedConnectionResponse {
    id: String,
    name: String,
    host: String,
    port: Option<u16>,
    database: String,
    user: String,
    has_password: bool,
    active: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateConnectionPayload {
    name: String,
    #[serde(flatten)]
    postgres: PostgresFields,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectionsListResponse {
    items: Vec<SavedConnectionResponse>,
}

fn connection_response(connection: &SavedConnection, active_id: Option<&str>) -> SavedConnectionResponse {
    SavedConnectionResponse {
        id: connection.id.clone(),
        name: connection.name.clone(),
        host: connection.host.clone(),
        port: connection.port,
        database: connection.database.clone(),
        user: connection.user.clone(),
        has_password: connection.has_password(),
        active: active_id == Some(connection.id.as_str()),
    }
}

fn sync_connection_from_postgres_fields(
    config: &mut AppConfig,
    connection_id: Option<&str>,
    postgres: &PostgresFields,
) -> Result<(), String> {
    let target_id = connection_id
        .map(str::to_string)
        .or_else(|| config.postgres.active_connection_id.clone());
    let Some(target_id) = target_id else {
        return Ok(());
    };
    config.update_connection_from_fields(
        &target_id,
        postgres.pg_host.as_deref(),
        postgres.pg_port.as_deref(),
        postgres.pg_database.as_deref(),
        postgres.pg_user.as_deref(),
        postgres.pg_password.as_deref(),
    )
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageConnectResponse {
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
    let runtime_database_url = active_database_url()
        .ok()
        .map(|url| mask_database_url(&url));
    let parts = current_postgres_parts();

    HttpResponse::Ok().json(StorageSettingsResponse {
        configured_storage_mode: config.storage_mode.as_str(),
        runtime_storage_mode: runtime_storage_mode().as_str(),
        database_url,
        runtime_database_url,
        database_url_source: source_label(active_database_url_source()),
        pg_host: parts.as_ref().map(|parts| parts.host.clone()),
        pg_port: parts.as_ref().and_then(|parts| parts.port),
        pg_database: parts.as_ref().map(|parts| parts.database.clone()),
        pg_user: parts.as_ref().map(|parts| parts.user.clone()),
        pg_has_password: parts
            .as_ref()
            .map(|parts| parts.password.as_deref().is_some_and(|value| !value.is_empty()))
            .unwrap_or(false),
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

    let mut postgres_changed = false;
    if let Some(url) = &payload.database_url {
        let trimmed = url.trim();
        if trimmed.is_empty() {
            config.postgres.url = None;
        } else {
            config.postgres.url = Some(trimmed.to_string());
            config.storage_mode = StorageMode::Postgres;
            postgres_changed = true;
        }
    } else if !payload.postgres.is_empty() {
        if let Some(connection_id) = payload.connection_id.as_deref() {
            config.set_active_connection(connection_id).map_err(error::ErrorBadRequest)?;
        }
        sync_connection_from_postgres_fields(&mut config, payload.connection_id.as_deref(), &payload.postgres)
            .map_err(error::ErrorBadRequest)?;
        let url = payload
            .postgres
            .build_url_with_connection(&config, payload.connection_id.as_deref())
            .map_err(error::ErrorBadRequest)?;
        config.postgres.url = Some(url);
        config.storage_mode = StorageMode::Postgres;
        postgres_changed = true;
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
        "Settings saved. Restart the app to apply this change.".to_string()
    } else if postgres_changed {
        "Settings saved. Test the connection, then use Connect to switch without restarting."
            .to_string()
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
    } else if !payload.postgres.is_empty() {
        let config = AppConfig::load();
        payload
            .postgres
            .build_url_with_connection(&config, payload.connection_id.as_deref())
            .map_err(error::ErrorBadRequest)?
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

async fn connect_storage(payload: web::Json<StorageConnectPayload>) -> Result<impl Responder> {
    let mut config = AppConfig::load();
    let provided_url = if let Some(url) = payload
        .database_url
        .as_ref()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        Some(url)
    } else if !payload.postgres.is_empty() {
        if let Some(connection_id) = payload.connection_id.as_deref() {
            config.set_active_connection(connection_id).map_err(error::ErrorBadRequest)?;
        }
        sync_connection_from_postgres_fields(&mut config, payload.connection_id.as_deref(), &payload.postgres)
            .map_err(error::ErrorBadRequest)?;
        Some(
            payload
                .postgres
                .build_url_with_connection(&config, payload.connection_id.as_deref())
                .map_err(error::ErrorBadRequest)?,
        )
    } else {
        None
    };

    let url = if let Some(url) = provided_url {
        config.postgres.url = Some(url.clone());
        config.storage_mode = StorageMode::Postgres;
        config
            .save()
            .map_err(|message| error::ErrorInternalServerError(message))?;
        url
    } else {
        config
            .configured_postgres_url()
            .or_else(|| std::env::var("DATABASE_URL").ok())
            .ok_or_else(|| error::ErrorBadRequest("No database URL to connect"))?
    };

    match web::block(move || swap_postgres_pool(&url)).await {
        Ok(Ok(())) => Ok(HttpResponse::Ok().json(StorageConnectResponse {
            ok: true,
            message: "Saved and connected. The app is now using this database.".to_string(),
        })),
        Ok(Err(message)) => Ok(HttpResponse::Ok().json(StorageConnectResponse {
            ok: false,
            message,
        })),
        Err(_) => Err(error::ErrorInternalServerError("Failed to connect database")),
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MigrationsStatusResponse {
    items: Vec<MigrationStatusItem>,
    pending_count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MigrationsRunResponse {
    ok: bool,
    applied_count: usize,
    message: String,
}

async fn get_migrations_status() -> Result<impl Responder> {
    match web::block(list_migration_status).await {
        Ok(Ok(items)) => {
            let pending_count = items.iter().filter(|item| !item.applied).count();
            Ok(HttpResponse::Ok().json(MigrationsStatusResponse {
                items,
                pending_count,
            }))
        }
        Ok(Err(message)) => Err(error::ErrorInternalServerError(message)),
        Err(_) => Err(error::ErrorInternalServerError("Failed to load migrations")),
    }
}

async fn run_migrations() -> Result<impl Responder> {
    match web::block(run_pending_migrations_now).await {
        Ok(Ok(applied_count)) => {
            let message = if applied_count == 0 {
                "Database migrations are already up to date.".to_string()
            } else {
                format!("Applied {applied_count} migration(s).")
            };
            Ok(HttpResponse::Ok().json(MigrationsRunResponse {
                ok: true,
                applied_count,
                message,
            }))
        }
        Ok(Err(message)) => Ok(HttpResponse::Ok().json(MigrationsRunResponse {
            ok: false,
            applied_count: 0,
            message,
        })),
        Err(_) => Err(error::ErrorInternalServerError("Failed to run migrations")),
    }
}

async fn list_connections() -> impl Responder {
    let config = AppConfig::load();
    let active_id = config.postgres.active_connection_id.as_deref();
    let items = config
        .postgres
        .connections
        .iter()
        .map(|connection| connection_response(connection, active_id))
        .collect();
    HttpResponse::Ok().json(ConnectionsListResponse { items })
}

async fn create_connection(payload: web::Json<CreateConnectionPayload>) -> Result<impl Responder> {
    let mut config = AppConfig::load();
    let url = payload
        .postgres
        .build_url_from_form_only()
        .map_err(error::ErrorBadRequest)?;
    let parts = parse_postgres_url(&url).ok_or_else(|| {
        error::ErrorBadRequest("Could not parse connection details")
    })?;
    let connection = config
        .create_connection(&payload.name, &parts)
        .map_err(error::ErrorBadRequest)?;
    config
        .save()
        .map_err(|message| error::ErrorInternalServerError(message))?;
    let active_id = config.postgres.active_connection_id.as_deref();
    Ok(HttpResponse::Ok().json(connection_response(&connection, active_id)))
}

async fn delete_connection(path: web::Path<String>) -> Result<impl Responder> {
    let mut config = AppConfig::load();
    config
        .delete_connection(&path.into_inner())
        .map_err(error::ErrorBadRequest)?;
    config
        .save()
        .map_err(|message| error::ErrorInternalServerError(message))?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "ok": true })))
}

pub fn settings_service() -> Scope {
    web::scope("/settings")
        .route("/storage", web::get().to(get_storage_settings))
        .route("/storage", web::put().to(update_storage_settings))
        .route("/storage/test", web::post().to(test_storage_connection))
        .route("/storage/connect", web::post().to(connect_storage))
        .route("/connections", web::get().to(list_connections))
        .route("/connections", web::post().to(create_connection))
        .route("/connections/{id}", web::delete().to(delete_connection))
        .route("/migrations", web::get().to(get_migrations_status))
        .route("/migrations/run", web::post().to(run_migrations))
}
