//! Integration tests for serviceability summary.
//!
//! Requires Postgres (`DATABASE_URL` in `database/.env` or env).
//!
//! ```bash
//! cd database && cargo test --test serviceability_integration -- --ignored --nocapture
//! ```

use chrono::NaiveDate;
use database::models::income_stream;
use database::models::lender_expense;
use database::models::serviceability;
use database::modules::database::migrate_on_startup;

const EPSILON: f64 = 0.02;

fn approx_eq(left: f64, right: f64) -> bool {
    (left - right).abs() <= EPSILON
}

fn load_env_and_migrate() {
    let _ = dotenv::from_filename(".env");
    let _ = dotenv::from_filename("../.env");
    let _ = dotenv::from_filename("database/.env");
    migrate_on_startup().expect("migrations should apply");
}

fn income_total_for_comparison(min_occurrences: i32, account_id: Option<i64>) -> f64 {
    let income = income_stream::income_summary(min_occurrences, account_id).expect("income summary");
    let confirmed: Vec<_> = income
        .streams
        .iter()
        .filter(|stream| stream.is_confirmed)
        .filter(|stream| stream.merged_into_key.is_none())
        .collect();
    let streams = if confirmed.is_empty() {
        income
            .streams
            .iter()
            .filter(|stream| stream.merged_into_key.is_none())
            .collect::<Vec<_>>()
    } else {
        confirmed
    };
    streams
        .iter()
        .map(|stream| {
            stream
                .gross_monthly_dollars
                .unwrap_or(stream.estimated_monthly_dollars)
        })
        .sum()
}

#[test]
#[ignore = "requires DATABASE_URL; run: cargo test --test serviceability_integration -- --ignored"]
fn serviceability_summary_matches_components_and_formula() {
    load_env_and_migrate();

    let start = NaiveDate::from_ymd_opt(2026, 1, 1).expect("date");
    let end = NaiveDate::from_ymd_opt(2026, 6, 30).expect("date");
    let min_occurrences = 3;

    let summary =
        serviceability::serviceability_summary(start, end, None, 300, min_occurrences)
            .expect("serviceability summary");

    let living =
        lender_expense::expense_summary(start, end, None).expect("living expense summary");
    assert!(
        approx_eq(summary.living_expenses_monthly_dollars, living.total_monthly_dollars),
        "living expenses should match lender summary: {} vs {}",
        summary.living_expenses_monthly_dollars,
        living.total_monthly_dollars
    );

    let income_total = income_total_for_comparison(min_occurrences, None);
    assert!(
        approx_eq(summary.income_monthly_dollars, income_total),
        "income should match income summary logic: {} vs {}",
        summary.income_monthly_dollars,
        income_total
    );

    let income_lines_total: f64 = summary
        .income_lines
        .iter()
        .map(|line| line.monthly_dollars)
        .sum();
    assert!(approx_eq(summary.income_monthly_dollars, income_lines_total));

    let repayments_total: f64 = summary
        .liabilities
        .iter()
        .filter(|line| line.included)
        .map(|line| line.baseline_repayment_monthly_dollars)
        .sum();
    assert!(approx_eq(summary.repayments_monthly_dollars, repayments_total));

    let stressed_total: f64 = summary
        .liabilities
        .iter()
        .filter(|line| line.included)
        .map(|line| line.stressed_repayment_monthly_dollars)
        .sum();
    assert!(approx_eq(
        summary.stressed_repayments_monthly_dollars,
        stressed_total
    ));

    let expected_surplus =
        summary.income_monthly_dollars - summary.repayments_monthly_dollars - summary.living_expenses_monthly_dollars;
    assert!(approx_eq(summary.surplus_monthly_dollars, expected_surplus));

    let expected_stressed_surplus = summary.income_monthly_dollars
        - summary.stressed_repayments_monthly_dollars
        - summary.living_expenses_monthly_dollars;
    assert!(approx_eq(
        summary.stressed_surplus_monthly_dollars,
        expected_stressed_surplus
    ));

    let living_split_total = summary.living_split.committed_living_monthly_dollars
        + summary.living_split.discretionary_living_monthly_dollars;
    assert!(approx_eq(
        summary.living_expenses_monthly_dollars,
        living_split_total
    ));

    assert!(approx_eq(
        summary.committed_total_monthly_dollars,
        summary.repayments_monthly_dollars + summary.living_split.committed_living_monthly_dollars
    ));
    assert!(approx_eq(
        summary.discretionary_total_monthly_dollars,
        summary.living_split.discretionary_living_monthly_dollars
    ));

    for line in &summary.liabilities {
        if !line.included {
            continue;
        }
        match line.rate_type.as_deref() {
            Some("fixed") => assert!(
                approx_eq(
                    line.baseline_repayment_monthly_dollars,
                    line.stressed_repayment_monthly_dollars
                ),
                "fixed liability {} should not change under stress",
                line.name
            ),
            Some("variable") => assert!(
                line.stressed_repayment_monthly_dollars
                    >= line.baseline_repayment_monthly_dollars - EPSILON,
                "variable liability {} should not decrease under stress",
                line.name
            ),
            _ => {}
        }
    }

    assert_eq!(summary.income_uses_unconfirmed, {
        let income = income_stream::income_summary(min_occurrences, None).expect("income");
        let has_confirmed = income
            .streams
            .iter()
            .any(|stream| stream.is_confirmed && stream.merged_into_key.is_none());
        !has_confirmed && !income.streams.is_empty()
    });
}

#[test]
#[ignore = "requires DATABASE_URL; run: cargo test --test serviceability_integration -- --ignored"]
fn serviceability_higher_buffer_increases_stressed_repayments() {
    load_env_and_migrate();

    let start = NaiveDate::from_ymd_opt(2026, 1, 1).expect("date");
    let end = NaiveDate::from_ymd_opt(2026, 6, 30).expect("date");

    let baseline = serviceability::serviceability_summary(start, end, None, 300, 3)
        .expect("baseline buffer summary");
    let higher = serviceability::serviceability_summary(start, end, None, 600, 3)
        .expect("higher buffer summary");

    assert!(
        higher.stressed_repayments_monthly_dollars
            >= baseline.stressed_repayments_monthly_dollars - EPSILON,
        "600 bps buffer should stress repayments at least as much as 300 bps"
    );

    if baseline.stressed_repayments_monthly_dollars > baseline.repayments_monthly_dollars + EPSILON
    {
        assert!(
            higher.stressed_repayments_monthly_dollars
                > baseline.stressed_repayments_monthly_dollars + EPSILON,
            "when variable debt exists, a larger buffer should increase stressed repayments"
        );
    }
}
