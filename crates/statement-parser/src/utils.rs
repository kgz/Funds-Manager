use crate::ParseError;
use once_cell::sync::Lazy;
use regex::Regex;

static SHORT_TX_DATE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(?P<day>\d{2})(?P<month>(?:[A-Za-z]\s*){3})(?P<year>\d{2})$").unwrap()
});

static MONEY_TOKEN_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\$?[\d,]+\.\d{2}").unwrap());

pub(crate) fn combine_multiline_records<F>(text: &str, is_record_start: F) -> Vec<String>
where
    F: Fn(&str) -> bool,
{
    let mut records = Vec::new();
    let mut buffer = String::new();

    for raw_line in text.lines() {
        let line = raw_line.trim();

        if line.is_empty() {
            continue;
        }

        if is_record_start(line) {
            if !buffer.is_empty() {
                records.push(buffer.trim().to_string());
            }

            buffer.clear();
            buffer.push_str(line);
            continue;
        }

        if !buffer.is_empty() {
            buffer.push(' ');
            buffer.push_str(line);
        }
    }

    if !buffer.is_empty() {
        records.push(buffer.trim().to_string());
    }

    records
}

pub(crate) fn merge_wrapped_statement_lines(lines: Vec<String>) -> Vec<String> {
    let mut merged = Vec::new();

    for line in lines {
        let trimmed = line.trim().to_string();
        if trimmed.is_empty() {
            continue;
        }

        let Some(previous) = merged.last_mut() else {
            merged.push(trimmed);
            continue;
        };

        if should_merge_wrapped_line(previous, &trimmed) {
            previous.push(' ');
            previous.push_str(&trimmed);
            continue;
        }

        merged.push(trimmed);
    }

    merged
}

fn should_merge_wrapped_line(previous: &str, next: &str) -> bool {
    if !line_has_transaction_date_prefix(previous) {
        return false;
    }

    if line_has_transaction_date_prefix(next) {
        return false;
    }

    if next.contains('$') || MONEY_TOKEN_RE.is_match(next) {
        return false;
    }

    if next.contains("OPENING BALANCE") || next.contains("CURRENT BALANCE") {
        return false;
    }

    true
}

fn line_has_transaction_date_prefix(line: &str) -> bool {
    let Some(first_token) = line.split_whitespace().next() else {
        return false;
    };

    SHORT_TX_DATE_RE.is_match(first_token)
}

#[cfg(test)]
mod tests {
    use super::merge_wrapped_statement_lines;

    #[test]
    fn merges_description_only_continuation_lines() {
        let lines = vec![
            "01MAR25 EFTPOS PURCHASE JMS BEEF CO PTY $37.00 $5,263.99".to_string(),
            "LTD B 5041".to_string(),
        ];

        let merged = merge_wrapped_statement_lines(lines);
        assert_eq!(merged.len(), 1);
        assert!(merged[0].contains("LTD B 5041"));
        assert!(merged[0].contains("EFTPOS PURCHASE JMS BEEF CO PTY"));
    }

    #[test]
    fn merges_multiple_description_only_continuation_lines() {
        let lines = vec![
            "01MAR25 LINE ONE $1.00 $2.00".to_string(),
            "LINE TWO".to_string(),
            "LINE THREE".to_string(),
        ];

        let merged = merge_wrapped_statement_lines(lines);
        assert_eq!(merged.len(), 1);
        assert!(merged[0].contains("LINE ONE"));
        assert!(merged[0].contains("LINE TWO"));
        assert!(merged[0].contains("LINE THREE"));
    }
}

pub(crate) fn parse_currency_to_cents(
    value: &str,
    context: &'static str,
) -> Result<i32, ParseError> {
    let normalized = value.replace(['$', ','], "");
    let parsed = normalized
        .parse::<f64>()
        .map_err(|_| ParseError::InvalidField {
            context,
            value: value.to_string(),
        })?;

    Ok((parsed * 100.0).round() as i32)
}

pub(crate) fn normalize_short_statement_date(value: &str) -> String {
    let trimmed = value.trim();
    let Some(captures) = SHORT_TX_DATE_RE.captures(trimmed) else {
        return trimmed.to_string();
    };

    let day = captures.name("day").map(|m| m.as_str()).unwrap_or("");
    let year = captures.name("year").map(|m| m.as_str()).unwrap_or("");

    let month_raw = captures.name("month").map(|m| m.as_str()).unwrap_or("");
    let month_letters: String = month_raw
        .chars()
        .filter(|ch| ch.is_ascii_alphabetic())
        .collect();

    if day.len() != 2 || year.len() != 2 || month_letters.len() != 3 {
        return trimmed.to_string();
    }

    let month = month_letters.to_ascii_lowercase();
    let mut chars = month.chars();
    let first = match chars.next() {
        Some(first) => first.to_ascii_uppercase(),
        None => return trimmed.to_string(),
    };

    format!("{day}{first}{}{year}", chars.as_str())
}
