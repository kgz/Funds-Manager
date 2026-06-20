use crate::models::category::Category;
use crate::models::prediction_engine::LineFrequency;
use crate::modules::database::get_dbo;
use crate::schema::{prediction_scenario_lines, prediction_scenarios};
use chrono::{NaiveDate, NaiveDateTime, Utc};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(
    Queryable,
    Selectable,
    Identifiable,
    Debug,
    Serialize,
    Deserialize,
    Clone,
    AsChangeset,
)]
#[diesel(table_name = prediction_scenarios)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct PredictionScenario {
    pub id: i64,
    pub name: String,
    pub created_at: NaiveDateTime,
    pub deleted_at: Option<NaiveDateTime>,
}

#[derive(
    Queryable,
    Selectable,
    Identifiable,
    Debug,
    Serialize,
    Deserialize,
    Clone,
    AsChangeset,
)]
#[diesel(table_name = prediction_scenario_lines)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct PredictionScenarioLine {
    pub id: i64,
    pub scenario_id: i64,
    pub name: String,
    pub amount_cents: i32,
    pub frequency: String,
    pub start_date: NaiveDate,
    pub end_date: Option<NaiveDate>,
    pub category_id: Option<i64>,
    pub sort_order: i32,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = prediction_scenarios)]
pub struct NewPredictionScenario<'a> {
    pub name: &'a str,
    pub created_at: NaiveDateTime,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = prediction_scenario_lines)]
pub struct NewPredictionScenarioLine<'a> {
    pub scenario_id: i64,
    pub name: &'a str,
    pub amount_cents: i32,
    pub frequency: &'a str,
    pub start_date: NaiveDate,
    pub end_date: Option<NaiveDate>,
    pub category_id: Option<i64>,
    pub sort_order: i32,
}

#[derive(Debug, Default, AsChangeset)]
#[diesel(table_name = prediction_scenarios)]
pub struct PredictionScenarioChanges<'a> {
    pub name: Option<&'a str>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScenarioLineInput {
    pub name: String,
    pub amount_cents: i32,
    pub frequency: String,
    pub start_date: NaiveDate,
    pub end_date: Option<NaiveDate>,
    pub category_id: Option<i64>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct PredictionScenarioWithLines {
    pub id: i64,
    pub name: String,
    pub created_at: NaiveDateTime,
    pub lines: Vec<PredictionScenarioLine>,
}

impl PredictionScenarioLine {
    pub fn to_adjustment(&self) -> Option<crate::models::prediction_engine::AdjustmentLine> {
        let frequency = LineFrequency::parse(&self.frequency)?;
        Some(crate::models::prediction_engine::AdjustmentLine {
            amount_cents: i64::from(self.amount_cents),
            frequency,
            start_date: self.start_date,
            end_date: self.end_date,
        })
    }
}

impl PredictionScenario {
    fn load_lines(scenario_id: i64) -> Result<Vec<PredictionScenarioLine>, diesel::result::Error> {
        let conn = &mut get_dbo();
        prediction_scenario_lines::table
            .filter(prediction_scenario_lines::scenario_id.eq(scenario_id))
            .order((
                prediction_scenario_lines::sort_order.asc(),
                prediction_scenario_lines::id.asc(),
            ))
            .select(PredictionScenarioLine::as_select())
            .load(conn)
    }

    pub fn list_active_with_lines(
    ) -> Result<Vec<PredictionScenarioWithLines>, diesel::result::Error> {
        let conn = &mut get_dbo();
        let scenarios: Vec<PredictionScenario> = prediction_scenarios::table
            .filter(prediction_scenarios::deleted_at.is_null())
            .order((
                prediction_scenarios::name.asc(),
                prediction_scenarios::id.asc(),
            ))
            .select(PredictionScenario::as_select())
            .load(conn)?;

        let mut result = Vec::with_capacity(scenarios.len());
        for scenario in scenarios {
            let lines = Self::load_lines(scenario.id)?;
            result.push(PredictionScenarioWithLines {
                id: scenario.id,
                name: scenario.name,
                created_at: scenario.created_at,
                lines,
            });
        }
        Ok(result)
    }

    pub fn find_active_with_lines(
        id: i64,
    ) -> Result<Option<PredictionScenarioWithLines>, diesel::result::Error> {
        let conn = &mut get_dbo();
        let scenario = prediction_scenarios::table
            .filter(prediction_scenarios::id.eq(id))
            .filter(prediction_scenarios::deleted_at.is_null())
            .select(PredictionScenario::as_select())
            .first(conn)
            .optional()?;
        let Some(scenario) = scenario else {
            return Ok(None);
        };
        let lines = Self::load_lines(scenario.id)?;
        Ok(Some(PredictionScenarioWithLines {
            id: scenario.id,
            name: scenario.name,
            created_at: scenario.created_at,
            lines,
        }))
    }

