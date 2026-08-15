use diesel::migration::{Migration, MigrationSource};
use diesel::pg::{Pg, PgConnection};
use diesel::r2d2::{ConnectionManager, Pool, PooledConnection};
use diesel::Connection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::env;
use std::process::Command;
use std::sync::Once;
use std::sync::RwLock;
use std::time::Duration;

const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

static LOAD_DOTENV: Once = Once::new();
static DB_STATE: RwLock<Option<DbPoolState>> = RwLock::new(None);

struct DbPoolState {
    pool: DbPool,
    database_url: String,
}

pub type DbPool = Pool<ConnectionManager<PgConnection>>;
pub type DbConn = PooledConnection<ConnectionManager<PgConnection>>;

fn load_dotenv_override() {
    LOAD_DOTENV.call_once(|| {
        for path in [".env", "app/.env", "database/.env"] {
            if load_dotenv_file_if_unset(path) {
                return;
            }
        }
        dotenv::dotenv().ok();
    });
}

fn load_dotenv_file_if_unset(path: &str) -> bool {
    let Ok(contents) = std::fs::read_to_string(path) else {
        return false;
    };
    for line in contents.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let key = key.trim();
        if env::var_os(key).is_none() {
            let value = value.trim().trim_matches('"');
            env::set_var(key, value);
        }
    }
    true
}

fn build_pool(database_url: &str) -> Result<DbPool, String> {
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    Pool::builder()
        .max_size(16)
        .connection_timeout(Duration::from_secs(30))
        .build(manager)
        .map_err(|error| format!("Failed to create DB pool: {error}"))
}

fn init_pool_from_config() -> Result<DbPoolState, String> {
    load_dotenv_override();
    let database_url = crate::modules::app_config::resolve_database_url()?;
    let pool = build_pool(&database_url)?;
    pool.get()
        .map_err(|error| format!("Error connecting to {database_url}: {error}"))?;
    Ok(DbPoolState {
        pool,
        database_url,
    })
}

fn pool_state() -> Result<DbPoolState, String> {
    {
        let read = DB_STATE
            .read()
            .map_err(|_| "database pool lock poisoned".to_string())?;
        if let Some(state) = read.as_ref() {
            return Ok(DbPoolState {
                pool: state.pool.clone(),
                database_url: state.database_url.clone(),
            });
        }
    }

    let mut write = DB_STATE
        .write()
        .map_err(|_| "database pool lock poisoned".to_string())?;
    if let Some(state) = write.as_ref() {
        return Ok(DbPoolState {
            pool: state.pool.clone(),
            database_url: state.database_url.clone(),
        });
    }

    let state = init_pool_from_config()?;
    *write = Some(DbPoolState {
        pool: state.pool.clone(),
        database_url: state.database_url.clone(),
    });
    Ok(state)
}

pub fn active_database_url() -> Result<String, String> {
    Ok(pool_state()?.database_url)
}

pub fn pending_migration_count_for_url(database_url: &str) -> Result<usize, String> {
    let url = database_url.trim();
    if url.is_empty() {
        return Err("Database URL is empty".to_string());
    }
    let mut conn =
        PgConnection::establish(url).map_err(|error| format!("failed to connect: {error}"))?;
    let pending = conn
        .pending_migrations(MIGRATIONS)
        .map_err(|error| format!("failed to list pending migrations: {error}"))?;
    Ok(pending.len())
}

pub fn swap_postgres_pool(database_url: &str) -> Result<(), String> {
    let url = database_url.trim();
    if url.is_empty() {
        return Err("Database URL is empty".to_string());
    }

    crate::modules::app_config::test_postgres_connection(url)?;

    let pending = pending_migration_count_for_url(url)?;
    if pending > 0 {
        return Err(format!(
            "{pending} migration(s) pending on the target database — run migrations first."
        ));
    }

    let pool = build_pool(url)?;
    pool.get()
        .map_err(|error| format!("Error connecting to {url}: {error}"))?;

    let mut write = DB_STATE
        .write()
        .map_err(|_| "database pool lock poisoned".to_string())?;
    *write = Some(DbPoolState {
        pool,
        database_url: url.to_string(),
    });
    Ok(())
}

