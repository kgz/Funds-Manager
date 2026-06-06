//! Run from `crates/category-predict-cli` (this directory is its own `[workspace]` so the repo root stays on stable Rust).
//! Nightly is required for the `tktax-*` dependency chain (`named-item` uses `#![feature(associated_type_defaults)]`).
//! `crates/patches/tktax-3p` is a tiny fork of crates.io `tktax-3p` 0.2.2 that drops a broken `assert_matches` re-export.
//!
//! Parquet (e.g. repo `0000.parquet`): `parquet-info`, `parquet-head`, `parquet-predict`, `parquet-export-golden`.
//! `categories.json`: `categories-summary`.

use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;

use clap::{Parser, Subcommand};
use polars::prelude::*;
use serde::Deserialize;
use tktax_transaction::TryFromCsvContents;
use tktax_transaction::{CategorizeTransaction, GetDescription, Transaction};
use tktax_transaction_category::{CategoryMap, MockTransactionCategory};

#[derive(Debug, Parser)]
struct Args {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Parse a bank-style CSV into JSON (same row model as tktax_transaction)
    Parse {
        csv_path: PathBuf,
    },
    /// Run tktax category guesses for each row (uses built-in MockTransactionCategory map)
    Predict {
        csv_path: PathBuf,
    },
    /// Predict category for a single free-text description (no CSV)
    PredictText {
        description: String,
    },
    /// Print schema and row count for a Parquet file (e.g. 0000.parquet)
    ParquetInfo {
        path: PathBuf,
    },
    /// Print the first N rows of a Parquet file as a Polars table
    ParquetHead {
        path: PathBuf,
        #[arg(long, default_value_t = 10)]
        limit: usize,
    },
    /// Run tktax `predict_category` on the description column (use --limit on large files)
    ParquetPredict {
        path: PathBuf,
        #[arg(long, default_value_t = 25)]
        limit: usize,
        #[arg(long, default_value = "transaction_description")]
        desc_column: String,
    },
    /// Write `category,description` CSV (golden-style sample) for the first N rows
    ParquetExportGolden {
        path: PathBuf,
        #[arg(value_name = "OUT_CSV")]
        csv_out: PathBuf,
        #[arg(long, default_value_t = 5000)]
        limit: usize,
        #[arg(long, default_value = "transaction_description")]
        desc_column: String,
    },
    /// Summarize `categories.json` (ids, names, keyword counts)
    CategoriesSummary {
        path: PathBuf,
    },
}

#[derive(Debug, Deserialize)]
struct CategoriesFile {
    categories: Vec<CategoryEntry>,
}

#[derive(Debug, Deserialize)]
struct CategoryEntry {
    id: u32,
    name: String,
    #[serde(default)]
    description: String,
    keywords: Vec<String>,
}

fn main() -> ExitCode {
    let args = Args::parse();

    let category_map: CategoryMap<MockTransactionCategory> = CategoryMap::new();

    match args.command {
        Command::Parse { csv_path } => match read_csv(&csv_path) {
            Ok(bytes) => match Vec::<Transaction>::try_from_csv_contents(&bytes) {
                Ok(rows) => match serde_json::to_string_pretty(&rows) {
                    Ok(json) => {
                        println!("{json}");
                        ExitCode::SUCCESS
                    }
                    Err(e) => {
                        eprintln!("{e}");
                        ExitCode::FAILURE
                    }
                },
                Err(e) => {
                    eprintln!("CSV parse error: {e}");
                    ExitCode::FAILURE
                }
            },
            Err(e) => {
                eprintln!("{e}");
                ExitCode::FAILURE
            }
        },
        Command::Predict { csv_path } => match read_csv(&csv_path) {
            Ok(bytes) => match Vec::<Transaction>::try_from_csv_contents(&bytes) {
                Ok(rows) => {
                    for (i, tx) in rows.iter().enumerate() {
                        let desc = tx.description();
                        let preds = tx.categorize(&category_map);
                        println!("--- row {i} ---");
                        println!("description: {desc}");
                        for pred in &preds {
                            println!("  {:?} score {}", pred.category(), pred.score());
                        }
                    }
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("CSV parse error: {e}");
                    ExitCode::FAILURE
                }
            },
            Err(e) => {
                eprintln!("{e}");
                ExitCode::FAILURE
            }
        },
        Command::PredictText { description } => {
            let preds = tktax_transaction_category::predict_category(&description, &category_map);
            for pred in &preds {
                println!("{:?} score {}", pred.category(), pred.score());
            }
            ExitCode::SUCCESS
        }
        Command::ParquetInfo { path } => match parquet_info(&path) {
            Ok(()) => ExitCode::SUCCESS,
            Err(e) => {
                eprintln!("{e}");
                ExitCode::FAILURE
            }
        },
        Command::ParquetHead { path, limit } => match parquet_head(&path, limit) {
            Ok(()) => ExitCode::SUCCESS,
            Err(e) => {
                eprintln!("{e}");
                ExitCode::FAILURE
            }
        },
        Command::ParquetPredict {
            path,
            limit,
            desc_column,
        } => match parquet_predict(&path, limit, &desc_column, &category_map) {
            Ok(()) => ExitCode::SUCCESS,
            Err(e) => {
                eprintln!("{e}");
                ExitCode::FAILURE
            }
        },
        Command::ParquetExportGolden {
            path,
            csv_out,
            limit,
            desc_column,
        } => match parquet_export_golden(&path, &csv_out, limit, &desc_column) {
            Ok(()) => ExitCode::SUCCESS,
            Err(e) => {
                eprintln!("{e}");
                ExitCode::FAILURE
            }
        },
        Command::CategoriesSummary { path } => match categories_summary(&path) {
            Ok(()) => ExitCode::SUCCESS,
            Err(e) => {
                eprintln!("{e}");
                ExitCode::FAILURE
            }
        },
    }
}

