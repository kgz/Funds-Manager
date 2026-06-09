use std::path::PathBuf;

use chrono::NaiveDate;
use statement_parser::{parse_statement_auto, ParseError, ParserConfig};

#[test]
fn parses_banksa_complete_freedom_offset_pdf() {
    let sample_pdf = workspace_path(["CompleteFreedomOffset-2740-19Jun2025 (1).pdf"]);
    if !sample_pdf.exists() {
        return;
    }

    let config = sample_config();
    let statement = match parse_statement_auto(&sample_pdf, &config) {
        Ok(statement) => statement,
        Err(ParseError::PdfiumBinding(_)) => return,
        Err(error) => panic!("{error}"),
    };

    assert_eq!(statement.parser_name, "banksa");
    assert_eq!(statement.account_id, "045692740");
    assert_eq!(
        statement.statement_date,
        NaiveDate::from_ymd_opt(2025, 6, 19).unwrap()
    );
    assert_eq!(statement.opening_balance_cents, 157_278);
    assert_eq!(statement.closing_balance_cents, 241_002);
    assert!(!statement.transactions.is_empty());

    let shannons: Vec<_> = statement
        .transactions
        .iter()
        .filter(|txn| txn.description.contains("SHANNONS"))
        .collect();
    assert!(
        !shannons.is_empty(),
        "expected at least one SHANNONS transaction"
    );
    for txn in &shannons {
        assert!(
            txn.description.contains("SCM"),
            "SHANNONS description missing SCM ref: {}",
            txn.description
        );
        assert!(
            txn.amount_cents.abs() < 50_000,
            "SHANNONS amount looks wrong: {} cents for {}",
            txn.amount_cents,
            txn.description
        );
    }

    for txn in &statement.transactions {
        assert!(
            !txn.description.contains(" S."),
            "loan reference leaked into description: {}",
            txn.description
        );
        assert_ne!(
            txn.balance_cents, 2_077_200,
            "bogus 20772 balance on: {}",
            txn.description
        );
    }

    for txn in &statement.transactions {
        assert!(
            txn.description.len() < 120,
            "description too long (footer leak?): {}",
            txn.description
        );
    }
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
