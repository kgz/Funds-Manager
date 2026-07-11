use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use diesel::pg::PgConnection;
use diesel::prelude::*;

static CONFIG_DIR: OnceLock<PathBuf> = OnceLock::new();

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StorageMode {
    Postgres,
    Local,
}

impl StorageMode {
    pub fn parse(value: &str) -> Option<Self> {
        match value.trim().to_lowercase().as_str() {
            "postgres" | "postgresql" | "external" => Some(Self::Postgres),
            "local" | "sqlite" => Some(Self::Local),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Postgres => "postgres",
            Self::Local => "local",
        }
    }
}

impl Default for StorageMode {
    fn default() -> Self {
        Self::Postgres
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PostgresConfig {
    #[serde(default)]
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalConfig {
    pub sqlite_path: PathBuf,
}

impl Default for LocalConfig {
    fn default() -> Self {
        Self {
            sqlite_path: default_sqlite_path(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default)]
    pub storage_mode: StorageMode,
    #[serde(default)]
    pub postgres: PostgresConfig,
    #[serde(default)]
    pub local: LocalConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            storage_mode: StorageMode::Postgres,
            postgres: PostgresConfig::default(),
            local: LocalConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DatabaseUrlSource {
    Config,
    Environment,
}

pub fn config_dir() -> &'static Path {
    CONFIG_DIR.get_or_init(resolve_config_dir).as_path()
}

pub fn config_file_path() -> PathBuf {
    config_dir().join("config.toml")
}

pub fn default_sqlite_path() -> PathBuf {
    if let Ok(appdata) = env::var("APPDATA") {
        return PathBuf::from(appdata).join("Funds Manager").join("funds.db");
    }
    if let Ok(data_home) = env::var("XDG_DATA_HOME") {
        return PathBuf::from(data_home)
            .join("funds-manager")
            .join("funds.db");
    }
    if let Ok(home) = env::var("HOME") {
        return PathBuf::from(home)
            .join(".local")
            .join("share")
            .join("funds-manager")
            .join("funds.db");
    }
    PathBuf::from("funds.db")
}

fn resolve_config_dir() -> PathBuf {
    if let Ok(appdata) = env::var("APPDATA") {
        return PathBuf::from(appdata).join("Funds Manager");
    }
    if let Ok(xdg) = env::var("XDG_CONFIG_HOME") {
        return PathBuf::from(xdg).join("funds-manager");
    }
    if let Ok(home) = env::var("HOME") {
        return PathBuf::from(home).join(".config").join("funds-manager");
    }
    PathBuf::from(".funds-manager")
}

impl AppConfig {
    pub fn load() -> Self {
        let path = config_file_path();
        let Ok(contents) = fs::read_to_string(&path) else {
            return Self::default();
        };
        match toml::from_str(&contents) {
            Ok(config) => config,
            Err(error) => {
                eprintln!("Failed to parse {}: {error}", path.display());
                Self::default()
            }
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let path = config_file_path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Failed to create config directory: {error}"))?;
        }
        let contents = toml::to_string_pretty(self)
            .map_err(|error| format!("Failed to serialise config: {error}"))?;
        fs::write(&path, contents)
            .map_err(|error| format!("Failed to write config: {error}"))?;
        Ok(())
    }

    pub fn configured_postgres_url(&self) -> Option<String> {
        if self.storage_mode != StorageMode::Postgres {
            return None;
        }
        self.postgres
            .url
            .as_ref()
            .map(|url| url.trim().to_string())
            .filter(|url| !url.is_empty())
    }
}

pub fn resolve_database_url() -> Result<String, String> {
    let config = AppConfig::load();

    if let Some(url) = config.configured_postgres_url() {
        return Ok(url);
    }

    if config.storage_mode == StorageMode::Local {
        if let Ok(url) = env::var("DATABASE_URL") {
            if !url.trim().is_empty() {
                eprintln!(
                    "Storage mode is local in config; using DATABASE_URL until SQLite backend is available."
                );
                return Ok(url);
            }
        }
        return Err(
            "Local storage is not available yet. Configure PostgreSQL or set DATABASE_URL."
                .to_string(),
        );
    }

    env::var("DATABASE_URL").map_err(|_| "DATABASE_URL must be set".to_string())
}

pub fn active_database_url_source() -> DatabaseUrlSource {
    let config = AppConfig::load();
    if config.configured_postgres_url().is_some() {
        DatabaseUrlSource::Config
    } else {
        DatabaseUrlSource::Environment
    }
}

pub fn mask_database_url(url: &str) -> String {
    let Some(rest) = url.strip_prefix("postgres://") else {
        return url.to_string();
    };
    let Some(at_idx) = rest.find('@') else {
        return url.to_string();
    };
    let creds = &rest[..at_idx];
    let host_part = &rest[at_idx..];
    let Some(colon) = creds.find(':') else {
        return format!("postgres://{creds}{host_part}");
    };
    let user = &creds[..colon];
    format!("postgres://{user}:***{host_part}")
}

pub fn test_postgres_connection(database_url: &str) -> Result<(), String> {
    let url = database_url.trim();
    if url.is_empty() {
        return Err("Database URL is empty".to_string());
    }
    PgConnection::establish(url).map_err(|error| error.to_string())?;
    Ok(())
}

pub fn runtime_storage_mode() -> StorageMode {
    StorageMode::Postgres
}

pub fn local_storage_backend_available() -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mask_database_url_hides_password() {
        let masked = mask_database_url("postgres://funds:secret@127.0.0.1:5434/funds");
        assert_eq!(masked, "postgres://funds:***@127.0.0.1:5434/funds");
    }

    #[test]
    fn storage_mode_parse_accepts_aliases() {
        assert_eq!(StorageMode::parse("postgres"), Some(StorageMode::Postgres));
        assert_eq!(StorageMode::parse("local"), Some(StorageMode::Local));
        assert_eq!(StorageMode::parse("sqlite"), Some(StorageMode::Local));
        assert_eq!(StorageMode::parse("nope"), None);
    }

    #[test]
    fn default_config_round_trips_toml() {
        let config = AppConfig::default();
        let serialized = toml::to_string_pretty(&config).expect("serialize");
        let parsed: AppConfig = toml::from_str(&serialized).expect("parse");
        assert_eq!(parsed.storage_mode, StorageMode::Postgres);
    }
}
