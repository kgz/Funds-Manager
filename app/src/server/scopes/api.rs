/**
 * /api
 */
use actix_web::{web, Scope};

use crate::routes::{
    accounts::accounts_service,
    ai_api::get_api_catalog,
    analytics_api::analytics_service,
    api::swagger::openapi,
    auth_api::{get_me, login_user, logout_user, register_user},
    categories::categories_service,
    assets::assets_service,
    category_mappings::category_mappings_routes,
    income_streams::income_streams_service,
    lender_expenses::lender_expenses_service,
    report_coverage::report_coverage_service,
    report_snapshots::report_snapshots_service,
    broker_report::public_broker_reports_service,
    serviceability::serviceability_service,
    settings_api::settings_service,
    liabilities::liabilities_service,
    planned_spending::planned_spending_service,
    predictions_api::{
        prediction_goals_service, prediction_scenarios_service, predictions_service,
    },
    transactions_api::transactions_service,
    transfers_api::transfers_service,
    version_api::get_version,
};

use super::api_users::api_users;

pub fn api() -> Scope {
    web::scope("/api")
        .route("/version", web::get().to(get_version))
        .route("/register", web::post().to(register_user))
        .route("/login", web::post().to(login_user))
        .route("/logout", web::post().to(logout_user))
        .route("/me", web::get().to(get_me))
        .service(settings_service())
        .route("/ai", web::get().to(get_api_catalog))
        .route("/mcp", web::get().to(get_api_catalog))
        .route("openapi.json", web::get().to(openapi))
        .service(category_mappings_routes())
        .service(accounts_service())
        .service(categories_service())
        .service(planned_spending_service())
        .service(liabilities_service())
        .service(assets_service())
        .service(income_streams_service())
        .service(lender_expenses_service())
        .service(serviceability_service())
        .service(report_coverage_service())
        .service(report_snapshots_service())
        .service(public_broker_reports_service())
        .service(analytics_service())
        .service(transactions_service())
        .service(transfers_service())
        .service(predictions_service())
        .service(prediction_scenarios_service())
        .service(prediction_goals_service())
        .service(api_users())
}
