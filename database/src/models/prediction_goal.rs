use crate::modules::database::get_dbo;
use crate::schema::prediction_goals;
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
#[diesel(table_name = prediction_goals)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct PredictionGoal {
    pub id: i64,
    pub name: String,
    pub target_amount_cents: i64,
    pub target_date: NaiveDate,
    pub created_at: NaiveDateTime,
    pub deleted_at: Option<NaiveDateTime>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = prediction_goals)]
pub struct NewPredictionGoal<'a> {
    pub name: &'a str,
    pub target_amount_cents: i64,
    pub target_date: NaiveDate,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Default, AsChangeset)]
#[diesel(table_name = prediction_goals)]
pub struct PredictionGoalChanges<'a> {
    pub name: Option<&'a str>,
    pub target_amount_cents: Option<i64>,
    pub target_date: Option<NaiveDate>,
}

impl PredictionGoal {
    pub fn list_active() -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        prediction_goals::table
            .filter(prediction_goals::deleted_at.is_null())
            .order((
                prediction_goals::target_date.asc(),
                prediction_goals::name.asc(),
                prediction_goals::id.asc(),
            ))
            .select(PredictionGoal::as_select())
            .load(conn)
    }

    pub fn find_active(id: i64) -> Result<Option<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        prediction_goals::table
            .filter(prediction_goals::id.eq(id))
            .filter(prediction_goals::deleted_at.is_null())
            .select(PredictionGoal::as_select())
            .first(conn)
            .optional()
    }

    pub fn insert(
        name: &str,
        target_amount_cents: i64,
        target_date: NaiveDate,
    ) -> Result<Self, diesel::result::Error> {
        let conn = &mut get_dbo();
        diesel::insert_into(prediction_goals::table)
            .values(&NewPredictionGoal {
                name,
                target_amount_cents,
                target_date,
                created_at: Utc::now().naive_utc(),
            })
            .returning(PredictionGoal::as_returning())
            .get_result(conn)
    }

    pub fn update(id: i64, changes: PredictionGoalChanges<'_>) -> Result<Self, diesel::result::Error> {
        let conn = &mut get_dbo();
        diesel::update(
            prediction_goals::table
                .filter(prediction_goals::id.eq(id))
                .filter(prediction_goals::deleted_at.is_null()),
        )
        .set(&changes)
        .returning(PredictionGoal::as_returning())
        .get_result(conn)
    }

    pub fn soft_delete(id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        let updated = diesel::update(
            prediction_goals::table
                .filter(prediction_goals::id.eq(id))
                .filter(prediction_goals::deleted_at.is_null()),
        )
        .set(prediction_goals::deleted_at.eq(Some(Utc::now().naive_utc())))
        .execute(conn)?;
        if updated == 0 {
            return Err(diesel::result::Error::NotFound);
        }
        Ok(())
    }
}
