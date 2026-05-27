use serde::Serialize;

#[derive(Debug, thiserror::Error, Serialize)]
#[allow(dead_code)]
pub enum AppError {
    #[error("System error: {0}")]
    System(String),
    #[error("Database error: {0}")]
    Database(String),
    #[error("Process error: {0}")]
    Process(String),
    #[error("IO error: {0}")]
    Io(String),
    #[error("Parse error: {0}")]
    Parse(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Elevation required")]
    ElevationRequired,
    #[error("Timeout")]
    Timeout,
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::Database(e.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Parse(e.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
