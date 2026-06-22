use crate::modules::database::get_dbo;
use crate::schema::account_transfer_pairs;
use chrono::{NaiveDate, NaiveDateTime, Utc};
use diesel::prelude::*;
use diesel::sql_query;
use diesel::sql_types::{BigInt, Date, Integer, Nullable, Text, Timestamp};
use serde::{Deserialize, Serialize};

const MAX_DAY_GAP: i32 = 3;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TransferStatus {
    Suggested,
    Confirmed,
    Dismissed,
}

impl TransferStatus {
    fn as_str(self) -> &'static str {
        match self {
            Self::Suggested => "suggested",
            Self::Confirmed => "confirmed",
            Self::Dismissed => "dismissed",
        }
    }

    fn from_db(value: &str) -> Option<Self> {
        match value {
            "suggested" => Some(Self::Suggested),
            "confirmed" => Some(Self::Confirmed),
            "dismissed" => Some(Self::Dismissed),
            _ => None,
        }
    }
}

#[derive(Queryable, Selectable, Debug, Clone, Serialize)]
#[diesel(table_name = account_transfer_pairs)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct AccountTransferPair {
    pub id: i64,
    pub out_transaction_id: i64,
    pub in_transaction_id: i64,
    pub status: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Insertable)]
#[diesel(table_name = account_transfer_pairs)]
struct NewAccountTransferPair {
    out_transaction_id: i64,
    in_transaction_id: i64,
    status: String,
    created_at: NaiveDateTime,
    updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferTransactionSummary {
    pub id: i64,
    pub description: String,
    pub amount: i32,
    pub transaction_date: String,
    pub account_label: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferSuggestion {
    pub out_transaction: TransferTransactionSummary,
    pub in_transaction: TransferTransactionSummary,
    pub day_gap: i32,
    pub keyword_match: bool,
}

#[derive(Debug, QueryableByName)]
struct SuggestionRow {
    #[diesel(sql_type = BigInt)]
    out_id: i64,
    #[diesel(sql_type = Text)]
    out_description: String,
    #[diesel(sql_type = Integer)]
    out_amount: i32,
    #[diesel(sql_type = Timestamp)]
    out_date: NaiveDateTime,
    #[diesel(sql_type = Text)]
    out_account_label: String,
    #[diesel(sql_type = BigInt)]
    in_id: i64,
    #[diesel(sql_type = Text)]
    in_description: String,
    #[diesel(sql_type = Integer)]
    in_amount: i32,
    #[diesel(sql_type = Timestamp)]
    in_date: NaiveDateTime,
    #[diesel(sql_type = Text)]
    in_account_label: String,
    #[diesel(sql_type = Integer)]
    day_gap: i32,
}

fn transfer_keyword_match(out_description: &str, in_description: &str) -> bool {
    const KEYWORDS: &[&str] = &[
        "TRANSFER",
        "TFR",
        "OSKO",
        "PAYMENT TO",
        "INTERNAL",
        "PAY ANYONE",
    ];
    let haystack = format!(
        "{} {}",
        out_description.to_uppercase(),
        in_description.to_uppercase()
    );
    KEYWORDS.iter().any(|keyword| haystack.contains(keyword))
}

fn summary_from_row(
    id: i64,
    description: String,
    amount: i32,
    transaction_date: NaiveDateTime,
    account_label: String,
) -> TransferTransactionSummary {
    TransferTransactionSummary {
        id,
        description,
        amount,
        transaction_date: transaction_date.format("%Y-%m-%d").to_string(),
        account_label,
    }
}

pub struct AccountTransfer;

impl AccountTransfer {
    pub fn list_confirmed() -> Result<Vec<AccountTransferPair>, diesel::result::Error> {
        let conn = &mut get_dbo();
        account_transfer_pairs::table
            .filter(account_transfer_pairs::status.eq(TransferStatus::Confirmed.as_str()))
            .order(account_transfer_pairs::updated_at.desc())
            .load(conn)
    }

    pub fn detect_suggestions(
        financial_account_id: Option<i64>,
    ) -> Result<Vec<TransferSuggestion>, diesel::result::Error> {
        let conn = &mut get_dbo();
        let rows: Vec<SuggestionRow> = sql_query(
            r#"
            SELECT
                out_t.id AS out_id,
                out_t.description AS out_description,
                out_t.amount AS out_amount,
                out_t.transaction_date AS out_date,
                COALESCE(out_fa.display_name, out_s.account_id) AS out_account_label,
                in_t.id AS in_id,
                in_t.description AS in_description,
                in_t.amount AS in_amount,
                in_t.transaction_date AS in_date,
                COALESCE(in_fa.display_name, in_s.account_id) AS in_account_label,
                ABS((in_t.transaction_date::date - out_t.transaction_date::date))::integer AS day_gap
            FROM transaction_data out_t
            INNER JOIN statement out_s
                ON out_s.id = out_t.statement_id
               AND out_s.deleted_at IS NULL
            LEFT JOIN financial_accounts out_fa
                ON out_fa.id = out_s.financial_account_id
               AND out_fa.deleted_at IS NULL
            INNER JOIN transaction_data in_t
                ON in_t.amount = -out_t.amount
               AND in_t.deleted_at IS NULL
               AND in_t.id <> out_t.id
            INNER JOIN statement in_s
                ON in_s.id = in_t.statement_id
               AND in_s.deleted_at IS NULL
            LEFT JOIN financial_accounts in_fa
                ON in_fa.id = in_s.financial_account_id
               AND in_fa.deleted_at IS NULL
            WHERE out_t.deleted_at IS NULL
              AND out_t.amount < 0
              AND in_t.amount > 0
              AND COALESCE(out_s.financial_account_id, -out_s.id)
                  <> COALESCE(in_s.financial_account_id, -in_s.id)
              AND ABS((in_t.transaction_date::date - out_t.transaction_date::date)) <= $1
              AND ($2::bigint IS NULL OR out_s.financial_account_id = $2 OR in_s.financial_account_id = $2)
              AND NOT EXISTS (
                  SELECT 1 FROM account_transfer_pairs p
                  WHERE p.out_transaction_id = out_t.id
                     OR p.in_transaction_id = out_t.id
                     OR p.out_transaction_id = in_t.id
                     OR p.in_transaction_id = in_t.id
              )
            ORDER BY out_t.transaction_date DESC, out_t.id DESC, in_t.id DESC
            "#,
        )
        .bind::<Integer, _>(MAX_DAY_GAP)
        .bind::<Nullable<BigInt>, _>(financial_account_id)
        .load(conn)?;

        Ok(rows
            .into_iter()
            .map(|row| TransferSuggestion {
                keyword_match: transfer_keyword_match(&row.out_description, &row.in_description),
                day_gap: row.day_gap,
                out_transaction: summary_from_row(
                    row.out_id,
                    row.out_description,
                    row.out_amount,
                    row.out_date,
                    row.out_account_label,
                ),
                in_transaction: summary_from_row(
                    row.in_id,
                    row.in_description,
                    row.in_amount,
                    row.in_date,
                    row.in_account_label,
                ),
            })
            .collect())
    }

    pub fn confirm_pair(
        out_transaction_id: i64,
        in_transaction_id: i64,
    ) -> Result<AccountTransferPair, diesel::result::Error> {
        validate_pair(out_transaction_id, in_transaction_id)?;

        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();

        if let Some(existing) = find_by_transaction(conn, out_transaction_id)? {
            return update_status(conn, existing.id, TransferStatus::Confirmed, now);
        }
        if let Some(existing) = find_by_transaction(conn, in_transaction_id)? {
            return update_status(conn, existing.id, TransferStatus::Confirmed, now);
        }

        let pair = NewAccountTransferPair {
            out_transaction_id,
            in_transaction_id,
            status: TransferStatus::Confirmed.as_str().to_string(),
            created_at: now,
            updated_at: now,
        };

        diesel::insert_into(account_transfer_pairs::table)
            .values(&pair)
            .returning(AccountTransferPair::as_returning())
            .get_result(conn)
    }

    pub fn dismiss_pair(id: i64) -> Result<AccountTransferPair, diesel::result::Error> {
        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();
        update_status(conn, id, TransferStatus::Dismissed, now)
    }

    pub fn unlink(id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        let rows = diesel::delete(account_transfer_pairs::table.filter(account_transfer_pairs::id.eq(id)))
            .execute(conn)?;
        if rows == 0 {
            return Err(diesel::result::Error::NotFound);
        }
        Ok(())
    }

    pub fn dismiss_suggestion(
        out_transaction_id: i64,
        in_transaction_id: i64,
    ) -> Result<AccountTransferPair, diesel::result::Error> {
        validate_pair(out_transaction_id, in_transaction_id)?;

        let conn = &mut get_dbo();
        let now = Utc::now().naive_utc();

        if let Some(existing) = find_by_transaction(conn, out_transaction_id)? {
            return update_status(conn, existing.id, TransferStatus::Dismissed, now);
        }
        if let Some(existing) = find_by_transaction(conn, in_transaction_id)? {
            return update_status(conn, existing.id, TransferStatus::Dismissed, now);
        }

        let pair = NewAccountTransferPair {
            out_transaction_id,
            in_transaction_id,
            status: TransferStatus::Dismissed.as_str().to_string(),
            created_at: now,
            updated_at: now,
        };

        diesel::insert_into(account_transfer_pairs::table)
            .values(&pair)
            .returning(AccountTransferPair::as_returning())
            .get_result(conn)
    }

    pub fn transfer_status_for_transactions(
        transaction_ids: &[i64],
    ) -> Result<std::collections::HashMap<i64, String>, diesel::result::Error> {
        if transaction_ids.is_empty() {
            return Ok(std::collections::HashMap::new());
        }

        let conn = &mut get_dbo();
        let rows: Vec<(i64, i64, String)> = account_transfer_pairs::table
            .filter(
                account_transfer_pairs::out_transaction_id
                    .eq_any(transaction_ids)
                    .or(account_transfer_pairs::in_transaction_id.eq_any(transaction_ids)),
            )
            .select((
                account_transfer_pairs::out_transaction_id,
                account_transfer_pairs::in_transaction_id,
                account_transfer_pairs::status,
            ))
            .load(conn)?;

        let mut map = std::collections::HashMap::new();
        for (out_id, in_id, status) in rows {
            map.insert(out_id, status.clone());
            map.insert(in_id, status);
        }

        Ok(map)
    }
}

fn find_by_transaction(
    conn: &mut diesel::pg::PgConnection,
    transaction_id: i64,
) -> Result<Option<AccountTransferPair>, diesel::result::Error> {
    account_transfer_pairs::table
        .filter(
            account_transfer_pairs::out_transaction_id
                .eq(transaction_id)
                .or(account_transfer_pairs::in_transaction_id.eq(transaction_id)),
        )
        .first(conn)
        .optional()
}

fn update_status(
    conn: &mut diesel::pg::PgConnection,
    id: i64,
    status: TransferStatus,
    now: NaiveDateTime,
) -> Result<AccountTransferPair, diesel::result::Error> {
    diesel::update(account_transfer_pairs::table.filter(account_transfer_pairs::id.eq(id)))
        .set((
            account_transfer_pairs::status.eq(status.as_str()),
            account_transfer_pairs::updated_at.eq(now),
        ))
        .returning(AccountTransferPair::as_returning())
        .get_result(conn)
}

fn validate_pair(
    out_transaction_id: i64,
    in_transaction_id: i64,
) -> Result<(), diesel::result::Error> {
    if out_transaction_id == in_transaction_id {
        return Err(diesel::result::Error::NotFound);
    }

    #[derive(QueryableByName)]
    struct PairCheckRow {
        #[diesel(sql_type = Integer)]
        out_amount: i32,
        #[diesel(sql_type = Integer)]
        in_amount: i32,
        #[diesel(sql_type = BigInt)]
        out_account_id: i64,
        #[diesel(sql_type = BigInt)]
        in_account_id: i64,
        #[diesel(sql_type = Date)]
        out_date: NaiveDate,
        #[diesel(sql_type = Date)]
        in_date: NaiveDate,
    }

    let conn = &mut get_dbo();
    let row: PairCheckRow = sql_query(
        r#"
        SELECT
            out_t.amount AS out_amount,
            in_t.amount AS in_amount,
            COALESCE(out_s.financial_account_id, -out_s.id) AS out_account_id,
            COALESCE(in_s.financial_account_id, -in_s.id) AS in_account_id,
            out_t.transaction_date::date AS out_date,
            in_t.transaction_date::date AS in_date
        FROM transaction_data out_t
        INNER JOIN statement out_s ON out_s.id = out_t.statement_id AND out_s.deleted_at IS NULL
        INNER JOIN transaction_data in_t ON in_t.id = $2 AND in_t.deleted_at IS NULL
        INNER JOIN statement in_s ON in_s.id = in_t.statement_id AND in_s.deleted_at IS NULL
        WHERE out_t.id = $1
          AND out_t.deleted_at IS NULL
        "#,
    )
    .bind::<BigInt, _>(out_transaction_id)
    .bind::<BigInt, _>(in_transaction_id)
    .get_result(conn)?;

    if row.out_amount >= 0 || row.in_amount <= 0 || row.out_amount != -row.in_amount {
        return Err(diesel::result::Error::NotFound);
    }
    if row.out_account_id == row.in_account_id {
        return Err(diesel::result::Error::NotFound);
    }
    if (row.in_date - row.out_date).num_days().abs() > i64::from(MAX_DAY_GAP) {
        return Err(diesel::result::Error::NotFound);
    }

    Ok(())
}
