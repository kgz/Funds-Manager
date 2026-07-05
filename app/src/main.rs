use server_v2::server::server::server;

pub mod routes;
#[actix_web::main]
#[allow(unreachable_patterns)]
async fn main() {
    dotenv::from_path(".env").ok();
    server().await;
}
