use std::collections::HashMap;
use std::env;

use chrono::{Datelike, Days, Months, NaiveDate, Utc};
use database::models::assets::{Asset, AssetInput};
use database::models::category::Category;
use database::models::financial_account::FinancialAccount;
use database::models::liabilities::{Liability, LiabilityInput};
use database::models::planned_spending::PlannedSpending;
use database::models::prediction_goal::PredictionGoal;
use database::models::prediction_scenario::{PredictionScenario, ScenarioLineInput};
use database::models::statement::Statement;
use database::models::transaction::NewTransaction;
use database::modules::database::{get_dbo, DbConn};
use database::schema::transaction_data;
use diesel::prelude::*;
use rand::rngs::StdRng;
use rand::{RngExt, SeedableRng};

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
    let mut statements = 36_u32;
    let mut tx_per_statement = 120_u32;
    let mut seed = 7_u64;

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
                    "Usage: demo_seed [--statements N] [--tx-per-statement N] [--seed N]"
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
        seed,
    }
}

fn seed_categories() -> Result<HashMap<String, i64>, diesel::result::Error> {
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

    let mut ids = HashMap::new();
    for (name, colour) in specs {
        let cat = Category::insert(name, None, None, Some(colour))?;
        ids.insert(name.to_string(), cat.id);
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
        "SALARY DEPOSIT ACME PTY",
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
        "TRANSFER IN",
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
    let merchant = merchants[rng.random_range(0..merchants.len())];
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
    is_recent: bool,
) -> u64 {
    let opening = account.balance_cents;
    let statement = Statement::insert(
        month,
        account.spec.account_number.to_string(),
        opening,
        account.financial_account_id,
        month,
        month
            .checked_add_months(Months::new(1))
            .and_then(|next| next.checked_sub_days(Days::new(1)))
            .unwrap_or(month),
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
        let day = u32::try_from(rng.random_range(1..=days_in_month)).expect("day");
        let hour = rng.random_range(0..23);
        let minute = rng.random_range(0..59);
        let tx_date = month
            .with_day(day)
            .unwrap_or(month)
            .and_hms_opt(hour, minute, 0)
            .unwrap_or(now);

        let is_income = rng.random_bool(account.spec.income_rate);
        let amount_cents: i32 = if is_income {
            rng.random_range(800_00..6_000_00)
        } else if account.spec.parser_name == "banksa" {
            -rng.random_range(500..35_000)
        } else {
            -rng.random_range(50..25_000)
        };
        account.balance_cents = account.balance_cents.saturating_add(amount_cents);

        let category_id = if is_income {
            category_ids.last().copied()
        } else {
            Some(category_ids[rng.random_range(0..category_ids.len() - 1)])
        };

        let status = if is_recent && tx_idx < 3 {
            "pending".to_string()
        } else {
            "parsed".to_string()
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
            status,
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

fn seed_transfer_pairs(
    conn: &mut DbConn,
    accounts: &[ResolvedSeedAccount],
    now: chrono::NaiveDateTime,
) {
    let everyday = &accounts[0];
    let savings = &accounts[2];

    let transfer_date = now.date().checked_sub_days(Days::new(2)).unwrap_or(now.date());
    let amount = -5_000_00;

    let out_statement = Statement::insert(
        month_start(transfer_date.year(), transfer_date.month()),
        everyday.spec.account_number.to_string(),
        everyday.balance_cents,
        everyday.financial_account_id,
        transfer_date,
        transfer_date,
    )
    .expect("transfer out statement");

    let in_statement = Statement::insert(
        month_start(transfer_date.year(), transfer_date.month()),
        savings.spec.account_number.to_string(),
        savings.balance_cents,
        savings.financial_account_id,
        transfer_date,
        transfer_date,
    )
    .expect("transfer in statement");

    let out_id = diesel::insert_into(transaction_data::table)
        .values(&NewTransaction {
            statement_id: i32::try_from(out_statement.id).unwrap(),
            category_id: None,
            description: "TRANSFER OUT TO SAVINGS".to_string(),
            amount,
            transaction_date: transfer_date.and_hms_opt(10, 0, 0).unwrap_or(now),
            last_updated: now,
            deleted_at: None,
            created_at: now,
            status: "parsed".to_string(),
            balance: everyday.balance_cents + amount,
        })
        .returning(transaction_data::id)
        .get_result::<i64>(conn)
        .expect("transfer out");

    let in_id = diesel::insert_into(transaction_data::table)
        .values(&NewTransaction {
            statement_id: i32::try_from(in_statement.id).unwrap(),
            category_id: None,
            description: "TRANSFER IN FROM EVERYDAY".to_string(),
            amount: -amount,
            transaction_date: transfer_date.and_hms_opt(10, 5, 0).unwrap_or(now),
            last_updated: now,
            deleted_at: None,
            created_at: now,
            status: "parsed".to_string(),
            balance: savings.balance_cents - amount,
        })
        .returning(transaction_data::id)
        .get_result::<i64>(conn)
        .expect("transfer in");

    eprintln!("  transfer pair for suggestions: out={out_id} in={in_id}");
}

fn seed_liabilities_and_assets(accounts: &[ResolvedSeedAccount]) {
    let offset = accounts
        .iter()
        .find(|a| a.spec.parser_name == "banksa")
        .expect("offset account");

    let home_loan = Liability::insert(LiabilityInput {
        name: "Home loan — BankSA",
        kind: "home_loan",
        lender: Some("BankSA"),
        balance_cents: 412_000_00,
        credit_limit_cents: None,
        original_amount_cents: Some(480_000_00),
        interest_rate_bps: Some(625),
        rate_type: Some("variable"),
        repayment_cents: Some(2_850_00),
        repayment_frequency: Some("monthly"),
        term_months: Some(360),
        financial_account_id: Some(offset.financial_account_id),
        notes: Some("Demo offset account linked to home loan"),
        originated_date: Some(NaiveDate::from_ymd_opt(2019, 6, 15).expect("date")),
    })
    .expect("home loan");

    Liability::insert(LiabilityInput {
        name: "Visa — Heritage",
        kind: "credit_card",
        lender: Some("Heritage"),
        balance_cents: 3_420_00,
        credit_limit_cents: Some(15_000_00),
        original_amount_cents: None,
        interest_rate_bps: Some(1999),
        rate_type: Some("variable"),
        repayment_cents: None,
        repayment_frequency: None,
        term_months: None,
        financial_account_id: None,
        notes: None,
        originated_date: None,
    })
    .expect("credit card");

    Asset::insert(AssetInput {
        name: "Family home — Adelaide",
        kind: "property",
        value_cents: 820_000_00,
        valued_at: Some(NaiveDate::from_ymd_opt(2025, 12, 1).expect("date")),
        value_source: Some("Demo valuation"),
        liability_id: Some(home_loan.id),
        notes: Some("Linked to home loan for net equity"),
        purchase_price_cents: Some(520_000_00),
        purchase_date: Some(NaiveDate::from_ymd_opt(2019, 6, 15).expect("date")),
    })
    .expect("property asset");

    Asset::insert(AssetInput {
        name: "Super — Hostplus",
        kind: "super",
        value_cents: 186_500_00,
        valued_at: Some(NaiveDate::from_ymd_opt(2026, 3, 31).expect("date")),
        value_source: Some("Quarterly statement"),
        liability_id: None,
        notes: None,
        purchase_price_cents: None,
        purchase_date: None,
    })
    .expect("super asset");

    Asset::insert(AssetInput {
        name: "2019 Mazda CX-5",
        kind: "vehicle",
        value_cents: 28_500_00,
        valued_at: Some(NaiveDate::from_ymd_opt(2026, 1, 15).expect("date")),
        value_source: Some("RedBook estimate"),
        liability_id: None,
        notes: None,
        purchase_price_cents: Some(42_000_00),
        purchase_date: Some(NaiveDate::from_ymd_opt(2019, 3, 10).expect("date")),
    })
    .expect("vehicle asset");
}

fn seed_predictions(categories: &HashMap<String, i64>) {
    let today = Utc::now().date_naive();
    let housing = categories.get("housing").copied();
    let food = categories.get("food").copied();
    let transport = categories.get("transport").copied();

    PredictionScenario::insert_with_lines(
        "Baseline",
        &[
            ScenarioLineInput {
                name: "Mortgage repayment".to_string(),
                amount_cents: -2_850_00,
                frequency: "monthly".to_string(),
                start_date: today,
                end_date: None,
                category_id: housing,
                sort_order: Some(0),
            },
            ScenarioLineInput {
                name: "Groceries".to_string(),
                amount_cents: -900_00,
                frequency: "weekly".to_string(),
                start_date: today,
                end_date: None,
                category_id: food,
                sort_order: Some(1),
            },
        ],
    )
    .expect("baseline scenario");

    PredictionScenario::insert_with_lines(
        "New car",
        &[
            ScenarioLineInput {
                name: "Car purchase".to_string(),
                amount_cents: -35_000_00,
                frequency: "once".to_string(),
                start_date: today
                    .checked_add_months(Months::new(6))
                    .unwrap_or(today),
                end_date: None,
                category_id: transport,
                sort_order: Some(0),
            },
            ScenarioLineInput {
                name: "Insurance (annual)".to_string(),
                amount_cents: -1_200_00,
                frequency: "yearly".to_string(),
                start_date: today,
                end_date: None,
                category_id: categories.get("insurance").copied(),
                sort_order: Some(1),
            },
        ],
    )
    .expect("new car scenario");

    PredictionScenario::insert_with_lines(
        "Side hustle",
        &[
            ScenarioLineInput {
                name: "Freelance income".to_string(),
                amount_cents: 1_500_00,
                frequency: "fortnightly".to_string(),
                start_date: today,
                end_date: None,
                category_id: categories.get("income").copied(),
                sort_order: Some(0),
            },
        ],
    )
    .expect("side hustle scenario");

    PredictionGoal::insert(
        "Emergency fund",
        30_000_00,
        today.checked_add_months(Months::new(12)).unwrap_or(today),
    )
    .expect("emergency fund goal");

    PredictionGoal::insert(
        "Europe trip",
        12_000_00,
        today.checked_add_months(Months::new(18)).unwrap_or(today),
    )
    .expect("europe trip goal");
}

fn seed_planned_spending(categories: &HashMap<String, i64>) {
    let today = Utc::now().date_naive();

    PlannedSpending::insert(
        "Annual car rego",
        850_00,
        today.checked_add_days(Days::new(14)).unwrap_or(today),
        None,
        categories.get("transport").copied(),
        Some("Due mid-month"),
    )
    .expect("car rego");

    PlannedSpending::insert(
        "School fees — term 3",
        2_400_00,
        today.checked_add_months(Months::new(1)).unwrap_or(today),
        Some(today.checked_add_months(Months::new(4)).unwrap_or(today)),
        categories.get("housing").copied(),
        None,
    )
    .expect("school fees");

    PlannedSpending::insert(
        "Kitchen renovation deposit",
        8_000_00,
        today.checked_add_months(Months::new(3)).unwrap_or(today),
        None,
        categories.get("housing").copied(),
        Some("Builder quote accepted"),
    )
    .expect("kitchen renovation");
}

fn main() {
    let cfg = parse_args();
    let mut rng = StdRng::seed_from_u64(cfg.seed);
    let conn = &mut get_dbo();
    let now = Utc::now().naive_utc();

    eprintln!("=== Demo seed: categories & accounts ===");
    let categories = seed_categories().expect("seed categories");
    let category_ids: Vec<i32> = categories
        .values()
        .map(|id| i32::try_from(*id).unwrap_or(1))
        .collect();
    let mut accounts = resolve_seed_accounts();

    eprintln!("=== Demo seed: transactions ===");
    let end_month = month_start(now.year(), now.month());
    let start_month = end_month
        .checked_sub_months(Months::new(cfg.statements.saturating_sub(1)))
        .unwrap_or(end_month);

    let mut month = start_month;
    let mut total_txns = 0_u64;

    for stmt_idx in 0..cfg.statements {
        let is_recent = stmt_idx + 1 == cfg.statements;
        for account in &mut accounts {
            total_txns += seed_statement_month(
                conn,
                &mut rng,
                account,
                month,
                cfg.tx_per_statement,
                &category_ids,
                now,
                is_recent,
            );
        }

        if (stmt_idx + 1) % 12 == 0 || stmt_idx + 1 == cfg.statements {
            eprintln!(
                "  {}/{} months, {total_txns} transactions",
                stmt_idx + 1,
                cfg.statements,
            );
        }

        month = match month.checked_add_months(Months::new(1)) {
            Some(d) => d,
            None => break,
        };
    }

    eprintln!("=== Demo seed: transfer pairs ===");
    seed_transfer_pairs(conn, &accounts, now);

    eprintln!("=== Demo seed: liabilities & assets ===");
    seed_liabilities_and_assets(&accounts);

    eprintln!("=== Demo seed: predictions ===");
    seed_predictions(&categories);

    eprintln!("=== Demo seed: planned spending ===");
    seed_planned_spending(&categories);

    eprintln!(
        "Done: {total_txns} transactions, {} accounts, full feature coverage",
        accounts.len()
    );
}
