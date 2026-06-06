use actix_web::web::Data;
use moka::future::Cache;
use server_v2::server::server::server;

pub mod routes;
#[actix_web::main]
#[allow(unreachable_patterns)]
async fn main() {
    if let Ok(iter) = dotenv::from_filename_iter(".env") {
        for entry in iter.flatten() {
            std::env::set_var(entry.0, entry.1);
        }
    }
    server().await;
}
