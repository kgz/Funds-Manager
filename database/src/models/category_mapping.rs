use std::io::Write;

use crate::models::category::Category; // Assuming you might need this for associations later
use crate::schema::{category_mappings, sql_types};
use chrono::NaiveDateTime;
use diesel::{
    deserialize::{self, FromSql, FromSqlRow}, // Import FromSqlRow here
    dsl::count_star,
    expression::{AsExpression, Expression}, // Import Expression
    pg::Pg,
    prelude::*,
    serialize::{self, IsNull, Output, ToSql}, // Import ToSql and related items
    sql_types::{self as other_sql_types, Text}, // Import Text SQL type for string mapping
};
use serde::{Deserialize, Serialize};

// Define an enum for MatchType in Rust for better type safety
// Note: Diesel doesn't automatically map Rust enums to SQL ENUMs for MySQL easily.
// We'll store it as a String in the struct and handle conversion/validation elsewhere,
// or you could implement custom Diesel serialization/deserialization if needed. <- This comment is outdated, DbEnum handles the mapping.
// Remove DbEnum derive
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)] // Keep necessary derives
pub enum CategoryMappingsMatch {
    Exact,
    Regex,
}

#[derive(
    Queryable, Selectable, Identifiable, Debug, Serialize, Deserialize, Clone, Associations,
)]
#[diesel(belongs_to(Category))] // Add association if category_id is a foreign key
#[diesel(table_name = category_mappings)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct CategoryMapping {
    pub id: i64,
    pub pattern: String,
    pub match_type: CategoryMappingsMatch,
    pub category_id: i64,
    pub priority: i32,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

// Optional: Define a struct for inserting new mappings if you don't need `id` or timestamps
#[derive(Insertable, Debug, Clone)]
#[diesel(table_name = category_mappings)]
pub struct NewCategoryMapping<'a> {
    pub pattern: &'a str,
    pub match_type: CategoryMappingsMatch, // Use the correct enum name
    pub category_id: i64,
    pub priority: Option<i32>, // Make priority optional on insert, defaults in DB
}

// Struct specifically for updating CategoryMapping records
#[derive(AsChangeset, Identifiable, Debug, Clone)]
#[diesel(table_name = category_mappings)]
pub struct UpdateCategoryMapping {
    pub id: i64,
    pub pattern: Option<String>,
    pub match_type: Option<CategoryMappingsMatch>,
    pub category_id: Option<i64>,
    pub priority: Option<i32>,
    // Do not include created_at
    // updated_at is usually handled by the DB or set explicitly in update logic
}

// --- Manual Diesel Trait Implementations for CategoryMappingsMatch ---

// 1. AsExpression: Allows using the enum in query builders
impl AsExpression<sql_types::CategoryMappingsMatchTypeEnum> for CategoryMappingsMatch {
    type Expression = diesel::expression::SqlLiteral<sql_types::CategoryMappingsMatchTypeEnum>;

    fn as_expression(self) -> Self::Expression {
        // Convert the enum variant to its string representation for SQL
        let sql_string = match self {
            CategoryMappingsMatch::Exact => "'exact'", // Ensure quotes for SQL string literal
            CategoryMappingsMatch::Regex => "'regex'",
        };
        diesel::dsl::sql(sql_string)
    }
}

// Also implement for references if needed
impl<'expr> AsExpression<sql_types::CategoryMappingsMatchTypeEnum>
    for &'expr CategoryMappingsMatch
{
    type Expression = diesel::expression::SqlLiteral<sql_types::CategoryMappingsMatchTypeEnum>;

    fn as_expression(self) -> Self::Expression {
        let sql_string = match self {
            CategoryMappingsMatch::Exact => "'exact'",
            CategoryMappingsMatch::Regex => "'regex'",
        };
        diesel::dsl::sql(sql_string)
    }
}

// 2. FromSql: Handles reading the ENUM value from the database
impl FromSql<sql_types::CategoryMappingsMatchTypeEnum, Pg> for CategoryMappingsMatch {
    fn from_sql(bytes: diesel::backend::RawValue<'_, Pg>) -> deserialize::Result<Self> {
        match std::str::from_utf8(bytes.as_bytes())? {
            "exact" => Ok(CategoryMappingsMatch::Exact),
            "regex" => Ok(CategoryMappingsMatch::Regex),
            s => Err(format!("Unrecognized variant '{}'", s).into()),
        }
    }
}

