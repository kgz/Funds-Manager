use std::path::PathBuf;

use chrono::NaiveDate;
use statement_parser::{parse_statement, ParseError, ParserConfig};

#[test]
fn parses_sample_statement_pdf() {
    let sample_pdf = workspace_path(["app", "src", "test.pdf"]);
    assert!(
        sample_pdf.exists(),
        "missing sample PDF at {}",
        sample_pdf.display()
    );

    let config = sample_config();
    let statement = match parse_statement(&sample_pdf, "heritage", &config) {
        Ok(statement) => statement,
        Err(ParseError::PdfiumBinding(_)) => return,
        Err(error) => panic!("{error}"),
    };

    assert_eq!(statement.account_id, "102049120");
    assert_eq!(
        statement.statement_date,
        NaiveDate::from_ymd_opt(2025, 3, 31).unwrap()
    );
    assert_eq!(statement.opening_balance_cents, 530_099);
    assert_eq!(statement.closing_balance_cents, 334_127);
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
