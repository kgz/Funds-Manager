use std::env;

use chrono::{Datelike, Months, NaiveDate, Utc};
use database::models::category::Category;
use database::models::financial_account::FinancialAccount;
use database::models::statement::Statement;
use database::models::transaction::NewTransaction;
use database::modules::database::{get_dbo, DbConn};
use database::schema::transaction_data;
use diesel::prelude::*;
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

const BATCH_SIZE: usize = 500;

struct SeedConfig {
    statements: u32,
    tx_per_statement: u32,
    seed: u64,
}

#[derive(Clone, Copy)]
struct SeedAccountSpec {
    parser_name: &'static str,
    account_number: &'static str,
    opening_balance_cents: i32,
    income_rate: f64,
}

struct ResolvedSeedAccount {
    spec: SeedAccountSpec,
    financial_account_id: i64,
    balance_cents: i32,
}

const DEFAULT_ACCOUNTS: [SeedAccountSpec; 3] = [
    SeedAccountSpec {
        parser_name: "heritage",
        account_number: "4829103847",
        opening_balance_cents: 250_000_00,
        income_rate: 0.10,
    },
    SeedAccountSpec {
        parser_name: "banksa",
        account_number: "045692740",
        opening_balance_cents: 157_278_00,
        income_rate: 0.02,
    },
    SeedAccountSpec {
        parser_name: "heritage",
        account_number: "8765432101",
        opening_balance_cents: 45_000_00,
        income_rate: 0.05,
    },
];

