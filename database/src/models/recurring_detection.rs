use chrono::NaiveDate;
use serde::Serialize;

use crate::models::description_key::canonical_expense_group_key;

#[derive(Clone, Debug)]
pub struct SlimTransaction {
    pub description: String,
    pub amount: i32,
    pub transaction_date: NaiveDate,
    pub category_id: Option<i32>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RecurringCandidate {
    pub row_id: String,
    pub key: String,
    pub label_sample: String,
    pub mode_category_id: Option<i32>,
    pub flow: String,
    pub cadence_label: String,
    pub median_gap_days: f64,
    pub estimated_monthly_dollars: f64,
    pub typical_amount_dollars: f64,
    pub min_amount_dollars: f64,
    pub max_amount_dollars: f64,
    pub occurrences: i32,
    pub first_date: String,
    pub last_date: String,
    pub confidence: i32,
}

fn median(nums: &[f64]) -> f64 {
    if nums.is_empty() {
        return 0.0;
    }
    let mut s: Vec<f64> = nums.to_vec();
    s.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let m = s.len() / 2;
    if s.len() % 2 == 1 {
        s[m]
    } else {
        (s[m - 1] + s[m]) / 2.0
    }
}

fn cadence_from_median_gap(gap: f64) -> String {
    if (5.0..=9.0).contains(&gap) {
        return "Weekly".to_string();
    }
    if (12.0..=16.0).contains(&gap) {
        return "Biweekly".to_string();
    }
    if (26.0..=34.0).contains(&gap) {
        return "Monthly".to_string();
    }
    if (360.0..=370.0).contains(&gap) {
        return "Yearly".to_string();
    }
    if (85.0..=95.0).contains(&gap) {
        return "~Quarterly".to_string();
    }
    format!("~every {} days", gap.round())
}

fn confidence_score(count: i32, gap_spread: f64, amount_cv: f64) -> i32 {
    let count_score = ((count - 2) * 10).clamp(0, 40);
    let gap_score = (35.0 - gap_spread.min(35.0)).max(0.0) as i32;
    let amt_score = (25.0 - (amount_cv * 50.0).min(25.0)).max(0.0) as i32;
    (count_score + gap_score + amt_score).min(100)
}

fn mode_category_id(ids: &[Option<i32>]) -> Option<i32> {
    let mut tallies: std::collections::HashMap<i32, i32> = std::collections::HashMap::new();
    for id in ids {
        let Some(cid) = id else { continue };
        *tallies.entry(*cid).or_insert(0) += 1;
    }
    tallies
        .into_iter()
        .max_by_key(|(_, count)| *count)
        .map(|(id, _)| id)
}

fn detect_recurring(
    transactions: &[SlimTransaction],
    min_occurrences: i32,
    flow: &str,
) -> Vec<RecurringCandidate> {
    let expense = flow == "expense";
    let filtered: Vec<&SlimTransaction> = transactions
        .iter()
        .filter(|tx| {
            if expense {
                tx.amount < 0
            } else {
                tx.amount > 0
            }
        })
        .collect();

    let mut groups: std::collections::HashMap<
        String,
        (
            Vec<f64>,
            Vec<NaiveDate>,
            Vec<Option<i32>>,
            String,
        ),
    > = std::collections::HashMap::new();

    for tx in filtered {
        let key = canonical_expense_group_key(&tx.description);
        let dollar_amt = if expense {
            (tx.amount.abs() as f64) / 100.0
        } else {
            (tx.amount as f64) / 100.0
        };

        let entry = groups.entry(key).or_insert_with(|| {
            (
                Vec::new(),
                Vec::new(),
                Vec::new(),
                tx.description.clone(),
            )
        });
        entry.0.push(dollar_amt);
        entry.1.push(tx.transaction_date);
        entry.2.push(tx.category_id);
    }

    let mut out = Vec::new();
    for (key, (amounts, dates, category_ids, sample)) in groups {
        if amounts.len() < min_occurrences as usize {
            continue;
        }
        let mut unique_dates: Vec<NaiveDate> = dates.clone();
        unique_dates.sort_unstable();
        unique_dates.dedup();
        if unique_dates.len() < min_occurrences as usize {
            continue;
        }

        let mut gaps = Vec::new();
        for pair in unique_dates.windows(2) {
            let days = pair[1].signed_duration_since(pair[0]).num_days() as f64;
            gaps.push(days);
        }
        let med_gap = median(&gaps);
        let gap_spread = if gaps.is_empty() {
            99.0
        } else {
            median(&gaps.iter().map(|x| (x - med_gap).abs()).collect::<Vec<_>>())
        };
        let med_amt = median(&amounts);
        let mut sorted_amt = amounts.clone();
        sorted_amt.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let min_amt = sorted_amt.first().copied().unwrap_or(0.0);
        let max_amt = sorted_amt.last().copied().unwrap_or(0.0);
        let amt_dev = if amounts.is_empty() {
            0.0
        } else {
            median(
                &amounts
                    .iter()
                    .map(|x| (x - med_amt).abs())
                    .collect::<Vec<_>>(),
            )
        };
        let amount_cv = if med_amt > 0.0 { amt_dev / med_amt } else { 1.0 };
        let mcat = mode_category_id(&category_ids);
        let mean_gap = if gaps.is_empty() {
            med_gap
        } else {
            gaps.iter().sum::<f64>() / gaps.len() as f64
        };
        let span_days = if unique_dates.len() >= 2 {
            unique_dates[unique_dates.len() - 1]
                .signed_duration_since(unique_dates[0])
                .num_days() as f64
        } else {
            0.0
        };
        let sum_amt: f64 = amounts.iter().sum();
        let from_median_gap = if med_gap > 0.0 {
            (med_amt * 30.0) / med_gap
        } else {
            0.0
        };
        let from_observed_span = if span_days > 0.0 {
            (sum_amt / span_days) * 30.0
        } else {
            0.0
        };
        let mut estimated_monthly = if from_median_gap > 0.0 && from_observed_span > 0.0 {
            from_median_gap.min(from_observed_span)
        } else if from_observed_span > 0.0 {
            from_observed_span
        } else {
            from_median_gap
        };
        estimated_monthly = (estimated_monthly * 100.0).round() / 100.0;
        let cadence_gap = if mean_gap > med_gap + 1.0 && med_gap < mean_gap * 0.55 {
            med_gap
        } else {
            med_gap
        };
        let gap_days_rounded = (cadence_gap * 10.0).round() / 10.0;

        out.push(RecurringCandidate {
            row_id: format!("{flow}:{key}"),
            key: key.clone(),
            label_sample: sample,
            mode_category_id: mcat,
            flow: flow.to_string(),
            cadence_label: cadence_from_median_gap(cadence_gap),
            median_gap_days: gap_days_rounded,
            estimated_monthly_dollars: estimated_monthly,
            typical_amount_dollars: (med_amt * 100.0).round() / 100.0,
            min_amount_dollars: (min_amt * 100.0).round() / 100.0,
            max_amount_dollars: (max_amt * 100.0).round() / 100.0,
            occurrences: amounts.len() as i32,
            first_date: unique_dates[0].to_string(),
            last_date: unique_dates[unique_dates.len() - 1].to_string(),
            confidence: confidence_score(amounts.len() as i32, gap_spread, amount_cv),
        });
    }

    out.sort_by(|a, b| b.confidence.cmp(&a.confidence));
    out
}

pub fn detect_recurring_expenses(
    transactions: &[SlimTransaction],
    min_occurrences: i32,
) -> Vec<RecurringCandidate> {
    detect_recurring(transactions, min_occurrences, "expense")
}

pub fn detect_recurring_income(
    transactions: &[SlimTransaction],
    min_occurrences: i32,
) -> Vec<RecurringCandidate> {
    detect_recurring(transactions, min_occurrences, "income")
}
