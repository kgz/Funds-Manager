use crate::models::income_stream::{self, IncomeStreamSummary};
use crate::models::lender_expense::{self, LenderExpenseSummaryResponse};
use crate::models::liabilities::Liability;
use chrono::NaiveDate;
use serde::Serialize;

pub const DEFAULT_RATE_BUFFER_BPS: i32 = 300;

const COMMITTED_LIVING_BUCKETS: &[&str] = &[
    "housing",
    "utilities",
    "insurance",
    "childcare_education",
    "healthcare",
];

fn round2(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}

fn cents_to_dollars(cents: i64) -> f64 {
    round2(cents as f64 / 100.0)
}

pub fn monthly_repayment_cents(repayment_cents: i64, frequency: Option<&str>) -> i64 {
    match frequency {
        Some("weekly") => repayment_cents * 52 / 12,
        Some("fortnightly") => repayment_cents * 26 / 12,
        _ => repayment_cents,
    }
}

pub fn stressed_repayment_cents(
    baseline_cents: i64,
    rate_type: Option<&str>,
    interest_rate_bps: Option<i32>,
    rate_buffer_bps: i32,
) -> i64 {
    if rate_type != Some("variable") {
        return baseline_cents;
    }
    match interest_rate_bps {
        Some(rate) if rate > 0 => baseline_cents * i64::from(rate + rate_buffer_bps) / i64::from(rate),
        _ => baseline_cents * i64::from(10_000 + rate_buffer_bps) / 10_000,
    }
}

