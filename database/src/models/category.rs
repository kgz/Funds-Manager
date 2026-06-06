use crate::models::transaction::Transaction;
use crate::modules::database::get_dbo;
use crate::schema::{categories, transaction_categories, transaction_data};
use chrono::{NaiveDateTime, Utc};
use diesel::pg::Pg;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

// --- Category Model ---

#[derive(
    Queryable,
    Selectable,
    Identifiable,
    Debug,
    Serialize,
    Deserialize,
    Clone,
    AsChangeset,
    Associations,
)]
#[diesel(belongs_to(Category, foreign_key = parent_category_id))]
#[diesel(table_name = categories)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub parent_category_id: Option<i64>,
    pub colour: Option<String>, // Added colour field
    pub created_at: NaiveDateTime,
    pub deleted_at: Option<NaiveDateTime>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = categories)]
pub struct NewCategory<'a> {
    pub name: &'a str,
    pub description: Option<&'a str>,
    pub parent_category_id: Option<i64>,
    pub colour: Option<&'a str>, // Added colour field
    pub created_at: NaiveDateTime,
}

// Helper type alias remains useful for clarity in some places
type BoxedCategoriesQuery<'a> = categories::BoxedQuery<'a, Pg>;

impl Category {
    /// Retrieves categories from the database, optionally including deleted ones.
    pub fn all(include_deleted: bool) -> Result<Vec<Category>, diesel::result::Error> {
        let conn = &mut get_dbo();
        let mut query = categories::table.into_boxed(); // into_boxed() returns BoxedQuery

        if !include_deleted {
            query = query.filter(categories::deleted_at.is_null());
        }

        query.select(Category::as_select()).load::<Category>(conn)
    }

    /// Finds a category by its ID, optionally including deleted ones.
    pub fn find(id: i64, include_deleted: bool) -> Result<Option<Category>, diesel::result::Error> {
        let conn = &mut get_dbo();
        let mut query = categories::table.filter(categories::id.eq(id)).into_boxed();

        if !include_deleted {
            query = query.filter(categories::deleted_at.is_null());
        }

        query
            .select(Category::as_select())
            .first::<Category>(conn)
            .optional()
    }

    /// Finds a category by its name (case-sensitive), optionally including deleted ones.
    pub fn find_by_name(
        name: &str,
        include_deleted: bool,
    ) -> Result<Option<Category>, diesel::result::Error> {
        let conn = &mut get_dbo();
        let mut query = categories::table
            .filter(categories::name.eq(name))
            .into_boxed();

        if !include_deleted {
            query = query.filter(categories::deleted_at.is_null());
        }

        query
            .select(Category::as_select())
            .first::<Category>(conn)
            .optional()
    }

    /// Retrieves top-level categories (those without a parent), optionally including deleted ones.
    pub fn find_top_level(include_deleted: bool) -> Result<Vec<Category>, diesel::result::Error> {
        let conn = &mut get_dbo();
        let mut query = categories::table
            .filter(categories::parent_category_id.is_null())
            .into_boxed();

        if !include_deleted {
            query = query.filter(categories::deleted_at.is_null());
        }

        query.select(Category::as_select()).load::<Category>(conn)
    }

    /// Retrieves direct subcategories for a given parent category ID, optionally including deleted ones.
    pub fn find_subcategories(
        parent_id: i64,
        include_deleted: bool,
    ) -> Result<Vec<Category>, diesel::result::Error> {
        let conn = &mut get_dbo();
        let mut query = categories::table
            .filter(categories::parent_category_id.eq(parent_id))
            .into_boxed();

        if !include_deleted {
            query = query.filter(categories::deleted_at.is_null());
        }

        query.select(Category::as_select()).load::<Category>(conn)
    }

    /// Inserts a new category into the database.
    pub fn insert(
        name: &str,
        description: Option<&str>,
        parent_category_id: Option<i64>,
        colour: Option<&str>, // Added colour parameter
    ) -> Result<Category, diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();

        let new_category = NewCategory {
            name,
            description,
            parent_category_id,
            colour, // Pass colour to NewCategory
            created_at: now,
        };

        diesel::insert_into(categories::table)
            .values(&new_category)
            .execute(conn)?;

