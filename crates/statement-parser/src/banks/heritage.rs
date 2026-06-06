use chrono::NaiveDate;
use once_cell::sync::Lazy;
use regex::Regex;

use crate::utils::{
    combine_multiline_records, merge_wrapped_statement_lines, normalize_short_statement_date,
    parse_currency_to_cents,
};
use crate::{BankStatementParser, ParseError, ParsedStatement, ParsedTransaction};

static RE_ACCOUNT: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"ACCOUNT NO ACCOUNT\r?\n(\d{7,9})").unwrap());
static RE_DATE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"STATEMENT PERIOD ENDING (\d{2}/\d{2}/\d{4})").unwrap());
static RE_BALANCE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"OPENING BALANCE (\$?[\d,]+\.\d{2})").unwrap());
static DATE_LINE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^\d{2}(?:[A-Za-z]\s*){3}\d{2}").unwrap());
static TX_RE_DESCRIPTION_FIRST: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?x)
        ^\s*
        (?P<date>\d{2}(?:[A-Za-z]\s*){3}\d{2})\s+
        (?P<description>.+?)\s+
        (?:
            \$?(?P<debit>[\d,]+\.\d{2})\s+
        )?
        \$?(?P<balance>[\d,]+\.\d{2})
        (?:\s+(?P<trailing>.+))?$
        ",
    )
    .unwrap()
});
static TX_RE_AMOUNTS_FIRST: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?x)
        ^\s*
        (?P<date>\d{2}(?:[A-Za-z]\s*){3}\d{2})\s+
        (?:\$?(?P<debit>[\d,]+\.\d{2})\s+)?
        \$?(?P<balance>[\d,]+\.\d{2})\s+
        (?P<description>.+?)
        (?:\s+(?P<trailing>.+))?$
        ",
    )
    .unwrap()
});

pub struct HeritageBankParser;

impl BankStatementParser for HeritageBankParser {
    fn name(&self) -> &'static str {
        "heritage"
    }

    fn parse_pages(&self, pages: &[String]) -> Result<ParsedStatement, ParseError> {
        let first_page = pages
            .first()
            .ok_or(ParseError::MissingField("statement pages"))?;

        let account_id = extract_capture(&RE_ACCOUNT, first_page, "account_id")?;
        let statement_date = {
            let raw_date = extract_capture(&RE_DATE, first_page, "statement_date")?;

            NaiveDate::parse_from_str(&raw_date, "%d/%m/%Y").map_err(|_| {
                ParseError::InvalidField {
                    context: "statement_date",
                    value: raw_date,
                }
            })?
        };
        let opening_balance_cents = match RE_BALANCE.captures(first_page) {
            Some(captures) => parse_currency_to_cents(&captures[1], "opening_balance")?,
            None => 0,
        };

        let mut running_balance_cents = opening_balance_cents;
        let mut transactions = Vec::new();

        for page in pages {
            let combined_lines =
                merge_wrapped_statement_lines(combine_multiline_records(page, |line| {
                    DATE_LINE_RE.is_match(line)
                }));

            for line in combined_lines {
                if line.contains("OPENING BALANCE") || line.contains("CURRENT BALANCE") {
                    continue;
                }

                let transaction = match parse_transaction_line(&line, running_balance_cents)? {
                    Some(transaction) => transaction,
                    None => continue,
                };

                running_balance_cents = transaction.balance_cents;
                transactions.push(transaction);
            }
        }

        Ok(ParsedStatement {
            parser_name: self.name().to_string(),
            account_id,
            statement_date,
            opening_balance_cents,
            closing_balance_cents: running_balance_cents,
            transactions,
        })
    }
}

fn extract_capture(regex: &Regex, text: &str, context: &'static str) -> Result<String, ParseError> {
    regex
        .captures(text)
        .and_then(|captures| captures.get(1))
        .map(|capture| capture.as_str().to_string())
        .ok_or(ParseError::MissingField(context))
}

fn parse_transaction_line(
    line: &str,
    running_balance_cents: i32,
) -> Result<Option<ParsedTransaction>, ParseError> {
    let captures = match TX_RE_DESCRIPTION_FIRST
        .captures(line)
        .or_else(|| TX_RE_AMOUNTS_FIRST.captures(line))
    {
        Some(captures) => captures,
        None => return Ok(None),
    };

    let raw_date = captures
        .name("date")
        .map(|value| value.as_str())
        .unwrap_or("");
    let transaction_date =
        NaiveDate::parse_from_str(&normalize_short_statement_date(raw_date), "%d%b%y").map_err(
            |_| ParseError::InvalidField {
                context: "transaction_date",
                value: raw_date.to_string(),
            },
        )?;

    let mut description = captures
        .name("description")
        .map(|value| value.as_str().trim().to_string())
        .unwrap_or_default();

    if let Some(trailing) = captures.name("trailing") {
        let trailing = trailing.as_str().trim();
        if !trailing.is_empty() {
            description.push(' ');
            description.push_str(trailing);
        }
    }

    if description.is_empty() {
        return Ok(None);
    }

    let balance_value = captures
        .name("balance")
        .map(|value| value.as_str())
        .ok_or(ParseError::MissingField("transaction_balance"))?;
    let balance_cents = parse_currency_to_cents(balance_value, "transaction_balance")?;
    let amount_cents = balance_cents - running_balance_cents;

    Ok(Some(ParsedTransaction {
        transaction_date,
        description,
        amount_cents,
        balance_cents,
    }))
}

#[cfg(test)]
mod tests {
    use super::parse_transaction_line;

    #[test]
    fn parses_wrapped_eftpos_line_with_trailing_continuation_text() {
        let line = "01MAR25 EFTPOSPURCHASEJMSBEEF CO PTY $37.00 $5,263.99 LTD B 5041";
        let parsed = parse_transaction_line(line, 530_099)
            .expect("parse")
            .expect("some");

        assert!(parsed.description.contains("LTD B 5041"));
    }
}
