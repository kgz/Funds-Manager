use thiserror::Error;

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("unsupported parser: {0}")]
    UnsupportedParser(String),
    #[error("failed to bind Pdfium: {0}")]
    PdfiumBinding(String),
    #[error("failed to load PDF {path}: {details}")]
    PdfLoad { path: String, details: String },
    #[error("failed to extract text from page {page}: {details}")]
    PdfText { page: usize, details: String },
    #[error("missing field: {0}")]
    MissingField(&'static str),
    #[error("failed to parse {context}: {value}")]
    InvalidField {
        context: &'static str,
        value: String,
    },
}
