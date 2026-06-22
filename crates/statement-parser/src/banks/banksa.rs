use chrono::{Datelike, NaiveDate};
use once_cell::sync::Lazy;
use regex::Regex;

use crate::utils::parse_currency_to_cents;
use crate::{BankStatementParser, ParseError, ParsedStatement, ParsedTransaction};

static RE_ACCOUNT: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"Account Number\s+(\d{6,12})").unwrap());
static RE_PERIOD: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"Statement Period\s+\d{2}/\d{2}/\d{4}\s+to\s+(\d{2}/\d{2}/\d{4})").unwrap()
});
static RE_PERIOD_START: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"Statement Period\s+(\d{2}/\d{2}/\d{4})\s+to\s+\d{2}/\d{2}/\d{4}").unwrap()
});
static RE_SUMMARY_BALANCES: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?m)^([\d,]+\.\d{2})\s+\+\s+[\d,]+\.\d{2}\s+-\s+[\d,]+\.\d{2}\s+=\s+([\d,]+\.\d{2})",
    )
    .unwrap()
});
static DATE_LINE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^\d{2}\s+[A-Z]{3}(\s|$)").unwrap());
static MONEY_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"[\d,]+\.\d{2}").unwrap());
static LOAN_REFERENCE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^S\.\d+\.\d+\.\d{2}$").unwrap());

struct TransactionRecord {
    primary_line: String,
    description_lines: Vec<String>,
}

pub struct BankSaParser;

impl BankStatementParser for BankSaParser {
    fn name(&self) -> &'static str {
        "banksa"
    }

    fn parse_pages(&self, pages: &[String]) -> Result<ParsedStatement, ParseError> {
        let combined: String = pages.join("\n");
        let first_page = pages
            .first()
            .ok_or(ParseError::MissingField("statement pages"))?;

        let account_id = extract_capture(&RE_ACCOUNT, first_page, "account_id")?;
        let statement_date = parse_period_end_date(first_page)?;
        let period_start = parse_period_start_date(first_page)?;

        let (opening_balance_cents, summary_closing_cents) =
            extract_summary_balances(&combined).unwrap_or((0, None));

        let mut running_balance_cents = opening_balance_cents;
        let mut transactions = Vec::new();

        for page in pages {
            if !page.contains("Transaction Details") {
                continue;
            }

            for record in collect_transaction_records(page) {
                let transaction = match parse_transaction_record(
                    &record.primary_line,
                    &record.description_lines,
                    running_balance_cents,
                    period_start,
                    statement_date,
                )? {
                    Some(transaction) => transaction,
                    None => continue,
                };

                if record.primary_line.contains("OPENING BALANCE") {
                    running_balance_cents = transaction.balance_cents;
                    continue;
                }

                running_balance_cents = transaction.balance_cents;
                transactions.push(transaction);
            }
        }

        let closing_balance_cents = summary_closing_cents.unwrap_or(running_balance_cents);

        Ok(ParsedStatement {
            parser_name: self.name().to_string(),
            account_id,
            statement_date,
            period_start,
            period_end: statement_date,
            opening_balance_cents,
            closing_balance_cents,
            transactions,
        })
    }
}

fn collect_transaction_records(page: &str) -> Vec<TransactionRecord> {
    let mut records = Vec::new();
    let mut current_primary: Option<String> = None;
    let mut description_lines: Vec<String> = Vec::new();

    for raw_line in page.lines() {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }

        if should_end_current_record(line) {
            flush_transaction_record(&mut records, &mut current_primary, &mut description_lines);
            continue;
        }

        if should_skip_line(line) || is_loan_reference_line(line) {
            continue;
        }

        if DATE_LINE_RE.is_match(line) {
            flush_transaction_record(&mut records, &mut current_primary, &mut description_lines);
            current_primary = Some(line.to_string());
            continue;
        }

        if current_primary.is_some() && !is_noise_continuation(line) {
            description_lines.push(line.to_string());
        }
    }

    flush_transaction_record(&mut records, &mut current_primary, &mut description_lines);
    records
}

fn flush_transaction_record(
    records: &mut Vec<TransactionRecord>,
    current_primary: &mut Option<String>,
    description_lines: &mut Vec<String>,
) {
    let Some(primary_line) = current_primary.take() else {
        description_lines.clear();
        return;
    };
    records.push(TransactionRecord {
        primary_line,
        description_lines: std::mem::take(description_lines),
    });
}

fn is_loan_reference_line(line: &str) -> bool {
    LOAN_REFERENCE_RE.is_match(line.trim())
}

