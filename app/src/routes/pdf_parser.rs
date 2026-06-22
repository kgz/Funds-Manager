use std::ffi::OsString;
use std::io::Write;
use std::path::{Path, PathBuf};

use actix_multipart::Multipart;
use actix_web::{web, HttpResponse, Result};
use diesel::result::Error as DieselError;
use chrono::Utc;
use database::models::{
    financial_account::{FinancialAccount, FinancialAccountSummary},
    statement::{MissingStatementPeriod, Statement},
    transaction::{NewTransaction, Transaction},
    transaction_category_learn::CategoryPredictor,
};
use futures_util::StreamExt;
use sanitize_filename::sanitize;
use serde::{Deserialize, Serialize};
use statement_parser::{
    available_parsers, parse_statement, parse_statement_auto, ParsedStatement, ParserConfig,
};
use uuid::Uuid;

const APP_PDFIUM_LIBRARY_PATH: &str = "./lib/libpdfium.so";

#[derive(Debug, Deserialize)]
pub struct ParsePdfQuery {
    parser: Option<String>,
    #[serde(default)]
    preview: bool,
    #[serde(default)]
    replace: bool,
}

#[derive(Serialize, Deserialize)]
pub struct Resp {
    processed_files: Vec<String>,
    errors: Vec<String>,
}

#[derive(Serialize)]
pub struct StatementPreviewFile {
    filename: String,
    account_id: String,
    statement_date: String,
    period_label: String,
    conflict: bool,
    existing_statement_id: Option<i64>,
}

#[derive(Serialize)]
pub struct StatementPreviewResponse {
    files: Vec<StatementPreviewFile>,
    errors: Vec<String>,
}

fn period_label(date: chrono::NaiveDate) -> String {
    date.format("%b %Y").to_string()
}

fn existing_statement_for_upload(
    statement: &ParsedStatement,
) -> Result<Option<Statement>, String> {
    let existing = Statement::find_by_account_id(&statement.account_id, &statement.statement_date)
        .map_err(|error| {
            format!(
                "Database error finding existing statements for account {} on {}: {}",
                statement.account_id, statement.statement_date, error
            )
        })?;
    Ok(existing.into_iter().next())
}

fn parser_config() -> ParserConfig {
    if let Some(path) = pdfium_library_candidate() {
        return ParserConfig::default().with_pdfium_library_path(path);
    }

    ParserConfig::default()
}

fn pdfium_library_candidate() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("PDFIUM_LIBRARY_PATH").and_then(non_empty_path) {
        if path.exists() {
            return Some(path);
        }
    }

    let candidates = [
        PathBuf::from(APP_PDFIUM_LIBRARY_PATH),
        PathBuf::from("app/lib/libpdfium.so"),
    ];

    for candidate in candidates {
        if candidate.exists() {
            return Some(candidate);
        }
    }

    None
}

fn non_empty_path(value: OsString) -> Option<PathBuf> {
    if value.is_empty() {
        return None;
    }

    Some(PathBuf::from(value))
}

fn parse_uploaded_pdf(file_path: &str, parser_name: Option<&str>) -> Result<ParsedStatement, String> {
    let config = parser_config();
    let result = match parser_name {
        Some(name) => parse_statement(file_path, name, &config),
        None => parse_statement_auto(file_path, &config),
    };
    result.map_err(|error| format!("Failed to parse statement: {error}"))
}

fn preview_uploaded_pdf(
    filename: String,
    file_path: &str,
    parser_name: Option<&str>,
) -> Result<StatementPreviewFile, String> {
    let parsed = parse_uploaded_pdf(file_path, parser_name)?;
    let existing = existing_statement_for_upload(&parsed)?;
    Ok(StatementPreviewFile {
        filename,
        account_id: parsed.account_id,
        statement_date: parsed.statement_date.to_string(),
        period_label: period_label(parsed.statement_date),
        conflict: existing.is_some(),
        existing_statement_id: existing.map(|row| row.id),
    })
}

