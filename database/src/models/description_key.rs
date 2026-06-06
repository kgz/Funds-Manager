fn ref_like_token(word: &str) -> bool {
    fn ref_char(c: char) -> bool {
        c.is_ascii_alphanumeric() || c == '_' || c == '-'
    }
    if word.len() >= 8 && word.chars().all(ref_char) {
        return true;
    }
    if word.chars().all(|c| c.is_ascii_digit()) {
        let len = word.len();
        if (6..=7).contains(&len) || len >= 9 {
            return true;
        }
    }
    false
}

fn variant_keys(normalized: &str) -> Vec<String> {
    let mut words: Vec<&str> = normalized.split_whitespace().filter(|w| !w.is_empty()).collect();
    let mut keys = Vec::new();
    loop {
        let key = words.join(" ");
        if key.is_empty() {
            break;
        }
        if !keys.last().is_some_and(|prev| prev == &key) {
            keys.push(key);
        }
        if words.len() <= 3 {
            break;
        }
        let Some(last) = words.last().copied() else {
            break;
        };
        if !ref_like_token(last) {
            break;
        }
        words.pop();
    }
    keys
}

pub fn canonical_expense_group_key(description: &str) -> String {
    let normalized = description.trim().to_lowercase();
    let variants = variant_keys(&normalized);
    variants
        .last()
        .cloned()
        .unwrap_or(normalized)
}
