use std::ffi::OsString;
use std::io::Write;
use std::path::{Path, PathBuf};

use actix_multipart::Multipart;
use actix_web::{web, HttpResponse, Result};
use diesel::result::Error as DieselError;
use database::models::{
    statement::Statement,
    transaction::Transaction,
    transaction_category_learn::CategoryPredictor,
};
use futures_util::StreamExt;
use sanitize_filename::sanitize;
use serde::{Deserialize, Serialize};
use statement_parser::{available_parsers, parse_statement, ParsedStatement, ParserConfig};
use uuid::Uuid;

const DEFAULT_BANK_PARSER: &str = "heritage";
const APP_PDFIUM_LIBRARY_PATH: &str = "./lib/libpdfium.so";

#[derive(Debug, Deserialize)]
pub struct ParsePdfQuery {
    parser: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct Resp {
    processed_files: Vec<String>,
    errors: Vec<String>,
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

fn process_single_pdf(file_path: &str, parser_name: &str) -> Result<(), String> {
    let parsed_statement = parse_statement(file_path, parser_name, &parser_config())
        .map_err(|error| format!("Failed to parse statement: {error}"))?;

    persist_statement(parsed_statement)?;
    std::fs::remove_file(file_path)
        .map_err(|error| format!("Failed to remove temp file {file_path}: {error}"))?;

    Ok(())
}

fn persist_statement(statement: ParsedStatement) -> Result<(), String> {
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

    let new_statement = Statement::insert(
        statement.statement_date,
        statement.account_id,
        statement.opening_balance_cents,
    )
    .map_err(|error| format!("Failed to insert statement: {error}"))?;

    let statement_id = i32::try_from(new_statement.id)
        .map_err(|_| format!("Statement ID {} does not fit into i32", new_statement.id))?;

    let predictor = CategoryPredictor::load_from_db().map_err(|error| {
        format!(
            "Database error loading category prediction context: {error}"
        )
    })?;

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

        Transaction::insert(
            statement_id,
            predicted_category,
            transaction.description,
            transaction.amount_cents,
            transaction_datetime,
            None,
            "parsed".to_string(),
            transaction.balance_cents,
        )
        .map_err(|error| format!("Failed to insert transaction: {error}"))?;
    }

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

pub async fn parse_pdf(
    query: web::Query<ParsePdfQuery>,
    mut payload: Multipart,
) -> Result<HttpResponse, actix_web::Error> {
    let mut processed_files = Vec::new();
    let mut errors = Vec::new();
    let mut temp_files = Vec::new();
    let parser_name = query
        .parser
        .as_deref()
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_BANK_PARSER);

    if !available_parsers().iter().any(|name| *name == parser_name) {
        let message = format!(
            "Unsupported statement parser '{}'. Available parsers: {}",
            parser_name,
            available_parsers().join(", ")
        );
        return Ok(HttpResponse::BadRequest().json(Resp {
            processed_files,
            errors: vec![message],
        }));
    }

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

        let mut temp_dir = std::env::temp_dir();
        temp_dir.push(format!("{}_{}", Uuid::new_v4(), original_filename));
        let temp_file_path = temp_dir.to_path_buf();
        let temp_file_path_str = temp_file_path.to_string_lossy().to_string();

        match std::fs::File::create(&temp_file_path) {
            Ok(mut f) => {
                temp_files.push(temp_file_path.clone());
                let mut file_write_error = false;
                while let Some(chunk_result) = field.next().await {
                    match chunk_result {
                        Ok(data) => {
                            if f.write_all(&data).is_err() {
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

                if !file_write_error {
                    println!("Processing file: {}", original_filename);
                    match process_single_pdf(&temp_file_path_str, parser_name) {
                        Ok(_) => {
                            processed_files.push(original_filename.clone());
                            temp_files.retain(|p| p != &temp_file_path);
                        }
                        Err(e) => {
                            let error_msg =
                                format!("Error processing {}: {}", original_filename, e);
                            eprintln!("{}", error_msg);
                            errors.push(error_msg);
                        }
                    }
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

    for file_path in temp_files {
        if let Err(e) = std::fs::remove_file(&file_path) {
            eprintln!(
                "Warning: Failed to clean up temp file {}: {}",
                file_path.display(),
                e
            );
        }
    }

    let resp_body = Resp {
        processed_files,
        errors: errors.clone(),
    };

    let response = if errors.is_empty() && !resp_body.processed_files.is_empty() {
        HttpResponse::Ok().json(resp_body)
    } else if !resp_body.processed_files.is_empty() {
        HttpResponse::Accepted().json(resp_body)
    } else {
        HttpResponse::BadRequest().json(resp_body)
    };

    Ok(response)
}

#[derive(serde::Deserialize, Debug)]
pub struct StatementsQuery {
    #[serde(default = "default_statements_page")]
    pub page: i64,
    #[serde(default = "default_statements_per_page")]
    pub per_page: i64,
}

fn default_statements_page() -> i64 {
    1
}

fn default_statements_per_page() -> i64 {
    50
}

#[derive(serde::Serialize)]
pub struct PaginatedStatements {
    pub items: Vec<Statement>,
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

    let (items, total) = Statement::list_paginated(page, per_page).map_err(|e| {
        eprintln!("Database error fetching statements: {}", e);
        actix_web::error::ErrorInternalServerError("Failed to retrieve statements")
    })?;

    Ok(web::Json(PaginatedStatements {
        items,
        total,
        page,
        per_page,
        total_pages: statements_total_pages(total, per_page),
    }))
}

#[derive(serde::Serialize)]
pub struct MissingPeriodsResponse {
    pub periods: Vec<String>,
}

pub async fn get_missing_statement_periods() -> Result<web::Json<MissingPeriodsResponse>, actix_web::Error> {
    let periods = Statement::missing_period_labels().map_err(|e| {
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
