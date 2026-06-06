/**
 * /api
 */
use std::str::FromStr;

use actix_web::{web, HttpResponse, Responder, Scope};
use chrono::Utc;
use cron::Schedule;

use crate::routes::{
    analytics_api::analytics_service,
    api::swagger::openapi,
    categories::categories_service,
    category_mappings::category_mappings_routes,
    transactions_api::transactions_service,
};

use super::api_users::api_users;



pub fn api() -> Scope {
    web::scope("/api")
        .route("openapi.json", web::get().to(openapi))

        //migrations
        // users
        .service(category_mappings_routes()) // <-- Add the category mappings routes
        .service(categories_service())
        .service(analytics_service())
        .service(transactions_service())
        .service(api_users())
        // //user

        // .service(api_user())
        // admin
        // .service(api_admin())
        // data

}