fn extract_capture(regex: &Regex, text: &str, context: &'static str) -> Result<String, ParseError> {
    regex
        .captures(text)
        .and_then(|captures| captures.get(1))
        .map(|capture| capture.as_str().to_string())
        .ok_or(ParseError::MissingField(context))
}

fn parse_period_end_date(text: &str) -> Result<NaiveDate, ParseError> {
    let raw = extract_capture(&RE_PERIOD, text, "statement_period_end")?;
    NaiveDate::parse_from_str(&raw, "%d/%m/%Y").map_err(|_| ParseError::InvalidField {
        context: "statement_period_end",
        value: raw,
    })
}

fn parse_period_start_date(text: &str) -> Result<NaiveDate, ParseError> {
    let raw = extract_capture(&RE_PERIOD_START, text, "statement_period_start")?;
    NaiveDate::parse_from_str(&raw, "%d/%m/%Y").map_err(|_| ParseError::InvalidField {
        context: "statement_period_start",
        value: raw,
    })
}

fn extract_summary_balances(text: &str) -> Option<(i32, Option<i32>)> {
    let captures = RE_SUMMARY_BALANCES.captures(text)?;
    let opening = parse_currency_to_cents(&captures[1], "opening_balance").ok()?;
    let closing = parse_currency_to_cents(&captures[2], "closing_balance").ok()?;
    Some((opening, Some(closing)))
}

fn should_end_current_record(line: &str) -> bool {
    line.contains("CLOSING BALANCE")
        || line.contains("SUB TOTAL CARRIED FORWARD")
        || line.starts_with("Interest & Withholding")
        || line.starts_with("Summary of Transaction")
}

fn should_skip_line(line: &str) -> bool {
    line.contains("Transaction Details")
        || line.starts_with("Date ")
        || line.starts_with("EFFECTIVE DATE")
        || should_end_current_record(line)
}

fn is_noise_continuation(line: &str) -> bool {
    let trimmed = line.trim();
    if trimmed.is_empty() || is_loan_reference_line(trimmed) {
        return true;
    }

    if is_amount_only_line(trimmed) {
        return true;
    }

    trimmed.starts_with('•')
        || trimmed.starts_with("Interest")
        || trimmed.starts_with("Financial Year")
        || trimmed.starts_with("Credit Interest")
        || trimmed.starts_with("Debit Interest")
        || trimmed.contains("Withholding Tax")
        || trimmed.starts_with("Information")
        || trimmed.starts_with("Please check")
        || trimmed.starts_with("If your card")
        || trimmed.starts_with("This statement")
        || trimmed.starts_with("When enquiring")
        || trimmed.starts_with("To contact us")
}

fn is_amount_only_line(line: &str) -> bool {
    let trimmed = line.trim();
    MONEY_RE.is_match(trimmed)
        && trimmed
            .chars()
            .all(|ch| ch.is_ascii_digit() || matches!(ch, ',' | '.'))
}

fn parse_transaction_record(
    primary_line: &str,
    description_lines: &[String],
    running_balance_cents: i32,
    period_start: NaiveDate,
    period_end: NaiveDate,
) -> Result<Option<ParsedTransaction>, ParseError> {
    let Some(date_match) = DATE_LINE_RE.find(primary_line) else {
        return Ok(None);
    };

    let date_prefix = date_match.as_str().trim();
    let money_matches: Vec<_> = MONEY_RE.find_iter(primary_line).collect();
    let Some(balance_match) = money_matches.last() else {
        return Ok(None);
    };

    let balance_cents = parse_currency_to_cents(balance_match.as_str(), "transaction_balance")?;

    let mut description = if money_matches.len() >= 2 {
        let penultimate = money_matches[money_matches.len() - 2];
        primary_line[date_match.end()..penultimate.start()]
            .trim()
            .to_string()
    } else {
        primary_line[date_match.end()..balance_match.start()]
            .trim()
            .to_string()
    };

    for extra in description_lines {
        let extra = extra.trim();
        if extra.is_empty() || is_loan_reference_line(extra) {
            continue;
        }
        if !description.is_empty() {
            description.push(' ');
        }
        description.push_str(extra);
    }

    description = normalize_description(&description);
    if description.is_empty() {
        return Ok(None);
    }

    let transaction_date = parse_day_month_date(date_prefix, period_start, period_end)?;
    let amount_cents = balance_cents - running_balance_cents;

    Ok(Some(ParsedTransaction {
        transaction_date,
        description,
        amount_cents,
        balance_cents,
    }))
}

