use crate::models::report_snapshot::ReportSnapshot;
use crate::models::transaction::Transaction;
use crate::modules::database::get_dbo;
use crate::schema::{broker_report_annotations, broker_report_shares, broker_report_snapshots};
use chrono::{NaiveDateTime, Utc};
use diesel::prelude::*;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::sync::LazyLock;
use uuid::Uuid;

pub const DISCLAIMER: &str =
    "Supporting summary only. Not financial advice. Verify figures against your own records and official documents.";

static ACCOUNT_NUMBER_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\b\d{6,}\b").expect("account number regex"));

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ReportRedaction {
    #[serde(default = "default_hide_account_numbers")]
    pub hide_account_numbers: bool,
    #[serde(default)]
    pub hidden_merchant_patterns: Vec<String>,
}

fn default_hide_account_numbers() -> bool {
    true
}

#[derive(Queryable, Selectable, Debug, Clone)]
#[diesel(table_name = broker_report_shares)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct BrokerReportShare {
    pub id: i64,
    pub snapshot_id: i64,
    pub token: String,
    pub redaction: String,
    pub created_at: NaiveDateTime,
    pub revoked_at: Option<NaiveDateTime>,
}

#[derive(Insertable)]
#[diesel(table_name = broker_report_shares)]
struct NewBrokerReportShare<'a> {
    snapshot_id: i64,
    token: &'a str,
    redaction: &'a str,
    created_at: NaiveDateTime,
}

#[derive(Queryable, Selectable, Debug, Clone)]
#[diesel(table_name = broker_report_annotations)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct BrokerReportAnnotation {
    pub id: i64,
    pub snapshot_id: i64,
    pub transaction_id: i64,
    pub note: String,
    pub exclude_from_analysis: bool,
    pub created_at: NaiveDateTime,
    pub deleted_at: Option<NaiveDateTime>,
}

