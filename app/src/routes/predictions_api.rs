use actix_web::{error, web, HttpResponse, Responder, Result, Scope};
use chrono::NaiveDate;
use database::models::prediction_engine::{
    compute_baseline, compute_scenario, AdjustmentLine, LineFrequency,
};
use database::models::prediction_goal::{PredictionGoal, PredictionGoalChanges};
use database::models::prediction_scenario::{
    PredictionScenario, ScenarioLineInput,
};
use diesel::result::Error as DbError;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct PredictionRangeQuery {
    pub from: String,
    pub to: String,
    pub account_id: Option<i64>,
}

#[derive(Deserialize, Debug)]
pub struct RepeatAdjustmentPayload {
    pub amount_cents: i64,
    pub frequency: String,
    pub start_date: String,
    pub end_date: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct BaselinePostPayload {
    pub from: String,
    pub to: String,
    pub account_id: Option<i64>,
    pub repeat_adjustments: Option<Vec<RepeatAdjustmentPayload>>,
}

#[derive(Deserialize, Debug)]
pub struct ScenarioLinePayload {
    pub name: String,
    pub amount_cents: i32,
    pub frequency: String,
    pub start_date: String,
    pub end_date: Option<String>,
    pub category_id: Option<i64>,
    pub sort_order: Option<i32>,
}

#[derive(Deserialize, Debug)]
pub struct CreateScenarioPayload {
    pub name: String,
    pub lines: Vec<ScenarioLinePayload>,
}

#[derive(Deserialize, Debug)]
pub struct UpdateScenarioPayload {
    pub name: Option<String>,
    pub lines: Option<Vec<ScenarioLinePayload>>,
}

#[derive(Deserialize, Debug)]
pub struct CreateGoalPayload {
    pub name: String,
    pub target_amount_cents: i64,
    pub target_date: String,
}

#[derive(Deserialize, Debug)]
pub struct UpdateGoalPayload {
    pub name: Option<String>,
    pub target_amount_cents: Option<i64>,
    pub target_date: Option<String>,
}

fn map_db_error(err: DbError) -> error::Error {
    eprintln!("Database Error: {:?}", err);
    match err {
        DbError::NotFound => error::ErrorNotFound("Not found"),
        _ => error::ErrorInternalServerError("An internal server error occurred"),
    }
}

fn parse_date(value: &str, field: &str) -> Result<NaiveDate, error::Error> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| {
        error::ErrorBadRequest(format!("Invalid {field}; use YYYY-MM-DD"))
    })
}

fn parse_range(query: &PredictionRangeQuery) -> Result<(NaiveDate, NaiveDate, Option<i64>), error::Error> {
    let from = parse_date(&query.from, "from")?;
    let to = parse_date(&query.to, "to")?;
    if from > to {
        return Err(error::ErrorBadRequest("from must be on or before to"));
    }
    Ok((from, to, query.account_id))
}

fn parse_repeat_adjustments(
    items: &[RepeatAdjustmentPayload],
) -> Result<Vec<AdjustmentLine>, error::Error> {
    let mut lines = Vec::with_capacity(items.len());
    for item in items {
        let frequency = LineFrequency::parse(&item.frequency).ok_or_else(|| {
            error::ErrorBadRequest(format!("Invalid frequency: {}", item.frequency))
        })?;
        if item.amount_cents == 0 {
            return Err(error::ErrorBadRequest("amount_cents must be non-zero"));
        }
        let start_date = parse_date(&item.start_date, "start_date")?;
        let end_date = match item.end_date.as_deref() {
            Some(value) => Some(parse_date(value, "end_date")?),
            None => None,
        };
        if let Some(end) = end_date {
            if end < start_date {
                return Err(error::ErrorBadRequest(
                    "end_date must be on or after start_date",
                ));
            }
        }
        lines.push(AdjustmentLine {
            amount_cents: item.amount_cents,
            frequency,
            start_date,
            end_date,
        });
    }
    Ok(lines)
}

