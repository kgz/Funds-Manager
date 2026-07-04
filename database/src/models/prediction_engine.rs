use crate::models::analytics::dashboard_kpis;
use crate::models::planned_spending::PlannedSpending;
use crate::models::transaction::EXCLUDE_CONFIRMED_TRANSFERS_AND;
use crate::modules::database::get_dbo;
use chrono::{Datelike, Duration, NaiveDate};
use diesel::prelude::*;
use diesel::sql_query;
use diesel::sql_types::{BigInt, Date, Nullable};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LineFrequency {
    Once,
    Weekly,
    Fortnightly,
    Monthly,
    Yearly,
}

impl LineFrequency {
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "once" => Some(Self::Once),
            "weekly" => Some(Self::Weekly),
            "fortnightly" => Some(Self::Fortnightly),
            "monthly" => Some(Self::Monthly),
            "yearly" => Some(Self::Yearly),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Once => "once",
            Self::Weekly => "weekly",
            Self::Fortnightly => "fortnightly",
            Self::Monthly => "monthly",
            Self::Yearly => "yearly",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdjustmentLine {
    pub amount_cents: i64,
    pub frequency: LineFrequency,
    pub start_date: NaiveDate,
    pub end_date: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalancePoint {
    pub date: String,
    pub balance_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaselineMetadata {
    pub starting_balance_cents: i64,
    pub baseline_monthly_net_cents: i64,
    pub baseline_daily_net_cents: i64,
    pub months_averaged: u32,
    pub planned_item_count: usize,
    pub repeat_adjustment_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaselineProjection {
    pub points: Vec<BalancePoint>,
    pub metadata: BaselineMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalGapResult {
    pub projected_balance_cents: i64,
    pub gap_cents: i64,
    pub months_remaining: u32,
    pub suggested_monthly_cents: i64,
}

fn line_active_on(
    start_date: NaiveDate,
    end_date: Option<NaiveDate>,
    day: NaiveDate,
) -> bool {
    if day < start_date {
        return false;
    }
    if let Some(end) = end_date {
        if day > end {
            return false;
        }
    }
    true
}

fn month_bounds(year: i32, month: u32) -> (NaiveDate, NaiveDate) {
    let start = NaiveDate::from_ymd_opt(year, month, 1).expect("valid month start");
    let end = if month == 12 {
        NaiveDate::from_ymd_opt(year + 1, 1, 1).expect("valid year rollover") - Duration::days(1)
    } else {
        NaiveDate::from_ymd_opt(year, month + 1, 1).expect("valid month end") - Duration::days(1)
    };
    (start, end)
}

fn months_in_range(from: NaiveDate, to: NaiveDate) -> Vec<(i32, u32)> {
    let mut months = Vec::new();
    let mut year = from.year();
    let mut month = from.month();
    let end_year = to.year();
    let end_month = to.month();
    loop {
        months.push((year, month));
        if year == end_year && month == end_month {
            break;
        }
        if month == 12 {
            year += 1;
            month = 1;
        } else {
            month += 1;
        }
    }
    months
}

fn format_month_label(year: i32, month: u32) -> String {
    let (start, _) = month_bounds(year, month);
    start.format("%b %Y").to_string()
}

fn count_interval_occurrences(
    start_date: NaiveDate,
    end_date: Option<NaiveDate>,
    month_start: NaiveDate,
    month_end: NaiveDate,
    step_days: i64,
) -> i32 {
    let mut count = 0;
    let mut day = start_date;
    while day < month_start {
        day += Duration::days(step_days);
    }
    while day <= month_end {
        if line_active_on(start_date, end_date, day) {
            count += 1;
        }
        day += Duration::days(step_days);
    }
    count
}

fn format_date(day: NaiveDate) -> String {
    day.format("%Y-%m-%d").to_string()
}

fn days_in_month(year: i32, month: u32) -> i64 {
    let (start, end) = month_bounds(year, month);
    i64::from((end - start).num_days() + 1)
}

fn daily_baseline_delta(monthly_net_cents: i64, day: NaiveDate) -> i64 {
    let dim = days_in_month(day.year(), day.month()).max(1);
    monthly_net_cents / dim
}

fn days_in_range(from: NaiveDate, to: NaiveDate) -> Vec<NaiveDate> {
    let mut days = Vec::new();
    let mut day = from;
    while day <= to {
        days.push(day);
        day += Duration::days(1);
    }
    days
}

pub fn line_effect_on_day(line: &AdjustmentLine, day: NaiveDate) -> i64 {
    if !line_active_on(line.start_date, line.end_date, day) {
        return 0;
    }

    let amount = line.amount_cents;
    match line.frequency {
        LineFrequency::Once => {
            if day == line.start_date {
                amount
            } else {
                0
            }
        }
        LineFrequency::Weekly => {
            let diff = (day - line.start_date).num_days();
            if diff >= 0 && diff % 7 == 0 {
                amount
            } else {
                0
            }
        }
        LineFrequency::Fortnightly => {
            let diff = (day - line.start_date).num_days();
            if diff >= 0 && diff % 14 == 0 {
                amount
            } else {
                0
            }
        }
        LineFrequency::Monthly => {
            if day.day() == line.start_date.day() {
                amount
            } else {
                0
            }
        }
        LineFrequency::Yearly => {
            if day.month() == line.start_date.month() && day.day() == line.start_date.day() {
                amount
            } else {
                0
            }
        }
    }
}

pub fn line_effect_in_month(line: &AdjustmentLine, year: i32, month: u32) -> i64 {
    let (month_start, month_end) = month_bounds(year, month);
    if month_end < line.start_date {
        return 0;
    }
    if let Some(end) = line.end_date {
        if month_start > end {
            return 0;
        }
    }

    let amount = line.amount_cents;
    match line.frequency {
        LineFrequency::Once => {
            if line.start_date >= month_start && line.start_date <= month_end {
                amount
            } else {
                0
            }
        }
        LineFrequency::Monthly => {
            if line_active_on(line.start_date, line.end_date, month_end) {
                amount
            } else {
                0
            }
        }
        LineFrequency::Weekly => {
            let count = count_interval_occurrences(
                line.start_date,
                line.end_date,
                month_start,
                month_end,
                7,
            );
            amount * i64::from(count)
        }
        LineFrequency::Fortnightly => {
            let count = count_interval_occurrences(
                line.start_date,
                line.end_date,
                month_start,
                month_end,
                14,
            );
            amount * i64::from(count)
        }
        LineFrequency::Yearly => {
            if line.start_date.month() == month {
                let anniversary = NaiveDate::from_ymd_opt(year, month, line.start_date.day());
                if let Some(day) = anniversary {
                    if line_active_on(line.start_date, line.end_date, day) {
                        return amount;
                    }
                }
            }
            0
        }
    }
}

pub fn planned_to_adjustment(item: &PlannedSpending) -> AdjustmentLine {
    AdjustmentLine {
        amount_cents: i64::from(item.amount_cents),
        frequency: LineFrequency::Once,
        start_date: item.start_date,
        end_date: item.end_date,
    }
}

pub fn project_balance(
    starting_balance_cents: i64,
    from: NaiveDate,
    to: NaiveDate,
    baseline_monthly_net_cents: i64,
    extra_lines: &[AdjustmentLine],
) -> Vec<BalancePoint> {
    let horizon_days = days_in_range(from, to);
    let mut points = Vec::with_capacity(horizon_days.len());
    let mut balance = starting_balance_cents;

    for (index, day) in horizon_days.iter().enumerate() {
        if index > 0 {
            let mut delta = daily_baseline_delta(baseline_monthly_net_cents, *day);
            for line in extra_lines {
                delta += line_effect_on_day(line, *day);
            }
            balance += delta;
        }
        points.push(BalancePoint {
            date: format_date(*day),
            balance_cents: balance,
        });
    }

    points
}

pub fn balance_at_date(points: &[BalancePoint], target_date: NaiveDate) -> Option<i64> {
    if points.is_empty() {
        return None;
    }
    let target = format_date(target_date);
    for point in points {
        if point.date == target {
            return Some(point.balance_cents);
        }
    }
    if target_date < NaiveDate::parse_from_str(&points[0].date, "%Y-%m-%d").ok()? {
        return None;
    }
    points.last().map(|point| point.balance_cents)
}

pub fn goal_gap(
    target_amount_cents: i64,
    target_date: NaiveDate,
    today: NaiveDate,
    points: &[BalancePoint],
) -> Option<GoalGapResult> {
    let projected = balance_at_date(points, target_date)?;
    let gap = target_amount_cents - projected;
    let months_remaining = months_between_inclusive(today, target_date);
    let suggested_monthly = if gap > 0 && months_remaining > 0 {
        gap / i64::from(months_remaining)
    } else {
        0
    };
    Some(GoalGapResult {
        projected_balance_cents: projected,
        gap_cents: gap,
        months_remaining,
        suggested_monthly_cents: suggested_monthly,
    })
}

pub fn months_between_inclusive(from: NaiveDate, to: NaiveDate) -> u32 {
    if to < from {
        return 0;
    }
    let year_diff = to.year() - from.year();
    let month_diff = to.month() as i32 - from.month() as i32;
    (year_diff as u32)
        .saturating_mul(12)
        .saturating_add(month_diff.unsigned_abs())
        .max(1)
}

#[derive(QueryableByName, Debug)]
struct MonthNetRow {
    #[diesel(sql_type = BigInt)]
    net_cents: i64,
}

fn recent_avg_net_cents(
    as_of: NaiveDate,
    financial_account_id: Option<i64>,
    lookback_complete_months: u32,
) -> Result<(i64, u32), diesel::result::Error> {
    let conn = &mut get_dbo();
    let first_of_month = NaiveDate::from_ymd_opt(as_of.year(), as_of.month(), 1)
        .ok_or(diesel::result::Error::NotFound)?;
    let end = first_of_month - Duration::days(1);
    let lookback_start = {
        let mut year = end.year();
        let mut month = end.month();
        let steps = lookback_complete_months.saturating_sub(1);
        for _ in 0..steps {
            if month == 1 {
                year -= 1;
                month = 12;
            } else {
                month -= 1;
            }
        }
        NaiveDate::from_ymd_opt(year, month, 1).ok_or(diesel::result::Error::NotFound)?
    };

    let row = sql_query(&format!(
        r#"
        WITH monthly AS (
            SELECT
                date_trunc('month', transaction_date)::date AS month_start,
                COALESCE(SUM(amount), 0)::bigint AS net_cents
            FROM transaction_data
            WHERE deleted_at IS NULL
              AND EXISTS (
                  SELECT 1 FROM statement s
                  WHERE s.id = transaction_data.statement_id AND s.deleted_at IS NULL
              )
              AND ($3::bigint IS NULL OR EXISTS (
                  SELECT 1 FROM statement s2
                  WHERE s2.id = transaction_data.statement_id
                    AND s2.deleted_at IS NULL
                    AND s2.financial_account_id = $3
              ))
              AND transaction_date::date >= $1
              AND transaction_date::date <= $2
              {EXCLUDE_CONFIRMED_TRANSFERS_AND}
            GROUP BY date_trunc('month', transaction_date)
        )
        SELECT COALESCE(AVG(net_cents), 0)::bigint AS net_cents
        FROM monthly
        "#,
    ))
    .bind::<Date, _>(lookback_start)
    .bind::<Date, _>(end)
    .bind::<Nullable<BigInt>, _>(financial_account_id)
    .get_result::<MonthNetRow>(conn)?;

    let months_row = sql_query(&format!(
        r#"
        SELECT COUNT(DISTINCT date_trunc('month', transaction_date))::bigint AS net_cents
        FROM transaction_data
        WHERE deleted_at IS NULL
          AND EXISTS (
              SELECT 1 FROM statement s
              WHERE s.id = transaction_data.statement_id AND s.deleted_at IS NULL
          )
          AND ($3::bigint IS NULL OR EXISTS (
              SELECT 1 FROM statement s2
              WHERE s2.id = transaction_data.statement_id
                AND s2.deleted_at IS NULL
                AND s2.financial_account_id = $3
          ))
          AND transaction_date::date >= $1
          AND transaction_date::date <= $2
          {EXCLUDE_CONFIRMED_TRANSFERS_AND}
        "#,
    ))
    .bind::<Date, _>(lookback_start)
    .bind::<Date, _>(end)
    .bind::<Nullable<BigInt>, _>(financial_account_id)
    .get_result::<MonthNetRow>(conn)?;

    let months_count = months_row.net_cents.clamp(0, i64::from(lookback_complete_months)) as u32;
    Ok((row.net_cents, months_count.max(1)))
}

const BASELINE_LOOKBACK_MONTHS: u32 = 6;
const AVG_DAYS_PER_MONTH: i64 = 30;

pub fn compute_baseline(
    from: NaiveDate,
    to: NaiveDate,
    financial_account_id: Option<i64>,
    repeat_adjustments: &[AdjustmentLine],
) -> Result<BaselineProjection, diesel::result::Error> {
    let today = from;
    let kpis = dashboard_kpis(None, Some(today), financial_account_id)?;
    let starting_balance_cents = kpis
        .balance
        .map(|dollars| (dollars * 100.0).round() as i64)
        .unwrap_or(0);
    let (baseline_monthly_net_cents, months_averaged) =
        recent_avg_net_cents(today, financial_account_id, BASELINE_LOOKBACK_MONTHS)?;

    let planned = PlannedSpending::list_overlapping(from, to, false)?;
    let planned_item_count = planned.len();
    let extra_lines: Vec<AdjustmentLine> = planned
        .iter()
        .map(planned_to_adjustment)
        .collect();
    // Monthly net already includes recurring spend/income from history; do not
    // also apply repeat_adjustments or the same flows are double-counted.

    let points = project_balance(
        starting_balance_cents,
        from,
        to,
        baseline_monthly_net_cents,
        &extra_lines,
    );

    Ok(BaselineProjection {
        points,
        metadata: BaselineMetadata {
            starting_balance_cents,
            baseline_monthly_net_cents,
            baseline_daily_net_cents: baseline_monthly_net_cents / AVG_DAYS_PER_MONTH,
            months_averaged,
            planned_item_count,
            repeat_adjustment_count: repeat_adjustments.len(),
        },
    })
}

pub fn compute_scenario(
    from: NaiveDate,
    to: NaiveDate,
    financial_account_id: Option<i64>,
    repeat_adjustments: &[AdjustmentLine],
    scenario_lines: &[AdjustmentLine],
) -> Result<BaselineProjection, diesel::result::Error> {
    let baseline = compute_baseline(from, to, financial_account_id, repeat_adjustments)?;

    if scenario_lines.is_empty() {
        return Ok(baseline);
    }

    let mut scenario_running_total: i64 = 0;
    let mut points = Vec::with_capacity(baseline.points.len());

    for (index, point) in baseline.points.iter().enumerate() {
        if index > 0 {
            if let Ok(day) = NaiveDate::parse_from_str(&point.date, "%Y-%m-%d") {
                for line in scenario_lines {
                    scenario_running_total += line_effect_on_day(line, day);
                }
            }
        }
        points.push(BalancePoint {
            date: point.date.clone(),
            balance_cents: point.balance_cents + scenario_running_total,
        });
    }

    Ok(BaselineProjection {
        points,
        metadata: baseline.metadata,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn d(value: &str) -> NaiveDate {
        NaiveDate::parse_from_str(value, "%Y-%m-%d").expect("date")
    }

    fn line(amount: i64, frequency: LineFrequency, start: &str) -> AdjustmentLine {
        AdjustmentLine {
            amount_cents: amount,
            frequency,
            start_date: d(start),
            end_date: None,
        }
    }

    #[test]
    fn project_balance_starts_at_current_balance() {
        let points = project_balance(100_000, d("2026-01-01"), d("2026-01-03"), 0, &[]);
        assert_eq!(points[0].date, "2026-01-01");
        assert_eq!(points[0].balance_cents, 100_000);
        assert_eq!(points[1].balance_cents, 100_000);
    }

    #[test]
    fn project_balance_applies_daily_net_from_monthly_average() {
        let points = project_balance(10_000, d("2026-01-01"), d("2026-01-31"), 3_100, &[]);
        assert_eq!(points.len(), 31);
        assert_eq!(points[0].balance_cents, 10_000);
        assert_eq!(points[1].balance_cents, 10_100);
        assert_eq!(points[30].balance_cents, 13_000);
    }

    #[test]
    fn once_line_applies_on_target_day_only() {
        let lines = vec![line(-2_000, LineFrequency::Once, "2026-01-15")];
        let points = project_balance(0, d("2026-01-01"), d("2026-01-17"), 0, &lines);
        assert_eq!(points[14].balance_cents, -2_000);
        assert_eq!(points[15].balance_cents, -2_000);
    }

    #[test]
    fn weekly_line_applies_every_seven_days() {
        let lines = vec![line(-100, LineFrequency::Weekly, "2026-01-01")];
        let points = project_balance(0, d("2026-01-01"), d("2026-01-15"), 0, &lines);
        assert_eq!(points[0].balance_cents, 0);
        assert_eq!(points[7].balance_cents, -100);
        assert_eq!(points[14].balance_cents, -200);
    }

    #[test]
    fn goal_gap_positive_shortfall() {
        let points = project_balance(50_000, d("2026-01-01"), d("2026-06-30"), 10_000, &[]);
        let gap = goal_gap(200_000, d("2026-06-30"), d("2026-01-01"), &points).expect("gap");
        assert!(gap.gap_cents > 0);
        assert!(gap.suggested_monthly_cents > 0);
    }

    #[test]
    fn goal_gap_no_shortfall_when_on_track() {
        let points = project_balance(500_000, d("2026-01-01"), d("2026-03-31"), 0, &[]);
        let gap = goal_gap(100_000, d("2026-03-31"), d("2026-01-01"), &points).expect("gap");
        assert!(gap.gap_cents <= 0);
        assert_eq!(gap.suggested_monthly_cents, 0);
    }

    #[test]
    fn compute_scenario_matches_baseline_without_lines() {
        let baseline_points =
            project_balance(50_000, d("2026-01-01"), d("2026-01-05"), 0, &[]);
        let scenario_lines = vec![line(-1_000, LineFrequency::Once, "2026-01-03")];
        let mut scenario_running_total: i64 = 0;
        let mut scenario_points = Vec::new();
        for (index, point) in baseline_points.iter().enumerate() {
            if index > 0 {
                if let Ok(day) = NaiveDate::parse_from_str(&point.date, "%Y-%m-%d") {
                    for line in &scenario_lines {
                        scenario_running_total += line_effect_on_day(line, day);
                    }
                }
            }
            scenario_points.push(BalancePoint {
                date: point.date.clone(),
                balance_cents: point.balance_cents + scenario_running_total,
            });
        }
        assert_eq!(scenario_points[2].balance_cents, baseline_points[2].balance_cents - 1_000);
        assert_eq!(scenario_points[0].balance_cents, baseline_points[0].balance_cents);
    }

    #[test]
    fn balance_at_date_matches_iso_day() {
        let points = project_balance(0, d("2026-01-01"), d("2026-01-05"), 1_000, &[]);
        let balance = balance_at_date(&points, d("2026-01-03")).expect("balance");
        assert_eq!(balance, points[2].balance_cents);
    }

    #[test]
    fn months_between_inclusive_counts_partial_months() {
        assert_eq!(months_between_inclusive(d("2026-01-15"), d("2026-03-01")), 2);
        assert_eq!(months_between_inclusive(d("2026-06-01"), d("2026-06-30")), 1);
    }
}
