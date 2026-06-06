use std::collections::{HashMap, HashSet};

use crate::models::category::Category;
use crate::models::category_mapping::{CategoryMapping, CategoryMappingsMatch};
use crate::models::transaction::Transaction;
use crate::modules::database::get_dbo;
use crate::models::transaction::filter_active_statement;
use crate::schema::transaction_data;
use diesel::prelude::*;
use diesel::sql_query;
use diesel::sql_types::{BigInt, Integer, Text};
use regex::Regex;

#[derive(diesel::QueryableByName)]
struct LearnedAggRow {
    #[diesel(sql_type = Text)]
    description: String,
    #[diesel(sql_type = Integer)]
    category_id: i32,
    #[diesel(sql_type = BigInt)]
    cnt: i64,
}

pub fn normalize_transaction_description(description: &str) -> String {
    description.trim().to_lowercase()
}

fn is_trailing_reference_token(word: &str) -> bool {
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

fn learned_description_variants(normalized_lower: &str) -> Vec<String> {
    let mut words: Vec<&str> = normalized_lower.split_whitespace().collect();
    let mut variants: Vec<String> = Vec::new();
    loop {
        let key = words.join(" ");
        if key.is_empty() {
            break;
        }
        if !variants.last().is_some_and(|prev| prev == &key) {
            variants.push(key);
        }
        if words.len() <= 3 {
            break;
        }
        let Some(last) = words.last().copied() else {
            break;
        };
        if !is_trailing_reference_token(last) {
            break;
        }
        words.pop();
    }
    variants
}

pub fn learned_description_category_map() -> Result<HashMap<String, i32>, diesel::result::Error> {
    let conn = &mut get_dbo();
    let rows: Vec<LearnedAggRow> = sql_query(
        r#"
        SELECT description, category_id, COUNT(*)::bigint AS cnt
        FROM transaction_data
        WHERE deleted_at IS NULL AND category_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM statement s WHERE s.id = transaction_data.statement_id AND s.deleted_at IS NULL)
        GROUP BY description, category_id
        "#,
    )
    .load(conn)?;

    let mut tallies: HashMap<String, HashMap<i32, u64>> = HashMap::new();
    for row in rows {
        let weight = u64::try_from(row.cnt).unwrap_or(1);
        let normalized = normalize_transaction_description(&row.description);
        for key in learned_description_variants(&normalized) {
            tallies
                .entry(key)
                .or_default()
                .entry(row.category_id)
                .and_modify(|count| *count += weight)
                .or_insert(weight);
        }
    }

    let mut out = HashMap::new();
    for (key, counts) in tallies {
        if let Some((best, _)) = counts.into_iter().max_by_key(|(_, c)| *c) {
            out.insert(key, best);
        }
    }
    Ok(out)
}

enum MappingRule {
    Exact {
        pattern_lower: String,
        category_id: i64,
    },
    Regex {
        re: Regex,
        category_id: i64,
    },
}

pub struct CategoryPredictor {
    learned: HashMap<String, i32>,
    rules: Vec<MappingRule>,
}

impl CategoryPredictor {
    pub fn load_from_db() -> Result<Self, diesel::result::Error> {
        let learned = learned_description_category_map()?;
        let mappings = CategoryMapping::all()?;
        let categories = Category::all(false)?;
        let valid_category_ids: HashSet<i64> = categories.into_iter().map(|c| c.id).collect();

        let mut rules = Vec::new();
        for mapping in mappings {
            if !valid_category_ids.contains(&mapping.category_id) {
                continue;
            }
            match mapping.match_type {
                CategoryMappingsMatch::Exact => rules.push(MappingRule::Exact {
                    pattern_lower: mapping.pattern.to_lowercase(),
                    category_id: mapping.category_id,
                }),
                CategoryMappingsMatch::Regex => {
                    if let Ok(re) = Regex::new(&mapping.pattern) {
                        rules.push(MappingRule::Regex {
                            re,
                            category_id: mapping.category_id,
                        });
                    }
                }
            }
        }

        Ok(Self { learned, rules })
    }

    pub fn predict(&self, description: &str) -> Option<i32> {
        let desc_lower = description.to_lowercase();
        for rule in &self.rules {
            let matched = match rule {
                MappingRule::Exact {
                    pattern_lower, ..
                } => desc_lower == *pattern_lower,
                MappingRule::Regex { re, .. } => re.is_match(description),
            };
            if !matched {
                continue;
            }
            let category_id = match rule {
                MappingRule::Exact { category_id, .. } => *category_id,
                MappingRule::Regex { category_id, .. } => *category_id,
            };
            return i32::try_from(category_id).ok();
        }
        let normalized = normalize_transaction_description(description);
        for key in learned_description_variants(&normalized) {
            if let Some(cid) = self.learned.get(&key) {
                return Some(*cid);
            }
        }
        None
    }
}

pub fn recategorize_uncategorized_transactions() -> Result<usize, diesel::result::Error> {
    let predictor = CategoryPredictor::load_from_db()?;
    let conn = &mut get_dbo();
    let uncategorized: Vec<(i64, String)> = filter_active_statement(
        transaction_data::table
            .filter(transaction_data::deleted_at.is_null())
            .filter(transaction_data::category_id.is_null())
            .into_boxed(),
    )
    .select((transaction_data::id, transaction_data::description))
    .load(conn)?;

    let mut updated = 0usize;
    for (id, description) in uncategorized {
        if let Some(cid) = predictor.predict(&description) {
            Transaction::update_category(id, Some(cid))?;
            updated += 1;
        }
    }
    Ok(updated)
}