fn process_single_pdf(
    file_path: &str,
    parser_name: Option<&str>,
    replace: bool,
    predictor: &CategoryPredictor,
) -> Result<(), String> {
    let parsed_statement = parse_uploaded_pdf(file_path, parser_name)?;

    if !replace {
        let existing = existing_statement_for_upload(&parsed_statement)?;
        if existing.is_some() {
            return Err(format!(
                "Statement for account {} in {} already exists",
                parsed_statement.account_id,
                period_label(parsed_statement.statement_date)
            ));
        }
    }

    persist_statement(parsed_statement, predictor)?;
    Ok(())
}

fn persist_statement(
    statement: ParsedStatement,
    predictor: &CategoryPredictor,
) -> Result<(), String> {
    let existing_statements =
        Statement::find_by_account_id(&statement.account_id, &statement.statement_date).map_err(
            |error| {
                format!(
                    "Database error finding existing statements for account {} on {}: {}",
                    statement.account_id, statement.statement_date, error
                )
            },
        )?;

    for existing_statement in existing_statements {
        Statement::delete(existing_statement.id).map_err(|error| {
            format!(
                "Failed to delete existing statement ID {}: {}",
                existing_statement.id, error
            )
        })?;
    }

    let financial_account = FinancialAccount::find_or_create_for_import(
        &statement.parser_name,
        &statement.account_id,
    )
    .map_err(|error| format!("Failed to resolve financial account: {error}"))?;

    let new_statement = Statement::insert(
        statement.statement_date,
        statement.account_id,
        statement.opening_balance_cents,
        financial_account.id,
        statement.period_start,
        statement.period_end,
    )
    .map_err(|error| format!("Failed to insert statement: {error}"))?;

    let statement_id = i32::try_from(new_statement.id)
        .map_err(|_| format!("Statement ID {} does not fit into i32", new_statement.id))?;

    let now = Utc::now().naive_utc();
    let mut new_transactions = Vec::with_capacity(statement.transactions.len());
    for transaction in statement.transactions {
        let transaction_datetime = transaction
            .transaction_date
            .and_hms_opt(0, 0, 0)
            .ok_or_else(|| {
                format!(
                    "Failed to convert transaction date {} to NaiveDateTime",
                    transaction.transaction_date
                )
            })?;

        let predicted_category = predictor.predict(&transaction.description);

        new_transactions.push(NewTransaction {
            statement_id,
            category_id: predicted_category,
            description: transaction.description,
            amount: transaction.amount_cents,
            transaction_date: transaction_datetime,
            deleted_at: None,
            last_updated: now,
            created_at: now,
            status: "parsed".to_string(),
            balance: transaction.balance_cents,
        });
    }

    Transaction::insert_batch(&new_transactions)
        .map_err(|error| format!("Failed to insert transactions: {error}"))?;

    Statement::update_closing_balance(new_statement.id, statement.closing_balance_cents).map_err(
        |error| {
            format!(
                "Failed to update closing balance for statement ID {}: {}",
                new_statement.id, error
            )
        },
    )?;

    Ok(())
}

