use crate::models::financial_account::FinancialAccount;
use crate::models::statement::{
    statement_coverage_in_window, months_in_range, start_of_month, StatementCoverageGap,
};
use crate::modules::database::get_dbo;
use crate::schema::statement;
use chrono::NaiveDate;
use diesel::prelude::*;
use serde::Serialize;
use std::collections::{BTreeMap, HashMap};

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
enum AccountScope {
    Linked(i64),
    Legacy(String),
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReportCoverageAccountLine {
    pub account_id: Option<i64>,
    pub account_label: String,
    pub months_expected: i32,
    pub months_covered: i32,
    pub missing_months: Vec<String>,
    pub gap_ranges: Vec<StatementCoverageGap>,
    pub multi_month_cadence: bool,
    pub sufficient: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReportCoverageSummaryResponse {
    pub start_date: String,
    pub end_date: String,
    pub months_in_range: i32,
    pub total_month_slots: i32,
    pub covered_month_slots: i32,
    pub sufficient: bool,
    pub summary_statement: String,
    pub accounts: Vec<ReportCoverageAccountLine>,
}

fn load_statement_ranges(
    financial_account_id: Option<i64>,
) -> Result<BTreeMap<AccountScope, Vec<(NaiveDate, NaiveDate)>>, diesel::result::Error> {
    let conn = &mut get_dbo();

    let mut query = statement::table
        .filter(statement::deleted_at.is_null())
        .into_boxed();

    if let Some(account_id) = financial_account_id {
        query = query.filter(statement::financial_account_id.eq(account_id));
    }

    let rows: Vec<(Option<i64>, String, NaiveDate, Option<NaiveDate>, Option<NaiveDate>)> =
        query
            .select((
                statement::financial_account_id,
                statement::account_id,
                statement::date,
                statement::period_start,
                statement::period_end,
            ))
            .load(conn)?;

    let mut ranges_by_account: BTreeMap<AccountScope, Vec<(NaiveDate, NaiveDate)>> =
        BTreeMap::new();

    for (linked_id, account_id, date, period_start, period_end) in rows {
        let scope = match linked_id {
            Some(id) => AccountScope::Linked(id),
            None => AccountScope::Legacy(account_id),
        };
        let start = period_start.unwrap_or_else(|| start_of_month(date));
        let end = period_end.unwrap_or(date);
        ranges_by_account
            .entry(scope)
            .or_default()
            .push((start, end));
    }

    Ok(ranges_by_account)
}

fn account_lines_for_scope(
    scope: AccountScope,
    ranges: &[(NaiveDate, NaiveDate)],
    label: String,
    window_start: NaiveDate,
    window_end: NaiveDate,
    months_in_range_count: i32,
) -> ReportCoverageAccountLine {
    let coverage = statement_coverage_in_window(ranges, window_start, window_end);
    let months_covered =
        months_in_range_count - i32::try_from(coverage.missing_months.len()).unwrap_or(0);

    ReportCoverageAccountLine {
        account_id: match scope {
            AccountScope::Linked(id) => Some(id),
            AccountScope::Legacy(_) => None,
        },
        account_label: label,
        months_expected: months_in_range_count,
        months_covered,
        missing_months: coverage.missing_months,
        gap_ranges: coverage.gap_ranges,
        multi_month_cadence: coverage.multi_month_cadence,
        sufficient: coverage.sufficient,
    }
}

fn build_summary_statement(accounts: &[ReportCoverageAccountLine]) -> String {
    if accounts.is_empty() {
        return "No accounts in scope".to_string();
    }
    if accounts.len() == 1 {
        let account = &accounts[0];
        if account.sufficient {
            return format!(
                "{} of {} months covered for {}",
                account.months_covered, account.months_expected, account.account_label
            );
        }
        let gaps = account.missing_months.join(", ");
        if account.multi_month_cadence && !account.gap_ranges.is_empty() {
            let gap_labels: Vec<String> = account
                .gap_ranges
                .iter()
                .map(|gap| format!("{} to {}", gap.start_date, gap.end_date))
                .collect();
            return format!(
                "{} of {} months covered for {} ({} missing)",
                account.months_covered,
                account.months_expected,
                account.account_label,
                gap_labels.join("; ")
            );
        }
        return format!(
            "{} of {} months covered for {} ({gaps} missing)",
            account.months_covered, account.months_expected, account.account_label
        );
    }

    let covered: i32 = accounts.iter().map(|line| line.months_covered).sum();
    let expected: i32 = accounts.iter().map(|line| line.months_expected).sum();
    if accounts.iter().all(|line| line.sufficient) {
        return format!(
            "{covered} of {expected} account-months covered across {} accounts",
            accounts.len()
        );
    }
    format!(
        "{covered} of {expected} account-months covered across {} accounts — gaps present",
        accounts.len()
    )
}

pub fn coverage_summary(
    start: NaiveDate,
    end: NaiveDate,
    financial_account_id: Option<i64>,
) -> Result<ReportCoverageSummaryResponse, diesel::result::Error> {
    let window_start = start;
    let window_end = end;
    let month_window_start = start_of_month(start);
    let month_window_end = start_of_month(end);
    let expected_months = months_in_range(month_window_start, month_window_end);

    let months_in_range_count = i32::try_from(expected_months.len()).unwrap_or(0);

    let label_by_id: HashMap<i64, String> = FinancialAccount::all_active()?
        .into_iter()
        .map(|account| (account.id, account.display_name))
        .collect();

    let ranges_by_account = load_statement_ranges(financial_account_id)?;
    let mut accounts = Vec::new();

    match financial_account_id {
        Some(account_id) => {
            let label = label_by_id
                .get(&account_id)
                .cloned()
                .unwrap_or_else(|| format!("Account {account_id}"));
            let ranges = ranges_by_account
                .get(&AccountScope::Linked(account_id))
                .map(Vec::as_slice)
                .unwrap_or(&[]);
            accounts.push(account_lines_for_scope(
                AccountScope::Linked(account_id),
                ranges,
                label,
                window_start,
                window_end,
                months_in_range_count,
            ));
        }
        None => {
            for (id, label) in &label_by_id {
                let ranges = ranges_by_account
                    .get(&AccountScope::Linked(*id))
                    .map(Vec::as_slice)
                    .unwrap_or(&[]);
                accounts.push(account_lines_for_scope(
                    AccountScope::Linked(*id),
                    ranges,
                    label.clone(),
                    window_start,
                    window_end,
                    months_in_range_count,
                ));
            }

            for (scope, ranges) in &ranges_by_account {
                let AccountScope::Legacy(account_id) = scope else {
                    continue;
                };
                accounts.push(account_lines_for_scope(
                    scope.clone(),
                    ranges,
                    account_id.clone(),
                    window_start,
                    window_end,
                    months_in_range_count,
                ));
            }
        }
    }

    accounts.sort_by(|left, right| {
        left.account_label
            .cmp(&right.account_label)
            .then_with(|| left.account_id.cmp(&right.account_id))
    });

    let total_month_slots: i32 = accounts.iter().map(|line| line.months_expected).sum();
    let covered_month_slots: i32 = accounts.iter().map(|line| line.months_covered).sum();
    let sufficient = accounts.iter().all(|line| line.sufficient);
    let summary_statement = build_summary_statement(&accounts);

    Ok(ReportCoverageSummaryResponse {
        start_date: start.to_string(),
        end_date: end.to_string(),
        months_in_range: months_in_range_count,
        total_month_slots,
        covered_month_slots,
        sufficient,
        summary_statement,
        accounts,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_summary_statement_single_account_full() {
        let accounts = vec![ReportCoverageAccountLine {
            account_id: Some(1),
            account_label: "Everyday".to_string(),
            months_expected: 6,
            months_covered: 6,
            missing_months: vec![],
            gap_ranges: vec![],
            multi_month_cadence: false,
            sufficient: true,
        }];
        assert_eq!(
            build_summary_statement(&accounts),
            "6 of 6 months covered for Everyday"
        );
    }

    #[test]
    fn build_summary_statement_single_account_gap() {
        let accounts = vec![ReportCoverageAccountLine {
            account_id: Some(1),
            account_label: "Everyday".to_string(),
            months_expected: 6,
            months_covered: 5,
            missing_months: vec!["Mar 2026".to_string()],
            gap_ranges: vec![],
            multi_month_cadence: false,
            sufficient: false,
        }];
        assert_eq!(
            build_summary_statement(&accounts),
            "5 of 6 months covered for Everyday (Mar 2026 missing)"
        );
    }
}
