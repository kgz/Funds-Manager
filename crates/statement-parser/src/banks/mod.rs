mod banksa;
mod detect;
mod heritage;
mod peopleschoice;

use crate::{ParseError, ParsedStatement};

pub trait BankStatementParser: Sync {
    fn name(&self) -> &'static str;
    fn parse_pages(&self, pages: &[String]) -> Result<ParsedStatement, ParseError>;
}

static HERITAGE: heritage::HeritageBankParser = heritage::HeritageBankParser;
static BANKSA: banksa::BankSaParser = banksa::BankSaParser;
static PEOPLES_CHOICE: peopleschoice::PeoplesChoiceParser = peopleschoice::PeoplesChoiceParser;
static AVAILABLE_PARSERS: [&str; 3] = ["heritage", "banksa", "peopleschoice"];

pub fn get_parser(name: &str) -> Option<&'static dyn BankStatementParser> {
    match name {
        "heritage" => Some(&HERITAGE),
        "banksa" => Some(&BANKSA),
        "peopleschoice" => Some(&PEOPLES_CHOICE),
        _ => None,
    }
}

pub fn infer_parser_name(pages: &[String]) -> &'static str {
    detect::infer_parser_name(pages)
}

pub fn available_parsers() -> &'static [&'static str] {
    &AVAILABLE_PARSERS
}