async fn collect_uploaded_pdfs(
    mut payload: Multipart,
) -> (Vec<(String, PathBuf)>, Vec<String>) {
    let mut uploads = Vec::new();
    let mut errors = Vec::new();

    while let Some(item_result) = payload.next().await {
        let mut field = match item_result {
            Ok(field) => field,
            Err(e) => {
                errors.push(format!("Error reading multipart item: {}", e));
                eprintln!("Error reading multipart item: {}", e);
                continue;
            }
        };

        let content_disposition = field.content_disposition();
        let original_filename = content_disposition
            .and_then(|cd| cd.get_filename())
            .map(|name| sanitize(name))
            .unwrap_or_else(|| format!("unknown_file_{}", Uuid::new_v4()));

        if !original_filename.to_lowercase().ends_with(".pdf") {
            println!("Skipping non-PDF file: {}", original_filename);
            errors.push(format!("Skipped non-PDF file: {}", original_filename));
            while field.next().await.is_some() {}
            continue;
        }

        let mut temp_path = std::env::temp_dir();
        temp_path.push(format!("{}_{}", Uuid::new_v4(), original_filename));

        match std::fs::File::create(&temp_path) {
            Ok(mut file) => {
                let mut file_write_error = false;
                while let Some(chunk_result) = field.next().await {
                    match chunk_result {
                        Ok(data) => {
                            if file.write_all(&data).is_err() {
                                let error_msg =
                                    format!("Error writing to temp file for {}", original_filename);
                                eprintln!("{}", error_msg);
                                errors.push(error_msg);
                                file_write_error = true;
                                break;
                            }
                        }
                        Err(e) => {
                            let error_msg =
                                format!("Error reading chunk for {}: {}", original_filename, e);
                            eprintln!("{}", error_msg);
                            errors.push(error_msg);
                            file_write_error = true;
                            break;
                        }
                    }
                }

                if file_write_error {
                    let _ = std::fs::remove_file(&temp_path);
                } else {
                    uploads.push((original_filename, temp_path));
                }
            }
            Err(e) => {
                let error_msg = format!(
                    "Failed to create temp file for {}: {}",
                    original_filename, e
                );
                eprintln!("{}", error_msg);
                errors.push(error_msg);
                while field.next().await.is_some() {}
            }
        }
    }

    (uploads, errors)
}

fn cleanup_temp_files(paths: &[PathBuf]) {
    use std::io::ErrorKind;

    for file_path in paths {
        if let Err(e) = std::fs::remove_file(file_path) {
            if e.kind() != ErrorKind::NotFound {
                eprintln!(
                    "Warning: Failed to clean up temp file {}: {}",
                    file_path.display(),
                    e
                );
            }
        }
    }
}

