//! Integration tests for broker report snapshots.
//!
//! ```bash
//! cd database && cargo test --test report_snapshot_integration -- --ignored --nocapture
//! ```

use chrono::NaiveDate;
use database::models::report_snapshot::{CaptureInput, ReportSnapshot, PAYLOAD_VERSION};
use database::modules::database::migrate_on_startup;

fn load_env_and_migrate() {
    let _ = dotenv::from_filename(".env");
    let _ = dotenv::from_filename("../.env");
    let _ = dotenv::from_filename("database/.env");
    migrate_on_startup().expect("migrations should apply");
}

#[test]
#[ignore = "requires DATABASE_URL; run: cargo test --test report_snapshot_integration -- --ignored"]
fn capture_persists_and_replays_payload() {
    load_env_and_migrate();

    let start = NaiveDate::from_ymd_opt(2026, 1, 1).expect("date");
    let end = NaiveDate::from_ymd_opt(2026, 6, 30).expect("date");
    let as_at = NaiveDate::from_ymd_opt(2026, 6, 22).expect("date");

    let snapshot = ReportSnapshot::capture(CaptureInput {
        name: "integration test snapshot".to_string(),
        as_at,
        start_date: start,
        end_date: end,
        account_id: None,
        rate_buffer_bps: 300,
        min_occurrences: 3,
    })
    .expect("capture");

    let detail = snapshot.to_detail().expect("detail");
    assert_eq!(detail.payload["version"], PAYLOAD_VERSION);
    assert_eq!(
        detail.payload["serviceability"]["startDate"],
        start.to_string()
    );
    let living = detail.payload["lenderExpenses"]["totalMonthlyDollars"]
        .as_f64()
        .expect("living total");
    let serviceability_living = detail.payload["serviceability"]["livingExpensesMonthlyDollars"]
        .as_f64()
        .expect("serviceability living");
    assert!((living - serviceability_living).abs() <= 0.02);

    let reloaded = ReportSnapshot::find_active(snapshot.id)
        .expect("find")
        .expect("exists");
    let replay = reloaded.to_detail().expect("replay");
    assert_eq!(
        replay.payload["serviceability"]["surplusMonthlyDollars"],
        detail.payload["serviceability"]["surplusMonthlyDollars"]
    );

    ReportSnapshot::soft_delete(snapshot.id).expect("delete");
    assert!(ReportSnapshot::find_active(snapshot.id)
        .expect("find after delete")
        .is_none());
}
