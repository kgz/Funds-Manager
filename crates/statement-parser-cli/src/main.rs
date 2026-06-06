use std::process::ExitCode;

use clap::Parser;
use statement_parser::{available_parsers, parse_statement, ParseError, ParserConfig};

#[derive(Debug, Parser)]
struct Args {
    pdf_path: String,
    #[arg(long)]
    parser: String,
    #[arg(long)]
    pdfium_library_path: Option<String>,
}

fn main() -> ExitCode {
    let args = Args::parse();

    let config = match args.pdfium_library_path {
        Some(path) => ParserConfig::default().with_pdfium_library_path(path),
        None => ParserConfig::default(),
    };

    match parse_statement(&args.pdf_path, &args.parser, &config) {
        Ok(statement) => match serde_json::to_string_pretty(&statement) {
            Ok(output) => {
                println!("{output}");
                ExitCode::SUCCESS
            }
            Err(error) => {
                eprintln!("{error}");
                ExitCode::FAILURE
            }
        },
        Err(error) => {
            report_error(&error);
            ExitCode::FAILURE
        }
    }
}

fn report_error(error: &ParseError) {
    eprintln!("{error}");

    if matches!(error, ParseError::UnsupportedParser(_)) {
        eprintln!("available parsers: {}", available_parsers().join(", "));
    }
}
