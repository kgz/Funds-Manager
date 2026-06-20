/**
 * /api
 */
use std::str::FromStr;

use actix_web::{web, HttpResponse, Responder, Scope};
use chrono::Utc;
use cron::Schedule;

use crate::routes::{
    accounts::accounts_service,
    analytics_api::analytics_service,
    api::swagger::openapi,
    categories::categories_service,
    category_mappings::category_mappings_routes,
    liabilities::liabilities_service,
    planned_spending::planned_spending_service,
    predictions_api::{
        prediction_goals_service, prediction_scenarios_service, predictions_service,
    },
    transactions_api::transactions_service,
    version_api::get_version,
};

use super::api_users::api_users;



pub fn api() -> Scope {
    web::scope("/api")
        .route("/version", web::get().to(get_version))
        .route("openapi.json", web::get().to(openapi))

        //migrations
        // users
        .service(category_mappings_routes()) // <-- Add the category mappings routes
        .service(accounts_service())
        .service(categories_service())
        .service(planned_spending_service())
        .service(liabilities_service())
        .service(analytics_service())
        .service(transactions_service())
        .service(predictions_service())
        .service(prediction_scenarios_service())
        .service(prediction_goals_service())
        .service(api_users())
        // //user

        // .service(api_user())
        // admin
        // .service(api_admin())
        // data

}
