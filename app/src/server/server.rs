#![allow(warnings)]
use std::collections::HashSet;
use std::env;
use std::path::PathBuf;
use std::process::exit;
use std::time::Duration;


use crate::server::scopes::api::api;
use crate::server::static_embed::serve_embedded;
use crate::templates::redoc;
use crate::{
    resources::environment::{load_certs, Environments, APP_ENV, SCOPE},
    templates::index::index,
};

use actix_cors::Cors;
use actix_web::web::Data;
use actix_web::{http, web, App, HttpRequest, HttpResponse, HttpServer, Responder};
use database::modules::database::migrate_on_startup;
use chrono::{DateTime, Local, Utc};
use cron::Schedule;
use moka::future::Cache;
use moka::Expiry;
use openssl::rand;
use rusqlite::Connection;
use std::str::FromStr;
use std::thread::{self, Builder, Thread};
use std::time::Instant;
use tokio::sync::mpsc::{self, Receiver, Sender};
use tokio::task;
use tokio_util::sync::CancellationToken;

fn make_cors(listen_port: u16) -> Cors {
    let lp = listen_port;
    let mut origins: HashSet<String> = HashSet::new();
    origins.insert("https://localhost".to_string());
    origins.insert("https://127.0.0.1".to_string());
    origins.insert(format!("https://localhost:{lp}"));
    origins.insert(format!("https://127.0.0.1:{lp}"));
    origins.insert(format!("http://localhost:{lp}"));
    origins.insert(format!("http://127.0.0.1:{lp}"));
    origins.insert("https://localhost:3000".to_string());
    origins.insert("https://127.0.0.1:3000".to_string());
    origins.insert("http://localhost:3000".to_string());
    origins.insert("http://127.0.0.1:3000".to_string());
    if let Ok(extra) = env::var("CORS_ORIGINS") {
        for part in extra.split(',') {
            let t = part.trim();
            if !t.is_empty() {
                origins.insert(t.to_string());
            }
        }
    }
    let mut cors = Cors::default()
        .allowed_methods(vec![
            http::Method::GET,
            http::Method::POST,
            http::Method::PUT,
            http::Method::PATCH,
            http::Method::DELETE,
            http::Method::OPTIONS,
        ])
        .allowed_headers(vec![http::header::AUTHORIZATION, http::header::ACCEPT])
        .allowed_header(http::header::CONTENT_TYPE)
        .max_age(3600);
    for o in origins {
        cors = cors.allowed_origin(o.as_str());
    }
    cors.allowed_origin_fn(|origin, _req_head| origin.as_bytes().ends_with(b".rust-lang.org"))
}

pub async fn server() {
    // if not super user, create with random password and all rights

    std::env::set_var("RUST_LOG", "debug");

    if let Err(error) = migrate_on_startup() {
        eprintln!("FATAL: {error}");
        exit(1);
    }

    let listen_port: u16 = env::var("SERVER_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(2020);
    let listen_addr = format!("0.0.0.0:{listen_port}");
    let listen_port_u16 = listen_port;

    let server = HttpServer::new(move || {
        let cors = make_cors(listen_port_u16);

        App::new().wrap(cors).service(
            web::scope(SCOPE)
                // add cache to every request
                // .route("/", web::get().to(index))
                .route("", web::get().to(index))
                .route("/", web::get().to(index))
                .route("/test", web::get().to(redoc::redoc))
                .service(api())
                .service(
                    web::scope("/static").route("/{tail:.*}", web::get().to(serve_embedded)),
                )
                .route("/{tail:.*}", web::get().to(index)),
        )
    });

    let server = match APP_ENV.env {
        Environments::DEV => {
            let cert = match env::var("CERT_PATH") {
                Ok(v) => PathBuf::from_str(&v).unwrap(),
                Err(_) => panic!("DEV (debug) build requires CERT_PATH and KEY_PATH for HTTPS"),
            };
            let key = match env::var("KEY_PATH") {
                Ok(v) => PathBuf::from_str(&v).unwrap(),
                Err(_) => panic!("DEV (debug) build requires KEY_PATH for HTTPS"),
            };
            server
                .bind_rustls(listen_addr.as_str(), load_certs(cert, key).unwrap())
                .unwrap()
        }
        Environments::PROD => server.bind(listen_addr.as_str()).unwrap(),
        Environments::TEST => todo!(),
        _ => panic!("Could not start server"),
    };

    let scheme = match APP_ENV.env {
        Environments::DEV => "https",
        _ => "http",
    };
    println!(
        "Server running on {}://127.0.0.1:{}{}",
        scheme, listen_port, SCOPE
    );
    server.run().await.unwrap();
    println!("Server stopped");
}
