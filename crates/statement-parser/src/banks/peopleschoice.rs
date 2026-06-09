use crate::{BankStatementParser, ParseError, ParsedStatement};

use super::heritage::HeritageBankParser;

static HERITAGE: HeritageBankParser = HeritageBankParser;

pub struct PeoplesChoiceParser;

impl BankStatementParser for PeoplesChoiceParser {
    fn name(&self) -> &'static str {
        "peopleschoice"
    }

    fn parse_pages(&self, pages: &[String]) -> Result<ParsedStatement, ParseError> {
        let mut statement = HERITAGE.parse_pages(pages)?;
        statement.parser_name = self.name().to_string();
        Ok(statement)
    }
}
