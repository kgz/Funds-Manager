use std::path::PathBuf;

use chrono::NaiveDate;
use statement_parser::{parse_statement_auto, ParseError, ParserConfig};

#[test]
fn auto_detects_and_parses_peoples_choice_pdf() {
    let sample_pdf = workspace_path(["b2f5b678790a0b78b49674d6ca69c4ce4382123640097144618.pdf"]);
    if !sample_pdf.exists() {
        return;
    }

    let config = sample_config();
    let statement = match parse_statement_auto(&sample_pdf, &config) {
        Ok(statement) => statement,
        Err(ParseError::PdfiumBinding(_)) => return,
        Err(error) => panic!("{error}"),
    };

    assert_eq!(statement.parser_name, "peopleschoice");
    assert_eq!(statement.account_id, "102049120");
    assert_eq!(
        statement.statement_date,
        NaiveDate::from_ymd_opt(2026, 3, 31).unwrap()
    );
    assert_eq!(statement.opening_balance_cents, 497_410);
    assert!(!statement.transactions.is_empty());
}

fn sample_config() -> ParserConfig {
    let bundled_pdfium = workspace_path(["app", "lib", "libpdfium.so"]);

    if bundled_pdfium.exists() {
        return ParserConfig::default().with_pdfium_library_path(bundled_pdfium);
    }

    ParserConfig::default()
}

fn workspace_path<const N: usize>(parts: [&str; N]) -> PathBuf {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.pop();
    path.pop();

    for part in parts {
        path.push(part);
    }

    path
}
