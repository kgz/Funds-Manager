use std::collections::{HashMap, HashSet};

const MERCHANT_MARKERS: &[&str] = &[
    "AUSSIEBROADBAND",
    "BUNNINGS",
    "COLES",
    "WOOLWORTHS",
    "ALDI",
    "KFC",
    "MCDONALDS",
    "SUBWAY",
    "AMPOL",
    "BP ",
    "SHELL",
    "OFFICEWORKS",
    "CHEMIST",
    "PHARMACY",
    "NETFLIX",
    "SPOTIFY",
    "APPLE",
    "GOOGLE",
    "AMAZON",
    "PAYPAL",
    "UBER",
    "BATTERY",
];

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
    merchant_categories: HashMap<String, i32>,
}

fn merchant_markers_in(description: &str) -> Vec<String> {
    let upper = description.to_uppercase();
    let mut hits: Vec<String> = MERCHANT_MARKERS
        .iter()
        .filter(|marker| upper.contains(**marker))
        .map(|marker| (*marker).trim().to_string())
        .collect();
    hits.sort_by(|a, b| b.len().cmp(&a.len()));
    hits.dedup();
    hits
}

fn load_merchant_categories() -> Result<HashMap<String, i32>, diesel::result::Error> {
    #[derive(QueryableByName, Debug)]
    struct MarkerCategoryRow {
        #[diesel(sql_type = Integer)]
        category_id: i32,
        #[diesel(sql_type = BigInt)]
        cnt: i64,
    }

    let conn = &mut get_dbo();
    let mut out = HashMap::new();

    for marker in MERCHANT_MARKERS {
        let marker = marker.trim();
        if marker.is_empty() {
            continue;
        }
        let pattern = format!("%{marker}%");
        let rows: Vec<MarkerCategoryRow> = sql_query(
            "SELECT category_id, COUNT(*)::bigint AS cnt
             FROM transaction_data
             WHERE deleted_at IS NULL
               AND category_id IS NOT NULL
               AND EXISTS (
                   SELECT 1 FROM statement s
                   WHERE s.id = transaction_data.statement_id AND s.deleted_at IS NULL
               )
               AND UPPER(description) LIKE $1
             GROUP BY category_id
             ORDER BY cnt DESC
             LIMIT 2",
        )
        .bind::<Text, _>(pattern)
        .load(conn)?;

        let Some(top) = rows.first() else {
            continue;
        };
        if top.cnt < 5 {
            continue;
        }
        let total_top: i64 = rows.iter().map(|row| row.cnt).sum();
        let share = top.cnt as f64 / total_top as f64;
        if share < 0.55 {
            continue;
        }
        out.insert(marker.to_string(), top.category_id);
    }

    Ok(out)
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

        let merchant_categories = load_merchant_categories()?;

        Ok(Self {
            learned,
            rules,
            merchant_categories,
        })
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
        for (learned_key, category_id) in &self.learned {
            if learned_key.len() >= 8 && normalized.contains(learned_key.as_str()) {
                return Some(*category_id);
            }
        }
        for marker in merchant_markers_in(description) {
            if let Some(category_id) = self.merchant_categories.get(&marker) {
                return Some(*category_id);
            }
        }
        None
    }
}

pub fn apply_suggestions_for_transaction_ids(ids: &[i64]) -> Result<usize, diesel::result::Error> {
    if ids.is_empty() {
        return Ok(0);
    }
    let predictor = CategoryPredictor::load_from_db()?;
    let conn = &mut get_dbo();
    let rows: Vec<(i64, Option<i32>, String)> = filter_active_statement(
        transaction_data::table
            .filter(transaction_data::id.eq_any(ids))
            .filter(transaction_data::deleted_at.is_null())
            .into_boxed(),
        None,
    )
    .select((
        transaction_data::id,
        transaction_data::category_id,
        transaction_data::description,
    ))
    .load(conn)?;

    let mut updated = 0usize;
    for (id, current, description) in rows {
        let Some(predicted) = predictor.predict(&description) else {
            continue;
        };
        if current == Some(predicted) {
            continue;
        }
        Transaction::update_category(id, Some(predicted))?;
        updated += 1;
    }
    Ok(updated)
}

pub fn recategorize_uncategorized_transactions() -> Result<usize, diesel::result::Error> {
    let predictor = CategoryPredictor::load_from_db()?;
    let conn = &mut get_dbo();
    let uncategorized: Vec<(i64, String)> = filter_active_statement(
        transaction_data::table
            .filter(transaction_data::deleted_at.is_null())
            .filter(transaction_data::category_id.is_null())
            .into_boxed(),
        None,
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
