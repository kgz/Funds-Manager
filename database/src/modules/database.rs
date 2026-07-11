use diesel::migration::{Migration, MigrationSource};
use diesel::pg::{Pg, PgConnection};
use diesel::r2d2::{ConnectionManager, Pool, PooledConnection};
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use serde::{Deserialize, Serialize};
use std::env;
use std::process::Command;
use std::sync::Once;
use std::sync::OnceLock;
use std::time::Duration;

const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

static LOAD_DOTENV: Once = Once::new();
static DB_POOL: OnceLock<DbPool> = OnceLock::new();

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

fn db_pool() -> &'static DbPool {
    DB_POOL.get_or_init(|| {
        load_dotenv_override();
        let database_url = crate::modules::app_config::resolve_database_url()
            .unwrap_or_else(|error| panic!("{error}"));
        let manager = ConnectionManager::<PgConnection>::new(database_url);
        Pool::builder()
            .max_size(16)
            .connection_timeout(Duration::from_secs(30))
            .build(manager)
            .unwrap_or_else(|e| panic!("Failed to create DB pool: {e}"))
    })
}

pub fn get_dbo() -> DbConn {
    load_dotenv_override();
    db_pool().get().unwrap_or_else(|e| {
        let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| "<unset>".to_string());
        panic!("Error connecting to {database_url}: {e}")
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