#[derive(Insertable)]
#[diesel(table_name = broker_report_annotations)]
struct NewBrokerReportAnnotation<'a> {
    snapshot_id: i64,
    transaction_id: i64,
    note: &'a str,
    exclude_from_analysis: bool,
    created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BrokerReportShareListItem {
    pub id: i64,
    pub token: String,
    pub url_path: String,
    pub redaction: ReportRedaction,
    pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BrokerReportAnnotationItem {
    pub id: i64,
    pub transaction_id: i64,
    pub transaction_description: String,
    pub transaction_date: String,
    pub transaction_amount: i32,
    pub note: String,
    pub exclude_from_analysis: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PublicBrokerReportSnapshotMeta {
    pub id: i64,
    pub name: String,
    pub as_at: String,
    pub start_date: String,
    pub end_date: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PublicBrokerReportResponse {
    pub snapshot: PublicBrokerReportSnapshotMeta,
    pub payload: JsonValue,
    pub annotations: Vec<BrokerReportAnnotationItem>,
    pub redaction: ReportRedaction,
    pub disclaimer: &'static str,
}

pub fn parse_redaction_json(raw: &str) -> ReportRedaction {
    serde_json::from_str(raw).unwrap_or_default()
}

pub fn redact_string(value: &str, redaction: &ReportRedaction) -> String {
    let mut result = value.to_string();
    if redaction.hide_account_numbers {
        result = ACCOUNT_NUMBER_RE
            .replace_all(&result, "[account]")
            .into_owned();
    }
    for pattern in &redaction.hidden_merchant_patterns {
        let trimmed = pattern.trim();
        if trimmed.is_empty() {
            continue;
        }
        if result.to_lowercase().contains(&trimmed.to_lowercase()) {
            result = "[redacted]".to_string();
            break;
        }
    }
    result
}

fn redact_json_value(value: &mut JsonValue, redaction: &ReportRedaction) {
    match value {
        JsonValue::String(text) => {
            *text = redact_string(text, redaction);
        }
        JsonValue::Array(items) => {
            for item in items {
                redact_json_value(item, redaction);
            }
        }
        JsonValue::Object(map) => {
            for nested in map.values_mut() {
                redact_json_value(nested, redaction);
            }
        }
        _ => {}
    }
}

pub fn apply_redaction(mut payload: JsonValue, redaction: &ReportRedaction) -> JsonValue {
    if redaction.hide_account_numbers {
        if let Some(accounts) = payload
            .get_mut("accounts")
            .and_then(JsonValue::as_array_mut)
        {
            for account in accounts {
                if let Some(obj) = account.as_object_mut() {
                    obj.remove("accountNumber");
                    if let Some(display_name) = obj.get_mut("displayName") {
                        if let Some(text) = display_name.as_str() {
                            *display_name = JsonValue::String(redact_string(text, redaction));
                        }
                    }
                }
            }
        }
    }
    redact_json_value(&mut payload, redaction);
    payload
}

fn ensure_active_snapshot(snapshot_id: i64) -> Result<ReportSnapshot, diesel::result::Error> {
    ReportSnapshot::find_active(snapshot_id)?.ok_or(diesel::result::Error::NotFound)
}

impl BrokerReportShare {
    pub fn list_active_for_snapshot(
        snapshot_id: i64,
    ) -> Result<Vec<Self>, diesel::result::Error> {
        ensure_active_snapshot(snapshot_id)?;
        let conn = &mut get_dbo();
        broker_report_shares::table
            .filter(broker_report_shares::snapshot_id.eq(snapshot_id))
            .filter(broker_report_shares::revoked_at.is_null())
            .order(broker_report_shares::created_at.desc())
            .select(BrokerReportShare::as_select())
            .load(conn)
    }

    pub fn create(
        snapshot_id: i64,
        redaction: &ReportRedaction,
    ) -> Result<Self, diesel::result::Error> {
        ensure_active_snapshot(snapshot_id)?;
        let redaction_json = serde_json::to_string(redaction).map_err(|err| {
            eprintln!("Failed to serialise redaction: {err:?}");
            diesel::result::Error::SerializationError(Box::new(err))
        })?;
        let token = Uuid::new_v4().to_string();
        let conn = &mut get_dbo();
        diesel::insert_into(broker_report_shares::table)
            .values(NewBrokerReportShare {
                snapshot_id,
                token: &token,
                redaction: &redaction_json,
                created_at: Utc::now().naive_utc(),
            })
            .returning(BrokerReportShare::as_returning())
            .get_result(conn)
    }

    pub fn revoke(snapshot_id: i64, share_id: i64) -> Result<(), diesel::result::Error> {
        ensure_active_snapshot(snapshot_id)?;
        let conn = &mut get_dbo();
        let rows = diesel::update(
            broker_report_shares::table
                .filter(broker_report_shares::id.eq(share_id))
                .filter(broker_report_shares::snapshot_id.eq(snapshot_id))
                .filter(broker_report_shares::revoked_at.is_null()),
        )
        .set(broker_report_shares::revoked_at.eq(Some(Utc::now().naive_utc())))
        .execute(conn)?;
        if rows == 0 {
            return Err(diesel::result::Error::NotFound);
        }
        Ok(())
    }

    pub fn find_active_by_token(token: &str) -> Result<Option<Self>, diesel::result::Error> {
        let conn = &mut get_dbo();
        broker_report_shares::table
            .filter(broker_report_shares::token.eq(token))
            .filter(broker_report_shares::revoked_at.is_null())
            .select(BrokerReportShare::as_select())
            .first(conn)
            .optional()
    }

    pub fn to_list_item(&self) -> BrokerReportShareListItem {
        BrokerReportShareListItem {
            id: self.id,
            token: self.token.clone(),
            url_path: format!("/r/{}", self.token),
            redaction: parse_redaction_json(&self.redaction),
            created_at: self.created_at.to_string(),
        }
    }
}

impl BrokerReportAnnotation {
    fn annotation_items(rows: Vec<Self>) -> Result<Vec<BrokerReportAnnotationItem>, diesel::result::Error> {
        let mut items = Vec::with_capacity(rows.len());
        for row in rows {
            let transaction = Transaction::find(row.transaction_id)?
                .ok_or(diesel::result::Error::NotFound)?;
            items.push(BrokerReportAnnotationItem {
                id: row.id,
                transaction_id: row.transaction_id,
                transaction_description: transaction.description,
                transaction_date: transaction.transaction_date.to_string(),
                transaction_amount: transaction.amount,
                note: row.note,
                exclude_from_analysis: row.exclude_from_analysis,
                created_at: row.created_at.to_string(),
            });
        }
        Ok(items)
    }

    pub fn list_for_snapshot(
        snapshot_id: i64,
    ) -> Result<Vec<BrokerReportAnnotationItem>, diesel::result::Error> {
        ensure_active_snapshot(snapshot_id)?;
        let conn = &mut get_dbo();
        let rows = broker_report_annotations::table
            .filter(broker_report_annotations::snapshot_id.eq(snapshot_id))
            .filter(broker_report_annotations::deleted_at.is_null())
            .order(broker_report_annotations::created_at.asc())
            .select(BrokerReportAnnotation::as_select())
            .load(conn)?;
        Self::annotation_items(rows)
    }

    pub fn create(
        snapshot_id: i64,
        transaction_id: i64,
        note: &str,
        exclude_from_analysis: bool,
    ) -> Result<BrokerReportAnnotationItem, diesel::result::Error> {
        ensure_active_snapshot(snapshot_id)?;
        let trimmed = note.trim();
        if trimmed.is_empty() {
            return Err(diesel::result::Error::NotFound);
        }
        Transaction::find(transaction_id)?
            .ok_or(diesel::result::Error::NotFound)?;
        let conn = &mut get_dbo();
        let row = diesel::insert_into(broker_report_annotations::table)
            .values(NewBrokerReportAnnotation {
                snapshot_id,
                transaction_id,
                note: trimmed,
                exclude_from_analysis,
                created_at: Utc::now().naive_utc(),
            })
            .returning(BrokerReportAnnotation::as_returning())
            .get_result(conn)?;
        Self::annotation_items(vec![row])?
            .into_iter()
            .next()
            .ok_or(diesel::result::Error::NotFound)
    }

    pub fn soft_delete(snapshot_id: i64, annotation_id: i64) -> Result<(), diesel::result::Error> {
        ensure_active_snapshot(snapshot_id)?;
        let conn = &mut get_dbo();
        let rows = diesel::update(
            broker_report_annotations::table
                .filter(broker_report_annotations::id.eq(annotation_id))
                .filter(broker_report_annotations::snapshot_id.eq(snapshot_id))
                .filter(broker_report_annotations::deleted_at.is_null()),
        )
        .set(broker_report_annotations::deleted_at.eq(Some(Utc::now().naive_utc())))
        .execute(conn)?;
        if rows == 0 {
            return Err(diesel::result::Error::NotFound);
        }
        Ok(())
    }
}

pub fn public_report_by_token(token: &str) -> Result<PublicBrokerReportResponse, diesel::result::Error> {
    let share = BrokerReportShare::find_active_by_token(token)?
        .ok_or(diesel::result::Error::NotFound)?;
    let snapshot = broker_report_snapshots::table
        .filter(broker_report_snapshots::id.eq(share.snapshot_id))
        .filter(broker_report_snapshots::deleted_at.is_null())
        .select(ReportSnapshot::as_select())
        .first(&mut get_dbo())?;
    let redaction = parse_redaction_json(&share.redaction);
    let payload = apply_redaction(snapshot.parse_payload()?, &redaction);
    let annotations = BrokerReportAnnotation::list_for_snapshot(snapshot.id)?;
    Ok(PublicBrokerReportResponse {
        snapshot: PublicBrokerReportSnapshotMeta {
            id: snapshot.id,
            name: snapshot.name,
            as_at: snapshot.as_at.to_string(),
            start_date: snapshot.start_date.to_string(),
            end_date: snapshot.end_date.to_string(),
            created_at: snapshot.created_at.to_string(),
        },
        payload,
        annotations,
        redaction,
        disclaimer: DISCLAIMER,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn redact_string_hides_account_numbers() {
        let redaction = ReportRedaction {
            hide_account_numbers: true,
            hidden_merchant_patterns: vec![],
        };
        assert_eq!(
            redact_string("Transfer to 045692740", &redaction),
            "Transfer to [account]"
        );
    }

    #[test]
    fn redact_string_hides_merchant_pattern() {
        let redaction = ReportRedaction {
            hide_account_numbers: false,
            hidden_merchant_patterns: vec!["coles".to_string()],
        };
        assert_eq!(
            redact_string("COLES8721 purchase", &redaction),
            "[redacted]"
        );
    }

    #[test]
    fn apply_redaction_walks_income_labels() {
        let payload = json!({
            "income": {
                "streams": [{ "label": "COLES wages", "sourceLabel": "COLES8721" }]
            }
        });
        let redaction = ReportRedaction {
            hide_account_numbers: false,
            hidden_merchant_patterns: vec!["coles".to_string()],
        };
        let result = apply_redaction(payload, &redaction);
        assert_eq!(
            result["income"]["streams"][0]["label"].as_str(),
            Some("[redacted]")
        );
    }
}
