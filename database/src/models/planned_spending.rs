use crate::models::category::Category;
use crate::modules::database::get_dbo;
use crate::schema::planned_spending;
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
#[diesel(table_name = planned_spending)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct PlannedSpending {
    pub id: i64,
    pub name: String,
    pub amount_cents: i32,
    pub start_date: NaiveDate,
    pub end_date: Option<NaiveDate>,
    pub category_id: Option<i64>,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub deleted_at: Option<NaiveDateTime>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = planned_spending)]
pub struct NewPlannedSpending<'a> {
    pub name: &'a str,
    pub amount_cents: i32,
    pub start_date: NaiveDate,
    pub end_date: Option<NaiveDate>,
    pub category_id: Option<i64>,
    pub notes: Option<&'a str>,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Default, AsChangeset)]
#[diesel(table_name = planned_spending)]
pub struct PlannedSpendingChanges<'a> {
    pub name: Option<&'a str>,
    pub amount_cents: Option<i32>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<Option<NaiveDate>>,
    pub category_id: Option<Option<i64>>,
    pub notes: Option<Option<&'a str>>,
}

#[derive(Debug, Serialize)]
pub struct PlannedSpendingListResponse {
    pub items: Vec<PlannedSpending>,
    pub total_cents: i64,
}

pub fn spans_overlap(
    start_date: NaiveDate,
    end_date: Option<NaiveDate>,
    range_start: NaiveDate,
    range_end: NaiveDate,
) -> bool {
    let item_end = end_date.unwrap_or(start_date);
    start_date <= range_end && item_end >= range_start
}

fn overlap_filter(
    query: planned_spending::BoxedQuery<'_, diesel::pg::Pg>,
    range_start: NaiveDate,
    range_end: NaiveDate,
) -> planned_spending::BoxedQuery<'_, diesel::pg::Pg> {
    query.filter(
        planned_spending::end_date
            .is_not_null()
            .and(planned_spending::start_date.le(range_end))
            .and(planned_spending::end_date.ge(range_start))
            .or(
                planned_spending::end_date
                    .is_null()
                    .and(planned_spending::start_date.ge(range_start))
                    .and(planned_spending::start_date.le(range_end)),
            ),
    )
}

impl PlannedSpending {
    pub fn list_active() -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        planned_spending::table
            .filter(planned_spending::deleted_at.is_null())
            .order((
                planned_spending::start_date.asc(),
                planned_spending::name.asc(),
                planned_spending::id.asc(),
            ))
            .select(PlannedSpending::as_select())
            .load(conn)
    }

    pub fn list_overlapping(
        range_start: NaiveDate,
        range_end: NaiveDate,
    ) -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        let query = planned_spending::table
            .filter(planned_spending::deleted_at.is_null())
            .into_boxed();
        overlap_filter(query, range_start, range_end)
            .order((
                planned_spending::start_date.asc(),
                planned_spending::name.asc(),
                planned_spending::id.asc(),
            ))
            .select(PlannedSpending::as_select())
            .load(conn)
    }

    pub fn list_on_or_after(from: NaiveDate) -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        planned_spending::table
            .filter(planned_spending::deleted_at.is_null())
            .filter(planned_spending::start_date.ge(from))
            .order((
                planned_spending::start_date.asc(),
                planned_spending::name.asc(),
                planned_spending::id.asc(),
            ))
            .select(PlannedSpending::as_select())
            .load(conn)
    }

    pub fn list_with_total(
        range_start: Option<NaiveDate>,
        range_end: Option<NaiveDate>,
    ) -> Result<PlannedSpendingListResponse, diesel::result::Error> {
        let items = match (range_start, range_end) {
            (Some(start), Some(end)) => Self::list_overlapping(start, end)?,
            (Some(start), None) => Self::list_on_or_after(start)?,
            (None, None) => Self::list_active()?,
            (None, Some(_)) => Self::list_active()?,
        };
        let total_cents = items
            .iter()
            .map(|item| i64::from(item.amount_cents))
            .sum();
        Ok(PlannedSpendingListResponse {
            items,
            total_cents,
        })
    }

    pub fn find_active(id: i64) -> Result<Option<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        planned_spending::table
            .filter(planned_spending::id.eq(id))
            .filter(planned_spending::deleted_at.is_null())
            .select(PlannedSpending::as_select())
            .first(conn)
            .optional()
    }

    pub fn insert(
        name: &str,
        amount_cents: i32,
        start_date: NaiveDate,
        end_date: Option<NaiveDate>,
        category_id: Option<i64>,
        notes: Option<&str>,
    ) -> Result<Self, diesel::result::Error> {
        if let Some(category_id) = category_id {
            Category::find(category_id, false)?.ok_or(diesel::result::Error::NotFound)?;
        }
        let conn = &mut get_dbo();
        let row = NewPlannedSpending {
            name,
            amount_cents,
            start_date,
            end_date,
            category_id,
            notes,
            created_at: Utc::now().naive_utc(),
        };
        diesel::insert_into(planned_spending::table)
            .values(&row)
            .returning(PlannedSpending::as_returning())
            .get_result(conn)
    }

    pub fn update(
        id: i64,
        changes: PlannedSpendingChanges<'_>,
    ) -> Result<Self, diesel::result::Error> {
        if let Some(Some(category_id)) = changes.category_id {
            Category::find(category_id, false)?.ok_or(diesel::result::Error::NotFound)?;
        }
        let conn = &mut get_dbo();
        diesel::update(
            planned_spending::table
                .filter(planned_spending::id.eq(id))
                .filter(planned_spending::deleted_at.is_null()),
        )
        .set(&changes)
        .returning(PlannedSpending::as_returning())
        .get_result(conn)
    }

    pub fn soft_delete(id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        let updated = diesel::update(
            planned_spending::table
                .filter(planned_spending::id.eq(id))
                .filter(planned_spending::deleted_at.is_null()),
        )
        .set(planned_spending::deleted_at.eq(Some(Utc::now().naive_utc())))
        .execute(conn)?;
        if updated == 0 {
            return Err(diesel::result::Error::NotFound);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::spans_overlap;
    use chrono::NaiveDate;

    fn d(value: &str) -> NaiveDate {
        NaiveDate::parse_from_str(value, "%Y-%m-%d").expect("date")
    }

    #[test]
    fn overlap_single_day_inside_range() {
        assert!(spans_overlap(d("2026-03-10"), None, d("2026-03-01"), d("2026-03-31")));
    }

    #[test]
    fn overlap_single_day_outside_range() {
        assert!(!spans_overlap(d("2026-02-10"), None, d("2026-03-01"), d("2026-03-31")));
    }

    #[test]
    fn overlap_range_crosses_boundary() {
        assert!(spans_overlap(
            d("2026-02-15"),
            Some(d("2026-03-10")),
            d("2026-03-01"),
            d("2026-03-31")
        ));
    }

    #[test]
    fn overlap_range_before_period() {
        assert!(!spans_overlap(
            d("2026-01-01"),
            Some(d("2026-01-31")),
            d("2026-03-01"),
            d("2026-03-31")
        ));
    }
}
