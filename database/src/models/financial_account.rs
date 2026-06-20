use crate::modules::database::get_dbo;
use crate::schema::{financial_accounts, statement};
use chrono::{NaiveDate, NaiveDateTime, Utc};
use diesel::prelude::*;
use diesel::sql_query;
use diesel::sql_types::{BigInt, Date};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
#[diesel(table_name = financial_accounts)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct FinancialAccount {
    pub id: i64,
    pub bank_name: String,
    pub display_name: String,
    pub account_number: String,
    pub parser_name: String,
    pub account_type: Option<String>,
    pub created_at: NaiveDateTime,
    pub deleted_at: Option<NaiveDateTime>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = financial_accounts)]
pub struct NewFinancialAccount<'a> {
    pub bank_name: &'a str,
    pub display_name: &'a str,
    pub account_number: &'a str,
    pub parser_name: &'a str,
    pub account_type: Option<&'a str>,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Clone)]
pub struct FinancialAccountSummary {
    pub id: i64,
    pub bank_name: String,
    pub display_name: String,
    pub account_number: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct FinancialAccountWithStats {
    #[serde(flatten)]
    pub account: FinancialAccount,
    pub statement_count: i64,
    #[serde(rename = "lastKnownBalance")]
    pub last_known_balance: Option<f64>,
    #[serde(rename = "lastKnownBalanceDate")]
    pub last_known_balance_date: Option<String>,
}

#[derive(QueryableByName, Debug)]
struct StatementCountRow {
    #[diesel(sql_type = BigInt)]
    financial_account_id: i64,
    #[diesel(sql_type = BigInt)]
    statement_count: i64,
}

#[derive(QueryableByName, Debug)]
struct LastKnownBalanceRow {
    #[diesel(sql_type = BigInt)]
    financial_account_id: i64,
    #[diesel(sql_type = BigInt)]
    balance_cents: i64,
    #[diesel(sql_type = Date)]
    balance_date: NaiveDate,
}

fn cents_to_dollars(cents: i64) -> f64 {
    cents as f64 / 100.0
}

fn round2(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}

fn load_statement_counts_by_account_id(
    conn: &mut impl diesel::connection::LoadConnection<Backend = diesel::pg::Pg>,
) -> Result<HashMap<i64, i64>, diesel::result::Error> {
    let rows = sql_query(
        r#"
        SELECT financial_account_id, COUNT(*)::bigint AS statement_count
        FROM statement
        WHERE deleted_at IS NULL
        GROUP BY financial_account_id
        "#,
    )
    .load::<StatementCountRow>(conn)?;

    Ok(rows
        .into_iter()
        .map(|row| (row.financial_account_id, row.statement_count))
        .collect())
}

fn load_last_known_balances_by_account_id(
    conn: &mut impl diesel::connection::LoadConnection<Backend = diesel::pg::Pg>,
) -> Result<HashMap<i64, (f64, String)>, diesel::result::Error> {
    let rows = sql_query(
        r#"
        SELECT DISTINCT ON (s.financial_account_id)
            s.financial_account_id,
            td.balance::bigint AS balance_cents,
            td.transaction_date::date AS balance_date
        FROM transaction_data td
        INNER JOIN statement s ON s.id = td.statement_id AND s.deleted_at IS NULL
        WHERE td.deleted_at IS NULL
          AND s.financial_account_id IS NOT NULL
        ORDER BY s.financial_account_id, td.transaction_date DESC, td.id DESC
        "#,
    )
    .load::<LastKnownBalanceRow>(conn)?;

    Ok(rows
        .into_iter()
        .map(|row| {
            (
                row.financial_account_id,
                (
                    round2(cents_to_dollars(row.balance_cents)),
                    row.balance_date.format("%Y-%m-%d").to_string(),
                ),
            )
        })
        .collect())
}

impl From<FinancialAccount> for FinancialAccountSummary {
    fn from(account: FinancialAccount) -> Self {
        Self {
            id: account.id,
            bank_name: account.bank_name,
            display_name: account.display_name,
            account_number: account.account_number,
        }
    }
}

pub fn default_bank_name(parser_name: &str) -> String {
    match parser_name {
        "heritage" => "Heritage".to_string(),
        "banksa" => "BankSA".to_string(),
        "peopleschoice" => "People's Choice".to_string(),
        other => {
            let mut chars = other.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().chain(chars).collect(),
            }
        }
    }
}

pub fn default_display_name(bank_name: &str, account_number: &str) -> String {
    let last4: String = account_number
        .chars()
        .rev()
        .take(4)
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    format!("{bank_name} {last4}")
}