fn stream_monthly_dollars(stream: &IncomeStreamSummary) -> f64 {
    stream
        .gross_monthly_dollars
        .unwrap_or(stream.estimated_monthly_dollars)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceabilityIncomeLine {
    pub stream_key: String,
    pub label: String,
    pub monthly_dollars: f64,
    pub is_confirmed: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceabilityLiabilityLine {
    pub id: i64,
    pub name: String,
    pub kind: String,
    pub rate_type: Option<String>,
    pub interest_rate_bps: Option<i32>,
    pub included: bool,
    pub baseline_repayment_monthly_dollars: f64,
    pub stressed_repayment_monthly_dollars: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceabilityLivingSplit {
    pub committed_living_monthly_dollars: f64,
    pub discretionary_living_monthly_dollars: f64,
    pub committed_buckets: Vec<ServiceabilityBucketLine>,
    pub discretionary_buckets: Vec<ServiceabilityBucketLine>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceabilityBucketLine {
    pub bucket_key: String,
    pub label: String,
    pub monthly_average_dollars: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceabilitySummaryResponse {
    pub start_date: String,
    pub end_date: String,
    pub rate_buffer_bps: i32,
    pub income_uses_unconfirmed: bool,
    pub income_monthly_dollars: f64,
    pub income_lines: Vec<ServiceabilityIncomeLine>,
    pub repayments_monthly_dollars: f64,
    pub stressed_repayments_monthly_dollars: f64,
    pub living_expenses_monthly_dollars: f64,
    pub surplus_monthly_dollars: f64,
    pub stressed_surplus_monthly_dollars: f64,
    pub committed_total_monthly_dollars: f64,
    pub discretionary_total_monthly_dollars: f64,
    pub liabilities: Vec<ServiceabilityLiabilityLine>,
    pub living_split: ServiceabilityLivingSplit,
}

fn select_income_streams(
    streams: &[IncomeStreamSummary],
) -> (Vec<&IncomeStreamSummary>, bool) {
    let confirmed: Vec<&IncomeStreamSummary> = streams
        .iter()
        .filter(|stream| stream.is_confirmed)
        .collect();
    if confirmed.is_empty() {
        (streams.iter().collect(), true)
    } else {
        (confirmed, false)
    }
}

fn living_split(expense_summary: &LenderExpenseSummaryResponse) -> ServiceabilityLivingSplit {
    let mut committed = 0.0_f64;
    let mut discretionary = 0.0_f64;
    let mut committed_buckets = Vec::new();
    let mut discretionary_buckets = Vec::new();

    for bucket in &expense_summary.buckets {
        let line = ServiceabilityBucketLine {
            bucket_key: bucket.bucket_key.clone(),
            label: bucket.label.clone(),
            monthly_average_dollars: bucket.monthly_average_dollars,
        };
        if COMMITTED_LIVING_BUCKETS.contains(&bucket.bucket_key.as_str()) {
            committed += bucket.monthly_average_dollars;
            committed_buckets.push(line);
        } else {
            discretionary += bucket.monthly_average_dollars;
            discretionary_buckets.push(line);
        }
    }

    discretionary += expense_summary.unmapped.monthly_average_dollars;
    if expense_summary.unmapped.monthly_average_dollars > 0.0
        || expense_summary.unmapped.transaction_count > 0
    {
        discretionary_buckets.push(ServiceabilityBucketLine {
            bucket_key: "unmapped".to_string(),
            label: "Unmapped / uncategorised".to_string(),
            monthly_average_dollars: expense_summary.unmapped.monthly_average_dollars,
        });
    }

    ServiceabilityLivingSplit {
        committed_living_monthly_dollars: round2(committed),
        discretionary_living_monthly_dollars: round2(discretionary),
        committed_buckets,
        discretionary_buckets,
    }
}

pub fn serviceability_summary(
    start: NaiveDate,
    end: NaiveDate,
    financial_account_id: Option<i64>,
    rate_buffer_bps: i32,
    min_occurrences: i32,
) -> Result<ServiceabilitySummaryResponse, diesel::result::Error> {
    let income = income_stream::income_summary(min_occurrences, financial_account_id)?;
    let (selected_streams, income_uses_unconfirmed) =
        select_income_streams(&income.streams);

    let income_lines: Vec<ServiceabilityIncomeLine> = selected_streams
        .iter()
        .map(|stream| ServiceabilityIncomeLine {
            stream_key: stream.stream_key.clone(),
            label: stream.label.clone(),
            monthly_dollars: round2(stream_monthly_dollars(stream)),
            is_confirmed: stream.is_confirmed,
        })
        .collect();
    let income_monthly_dollars = round2(
        income_lines
            .iter()
            .map(|line| line.monthly_dollars)
            .sum::<f64>(),
    );

    let liabilities = Liability::list_active()?;
    let mut liability_lines = Vec::new();
    let mut repayments_monthly_dollars = 0.0_f64;
    let mut stressed_repayments_monthly_dollars = 0.0_f64;

    for liability in liabilities {
        let included = liability.repayment_cents.is_some();
        let (baseline_cents, stressed_cents) = match liability.repayment_cents {
            Some(repayment_cents) => {
                let baseline = monthly_repayment_cents(
                    repayment_cents,
                    liability.repayment_frequency.as_deref(),
                );
                let stressed = stressed_repayment_cents(
                    baseline,
                    liability.rate_type.as_deref(),
                    liability.interest_rate_bps,
                    rate_buffer_bps,
                );
                (baseline, stressed)
            }
            None => (0, 0),
        };
        if included {
            repayments_monthly_dollars += cents_to_dollars(baseline_cents);
            stressed_repayments_monthly_dollars += cents_to_dollars(stressed_cents);
        }
        liability_lines.push(ServiceabilityLiabilityLine {
            id: liability.id,
            name: liability.name,
            kind: liability.kind,
            rate_type: liability.rate_type,
            interest_rate_bps: liability.interest_rate_bps,
            included,
            baseline_repayment_monthly_dollars: cents_to_dollars(baseline_cents),
            stressed_repayment_monthly_dollars: cents_to_dollars(stressed_cents),
        });
    }
    repayments_monthly_dollars = round2(repayments_monthly_dollars);
    stressed_repayments_monthly_dollars = round2(stressed_repayments_monthly_dollars);

    let expense_summary =
        lender_expense::expense_summary(start, end, financial_account_id)?;
    let living_expenses_monthly_dollars = expense_summary.total_monthly_dollars;
    let living_split = living_split(&expense_summary);

    let surplus_monthly_dollars = round2(
        income_monthly_dollars - repayments_monthly_dollars - living_expenses_monthly_dollars,
    );
    let stressed_surplus_monthly_dollars = round2(
        income_monthly_dollars
            - stressed_repayments_monthly_dollars
            - living_expenses_monthly_dollars,
    );
    let committed_total_monthly_dollars =
        round2(repayments_monthly_dollars + living_split.committed_living_monthly_dollars);
    let discretionary_total_monthly_dollars =
        living_split.discretionary_living_monthly_dollars;

    Ok(ServiceabilitySummaryResponse {
        start_date: start.to_string(),
        end_date: end.to_string(),
        rate_buffer_bps,
        income_uses_unconfirmed,
        income_monthly_dollars,
        income_lines,
        repayments_monthly_dollars,
        stressed_repayments_monthly_dollars,
        living_expenses_monthly_dollars,
        surplus_monthly_dollars,
        stressed_surplus_monthly_dollars,
        committed_total_monthly_dollars,
        discretionary_total_monthly_dollars,
        liabilities: liability_lines,
        living_split,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        monthly_repayment_cents, stressed_repayment_cents, DEFAULT_RATE_BUFFER_BPS,
    };

    #[test]
    fn weekly_repayment_normalised_to_monthly() {
        assert_eq!(monthly_repayment_cents(100_00, Some("weekly")), 433_33);
    }

    #[test]
    fn variable_stress_increases_repayment() {
        let baseline = 2_000_00;
        let stressed = stressed_repayment_cents(
            baseline,
            Some("variable"),
            Some(600),
            DEFAULT_RATE_BUFFER_BPS,
        );
        assert_eq!(stressed, 3_000_00);
    }

    #[test]
    fn fixed_rate_unchanged_under_stress() {
        let baseline = 2_000_00;
        assert_eq!(
            stressed_repayment_cents(
                baseline,
                Some("fixed"),
                Some(600),
                DEFAULT_RATE_BUFFER_BPS,
            ),
            baseline
        );
    }
}