fn parse_scenario_lines(items: &[ScenarioLinePayload]) -> Result<Vec<ScenarioLineInput>, error::Error> {
    let mut lines = Vec::with_capacity(items.len());
    for item in items {
        if item.amount_cents == 0 {
            return Err(error::ErrorBadRequest("amount_cents must be non-zero"));
        }
        if LineFrequency::parse(&item.frequency).is_none() {
            return Err(error::ErrorBadRequest(format!(
                "Invalid frequency: {}",
                item.frequency
            )));
        }
        let start_date = parse_date(&item.start_date, "start_date")?;
        let end_date = match item.end_date.as_deref() {
            Some(value) => Some(parse_date(value, "end_date")?),
            None => None,
        };
        if let Some(end) = end_date {
            if end < start_date {
                return Err(error::ErrorBadRequest(
                    "end_date must be on or after start_date",
                ));
            }
        }
        let name = item.name.trim();
        if name.is_empty() {
            return Err(error::ErrorBadRequest("line name is required"));
        }
        lines.push(ScenarioLineInput {
            name: name.to_string(),
            amount_cents: item.amount_cents,
            frequency: item.frequency.clone(),
            start_date,
            end_date,
            category_id: item.category_id,
            sort_order: item.sort_order,
        });
    }
    Ok(lines)
}

async fn get_baseline(
    query: web::Query<PredictionRangeQuery>,
) -> Result<impl Responder, error::Error> {
    let (from, to, account_id) = parse_range(&query)?;
    let projection =
        compute_baseline(from, to, account_id, &[]).map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(projection))
}

async fn post_baseline(
    payload: web::Json<BaselinePostPayload>,
) -> Result<impl Responder, error::Error> {
    let data = payload.into_inner();
    let from = parse_date(&data.from, "from")?;
    let to = parse_date(&data.to, "to")?;
    if from > to {
        return Err(error::ErrorBadRequest("from must be on or before to"));
    }
    let repeat_adjustments = match data.repeat_adjustments {
        Some(items) => parse_repeat_adjustments(&items)?,
        None => Vec::new(),
    };
    let projection = compute_baseline(from, to, data.account_id, &repeat_adjustments)
        .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(projection))
}

async fn get_scenario_projection(
    path: web::Path<i64>,
    query: web::Query<PredictionRangeQuery>,
) -> Result<impl Responder, error::Error> {
    scenario_projection(path.into_inner(), &query, &[]).await
}

async fn post_scenario_projection(
    path: web::Path<i64>,
    query: web::Query<PredictionRangeQuery>,
    payload: web::Json<BaselinePostPayload>,
) -> Result<impl Responder, error::Error> {
    let repeat_adjustments = match &payload.repeat_adjustments {
        Some(items) => parse_repeat_adjustments(items)?,
        None => Vec::new(),
    };
    scenario_projection(path.into_inner(), &query, &repeat_adjustments).await
}

async fn scenario_projection(
    scenario_id: i64,
    query: &PredictionRangeQuery,
    repeat_adjustments: &[AdjustmentLine],
) -> Result<HttpResponse, error::Error> {
    let (from, to, account_id) = parse_range(query)?;
    let scenario = PredictionScenario::find_active_with_lines(scenario_id)
        .map_err(map_db_error)?
        .ok_or_else(|| error::ErrorNotFound("Scenario not found"))?;

    let scenario_lines: Vec<AdjustmentLine> = scenario
        .lines
        .iter()
        .filter_map(|line| line.to_adjustment())
        .collect();

    let projection = compute_scenario(from, to, account_id, repeat_adjustments, &scenario_lines)
        .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(projection))
}

async fn list_scenarios() -> Result<impl Responder, error::Error> {
    let scenarios = PredictionScenario::list_active_with_lines().map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(scenarios))
}

