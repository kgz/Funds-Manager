use crate::models::financial_account::FinancialAccount;
use crate::modules::database::get_dbo;
use crate::schema::{liabilities, liability_balances};
use chrono::{NaiveDate, NaiveDateTime, Utc};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

pub const LIABILITY_KINDS: [&str; 7] = [
    "home_loan",
    "car_loan",
    "personal_loan",
    "credit_card",
    "bnpl",
    "hecs",
    "other",
];

pub fn is_valid_kind(kind: &str) -> bool {
    LIABILITY_KINDS.contains(&kind)
}

pub fn is_valid_rate_type(value: &str) -> bool {
    matches!(value, "fixed" | "variable")
}

pub fn is_valid_frequency(value: &str) -> bool {
    matches!(value, "weekly" | "fortnightly" | "monthly")
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
#[diesel(table_name = liabilities)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Liability {
    pub id: i64,
    pub name: String,
    pub kind: String,
    pub lender: Option<String>,
    pub balance_cents: i64,
    pub credit_limit_cents: Option<i64>,
    pub original_amount_cents: Option<i64>,
    pub interest_rate_bps: Option<i32>,
    pub rate_type: Option<String>,
    pub repayment_cents: Option<i64>,
    pub repayment_frequency: Option<String>,
    pub term_months: Option<i32>,
    pub financial_account_id: Option<i64>,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub deleted_at: Option<NaiveDateTime>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = liabilities)]
struct NewLiability<'a> {
    name: &'a str,
    kind: &'a str,
    lender: Option<&'a str>,
    balance_cents: i64,
    credit_limit_cents: Option<i64>,
    original_amount_cents: Option<i64>,
    interest_rate_bps: Option<i32>,
    rate_type: Option<&'a str>,
    repayment_cents: Option<i64>,
    repayment_frequency: Option<&'a str>,
    term_months: Option<i32>,
    financial_account_id: Option<i64>,
    notes: Option<&'a str>,
    created_at: NaiveDateTime,
}

pub struct LiabilityInput<'a> {
    pub name: &'a str,
    pub kind: &'a str,
    pub lender: Option<&'a str>,
    pub balance_cents: i64,
    pub credit_limit_cents: Option<i64>,
    pub original_amount_cents: Option<i64>,
    pub interest_rate_bps: Option<i32>,
    pub rate_type: Option<&'a str>,
    pub repayment_cents: Option<i64>,
    pub repayment_frequency: Option<&'a str>,
    pub term_months: Option<i32>,
    pub financial_account_id: Option<i64>,
    pub notes: Option<&'a str>,
    pub originated_date: Option<NaiveDate>,
}

#[derive(Debug, Default, AsChangeset)]
#[diesel(table_name = liabilities)]
pub struct LiabilityChanges<'a> {
    pub name: Option<&'a str>,
    pub kind: Option<&'a str>,
    pub lender: Option<Option<&'a str>>,
    pub balance_cents: Option<i64>,
    pub credit_limit_cents: Option<Option<i64>>,
    pub original_amount_cents: Option<Option<i64>>,
    pub interest_rate_bps: Option<Option<i32>>,
    pub rate_type: Option<Option<&'a str>>,
    pub repayment_cents: Option<Option<i64>>,
    pub repayment_frequency: Option<Option<&'a str>>,
    pub term_months: Option<Option<i32>>,
    pub financial_account_id: Option<Option<i64>>,
    pub notes: Option<Option<&'a str>>,
}

#[derive(Debug, Serialize)]
pub struct LiabilityListResponse {
    pub items: Vec<Liability>,
    pub total_balance_cents: i64,
}

#[derive(Queryable, Selectable, Identifiable, Debug, Serialize, Clone)]
#[diesel(table_name = liability_balances)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct LiabilityBalance {
    pub id: i64,
    pub liability_id: i64,
    pub balanced_at: NaiveDate,
    pub balance_cents: i64,
    pub source: Option<String>,
    pub created_at: NaiveDateTime,
    pub deleted_at: Option<NaiveDateTime>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = liability_balances)]