        categories::table
            .filter(categories::name.eq(name))
            .select(Category::as_select()) // Select explicitly
            .order(categories::created_at.desc())
            .first(conn)
    }

    /// Updates an existing category.
    pub fn update(
        id: i64,
        name: Option<String>,
        description: Option<Option<String>>,
        parent_category_id: Option<Option<i64>>,
        colour: Option<Option<String>>, // Added colour parameter
    ) -> Result<Category, diesel::result::Error> {
        let conn = &mut get_dbo();

        #[derive(AsChangeset, Default, Debug)]
        #[diesel(table_name = categories)]
        struct CategoryChangeset {
            name: Option<String>,
            description: Option<Option<String>>,
            parent_category_id: Option<Option<i64>>,
            colour: Option<Option<String>>, // Added colour field
        }

        let changeset = CategoryChangeset {
            name,
            description,
            parent_category_id,
            colour,
        };

        diesel::update(categories::table.find(id))
            .set(&changeset)
            .execute(conn)?;

        Self::find(id, false).and_then(|opt| opt.ok_or(diesel::result::Error::NotFound))
        // find already uses select now
    }

    /// Soft deletes a category by setting its `deleted_at` field.
    pub fn delete(id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();
        diesel::update(categories::table.find(id))
            .set(categories::deleted_at.eq(now))
            .execute(conn)?;
        Ok(())
    }

    /// Reverts a soft delete by setting `deleted_at` to NULL.
    /// Returns NotFound error if the category doesn't exist or wasn't updated.
    /// Returns the reverted category on success.
    pub fn undelete(id: i64) -> Result<Category, diesel::result::Error> {
        let conn = &mut get_dbo();

        let rows_affected = diesel::update(categories::table.find(id))
            .set(categories::deleted_at.eq(None::<NaiveDateTime>)) // Set deleted_at to NULL
            .execute(conn)?;

        if rows_affected == 0 {
            // This could mean the ID didn't exist, or it wasn't deleted in the first place.
            // We'll try fetching it to distinguish, but NotFound is a reasonable default error.
            Self::find(id, false) // Try finding non-deleted first
                .and_then(|opt| opt.ok_or(diesel::result::Error::NotFound)) // If found non-deleted, return it (wasn't deleted). find uses select.
                .or_else(|_| Err(diesel::result::Error::NotFound)) // Otherwise, confirm NotFound
        } else {
            // Fetch and return the reverted category (it should exist and not be deleted now)
            Self::find(id, false).and_then(|opt| opt.ok_or(diesel::result::Error::NotFound))
            // find uses select. Should not fail if update succeeded.
        }
    }

    /// Retrieves all transactions associated with this category.
    pub fn get_transactions(&self) -> Result<Vec<Transaction>, diesel::result::Error> {
        let conn = &mut get_dbo();
        TransactionCategory::belonging_to(self)
            .inner_join(transaction_data::table)
            .select(Transaction::as_select())
            .load::<Transaction>(conn)
    }
}

// --- TransactionCategory Model (Join Table) ---
// ... (rest of the file remains the same) ...

#[derive(
    Queryable, Selectable, Identifiable, Associations, Debug, Serialize, Deserialize, Clone,
)]
#[diesel(belongs_to(Transaction))]
#[diesel(belongs_to(Category))]
#[diesel(table_name = transaction_categories)]
#[diesel(primary_key(id))]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct TransactionCategory {
    pub id: i64,
    pub transaction_id: i64,
    pub category_id: i64,
    pub created_at: NaiveDateTime,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = transaction_categories)]
pub struct NewTransactionCategory {
    pub transaction_id: i64,
    pub category_id: i64,
    pub created_at: NaiveDateTime,
}

impl TransactionCategory {
    /// Links a transaction to a category.
    pub fn link(transaction_id: i64, category_id: i64) -> Result<Self, diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();

        let new_link = NewTransactionCategory {
            transaction_id,
            category_id,
            created_at: now,
        };

        diesel::insert_into(transaction_categories::table)
            .values(&new_link)
            .execute(conn)?;

        transaction_categories::table
            .filter(transaction_categories::transaction_id.eq(transaction_id))
            .filter(transaction_categories::category_id.eq(category_id))
            .order(transaction_categories::created_at.desc())
            .first(conn)
    }

    /// Unlinks a transaction from a category.
    pub fn unlink(transaction_id: i64, category_id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        diesel::delete(
            transaction_categories::table
                .filter(transaction_categories::transaction_id.eq(transaction_id))
                .filter(transaction_categories::category_id.eq(category_id)),
        )
        .execute(conn)?;
        Ok(())
    }

    /// Finds all categories linked to a specific transaction, optionally including deleted categories.
    pub fn find_categories_for_transaction(
        transaction_id: i64,
        include_deleted: bool,
    ) -> Result<Vec<Category>, diesel::result::Error> {
        let conn = &mut get_dbo();

        // Let type inference work with into_boxed()
        let mut query = transaction_categories::table
            .filter(transaction_categories::transaction_id.eq(transaction_id))
            .inner_join(categories::table)
            .select(Category::as_select())
            .into_boxed(); // This returns the appropriate BoxedQuery type

        if !include_deleted {
            query = query.filter(categories::deleted_at.is_null());
        }

        query.load::<Category>(conn)
    }

    /// Finds all transactions linked to a specific category.
    pub fn find_transactions_for_category(
        category_id: i64,
    ) -> Result<Vec<Transaction>, diesel::result::Error> {
        let conn = &mut get_dbo();
        transaction_categories::table
            .filter(transaction_categories::category_id.eq(category_id))
            .inner_join(transaction_data::table)
            .select(Transaction::as_select())
            .load::<Transaction>(conn)
    }
}