async fn create_scenario(
    payload: web::Json<CreateScenarioPayload>,
) -> Result<impl Responder, error::Error> {
    let data = payload.into_inner();
    let name = data.name.trim();
    if name.is_empty() {
        return Err(error::ErrorBadRequest("name is required"));
    }
    let lines = parse_scenario_lines(&data.lines)?;
    let scenario =
        PredictionScenario::insert_with_lines(name, &lines).map_err(map_db_error)?;
    Ok(HttpResponse::Created().json(scenario))
}

async fn update_scenario(
    path: web::Path<i64>,
    payload: web::Json<UpdateScenarioPayload>,
) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    let data = payload.into_inner();
    let name = data
        .name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if data.name.as_deref().is_some_and(|value| value.trim().is_empty()) {
        return Err(error::ErrorBadRequest("name is required"));
    }
    let lines = match data.lines {
        Some(items) => Some(parse_scenario_lines(&items)?),
        None => None,
    };
    let scenario = PredictionScenario::update_with_lines(id, name, lines.as_deref())
        .map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(scenario))
}

async fn delete_scenario(path: web::Path<i64>) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    PredictionScenario::soft_delete(id).map_err(map_db_error)?;
    Ok(HttpResponse::NoContent().finish())
}

async fn list_goals() -> Result<impl Responder, error::Error> {
    let goals = PredictionGoal::list_active().map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(goals))
}

async fn create_goal(payload: web::Json<CreateGoalPayload>) -> Result<impl Responder, error::Error> {
    let data = payload.into_inner();
    let name = data.name.trim();
    if name.is_empty() {
        return Err(error::ErrorBadRequest("name is required"));
    }
    if data.target_amount_cents <= 0 {
        return Err(error::ErrorBadRequest(
            "target_amount_cents must be positive",
        ));
    }
    let target_date = parse_date(&data.target_date, "target_date")?;
    let goal = PredictionGoal::insert(name, data.target_amount_cents, target_date)
        .map_err(map_db_error)?;
    Ok(HttpResponse::Created().json(goal))
}

async fn update_goal(
    path: web::Path<i64>,
    payload: web::Json<UpdateGoalPayload>,
) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    let data = payload.into_inner();
    if data.name.as_deref().is_some_and(|value| value.trim().is_empty()) {
        return Err(error::ErrorBadRequest("name is required"));
    }
    if let Some(amount) = data.target_amount_cents {
        if amount <= 0 {
            return Err(error::ErrorBadRequest(
                "target_amount_cents must be positive",
            ));
        }
    }
    let target_date = match data.target_date.as_deref() {
        Some(value) => Some(parse_date(value, "target_date")?),
        None => None,
    };
    let changes = PredictionGoalChanges {
        name: data
            .name
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty()),
        target_amount_cents: data.target_amount_cents,
        target_date,
    };
    let goal = PredictionGoal::update(id, changes).map_err(map_db_error)?;
    Ok(HttpResponse::Ok().json(goal))
}

async fn delete_goal(path: web::Path<i64>) -> Result<impl Responder, error::Error> {
    let id = path.into_inner();
    PredictionGoal::soft_delete(id).map_err(map_db_error)?;
    Ok(HttpResponse::NoContent().finish())
}

pub fn predictions_service() -> Scope {
    web::scope("/predictions")
        .route("/baseline", web::get().to(get_baseline))
        .route("/baseline", web::post().to(post_baseline))
        .route("/scenario/{id}", web::get().to(get_scenario_projection))
        .route("/scenario/{id}", web::post().to(post_scenario_projection))
}

pub fn prediction_scenarios_service() -> Scope {
    web::scope("/prediction-scenarios")
        .route("", web::get().to(list_scenarios))
        .route("", web::post().to(create_scenario))
        .route("/{id}", web::put().to(update_scenario))
        .route("/{id}", web::delete().to(delete_scenario))
}

pub fn prediction_goals_service() -> Scope {
    web::scope("/prediction-goals")
        .route("", web::get().to(list_goals))
        .route("", web::post().to(create_goal))
        .route("/{id}", web::put().to(update_goal))
        .route("/{id}", web::delete().to(delete_goal))
}
