use std::env;
use std::ffi::OsString;
use std::path::PathBuf;

#[derive(Debug, Clone, Default)]
pub struct ParserConfig {
    pub pdfium_library_path: Option<PathBuf>,
}

impl ParserConfig {
    pub fn with_pdfium_library_path<P: Into<PathBuf>>(mut self, path: P) -> Self {
        self.pdfium_library_path = Some(path.into());
        self
    }

    pub(crate) fn resolved_pdfium_library_path(&self) -> Option<PathBuf> {
        self.pdfium_library_path
            .clone()
            .or_else(|| env::var_os("PDFIUM_LIBRARY_PATH").and_then(non_empty_path))
    }
}

fn non_empty_path(value: OsString) -> Option<PathBuf> {
    if value.is_empty() {
        return None;
    }

    Some(PathBuf::from(value))
}
