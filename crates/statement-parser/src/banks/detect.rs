pub fn infer_parser_name(pages: &[String]) -> &'static str {
    let text = pages.join("\n");
    if is_banksa(&text) {
        return "banksa";
    }
    if is_peoples_choice(&text) {
        return "peopleschoice";
    }
    "heritage"
}

fn is_banksa(text: &str) -> bool {
    text.contains("BankSA")
}

fn is_peoples_choice(text: &str) -> bool {
    let upper = text.to_uppercase();
    if upper.contains("PEOPLE'S CHOICE") || upper.contains("PEOPLES CHOICE") {
        return true;
    }
    if upper.contains("MEMBER NUMBER") && upper.contains("SHARES HELD") {
        return true;
    }
    upper.contains("BSB: 671") || upper.contains("BSB 671")
}

#[cfg(test)]
mod tests {
    use super::{infer_parser_name, is_peoples_choice};

    #[test]
    fn detects_peoples_choice_from_member_and_bsb_markers() {
        let text = "Member number(s): 600042883\nShares held: 1\nBSB: 671 000\nACCOUNT NO ACCOUNT\n102049120";
        assert!(is_peoples_choice(text));
        assert_eq!(
            infer_parser_name(&[text.to_string()]),
            "peopleschoice"
        );
    }

    #[test]
    fn detects_banksa_before_other_markers() {
        let text = "BankSA Complete Freedom\nBSB: 671 000";
        assert_eq!(infer_parser_name(&[text.to_string()]), "banksa");
    }

    #[test]
    fn defaults_to_heritage_for_generic_layout() {
        let text = "STATEMENT PERIOD ENDING 31/03/2025\nACCOUNT NO ACCOUNT\n102049120";
        assert_eq!(infer_parser_name(&[text.to_string()]), "heritage");
    }
}