    pub fn insert_with_lines(
        name: &str,
        lines: &[ScenarioLineInput],
    ) -> Result<PredictionScenarioWithLines, diesel::result::Error> {
        let conn = &mut get_dbo();
        for line in lines {
            if let Some(category_id) = line.category_id {
                Category::find(category_id, false)?.ok_or(diesel::result::Error::NotFound)?;
            }
            if LineFrequency::parse(&line.frequency).is_none() {
                return Err(diesel::result::Error::NotFound);
            }
        }

        conn.transaction(|conn| {
            let scenario = diesel::insert_into(prediction_scenarios::table)
                .values(&NewPredictionScenario {
                    name,
                    created_at: Utc::now().naive_utc(),
                })
                .returning(PredictionScenario::as_returning())
                .get_result(conn)?;

            let mut stored_lines = Vec::new();
            for (index, line) in lines.iter().enumerate() {
                let row = diesel::insert_into(prediction_scenario_lines::table)
                    .values(&NewPredictionScenarioLine {
                        scenario_id: scenario.id,
                        name: line.name.trim(),
                        amount_cents: line.amount_cents,
                        frequency: line.frequency.as_str(),
                        start_date: line.start_date,
                        end_date: line.end_date,
                        category_id: line.category_id,
                        sort_order: line.sort_order.unwrap_or(index as i32),
                    })
                    .returning(PredictionScenarioLine::as_returning())
                    .get_result(conn)?;
                stored_lines.push(row);
            }

            Ok(PredictionScenarioWithLines {
                id: scenario.id,
                name: scenario.name,
                created_at: scenario.created_at,
                lines: stored_lines,
            })
        })
    }

    pub fn update_with_lines(
        id: i64,
        name: Option<&str>,
        lines: Option<&[ScenarioLineInput]>,
    ) -> Result<PredictionScenarioWithLines, diesel::result::Error> {
        let conn = &mut get_dbo();
        conn.transaction(|conn| {
            if let Some(name) = name {
                diesel::update(
                    prediction_scenarios::table
                        .filter(prediction_scenarios::id.eq(id))
                        .filter(prediction_scenarios::deleted_at.is_null()),
                )
                .set(PredictionScenarioChanges { name: Some(name) })
                .execute(conn)?;
            }

            if let Some(lines) = lines {
                for line in lines {
                    if let Some(category_id) = line.category_id {
                        Category::find(category_id, false)?
                            .ok_or(diesel::result::Error::NotFound)?;
                    }
                    if LineFrequency::parse(&line.frequency).is_none() {
                        return Err(diesel::result::Error::NotFound);
                    }
                }
                diesel::delete(
                    prediction_scenario_lines::table
                        .filter(prediction_scenario_lines::scenario_id.eq(id)),
                )
                .execute(conn)?;

                for (index, line) in lines.iter().enumerate() {
                    diesel::insert_into(prediction_scenario_lines::table)
                        .values(&NewPredictionScenarioLine {
                            scenario_id: id,
                            name: line.name.trim(),
                            amount_cents: line.amount_cents,
                            frequency: line.frequency.as_str(),
                            start_date: line.start_date,
                            end_date: line.end_date,
                            category_id: line.category_id,
                            sort_order: line.sort_order.unwrap_or(index as i32),
                        })
                        .execute(conn)?;
                }
            }

            let scenario = prediction_scenarios::table
                .filter(prediction_scenarios::id.eq(id))
                .filter(prediction_scenarios::deleted_at.is_null())
                .select(PredictionScenario::as_select())
                .first(conn)?;

            let stored_lines = prediction_scenario_lines::table
                .filter(prediction_scenario_lines::scenario_id.eq(id))
                .order((
                    prediction_scenario_lines::sort_order.asc(),
                    prediction_scenario_lines::id.asc(),
                ))
                .select(PredictionScenarioLine::as_select())
                .load(conn)?;

            Ok(PredictionScenarioWithLines {
                id: scenario.id,
                name: scenario.name,
                created_at: scenario.created_at,
                lines: stored_lines,
            })
        })
    }

    pub fn soft_delete(id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        let updated = diesel::update(
            prediction_scenarios::table
                .filter(prediction_scenarios::id.eq(id))
                .filter(prediction_scenarios::deleted_at.is_null()),
        )
        .set(prediction_scenarios::deleted_at.eq(Some(Utc::now().naive_utc())))
        .execute(conn)?;
        if updated == 0 {
            return Err(diesel::result::Error::NotFound);
        }
        Ok(())
    }
}