// 3. ToSql: Handles writing the enum value to the database
impl ToSql<sql_types::CategoryMappingsMatchTypeEnum, Pg> for CategoryMappingsMatch {
    fn to_sql<'b>(&'b self, out: &mut Output<'b, '_, Pg>) -> serialize::Result {
        match self {
            CategoryMappingsMatch::Exact => out.write_all(b"exact")?,
            CategoryMappingsMatch::Regex => out.write_all(b"regex")?,
        }
        Ok(IsNull::No)
    }
}

// 4. Queryable: Allows loading the enum from a single column query result
// This relies on the FromSql implementation.
impl Queryable<sql_types::CategoryMappingsMatchTypeEnum, Pg> for CategoryMappingsMatch
where
    Self: FromSql<sql_types::CategoryMappingsMatchTypeEnum, Pg>,
{
    type Row = Self;

    fn build(row: Self::Row) -> deserialize::Result<Self> {
        Ok(row)
    }
}

// --- Implementation Block for CategoryMapping ---

use crate::modules::database::get_dbo; // Assuming get_dbo provides the connection
use chrono::Utc;

impl CategoryMapping {
    /// Retrieves all category mappings, ordered by priority (descending) then ID.
    pub fn all() -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        category_mappings::table
            .order((
                category_mappings::priority.desc(),
                category_mappings::id.asc(),
            ))
            .load(conn)
    }

    /// Finds a category mapping by its ID.
    pub fn find(id: i64) -> Result<Option<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        category_mappings::table
            .find(id) // Shorthand for .filter(category_mappings::id.eq(id))
            .first::<Self>(conn)
            .optional()
    }

    /// Finds mappings associated with a specific category ID.
    pub fn find_by_category_id(
        category_id_to_find: i64,
    ) -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        category_mappings::table
            .filter(category_mappings::category_id.eq(category_id_to_find))
            .order((
                category_mappings::priority.desc(),
                category_mappings::id.asc(),
            ))
            .load(conn)
    }

    /// Inserts a new category mapping.
    pub fn insert(new_mapping: NewCategoryMapping) -> Result<Self, diesel::result::Error> {
        let conn = &mut get_dbo();

        diesel::insert_into(category_mappings::table)
            .values(&new_mapping)
            .execute(conn)?; // Executes the insert

        // Fetch the newly inserted row. Ordering by ID desc is common but assumes sequential IDs.
        // Consider using `.returning()` or `.get_result()` if your backend supports it reliably
        // for returning the inserted row directly. MySQL support can be limited.
        category_mappings::table
            .order(category_mappings::id.desc())
            .first::<Self>(conn)
    }

    /// Updates an existing category mapping using an `UpdateCategoryMapping` changeset.
    /// Returns the updated mapping.
    pub fn update(changeset: &UpdateCategoryMapping) -> Result<Self, diesel::result::Error> {
        let conn = &mut get_dbo();

        // Use the changeset directly with diesel::update
        let rows_affected = diesel::update(category_mappings::table.find(changeset.id))
            .set(changeset) // AsChangeset handles setting only non-None fields
            .execute(conn)?;

        if rows_affected == 0 {
            Err(diesel::result::Error::NotFound)
        } else {
            // Fetch and return the updated mapping
            Self::find(changeset.id).and_then(|opt| opt.ok_or(diesel::result::Error::NotFound))
        }
    }

    /// Deletes a category mapping by its ID.
    /// Returns NotFound error if the mapping doesn't exist.
    pub fn delete(id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        let rows_affected = diesel::delete(category_mappings::table.find(id)).execute(conn)?;

        if rows_affected == 0 {
            Err(diesel::result::Error::NotFound)
        } else {
            Ok(())
        }
    }

    /// Counts the total number of category mappings.
    pub fn count() -> Result<i64, diesel::result::Error> {
        let conn = &mut get_dbo();
        category_mappings::table
            .select(count_star())
            .get_result(conn)
    }
}