fn read_csv(path: &PathBuf) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|e| format!("failed to read {}: {e}", path.display()))
}

fn parquet_info(path: &PathBuf) -> Result<(), String> {
    let lf = LazyFrame::scan_parquet(path, ScanArgsParquet::default())
        .map_err(|e| format!("scan_parquet {}: {e}", path.display()))?;
    let schema = lf
        .clone()
        .limit(1)
        .collect()
        .map_err(|e| format!("collect schema probe: {e}"))?
        .schema()
        .clone();
    println!("columns:");
    for (name, dtype) in schema.iter() {
        println!("  {name}: {dtype}");
    }
    let count_df = lf
        .select([len().alias("rows")])
        .collect()
        .map_err(|e| format!("row count: {e}"))?;
    let n = count_df
        .column("rows")
        .map_err(|e| e.to_string())?
        .get(0)
        .map_err(|e| format!("rows value: {e}"))?;
    println!("rows: {n:?}");
    Ok(())
}

fn parquet_head(path: &PathBuf, limit: usize) -> Result<(), String> {
    let df = LazyFrame::scan_parquet(path, ScanArgsParquet::default())
        .map_err(|e| format!("scan_parquet: {e}"))?
        .limit(limit as u32)
        .collect()
        .map_err(|e| format!("collect: {e}"))?;
    println!("{df}");
    Ok(())
}

fn parquet_predict(
    path: &PathBuf,
    limit: usize,
    desc_column: &str,
    category_map: &CategoryMap<MockTransactionCategory>,
) -> Result<(), String> {
    let df = LazyFrame::scan_parquet(path, ScanArgsParquet::default())
        .map_err(|e| format!("scan_parquet: {e}"))?
        .limit(limit as u32)
        .collect()
        .map_err(|e| format!("collect: {e}"))?;
    let desc = df
        .column(desc_column)
        .map_err(|_| format!("missing column {desc_column:?}"))?
        .str()
        .map_err(|_| format!("column {desc_column:?} is not String"))?;
    let label_ca = df.column("category").ok().and_then(|c| c.str().ok());
    for i in 0..desc.len() {
        let text = desc.get(i).unwrap_or("");
        let preds = tktax_transaction_category::predict_category(text, category_map);
        let top = preds.first().map(|p| format!("{:?}", p.category()));
        if let Some(lc) = label_ca {
            let lab = lc.get(i).unwrap_or("");
            println!(
                "[{i}] label={lab:?} top_tktax={} desc={text:?}",
                top.unwrap_or_else(|| "none".into())
            );
        } else {
            println!(
                "[{i}] top_tktax={} desc={text:?}",
                top.unwrap_or_else(|| "none".into())
            );
        }
        if preds.is_empty() {
            println!("    (no tktax token matches for this description)");
        } else {
            for pred in preds.iter().take(3) {
                println!("    {:?} score {}", pred.category(), pred.score());
            }
        }
    }
    Ok(())
}

fn parquet_export_golden(path: &PathBuf, csv_out: &PathBuf, limit: usize, desc_column: &str) -> Result<(), String> {
    let df = LazyFrame::scan_parquet(path, ScanArgsParquet::default())
        .map_err(|e| format!("scan_parquet: {e}"))?
        .select([col("category"), col(desc_column)])
        .limit(limit as u32)
        .collect()
        .map_err(|e| format!("collect: {e}"))?;
    let mut out = fs::File::create(csv_out)
        .map_err(|e| format!("create {}: {e}", csv_out.display()))?;
    CsvWriter::new(&mut out)
        .include_header(true)
        .finish(&mut df.clone())
        .map_err(|e| format!("csv write: {e}"))?;
    println!("wrote {} rows to {}", df.height(), csv_out.display());
    Ok(())
}

fn categories_summary(path: &PathBuf) -> Result<(), String> {
    let text = fs::read_to_string(path).map_err(|e| format!("read {}: {e}", path.display()))?;
    let parsed: CategoriesFile =
        serde_json::from_str(&text).map_err(|e| format!("parse categories json: {e}"))?;
    println!("{} categories in {}", parsed.categories.len(), path.display());
    for c in &parsed.categories {
        println!(
            "  id={} name={:?} keywords={} desc_len={}",
            c.id,
            c.name,
            c.keywords.len(),
            c.description.len()
        );
    }
    Ok(())
}
