use crate::models::liabilities::Liability;
use crate::modules::database::get_dbo;
use crate::schema::assets;
use chrono::{NaiveDate, NaiveDateTime, Utc};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

pub const ASSET_KINDS: [&str; 6] = [
    "property",
    "vehicle",
    "super",
    "savings",
    "investment",
    "other",
];

pub fn is_valid_kind(kind: &str) -> bool {
    ASSET_KINDS.contains(&kind)
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
#[diesel(table_name = assets)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Asset {
    pub id: i64,
    pub name: String,
    pub kind: String,
    pub value_cents: i64,
    pub valued_at: Option<NaiveDate>,
    pub value_source: Option<String>,
    pub liability_id: Option<i64>,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub deleted_at: Option<NaiveDateTime>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = assets)]
struct NewAsset<'a> {
    name: &'a str,
    kind: &'a str,
    value_cents: i64,
    valued_at: Option<NaiveDate>,
    value_source: Option<&'a str>,
    liability_id: Option<i64>,
    notes: Option<&'a str>,
    created_at: NaiveDateTime,
}

pub struct AssetInput<'a> {
    pub name: &'a str,
    pub kind: &'a str,
    pub value_cents: i64,
    pub valued_at: Option<NaiveDate>,
    pub value_source: Option<&'a str>,
    pub liability_id: Option<i64>,
    pub notes: Option<&'a str>,
}

#[derive(Debug, Default, AsChangeset)]
#[diesel(table_name = assets)]
pub struct AssetChanges<'a> {
    pub name: Option<&'a str>,
    pub kind: Option<&'a str>,
    pub value_cents: Option<i64>,
    pub valued_at: Option<Option<NaiveDate>>,
    pub value_source: Option<Option<&'a str>>,
    pub liability_id: Option<Option<i64>>,
    pub notes: Option<Option<&'a str>>,
}

#[derive(Debug, Serialize)]
pub struct AssetListResponse {
    pub items: Vec<Asset>,
    pub total_value_cents: i64,
}

fn ensure_liability_exists(liability_id: i64) -> Result<(), diesel::result::Error> {
    Liability::find_active(liability_id)?.ok_or(diesel::result::Error::NotFound)?;
    Ok(())
}

impl Asset {
    pub fn list_active() -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        assets::table
            .filter(assets::deleted_at.is_null())
            .order((assets::kind.asc(), assets::name.asc(), assets::id.asc()))
            .select(Asset::as_select())
            .load(conn)
    }

    pub fn list_with_total() -> Result<AssetListResponse, diesel::result::Error> {
        let items = Self::list_active()?;
        let total_value_cents = items.iter().map(|item| item.value_cents).sum();
        Ok(AssetListResponse {
            items,
            total_value_cents,
        })
    }

    pub fn find_active(id: i64) -> Result<Option<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        assets::table
            .filter(assets::id.eq(id))
            .filter(assets::deleted_at.is_null())
            .select(Asset::as_select())
            .first(conn)
            .optional()
    }

    pub fn insert(input: AssetInput<'_>) -> Result<Self, diesel::result::Error> {
        if let Some(liability_id) = input.liability_id {
            ensure_liability_exists(liability_id)?;
        }
        let conn = &mut get_dbo();
        let row = NewAsset {
            name: input.name,
            kind: input.kind,
            value_cents: input.value_cents,
            valued_at: input.valued_at,
            value_source: input.value_source,
            liability_id: input.liability_id,
            notes: input.notes,
            created_at: Utc::now().naive_utc(),
        };
        diesel::insert_into(assets::table)
            .values(&row)
            .returning(Asset::as_returning())
            .get_result(conn)
    }

    pub fn update(id: i64, changes: AssetChanges<'_>) -> Result<Self, diesel::result::Error> {
        if let Some(Some(liability_id)) = changes.liability_id {
            ensure_liability_exists(liability_id)?;
        }
        let conn = &mut get_dbo();
        diesel::update(
            assets::table
                .filter(assets::id.eq(id))
                .filter(assets::deleted_at.is_null()),
        )
        .set(&changes)
        .returning(Asset::as_returning())
        .get_result(conn)
    }

    pub fn soft_delete(id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        let updated = diesel::update(
            assets::table
                .filter(assets::id.eq(id))
                .filter(assets::deleted_at.is_null()),
        )
        .set(assets::deleted_at.eq(Some(Utc::now().naive_utc())))
        .execute(conn)?;
        if updated == 0 {
            return Err(diesel::result::Error::NotFound);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::is_valid_kind;

    #[test]
    fn valid_kinds_accepted() {
        assert!(is_valid_kind("property"));
        assert!(is_valid_kind("super"));
        assert!(is_valid_kind("other"));
    }

    #[test]
    fn invalid_kind_rejected() {
        assert!(!is_valid_kind("house"));
        assert!(!is_valid_kind(""));
    }
}