pub fn get_dbo() -> DbConn {
    let state = pool_state().unwrap_or_else(|error| panic!("{error}"));
    state.pool.get().unwrap_or_else(|error| {
        panic!("Error connecting to {}: {error}", state.database_url)
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Migrations {
    pub name: String,
    pub key: String,
    pub description: String,
    pub ran: bool,
    origional_commit: String,
    // pub metadata: dyn MigrationMetadata,
}

pub fn get_migrations(conn: &mut impl MigrationHarness<Pg>) -> Vec<Migrations> {
    // print out migrations
    println!(
        "Pending migrations: {}",
        conn.pending_migrations(MIGRATIONS).unwrap().len()
    );

    let run = conn.applied_migrations().unwrap();

    let mut migrations = Vec::new();
    for x in MigrationSource::<Pg>::migrations(&MIGRATIONS)
        .unwrap()
        .into_iter()
    {
        let name = x.name();
        // key is first part of split on _ then replace - with nothing
        let key = name.to_owned().to_string();
        let key1 = key.split("_");
        let key2 = key1.clone().nth(0);

        if key2.is_none() {
            println!("key2 is none for: {}", key);
            continue;
        }

        let key3 = key2.unwrap().replace("-", "");

        let desc = key1.clone().nth(1);
        let mut has_been_run = false;

        for el in run.iter() {
            if el.to_string().eq(&key3.to_string()) {
                has_been_run = true;
                break;
            }
        }

        migrations.push(Migrations {
            name: name.to_string(),
            key: key3,
            description: desc.unwrap().to_string(),
            ran: has_been_run,
            origional_commit: String::from_utf8(get_file_creator(name.to_string())).unwrap(),
            // metadata: x.metadata(),
        })
    }

    migrations
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationStatusItem {
    pub name: String,
    pub description: String,
    pub applied: bool,
}

fn migration_version_key(name: &str) -> Option<String> {
    let segment = name.split('_').next()?;
    Some(segment.replace('-', ""))
}

fn migration_description(name: &str) -> String {
    name.split('_')
        .nth(1)
        .unwrap_or("")
        .replace('_', " ")
}

fn list_migration_status_on(conn: &mut impl MigrationHarness<Pg>) -> Result<Vec<MigrationStatusItem>, String> {
    let applied = conn
        .applied_migrations()
        .map_err(|error| format!("failed to list applied migrations: {error}"))?;
    let applied_keys: HashSet<String> = applied.iter().map(|value| value.to_string()).collect();

    let mut items = Vec::new();
    for migration in MigrationSource::<Pg>::migrations(&MIGRATIONS)
        .map_err(|error| format!("failed to list migrations: {error}"))?
        .into_iter()
    {
        let name = migration.name().to_string();
        let version_key = migration_version_key(&name)
            .ok_or_else(|| format!("invalid migration name: {name}"))?;
        items.push(MigrationStatusItem {
            description: migration_description(&name),
            applied: applied_keys.contains(&version_key),
            name,
        });
    }
    Ok(items)
}

pub fn list_migration_status() -> Result<Vec<MigrationStatusItem>, String> {
    let mut conn = get_dbo();
    list_migration_status_on(&mut *conn)
}

pub fn list_migration_status_for_url(database_url: &str) -> Result<Vec<MigrationStatusItem>, String> {
    let url = database_url.trim();
    if url.is_empty() {
        return Err("Database URL is empty".to_string());
    }
    let mut conn =
        PgConnection::establish(url).map_err(|error| format!("failed to connect: {error}"))?;
    list_migration_status_on(&mut conn)
}

fn run_pending_migrations_on(conn: &mut impl MigrationHarness<Pg>) -> Result<usize, String> {
    let pending = conn
        .pending_migrations(MIGRATIONS)
        .map_err(|error| format!("failed to list pending migrations: {error}"))?;
    let count = pending.len();
    if count == 0 {
        return Ok(0);
    }
    run_pending_migrations(conn).map_err(|error| format!("migration failed: {error}"))?;
    Ok(count)
}

pub fn run_pending_migrations_now() -> Result<usize, String> {
    let mut conn = get_dbo();
    run_pending_migrations_on(&mut *conn)
}

pub fn run_pending_migrations_for_url(database_url: &str) -> Result<usize, String> {
    let url = database_url.trim();
    if url.is_empty() {
        return Err("Database URL is empty".to_string());
    }
    let mut conn =
        PgConnection::establish(url).map_err(|error| format!("failed to connect: {error}"))?;
    run_pending_migrations_on(&mut conn)
}

fn get_file_creator(file_name: String) -> Vec<u8> {
    let path = format!("migrations/{}/down.sql", file_name);
    println!("path: {}", path);

    // get cwd
    let resp = Command::new("pwd")
        .output()
        .expect("failed to execute process");

    let cwd = String::from_utf8(resp.stdout).unwrap();
    // trim the newline
    let cwd = cwd.trim_end();

    let fullpath = format!("{}/{}", cwd, path);
    println!("fullpath: {}", fullpath);

    let cmd = format!("
        git log --follow --reverse  -- \"{}\" | head -n 1 | awk '{{print $2}}' | tr -d '\\n' | xargs -I {{}} git show {{}} -- \"{}\" | grep -E \"Author:\" | tr -d '\\n'
    ", fullpath, fullpath);

    let resp = Command::new("sh")
        .arg("-c")
        .arg(cmd)
        .output()
        .expect("failed to execute process");
    resp.stdout
}
pub fn run_pending_migrations(
    conn: &mut impl MigrationHarness<Pg>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync + 'static>> {
    conn.run_pending_migrations(MIGRATIONS).map(|_| ())
}

pub fn migrate_on_startup() -> Result<(), String> {
    let mut conn = get_dbo();
    let pending = conn
        .pending_migrations(MIGRATIONS)
        .map_err(|error| format!("failed to list pending migrations: {error}"))?;
    if pending.is_empty() {
        println!("Database migrations up to date.");
        return Ok(());
    }
    eprintln!(
        "Applying {} pending database migration(s)...",
        pending.len()
    );
    for migration in &pending {
        eprintln!("  → {}", migration.name());
    }
    run_pending_migrations(&mut conn).map_err(|error| format!("migration failed: {error}"))
}

pub fn revert_migration(conn: &mut impl MigrationHarness<Pg>, name: &str) -> bool {
    for x in MigrationSource::<Pg>::migrations(&MIGRATIONS)
        .unwrap()
        .into_iter()
    {
        if x.name().to_string().eq(name) {
            let r = conn.revert_migration(&x);
            if r.is_err() {
                return false;
            } else {
                println!("Migration reverted: {}", r.unwrap());
                return true;
            }
        }
    }
    println!("Migration not found: {}", name);
    false
}