pub async fn parse_pdf(
    query: web::Query<ParsePdfQuery>,
    payload: Multipart,
) -> Result<HttpResponse, actix_web::Error> {
    let parser_name = query
        .parser
        .as_deref()
        .filter(|value| !value.is_empty());

    if let Some(name) = parser_name {
        if !available_parsers().iter().any(|parser| *parser == name) {
            let message = format!(
                "Unsupported statement parser '{name}'. Available parsers: {}",
                available_parsers().join(", ")
            );
            return Ok(HttpResponse::BadRequest().json(Resp {
                processed_files: Vec::new(),
                errors: vec![message],
            }));
        }
    }

    let (uploads, mut errors) = collect_uploaded_pdfs(payload).await;
    let temp_paths: Vec<PathBuf> = uploads.iter().map(|(_, path)| path.clone()).collect();

    if query.preview {
        let mut files = Vec::new();
        for (filename, path) in &uploads {
            let path_str = path.to_string_lossy().to_string();
            match preview_uploaded_pdf(filename.clone(), &path_str, parser_name) {
                Ok(preview) => files.push(preview),
                Err(error) => errors.push(error),
            }
        }
        cleanup_temp_files(&temp_paths);
        return Ok(HttpResponse::Ok().json(StatementPreviewResponse { files, errors }));
    }

    let predictor = CategoryPredictor::load_from_db().map_err(|error| {
        eprintln!("Database error loading category prediction context: {error}");
        actix_web::error::ErrorInternalServerError("Failed to load category prediction context")
    })?;

    let mut processed_files = Vec::new();
    for (filename, path) in &uploads {
        let path_str = path.to_string_lossy().to_string();
        println!("Processing file: {}", filename);
        match process_single_pdf(&path_str, parser_name, query.replace, &predictor) {
            Ok(()) => processed_files.push(filename.clone()),
            Err(error) => {
                let error_msg = format!("Error processing {}: {}", filename, error);
                eprintln!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    cleanup_temp_files(&temp_paths);

    let resp_body = Resp {
        processed_files,
        errors: errors.clone(),
    };

    if errors.is_empty() && !resp_body.processed_files.is_empty() {
        Ok(HttpResponse::Ok().json(resp_body))
    } else if !resp_body.processed_files.is_empty() {
        Ok(HttpResponse::Accepted().json(resp_body))
    } else {
        Ok(HttpResponse::BadRequest().json(resp_body))
    }
}

#[derive(serde::Deserialize, Debug)]
pub struct StatementsQuery {
    #[serde(default = "default_statements_page")]
    pub page: i64,
    #[serde(default = "default_statements_per_page")]
    pub per_page: i64,
    pub account_id: Option<i64>,
}

fn default_statements_page() -> i64 {
    1
}

fn default_statements_per_page() -> i64 {
    50
}

#[derive(serde::Serialize)]
pub struct StatementListItem {
    #[serde(flatten)]
    pub statement: Statement,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub financial_account: Option<FinancialAccountSummary>,
}

#[derive(serde::Serialize)]
pub struct PaginatedStatements {
    pub items: Vec<StatementListItem>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

fn statements_total_pages(total: i64, per_page: i64) -> i64 {
    if total <= 0 {
        return 0;
    }
    (total + per_page - 1) / per_page
}

pub async fn get_all_statements(
    query: web::Query<StatementsQuery>,
) -> Result<web::Json<PaginatedStatements>, actix_web::Error> {
    let page = query.page;
    let per_page = query.per_page;
    let account_id = query.account_id;

    let (statements, total) =
        Statement::list_paginated(page, per_page, account_id).map_err(|e| {
            eprintln!("Database error fetching statements: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to retrieve statements")
        })?;

    let account_ids: Vec<i64> = statements
        .iter()
        .filter_map(|row| row.financial_account_id)
        .collect();
    let summaries = FinancialAccount::summaries_for_ids(&account_ids).map_err(|e| {
        eprintln!("Database error fetching account summaries: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to retrieve statements")
    })?;
    let summary_by_id: std::collections::HashMap<i64, FinancialAccountSummary> = summaries
        .into_iter()
        .map(|summary| (summary.id, summary))
        .collect();

    let items = statements
        .into_iter()
        .map(|statement| {
            let financial_account = statement
                .financial_account_id
                .and_then(|id| summary_by_id.get(&id).cloned());
            StatementListItem {
                statement,
                financial_account,
            }
        })
        .collect();

    Ok(web::Json(PaginatedStatements {
        items,
        total,
        page,
        per_page,
        total_pages: statements_total_pages(total, per_page),
    }))
}

#[derive(serde::Deserialize, Debug)]
pub struct MissingPeriodsQuery {
    pub account_id: Option<i64>,
}

#[derive(serde::Serialize)]
pub struct MissingPeriodsResponse {
    pub periods: Vec<MissingStatementPeriod>,
}

pub async fn get_missing_statement_periods(
    query: web::Query<MissingPeriodsQuery>,
) -> Result<web::Json<MissingPeriodsResponse>, actix_web::Error> {
    let periods = Statement::missing_periods(query.account_id).map_err(|e| {
        eprintln!("Database error fetching missing statement periods: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to retrieve missing periods")
    })?;
    Ok(web::Json(MissingPeriodsResponse { periods }))
}

pub async fn delete_statement(path: web::Path<i64>) -> Result<HttpResponse, actix_web::Error> {
    let id = path.into_inner();
    Statement::delete(id).map_err(|e| {
        eprintln!("Database error deleting statement {}: {}", id, e);
        match e {
            DieselError::NotFound => actix_web::error::ErrorNotFound("Statement not found"),
            _ => actix_web::error::ErrorInternalServerError("Failed to delete statement"),
        }
    })?;
    Ok(HttpResponse::NoContent().finish())
}
