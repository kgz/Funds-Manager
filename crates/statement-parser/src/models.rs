use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ParsedStatement {
    pub parser_name: String,
    pub account_id: String,
    pub statement_date: NaiveDate,
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
    pub opening_balance_cents: i32,
    pub closing_balance_cents: i32,
    pub transactions: Vec<ParsedTransaction>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ParsedTransaction {
    pub transaction_date: NaiveDate,
    pub description: String,
    pub amount_cents: i32,
    pub balance_cents: i32,
}