fn normalize_description(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn parse_day_month_date(
    day_month: &str,
    period_start: NaiveDate,
    period_end: NaiveDate,
) -> Result<NaiveDate, ParseError> {
    let mut parts = day_month.split_whitespace();
    let day: u32 = parts
        .next()
        .ok_or(ParseError::MissingField("transaction_day"))?
        .parse()
        .map_err(|_| ParseError::InvalidField {
            context: "transaction_day",
            value: day_month.to_string(),
        })?;
    let month_abbr = parts
        .next()
        .ok_or(ParseError::MissingField("transaction_month"))?
        .to_ascii_uppercase();

    let month = match month_abbr.as_str() {
        "JAN" => 1,
        "FEB" => 2,
        "MAR" => 3,
        "APR" => 4,
        "MAY" => 5,
        "JUN" => 6,
        "JUL" => 7,
        "AUG" => 8,
        "SEP" => 9,
        "OCT" => 10,
        "NOV" => 11,
        "DEC" => 12,
        other => {
            return Err(ParseError::InvalidField {
                context: "transaction_month",
                value: other.to_string(),
            });
        }
    };

    for year in [period_start.year(), period_end.year()] {
        if let Some(date) = NaiveDate::from_ymd_opt(year, month, day) {
            if date >= period_start && date <= period_end {
                return Ok(date);
            }
        }
    }

    NaiveDate::from_ymd_opt(period_end.year(), month, day).ok_or(ParseError::InvalidField {
        context: "transaction_date",
        value: day_month.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;

    const SAMPLE_PAGE: &str = r#"Account Number 	045692740
Statement Period 	20/12/2024 to 19/06/2025
Opening Balance 	Total Credits 	Total Debits 	Closing Balance
1,572.78 	+ 	14,800.00 	- 	13,962.76 	= 	2,410.02
Transaction Details
Date 	Transaction Description 	Debit 	Credit 	Balance $
20 DEC 	OPENING BALANCE 	1,572.78
27 DEC 	LOAN REPAYMENT 	354.00 	1,218.78
S.514.2620772.00
30 DEC 	OSKO DEPOSIT 	29DEC 17:44 	2,000.00 	3,218.78
MATHEW FRAYNE
19 JUN 	CLOSING BALANCE 	2,410.02
"#;

    const SHANNONS_SNIPPET: &str = r#"Account Number 	045692740
Statement Period 	20/12/2024 to 19/06/2025
Transaction Details
Date 	Transaction Description 	Debit 	Credit 	Balance $
29 MAY 	LOAN REPAYMENT 	499.00 	2,052.48
S.514.2620772.00
05 JUN 	LOAN REPAYMENT 	499.00 	1,553.48
S.514.2620772.00
10 JUN 	SHANNONS PTY LIM 	145.46 	1,408.02
SCM012464470
"#;

    #[test]
    fn parses_sample_page_text() {
        let parser = BankSaParser;
        let statement = parser
            .parse_pages(&[SAMPLE_PAGE.to_string()])
            .expect("parse");

        assert_eq!(statement.account_id, "045692740");
        assert_eq!(
            statement.statement_date,
            NaiveDate::from_ymd_opt(2025, 6, 19).unwrap()
        );
        assert_eq!(
            statement.period_start,
            NaiveDate::from_ymd_opt(2024, 12, 20).unwrap()
        );
        assert_eq!(
            statement.period_end,
            NaiveDate::from_ymd_opt(2025, 6, 19).unwrap()
        );
        assert_eq!(statement.opening_balance_cents, 157_278);
        assert_eq!(statement.closing_balance_cents, 241_002);
        assert_eq!(statement.transactions.len(), 2);

        assert_eq!(statement.transactions[0].description, "LOAN REPAYMENT");
        assert_eq!(statement.transactions[0].amount_cents, -35_400);
        assert_eq!(
            statement.transactions[1].description,
            "OSKO DEPOSIT 29DEC 17:44 MATHEW FRAYNE"
        );
        assert_eq!(statement.transactions[1].amount_cents, 200_000);
    }

    #[test]
    fn parses_shannons_with_reference_line_and_correct_debit() {
        let parser = BankSaParser;
        let statement = parser
            .parse_pages(&[SHANNONS_SNIPPET.to_string()])
            .expect("parse");

        assert_eq!(statement.transactions.len(), 3);

        let loan = &statement.transactions[1];
        assert_eq!(loan.description, "LOAN REPAYMENT");
        assert_eq!(loan.amount_cents, -49_900);
        assert_eq!(loan.balance_cents, 155_348);

        let shannons = &statement.transactions[2];
        assert_eq!(shannons.description, "SHANNONS PTY LIM SCM012464470");
        assert_eq!(shannons.amount_cents, -14_546);
        assert_eq!(shannons.balance_cents, 140_802);
    }
}