struct NewLiabilityBalance<'a> {
    liability_id: i64,
    balanced_at: NaiveDate,
    balance_cents: i64,
    source: Option<&'a str>,
    created_at: NaiveDateTime,
}

pub struct LiabilityBalanceInput<'a> {
    pub balanced_at: NaiveDate,
    pub balance_cents: i64,
    pub source: Option<&'a str>,
}

type Conn = crate::modules::database::DbConn;

fn ensure_account_exists(account_id: i64) -> Result<(), diesel::result::Error> {
    FinancialAccount::find(account_id)?.ok_or(diesel::result::Error::NotFound)?;
    Ok(())
}

fn insert_balance_row(
    conn: &mut Conn,
    liability_id: i64,
    balanced_at: NaiveDate,
    balance_cents: i64,
    source: Option<&str>,
) -> Result<LiabilityBalance, diesel::result::Error> {
    let row = NewLiabilityBalance {
        liability_id,
        balanced_at,
        balance_cents,
        source,
        created_at: Utc::now().naive_utc(),
    };
    diesel::insert_into(liability_balances::table)
        .values(&row)
        .returning(LiabilityBalance::as_returning())
        .get_result(conn)
}

fn recompute_current(conn: &mut Conn, liability_id: i64) -> Result<(), diesel::result::Error> {
    let latest: Option<i64> = liability_balances::table
        .filter(liability_balances::liability_id.eq(liability_id))
        .filter(liability_balances::deleted_at.is_null())
        .order((
            liability_balances::balanced_at.desc(),
            liability_balances::id.desc(),
        ))
        .select(liability_balances::balance_cents)
        .first(conn)
        .optional()?;

    if let Some(balance_cents) = latest {
        diesel::update(liabilities::table.filter(liabilities::id.eq(liability_id)))
            .set(liabilities::balance_cents.eq(balance_cents))
            .execute(conn)?;
    }
    Ok(())
}

impl Liability {
    pub fn list_active() -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        liabilities::table
            .filter(liabilities::deleted_at.is_null())
            .order((
                liabilities::kind.asc(),
                liabilities::name.asc(),
                liabilities::id.asc(),
            ))
            .select(Liability::as_select())
            .load(conn)
    }

    pub fn list_with_total() -> Result<LiabilityListResponse, diesel::result::Error> {
        let items = Self::list_active()?;
        let total_balance_cents = items.iter().map(|item| item.balance_cents).sum();
        Ok(LiabilityListResponse {
            items,
            total_balance_cents,
        })
    }

    pub fn find_active(id: i64) -> Result<Option<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        liabilities::table
            .filter(liabilities::id.eq(id))
            .filter(liabilities::deleted_at.is_null())
            .select(Liability::as_select())
            .first(conn)
            .optional()
    }

    pub fn insert(input: LiabilityInput<'_>) -> Result<Self, diesel::result::Error> {
        if let Some(account_id) = input.financial_account_id {
            ensure_account_exists(account_id)?;
        }
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();
        conn.transaction(|conn| {
            let row = NewLiability {
                name: input.name,
                kind: input.kind,
                lender: input.lender,
                balance_cents: input.balance_cents,
                credit_limit_cents: input.credit_limit_cents,
                original_amount_cents: input.original_amount_cents,
                interest_rate_bps: input.interest_rate_bps,
                rate_type: input.rate_type,
                repayment_cents: input.repayment_cents,
                repayment_frequency: input.repayment_frequency,
                term_months: input.term_months,
                financial_account_id: input.financial_account_id,
                notes: input.notes,
                created_at: now,
            };
            let liability: Liability = diesel::insert_into(liabilities::table)
                .values(&row)
                .returning(Liability::as_returning())
                .get_result(conn)?;

            insert_balance_row(
                conn,
                liability.id,
                now.date(),
                input.balance_cents,
                None,
            )?;

            if let (Some(amount), Some(date)) = (input.original_amount_cents, input.originated_date)
            {
                insert_balance_row(conn, liability.id, date, amount, Some("Originated"))?;
            }

            recompute_current(conn, liability.id)?;
            liabilities::table
                .filter(liabilities::id.eq(liability.id))
                .select(Liability::as_select())
                .first(conn)
        })
    }

    pub fn update(
        id: i64,
        changes: LiabilityChanges<'_>,
    ) -> Result<Self, diesel::result::Error> {
        if let Some(Some(account_id)) = changes.financial_account_id {
            ensure_account_exists(account_id)?;
        }
        let conn = &mut get_dbo();
        diesel::update(
            liabilities::table
                .filter(liabilities::id.eq(id))
                .filter(liabilities::deleted_at.is_null()),
        )
        .set(&changes)
        .returning(Liability::as_returning())
        .get_result(conn)
    }

    pub fn soft_delete(id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        let updated = diesel::update(
            liabilities::table
                .filter(liabilities::id.eq(id))
                .filter(liabilities::deleted_at.is_null()),
        )
        .set(liabilities::deleted_at.eq(Some(Utc::now().naive_utc())))
        .execute(conn)?;
        if updated == 0 {
            return Err(diesel::result::Error::NotFound);
        }
        Ok(())
    }
}

