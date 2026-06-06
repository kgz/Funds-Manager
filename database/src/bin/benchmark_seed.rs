use std::env;

use chrono::{Datelike, Months, NaiveDate, Utc};
use database::models::category::Category;
use database::models::statement::Statement;
use database::models::transaction::NewTransaction;
use database::modules::database::get_dbo;
use database::schema::transaction_data;
use diesel::prelude::*;
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

const BATCH_SIZE: usize = 500;

struct SeedConfig {
    statements: u32,
    tx_per_statement: u32,
    account_id: String,
    seed: u64,
}

fn parse_args() -> SeedConfig {
    let mut statements = 120_u32;
    let mut tx_per_statement = 250_u32;
    let mut account_id = "BENCH-ACCT-001".to_string();
    let mut seed = 42_u64;

    let mut args = env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--statements" => {
                statements = args.next().and_then(|v| v.parse().ok()).unwrap_or(statements);
            }
            "--tx-per-statement" => {
                tx_per_statement = args
                    .next()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(tx_per_statement);
            }
            "--account-id" => {
                account_id = args.next().unwrap_or(account_id);
            }
            "--seed" => {
                seed = args.next().and_then(|v| v.parse().ok()).unwrap_or(seed);
            }
            "--help" | "-h" => {
                eprintln!(
                    "Usage: benchmark_seed [--statements N] [--tx-per-statement N] [--account-id ID] [--seed N]"
                );
                std::process::exit(0);
            }
            other => {
                eprintln!("Unknown argument: {other}");
                std::process::exit(1);
            }
        }
    }

    SeedConfig {
        statements,
        tx_per_statement,
        account_id,
        seed,
    }
}

fn seed_categories() -> Result<Vec<i32>, diesel::result::Error> {
    let specs: [(&str, &str); 12] = [
        ("housing", "#4f46e5"),
        ("food", "#16a34a"),
        ("transport", "#0ea5e9"),
        ("utilities", "#f59e0b"),
        ("insurance", "#8b5cf6"),
        ("health", "#ec4899"),
        ("shopping", "#64748b"),
        ("entertainment", "#f97316"),
        ("subscriptions", "#06b6d4"),
        ("pets", "#84cc16"),
        ("income", "#22c55e"),
        ("uncategorized", "#6b7280"),
    ];

    let mut ids = Vec::with_capacity(specs.len());
    for (name, colour) in specs {
        let cat = Category::insert(name, None, None, Some(colour))?;
        ids.push(i32::try_from(cat.id).unwrap_or(1));
    }
    Ok(ids)
}

fn month_start(year: i32, month: u32) -> NaiveDate {
    NaiveDate::from_ymd_opt(year, month, 1).expect("valid month start")
}

fn pick_description(rng: &mut StdRng, idx: u32) -> String {
    const MERCHANTS: [&str; 16] = [
        "COLES 8721",
        "WOOLWORTHS METRO",
        "UBER *EATS",
        "BP EXPRESS",
        "NETFLIX.COM",
        "SPOTIFY",
        "AMAZON MARKETPLACE",
        "DIRECT DEBIT TELSTRA",
        "SALARY DEPOSIT",
        "EFTPOS CAFE",
        "GYM MEMBERSHIP",
        "PET SUPPLIES",
        "STEAM PURCHASE",
        "INSURANCE PREMIUM",
        "RATES PAYMENT",
        "TRANSFER OUT",
    ];
    let merchant = MERCHANTS[rng.gen_range(0..MERCHANTS.len())];
    format!("{merchant} #{idx:05}")
}

fn main() {
    let cfg = parse_args();
    let mut rng = StdRng::seed_from_u64(cfg.seed);
    let conn = &mut get_dbo();
    let now = Utc::now().naive_utc();

    eprintln!(
        "Seeding {} statements × {} tx (account {})",
        cfg.statements, cfg.tx_per_statement, cfg.account_id
    );

    let category_ids = seed_categories().expect("seed categories");
    let end_month = month_start(now.year(), now.month());
    let start_month = end_month
        .checked_sub_months(Months::new(cfg.statements.saturating_sub(1)))
        .unwrap_or(end_month);

    let mut month = start_month;
    let mut total_txns = 0_u64;
    let mut balance_cents: i32 = 250_000_00;

    for stmt_idx in 0..cfg.statements {
        let opening = balance_cents;
        let statement = Statement::insert(month, cfg.account_id.clone(), opening)
            .expect("insert statement");
        let statement_id = i32::try_from(statement.id).expect("statement id fits i32");

        let mut batch: Vec<NewTransaction> = Vec::with_capacity(BATCH_SIZE);
        let next_month = month
            .checked_add_months(Months::new(1))
            .expect("next month");
        let days_in_month = usize::try_from((next_month - month).num_days()).unwrap_or(28);

        for tx_idx in 0..cfg.tx_per_statement {
            let day = u32::try_from(rng.gen_range(1..=days_in_month)).expect("day");
            let hour = rng.gen_range(0..23);
            let minute = rng.gen_range(0..59);
            let tx_date = month
                .with_day(day)
                .unwrap_or(month)
                .and_hms_opt(hour, minute, 0)
                .unwrap_or(now);

            let is_income = rng.gen_bool(0.08);
            let amount_cents: i32 = if is_income {
                rng.gen_range(800_00..6_000_00)
            } else {
                -rng.gen_range(50..25_000)
            };
            balance_cents = balance_cents.saturating_add(amount_cents);

            let category_id = if is_income {
                category_ids.last().copied()
            } else {
                Some(category_ids[rng.gen_range(0..category_ids.len() - 1)])
            };

            batch.push(NewTransaction {
                statement_id,
                category_id,
                description: pick_description(&mut rng, tx_idx),
                amount: amount_cents,
                transaction_date: tx_date,
                last_updated: now,
                deleted_at: None,
                created_at: now,
                status: "parsed".to_string(),
                balance: balance_cents,
            });

            if batch.len() >= BATCH_SIZE {
                diesel::insert_into(transaction_data::table)
                    .values(&batch)
                    .execute(conn)
                    .expect("insert transaction batch");
                total_txns += batch.len() as u64;
                batch.clear();
            }
        }

        if !batch.is_empty() {
            diesel::insert_into(transaction_data::table)
                .values(&batch)
                .execute(conn)
                .expect("insert transaction batch");
            total_txns += batch.len() as u64;
        }

        Statement::update_closing_balance(statement.id, balance_cents).expect("closing balance");

        if (stmt_idx + 1) % 10 == 0 || stmt_idx + 1 == cfg.statements {
            eprintln!(
                "  {}/{} statements, {} transactions",
                stmt_idx + 1,
                cfg.statements,
                total_txns
            );
        }

        month = match month.checked_add_months(Months::new(1)) {
            Some(d) => d,
            None => break,
        };
    }

    eprintln!("Done: {total_txns} transactions across {} statements", cfg.statements);
}
