use actix_web::{web, HttpResponse, Responder, Result, Scope};
use chrono::NaiveDate;
use database::models::analytics;
use serde::Deserialize;
use serde::Serialize;

#[derive(Deserialize, Debug)]
pub struct DashboardQuery {
    #[serde(default)]
    pub group_by_parent: bool,
    pub start: Option<String>,
    pub end: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct BreakdownQuery {
    pub start: String,
    pub end: String,
}

#[derive(Deserialize, Debug)]
pub struct RecurringQuery {
    #[serde(default = "default_min_occurrences")]
    pub min_occurrences: i32,
}

fn default_min_occurrences() -> i32 {
    3
}

#[derive(Deserialize, Debug)]
pub struct DrilldownQuery {
    pub group_key: String,
    #[serde(default)]
    pub group_by_parent: bool,
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_per_page")]
    pub per_page: i64,
}

fn default_page() -> i64 {
    1
}

fn default_per_page() -> i64 {
    50
}

#[derive(Serialize)]
pub struct PaginatedTransactions {
    pub items: Vec<database::models::transaction::Transaction>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

fn parse_date(value: &str) -> Result<NaiveDate, actix_web::Error> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| {
        actix_web::error::ErrorBadRequest(format!("Invalid date: {value} (expected YYYY-MM-DD)"))
    })
}

fn total_pages(total: i64, per_page: i64) -> i64 {
    if total <= 0 {
        return 0;
    }
    (total + per_page - 1) / per_page
}

#[derive(Deserialize, Debug)]
pub struct KpiQuery {
    pub start: Option<String>,
    pub end: Option<String>,
}

async fn get_kpis(query: web::Query<KpiQuery>) -> Result<impl Responder, actix_web::Error> {
    let start = match &query.start {
        Some(value) => Some(parse_date(value)?),
        None => None,
    };
    let end = match &query.end {
        Some(value) => Some(parse_date(value)?),
        None => None,
    };
    let data = web::block(move || analytics::dashboard_kpis(start, end))
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading KPI summary: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to load KPI summary")
        })?
        .map_err(|e| {
            eprintln!("Database error loading KPI summary: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to load KPI summary")
        })?;
    Ok(HttpResponse::Ok().json(data))
}

async fn get_dashboard(query: web::Query<DashboardQuery>) -> Result<impl Responder, actix_web::Error> {
    let group_by_parent = query.group_by_parent;
    let start = match &query.start {
        Some(value) => Some(parse_date(value)?),
        None => None,
    };
    let end = match &query.end {
        Some(value) => Some(parse_date(value)?),
        None => None,
    };
    let data = web::block(move || analytics::dashboard(group_by_parent, start, end))
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading dashboard analytics: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to load dashboard analytics")
        })?
        .map_err(|e| {
            eprintln!("Database error loading dashboard analytics: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to load dashboard analytics")
        })?;
    Ok(HttpResponse::Ok().json(data))
}

async fn get_breakdown(query: web::Query<BreakdownQuery>) -> Result<impl Responder, actix_web::Error> {
    let start = parse_date(&query.start)?;
    let end = parse_date(&query.end)?;
    let data = web::block(move || analytics::breakdown(start, end))
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading breakdown: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to load breakdown")
        })?
        .map_err(|e| {
            eprintln!("Database error loading breakdown: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to load breakdown")
        })?;
    Ok(HttpResponse::Ok().json(data))
}

async fn get_recurring(query: web::Query<RecurringQuery>) -> Result<impl Responder, actix_web::Error> {
    let min_occurrences = query.min_occurrences;
    let data = web::block(move || analytics::recurring(min_occurrences))
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading recurring: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to load recurring patterns")
        })?
        .map_err(|e| {
            eprintln!("Database error loading recurring: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to load recurring patterns")
        })?;
    Ok(HttpResponse::Ok().json(data))
}

async fn get_spending_drilldown_by_name(
    query: web::Query<DrilldownQuery>,
) -> Result<impl Responder, actix_web::Error> {
    let group_key = query.group_key.clone();
    let group_by_parent = query.group_by_parent;

    let rows = web::block(move || analytics::spending_drilldown_by_name(&group_key, group_by_parent))
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading drilldown by name: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to load drilldown by name")
        })?
        .map_err(|e| {
            eprintln!("Database error loading drilldown by name: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to load drilldown by name")
        })?;

    Ok(HttpResponse::Ok().json(rows))
}

async fn get_spending_drilldown(
    query: web::Query<DrilldownQuery>,
) -> Result<impl Responder, actix_web::Error> {
    let group_key = query.group_key.clone();
    let group_by_parent = query.group_by_parent;
    let page = query.page;
    let per_page = query.per_page;

    let (items, total) = web::block(move || {
        analytics::spending_drilldown(&group_key, group_by_parent, page, per_page)
    })
    .await
    .map_err(|e| {
        eprintln!("Blocking error loading drilldown: {:?}", e);
        actix_web::error::ErrorInternalServerError("Failed to load drilldown")
    })?
    .map_err(|e| {
        eprintln!("Database error loading drilldown: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to load drilldown")
    })?;

    Ok(HttpResponse::Ok().json(PaginatedTransactions {
        items,
        total,
        page,
        per_page,
        total_pages: total_pages(total, per_page),
    }))
}

async fn get_income_drilldown_by_name(
    query: web::Query<DrilldownQuery>,
) -> Result<impl Responder, actix_web::Error> {
    let group_key = query.group_key.clone();
    let group_by_parent = query.group_by_parent;

    let rows = web::block(move || analytics::income_drilldown_by_name(&group_key, group_by_parent))
        .await
        .map_err(|e| {
            eprintln!("Blocking error loading income drilldown by name: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to load income drilldown by name")
        })?
        .map_err(|e| {
            eprintln!("Database error loading income drilldown by name: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to load income drilldown by name")
        })?;

    Ok(HttpResponse::Ok().json(rows))
}

async fn get_income_drilldown(
    query: web::Query<DrilldownQuery>,
) -> Result<impl Responder, actix_web::Error> {
    let group_key = query.group_key.clone();
    let group_by_parent = query.group_by_parent;
    let page = query.page;
    let per_page = query.per_page;

    let (items, total) = web::block(move || {
        analytics::income_drilldown(&group_key, group_by_parent, page, per_page)
    })
    .await
    .map_err(|e| {
        eprintln!("Blocking error loading income drilldown: {:?}", e);
        actix_web::error::ErrorInternalServerError("Failed to load income drilldown")
    })?
    .map_err(|e| {
        eprintln!("Database error loading income drilldown: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to load income drilldown")
    })?;

    Ok(HttpResponse::Ok().json(PaginatedTransactions {
        items,
        total,
        page,
        per_page,
        total_pages: total_pages(total, per_page),
    }))
}

pub fn analytics_service() -> Scope {
    web::scope("/analytics")
        .route("/dashboard", web::get().to(get_dashboard))
        .route("/kpis", web::get().to(get_kpis))
        .route("/breakdown", web::get().to(get_breakdown))
        .route("/recurring", web::get().to(get_recurring))
        .route("/spending-drilldown", web::get().to(get_spending_drilldown))
        .route(
            "/spending-drilldown-by-name",
            web::get().to(get_spending_drilldown_by_name),
        )
        .route("/income-drilldown", web::get().to(get_income_drilldown))
        .route(
            "/income-drilldown-by-name",
            web::get().to(get_income_drilldown_by_name),
        )
}