impl LiabilityBalance {
    pub fn list_for_liability(liability_id: i64) -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        liability_balances::table
            .filter(liability_balances::liability_id.eq(liability_id))
            .filter(liability_balances::deleted_at.is_null())
            .order((
                liability_balances::balanced_at.desc(),
                liability_balances::id.desc(),
            ))
            .select(LiabilityBalance::as_select())
            .load(conn)
    }

    pub fn create(
        liability_id: i64,
        input: LiabilityBalanceInput<'_>,
    ) -> Result<Self, diesel::result::Error> {
        let conn = &mut get_dbo();
        conn.transaction(|conn| {
            let row = insert_balance_row(
                conn,
                liability_id,
                input.balanced_at,
                input.balance_cents,
                input.source,
            )?;
            recompute_current(conn, liability_id)?;
            Ok(row)
        })
    }

    pub fn soft_delete(liability_id: i64, id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        conn.transaction(|conn| {
            let updated = diesel::update(
                liability_balances::table
                    .filter(liability_balances::id.eq(id))
                    .filter(liability_balances::liability_id.eq(liability_id))
                    .filter(liability_balances::deleted_at.is_null()),
            )
            .set(liability_balances::deleted_at.eq(Some(Utc::now().naive_utc())))
            .execute(conn)?;
            if updated == 0 {
                return Err(diesel::result::Error::NotFound);
            }
            recompute_current(conn, liability_id)?;
            Ok(())
        })
    }

    pub fn active_points() -> Result<Vec<(i64, NaiveDate, i64)>, diesel::result::Error> {
        let conn = &mut get_dbo();
        liability_balances::table
            .inner_join(liabilities::table)
            .filter(liability_balances::deleted_at.is_null())
            .filter(liabilities::deleted_at.is_null())
            .order((
                liability_balances::liability_id.asc(),
                liability_balances::balanced_at.asc(),
                liability_balances::id.asc(),
            ))
            .select((
                liability_balances::liability_id,
                liability_balances::balanced_at,
                liability_balances::balance_cents,
            ))
            .load(conn)
    }
}

#[cfg(test)]
mod tests {
    use super::{is_valid_frequency, is_valid_kind, is_valid_rate_type};

    #[test]
    fn valid_kinds_accepted() {
        assert!(is_valid_kind("home_loan"));
        assert!(is_valid_kind("credit_card"));
        assert!(is_valid_kind("other"));
    }

    #[test]
    fn invalid_kind_rejected() {
        assert!(!is_valid_kind("mortgage"));
        assert!(!is_valid_kind(""));
    }

    #[test]
    fn rate_type_validation() {
        assert!(is_valid_rate_type("fixed"));
        assert!(is_valid_rate_type("variable"));
        assert!(!is_valid_rate_type("teaser"));
    }

    #[test]
    fn frequency_validation() {
        assert!(is_valid_frequency("weekly"));
        assert!(is_valid_frequency("fortnightly"));
        assert!(is_valid_frequency("monthly"));
        assert!(!is_valid_frequency("daily"));
    }
}
