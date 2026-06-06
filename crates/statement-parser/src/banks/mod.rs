mod heritage;

use crate::{ParseError, ParsedStatement};

pub trait BankStatementParser: Sync {
    fn name(&self) -> &'static str;
    fn parse_pages(&self, pages: &[String]) -> Result<ParsedStatement, ParseError>;
}

static HERITAGE: heritage::HeritageBankParser = heritage::HeritageBankParser;
static AVAILABLE_PARSERS: [&str; 1] = ["heritage"];

pub fn get_parser(name: &str) -> Option<&'static dyn BankStatementParser> {
    match name {
        "heritage" => Some(&HERITAGE),
        _ => None,
    }
}

pub fn available_parsers() -> &'static [&'static str] {
    &AVAILABLE_PARSERS
}
