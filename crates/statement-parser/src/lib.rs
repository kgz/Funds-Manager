mod banks;
mod config;
mod error;
mod extraction;
mod models;
mod utils;

use std::path::Path;

pub use banks::{available_parsers, get_parser, BankStatementParser};
pub use config::ParserConfig;
pub use error::ParseError;
pub use models::{ParsedStatement, ParsedTransaction};

pub fn parse_pages(parser_name: &str, pages: &[String]) -> Result<ParsedStatement, ParseError> {
    let parser = get_parser(parser_name)
        .ok_or_else(|| ParseError::UnsupportedParser(parser_name.to_string()))?;

    parser.parse_pages(pages)
}

pub fn parse_statement<P: AsRef<Path>>(
    file_path: P,
    parser_name: &str,
    config: &ParserConfig,
) -> Result<ParsedStatement, ParseError> {
    let pages = extraction::extract_page_texts(file_path.as_ref(), config)?;

    parse_pages(parser_name, &pages)
}