impl FinancialAccount {
    pub fn all_active() -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        financial_accounts::table
            .filter(financial_accounts::deleted_at.is_null())
            .order((
                financial_accounts::bank_name.asc(),
                financial_accounts::display_name.asc(),
                financial_accounts::id.asc(),
            ))
            .select(FinancialAccount::as_select())
            .load(conn)
    }

    pub fn all_active_with_stats() -> Result<Vec<FinancialAccountWithStats>, diesel::result::Error> {
        let accounts = Self::all_active()?;
        let conn = &mut get_dbo();
        let statement_counts = load_statement_counts_by_account_id(conn)?;
        let last_balances = load_last_known_balances_by_account_id(conn)?;

        let rows = accounts
            .into_iter()
            .map(|account| {
                let statement_count = statement_counts.get(&account.id).copied().unwrap_or(0);
                let (last_known_balance, last_known_balance_date) = last_balances
                    .get(&account.id)
                    .map(|(balance, date)| (Some(*balance), Some(date.clone())))
                    .unwrap_or((None, None));
                FinancialAccountWithStats {
                    account,
                    statement_count,
                    last_known_balance,
                    last_known_balance_date,
                }
            })
            .collect();

        Ok(rows)
    }

    pub fn find(id: i64) -> Result<Option<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        financial_accounts::table
            .filter(financial_accounts::id.eq(id))
            .filter(financial_accounts::deleted_at.is_null())
            .select(FinancialAccount::as_select())
            .first(conn)
            .optional()
    }

    pub fn find_by_account_number(account_number: &str) -> Result<Option<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        financial_accounts::table
            .filter(financial_accounts::account_number.eq(account_number))
            .filter(financial_accounts::deleted_at.is_null())
            .order(financial_accounts::id.asc())
            .select(FinancialAccount::as_select())
            .first(conn)
            .optional()
    }

    pub fn find_by_parser_and_number(
        parser_name: &str,
        account_number: &str,
    ) -> Result<Option<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        financial_accounts::table
            .filter(financial_accounts::parser_name.eq(parser_name))
            .filter(financial_accounts::account_number.eq(account_number))
            .filter(financial_accounts::deleted_at.is_null())
            .select(FinancialAccount::as_select())
            .first(conn)
            .optional()
    }

    pub fn insert(
        bank_name: &str,
        display_name: &str,
        account_number: &str,
        parser_name: &str,
        account_type: Option<&str>,
    ) -> Result<Self, diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();
        let row = NewFinancialAccount {
            bank_name,
            display_name,
            account_number,
            parser_name,
            account_type,
            created_at: now,
        };
        diesel::insert_into(financial_accounts::table)
            .values(&row)
            .returning(FinancialAccount::as_returning())
            .get_result(conn)
    }

    pub fn find_or_create_for_import(
        parser_name: &str,
        account_number: &str,
    ) -> Result<Self, diesel::result::Error> {
        if let Some(existing) = Self::find_by_account_number(account_number)? {
            return Ok(existing);
        }
        if let Some(existing) = Self::find_by_parser_and_number(parser_name, account_number)? {
            return Ok(existing);
        }
        let bank_name = default_bank_name(parser_name);
        let display_name = default_display_name(&bank_name, account_number);
        Self::insert(
            &bank_name,
            &display_name,
            account_number,
            parser_name,
            None,
        )
    }

    pub fn update(
        id: i64,
        bank_name: Option<String>,
        display_name: Option<String>,
        account_type: Option<Option<String>>,
    ) -> Result<Self, diesel::result::Error> {
        let conn = &mut get_dbo();

        #[derive(AsChangeset, Default, Debug)]
        #[diesel(table_name = financial_accounts)]
        struct FinancialAccountChangeset {
            bank_name: Option<String>,
            display_name: Option<String>,
            account_type: Option<Option<String>>,
        }

        let changeset = FinancialAccountChangeset {
            bank_name,
            display_name,
            account_type,
        };

        diesel::update(
            financial_accounts::table
                .filter(financial_accounts::id.eq(id))
                .filter(financial_accounts::deleted_at.is_null()),
        )
        .set(&changeset)
        .execute(conn)?;

        Self::find(id).and_then(|opt| opt.ok_or(diesel::result::Error::NotFound))
    }

    pub fn delete(id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();
        let rows = diesel::update(
            financial_accounts::table
                .filter(financial_accounts::id.eq(id))
                .filter(financial_accounts::deleted_at.is_null()),
        )
        .set(financial_accounts::deleted_at.eq(now))
        .execute(conn)?;
        if rows > 0 {
            return Ok(());
        }
        Err(diesel::result::Error::NotFound)
    }

    pub fn summaries_by_statement_ids(
        statement_ids: &[i32],
    ) -> Result<std::collections::HashMap<i32, FinancialAccountSummary>, diesel::result::Error> {
        use std::collections::HashMap;

        if statement_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let conn = &mut get_dbo();
        let statement_ids_i64: Vec<i64> = statement_ids
            .iter()
            .filter_map(|id| i64::try_from(*id).ok())
            .collect();

        let rows: Vec<(i64, FinancialAccount)> = statement::table
            .inner_join(financial_accounts::table)
            .filter(statement::id.eq_any(statement_ids_i64))
            .filter(statement::deleted_at.is_null())
            .filter(financial_accounts::deleted_at.is_null())
            .select((statement::id, FinancialAccount::as_select()))
            .load(conn)?;

        let mut map = HashMap::new();
        for (statement_id, account) in rows {
            if let Ok(statement_id_i32) = i32::try_from(statement_id) {
                map.insert(statement_id_i32, FinancialAccountSummary::from(account));
            }
        }
        Ok(map)
    }

    pub fn summaries_for_ids(ids: &[i64]) -> Result<Vec<FinancialAccountSummary>, diesel::result::Error> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        let conn = &mut get_dbo();
        financial_accounts::table
            .filter(financial_accounts::id.eq_any(ids))
            .filter(financial_accounts::deleted_at.is_null())
            .select(FinancialAccount::as_select())
            .load::<FinancialAccount>(conn)
            .map(|rows| rows.into_iter().map(FinancialAccountSummary::from).collect())
    }
}
