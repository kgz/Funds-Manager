use crate::modules::database::get_dbo;
use crate::modules::password::{hash_password, verify_password};
use crate::schema::users;
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::Serialize;

#[derive(Queryable, Selectable, Identifiable, Debug, Clone, Serialize)]
#[diesel(table_name = users)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct User {
    pub id: i64,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub created_at: NaiveDateTime,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = users)]
pub struct NewUser<'a> {
    pub email: &'a str,
    pub password_hash: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserPublic {
    pub id: i64,
    pub email: String,
}

impl From<User> for UserPublic {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            email: user.email,
        }
    }
}

impl User {
    pub fn count() -> Result<i64, diesel::result::Error> {
        let conn = &mut get_dbo();
        users::table.count().get_result(conn)
    }

    pub fn find_by_email(email: &str) -> Result<Option<User>, diesel::result::Error> {
        let conn = &mut get_dbo();
        users::table
            .filter(users::email.eq(email))
            .select(User::as_select())
            .first(conn)
            .optional()
    }

    pub fn find(id: i64) -> Result<Option<User>, diesel::result::Error> {
        let conn = &mut get_dbo();
        users::table
            .filter(users::id.eq(id))
            .select(User::as_select())
            .first(conn)
            .optional()
    }

    pub fn create(email: &str, password: &str) -> Result<User, String> {
        let password_hash = hash_password(password)?;
        let conn = &mut get_dbo();
        diesel::insert_into(users::table)
            .values(&NewUser {
                email,
                password_hash: &password_hash,
            })
            .returning(User::as_returning())
            .get_result(conn)
            .map_err(|error| error.to_string())
    }

    pub fn verify_login(email: &str, password: &str) -> Result<Option<User>, String> {
        let user = Self::find_by_email(email).map_err(|error| error.to_string())?;
        let Some(user) = user else {
            return Ok(None);
        };
        if verify_password(password, &user.password_hash) {
            Ok(Some(user))
        } else {
            Ok(None)
        }
    }
}
