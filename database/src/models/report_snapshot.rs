use crate::models::analytics::{self, NetWorthPoint};
use crate::models::assets::{Asset, AssetListResponse};
use crate::models::financial_account::FinancialAccount;
use crate::models::income_stream::{self, IncomeSummaryResponse};
use crate::models::lender_expense::{self, LenderExpenseSummaryResponse};
use crate::models::liabilities::{Liability, LiabilityListResponse};
use crate::models::serviceability::{self, ServiceabilitySummaryResponse, DEFAULT_RATE_BUFFER_BPS};
use crate::modules::database::get_dbo;
use crate::schema::broker_report_snapshots;
use chrono::{NaiveDate, NaiveDateTime, Utc};
use diesel::prelude::*;
use serde::Serialize;
use serde_json::Value as JsonValue;

pub const PAYLOAD_VERSION: i32 = 1;

#[derive(
    Queryable,
    Selectable,
    Identifiable,
    Debug,
    Serialize,
    Clone,
)]
#[diesel(table_name = broker_report_snapshots)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct ReportSnapshot {
    pub id: i64,
    pub name: String,
    pub as_at: NaiveDate,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub account_id: Option<i64>,
    pub rate_buffer_bps: i32,
    pub payload: String,
    pub created_at: NaiveDateTime,
    pub deleted_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReportSnapshotListItem {
    pub id: i64,
    pub name: String,
    pub as_at: String,
    pub start_date: String,
    pub end_date: String,
    pub account_id: Option<i64>,
    pub rate_buffer_bps: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReportSnapshotDetail {
    pub id: i64,
    pub name: String,
    pub as_at: String,
    pub start_date: String,
    pub end_date: String,
    pub account_id: Option<i64>,
    pub rate_buffer_bps: i32,
    pub created_at: String,
    pub payload: JsonValue,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReportSnapshotAccountRef {
    pub id: i64,
    pub bank_name: String,
    pub display_name: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReportSnapshotNetWorth {
    pub points: Vec<NetWorthPoint>,
    pub latest: Option<NetWorthPoint>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportSnapshotPayload {
    pub version: i32,
    pub accounts: Vec<ReportSnapshotAccountRef>,
    pub income: IncomeSummaryResponse,
    pub lender_expenses: LenderExpenseSummaryResponse,
    pub serviceability: ServiceabilitySummaryResponse,
    pub assets: AssetListResponse,
    pub liabilities: LiabilityListResponse,
    pub net_worth: ReportSnapshotNetWorth,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = broker_report_snapshots)]
struct NewReportSnapshot<'a> {
    name: &'a str,
    as_at: NaiveDate,
    start_date: NaiveDate,
    end_date: NaiveDate,
    account_id: Option<i64>,
    rate_buffer_bps: i32,
    payload: &'a str,
    created_at: NaiveDateTime,
}

pub struct CaptureInput {
    pub name: String,
    pub as_at: NaiveDate,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub account_id: Option<i64>,
    pub rate_buffer_bps: i32,
    pub min_occurrences: i32,
}

fn latest_net_worth_on_or_before(points: &[NetWorthPoint], as_at: NaiveDate) -> Option<NetWorthPoint> {
    points
        .iter()
        .filter(|point| {
            NaiveDate::parse_from_str(&point.date, "%Y-%m-%d")
                .ok()
                .is_some_and(|date| date <= as_at)
        })
        .max_by_key(|point| point.date.clone())
        .cloned()
}

fn account_refs(accounts: &[FinancialAccount]) -> Vec<ReportSnapshotAccountRef> {
    accounts
        .iter()
        .map(|account| ReportSnapshotAccountRef {
            id: account.id,
            bank_name: account.bank_name.clone(),
            display_name: account.display_name.clone(),
        })
        .collect()
}

pub fn build_payload(input: &CaptureInput) -> Result<ReportSnapshotPayload, diesel::result::Error> {
    let income = income_stream::income_summary(input.min_occurrences, input.account_id)?;
    let lender_expenses =
        lender_expense::expense_summary(input.start_date, input.end_date, input.account_id)?;
    let serviceability = serviceability::serviceability_summary(
        input.start_date,
        input.end_date,
        input.account_id,
        input.rate_buffer_bps,
        input.min_occurrences,
    )?;
    let assets = Asset::list_with_total()?;
    let liabilities = Liability::list_with_total()?;
    let accounts = FinancialAccount::all_active()?;
    let points = analytics::net_worth_over_time(
        Some(input.start_date),
        Some(input.end_date),
        input.account_id,
    )?;
    let latest = latest_net_worth_on_or_before(&points, input.as_at);

    Ok(ReportSnapshotPayload {
        version: PAYLOAD_VERSION,
        accounts: account_refs(&accounts),
        income,
        lender_expenses,
        serviceability,
        assets,
        liabilities,
        net_worth: ReportSnapshotNetWorth { points, latest },
    })
}

impl ReportSnapshot {
    pub fn list_active() -> Result<Vec<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        broker_report_snapshots::table
            .filter(broker_report_snapshots::deleted_at.is_null())
            .order(broker_report_snapshots::created_at.desc())
            .select(ReportSnapshot::as_select())
            .load(conn)
    }

    pub fn find_active(id: i64) -> Result<Option<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        broker_report_snapshots::table
            .filter(broker_report_snapshots::id.eq(id))
            .filter(broker_report_snapshots::deleted_at.is_null())
            .select(ReportSnapshot::as_select())
            .first(conn)
            .optional()
    }

    pub fn capture(input: CaptureInput) -> Result<Self, diesel::result::Error> {
        let payload = build_payload(&input)?;
        let payload_json = serde_json::to_string(&payload).map_err(|err| {
            eprintln!("Failed to serialise snapshot payload: {err:?}");
            diesel::result::Error::SerializationError(Box::new(err))
        })?;
        let conn = &mut get_dbo();
        diesel::insert_into(broker_report_snapshots::table)
            .values(NewReportSnapshot {
                name: &input.name,
                as_at: input.as_at,
                start_date: input.start_date,
                end_date: input.end_date,
                account_id: input.account_id,
                rate_buffer_bps: input.rate_buffer_bps,
                payload: &payload_json,
                created_at: Utc::now().naive_utc(),
            })
            .returning(ReportSnapshot::as_returning())
            .get_result(conn)
    }

    pub fn soft_delete(id: i64) -> Result<(), diesel::result::Error> {
        let conn = &mut get_dbo();
        let rows = diesel::update(
            broker_report_snapshots::table
                .filter(broker_report_snapshots::id.eq(id))
                .filter(broker_report_snapshots::deleted_at.is_null()),
        )
        .set(broker_report_snapshots::deleted_at.eq(Some(Utc::now().naive_utc())))
        .execute(conn)?;
        if rows == 0 {
            return Err(diesel::result::Error::NotFound);
        }
        Ok(())
    }

    pub fn to_list_item(&self) -> ReportSnapshotListItem {
        ReportSnapshotListItem {
            id: self.id,
            name: self.name.clone(),
            as_at: self.as_at.to_string(),
            start_date: self.start_date.to_string(),
            end_date: self.end_date.to_string(),
            account_id: self.account_id,
            rate_buffer_bps: self.rate_buffer_bps,
            created_at: self.created_at.to_string(),
        }
    }

    pub fn parse_payload(&self) -> Result<JsonValue, diesel::result::Error> {
        serde_json::from_str(&self.payload).map_err(|err| {
            eprintln!("Failed to deserialise snapshot payload: {err:?}");
            diesel::result::Error::DeserializationError(Box::new(err))
        })
    }

    pub fn to_detail(&self) -> Result<ReportSnapshotDetail, diesel::result::Error> {
        let payload = self.parse_payload()?;
        Ok(ReportSnapshotDetail {
            id: self.id,
            name: self.name.clone(),
            as_at: self.as_at.to_string(),
            start_date: self.start_date.to_string(),
            end_date: self.end_date.to_string(),
            account_id: self.account_id,
            rate_buffer_bps: self.rate_buffer_bps,
            created_at: self.created_at.to_string(),
            payload,
        })
    }
}

pub fn default_rate_buffer_bps() -> i32 {
    DEFAULT_RATE_BUFFER_BPS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn latest_net_worth_picks_last_point_on_or_before_as_at() {
        let points = vec![
            NetWorthPoint {
                date: "2026-01-01".to_string(),
                available_cash: 1.0,
                assets: 2.0,
                liabilities: 3.0,
                net_worth: 0.0,
            },
            NetWorthPoint {
                date: "2026-03-01".to_string(),
                available_cash: 4.0,
                assets: 5.0,
                liabilities: 6.0,
                net_worth: 3.0,
            },
            NetWorthPoint {
                date: "2026-06-01".to_string(),
                available_cash: 7.0,
                assets: 8.0,
                liabilities: 9.0,
                net_worth: 6.0,
            },
        ];
        let as_at = NaiveDate::from_ymd_opt(2026, 4, 15).expect("date");
        let latest = latest_net_worth_on_or_before(&points, as_at).expect("latest");
        assert_eq!(latest.date, "2026-03-01");
        assert_eq!(latest.net_worth, 3.0);
    }
}