fn parse_args() -> SeedConfig {
    let mut statements = 120_u32;
    let mut tx_per_statement = 250_u32;
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
            "--seed" => {
                seed = args.next().and_then(|v| v.parse().ok()).unwrap_or(seed);
            }
            "--help" | "-h" => {
                eprintln!(
                    "Usage: benchmark_seed [--statements N] [--tx-per-statement N] [--seed N]"
                );
                eprintln!();
                eprintln!("Seeds {} bank accounts with N monthly statements each.", DEFAULT_ACCOUNTS.len());
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

fn resolve_seed_accounts() -> Vec<ResolvedSeedAccount> {
    DEFAULT_ACCOUNTS
        .iter()
        .map(|spec| {
            let financial_account = FinancialAccount::find_or_create_for_import(
                spec.parser_name,
                spec.account_number,
            )
            .unwrap_or_else(|error| {
                panic!(
                    "resolve financial account {} / {}: {error}",
                    spec.parser_name, spec.account_number
                )
            });
            ResolvedSeedAccount {
                spec: *spec,
                financial_account_id: financial_account.id,
                balance_cents: spec.opening_balance_cents,
            }
        })
        .collect()
}

fn month_start(year: i32, month: u32) -> NaiveDate {
    NaiveDate::from_ymd_opt(year, month, 1).expect("valid month start")
}

fn pick_description(rng: &mut StdRng, idx: u32, parser_name: &str) -> String {
    const EVERYDAY_MERCHANTS: [&str; 16] = [
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
    const OFFSET_MERCHANTS: [&str; 12] = [
        "LOAN REPAYMENT",
        "INTEREST CHARGED",
        "SHANNONS INSURANCE",
        "SCM012464470",
        "OFFSET DEPOSIT",
        "REDRAW",
        "ANZ TRANSFER IN",
        "DIRECT DEBIT AGL",
        "COUNCIL RATES",
        "HOME INSURANCE",
        "OFFSET FEE",
        "LOAN VARIATION FEE",
    ];

    let merchants = if parser_name == "banksa" {
        &OFFSET_MERCHANTS[..]
    } else {
        &EVERYDAY_MERCHANTS[..]
    };
    let merchant = merchants[rng.gen_range(0..merchants.len())];
    format!("{merchant} #{idx:05}")
}

fn seed_statement_month(
    conn: &mut DbConn,
    rng: &mut StdRng,
    account: &mut ResolvedSeedAccount,
    month: NaiveDate,
    tx_per_statement: u32,
    category_ids: &[i32],
    now: chrono::NaiveDateTime,
) -> u64 {
    let opening = account.balance_cents;
    let statement = Statement::insert(
        month,
        account.spec.account_number.to_string(),
        opening,
        account.financial_account_id,
    )
    .expect("insert statement");
    let statement_id = i32::try_from(statement.id).expect("statement id fits i32");

    let mut batch: Vec<NewTransaction> = Vec::with_capacity(BATCH_SIZE);
    let next_month = month
        .checked_add_months(Months::new(1))
        .expect("next month");
    let days_in_month = usize::try_from((next_month - month).num_days()).unwrap_or(28);
    let mut inserted = 0_u64;

    for tx_idx in 0..tx_per_statement {
        let day = u32::try_from(rng.gen_range(1..=days_in_month)).expect("day");
        let hour = rng.gen_range(0..23);
        let minute = rng.gen_range(0..59);
        let tx_date = month
            .with_day(day)
            .unwrap_or(month)
            .and_hms_opt(hour, minute, 0)
            .unwrap_or(now);

        let is_income = rng.gen_bool(account.spec.income_rate);
        let amount_cents: i32 = if is_income {
            rng.gen_range(800_00..6_000_00)
        } else if account.spec.parser_name == "banksa" {
            -rng.gen_range(500..35_000)
        } else {
            -rng.gen_range(50..25_000)
        };
        account.balance_cents = account.balance_cents.saturating_add(amount_cents);

        let category_id = if is_income {
            category_ids.last().copied()
        } else {
            Some(category_ids[rng.gen_range(0..category_ids.len() - 1)])
        };

        batch.push(NewTransaction {
            statement_id,
            category_id,
            description: pick_description(rng, tx_idx, account.spec.parser_name),
            amount: amount_cents,
            transaction_date: tx_date,
            last_updated: now,
            deleted_at: None,
            created_at: now,
            status: "parsed".to_string(),
            balance: account.balance_cents,
        });

        if batch.len() >= BATCH_SIZE {
            diesel::insert_into(transaction_data::table)
                .values(&batch)
                .execute(conn)
                .expect("insert transaction batch");
            inserted += batch.len() as u64;
            batch.clear();
        }
    }

    if !batch.is_empty() {
        diesel::insert_into(transaction_data::table)
            .values(&batch)
            .execute(conn)
            .expect("insert transaction batch");
        inserted += batch.len() as u64;
    }

    Statement::update_closing_balance(statement.id, account.balance_cents).expect("closing balance");
    inserted
}

fn main() {
    let cfg = parse_args();
    let mut rng = StdRng::seed_from_u64(cfg.seed);
    let conn = &mut get_dbo();
    let now = Utc::now().naive_utc();

    let account_count = DEFAULT_ACCOUNTS.len();
    let total_statements = cfg.statements as u64 * account_count as u64;

    eprintln!(
        "Seeding {account_count} accounts × {} statements × {} tx",
        cfg.statements, cfg.tx_per_statement
    );

    let category_ids = seed_categories().expect("seed categories");
    let mut accounts = resolve_seed_accounts();

    let end_month = month_start(now.year(), now.month());
    let start_month = end_month
        .checked_sub_months(Months::new(cfg.statements.saturating_sub(1)))
        .unwrap_or(end_month);

    let mut month = start_month;
    let mut total_txns = 0_u64;
    let mut statements_done = 0_u64;

    for stmt_idx in 0..cfg.statements {
        for account in &mut accounts {
            total_txns += seed_statement_month(
                conn,
                &mut rng,
                account,
                month,
                cfg.tx_per_statement,
                &category_ids,
                now,
            );
            statements_done += 1;
        }

        if (stmt_idx + 1) % 10 == 0 || stmt_idx + 1 == cfg.statements {
            eprintln!(
                "  {}/{} statement months, {statements_done}/{total_statements} statements, {total_txns} transactions",
                stmt_idx + 1,
                cfg.statements,
            );
        }

        month = match month.checked_add_months(Months::new(1)) {
            Some(d) => d,
            None => break,
        };
    }

    eprintln!(
        "Done: {total_txns} transactions across {statements_done} statements ({account_count} accounts)"
    );
}
