use std::path::Path;

use pdfium_render::prelude::*;

use crate::{ParseError, ParserConfig};

pub(crate) fn extract_page_texts(
    file_path: &Path,
    config: &ParserConfig,
) -> Result<Vec<String>, ParseError> {
    let bindings = if let Some(path) = config.resolved_pdfium_library_path() {
        Pdfium::bind_to_library(path.to_string_lossy().as_ref())
            .map_err(|error| ParseError::PdfiumBinding(error.to_string()))?
    } else {
        Pdfium::bind_to_system_library()
            .map_err(|error| ParseError::PdfiumBinding(error.to_string()))?
    };

    let pdfium = Pdfium::new(bindings);
    let document = pdfium
        .load_pdf_from_file(file_path, None)
        .map_err(|error| ParseError::PdfLoad {
            path: file_path.display().to_string(),
            details: error.to_string(),
        })?;

    let mut pages = Vec::new();

    for (index, page) in document.pages().iter().enumerate() {
        let text = page
            .text()
            .map_err(|error| ParseError::PdfText {
                page: index + 1,
                details: error.to_string(),
            })?
            .all();

        pages.push(text);
    }

    Ok(pages)
}
