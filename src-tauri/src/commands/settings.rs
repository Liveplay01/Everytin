use crate::{error::AppResult, state::AppState};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppSettings {
    pub theme: String,
    pub ai_provider: String,
    pub gemini_api_key: String,
    pub claude_api_key: String,
    pub autostart: bool,
    pub minimize_to_tray: bool,
    pub update_check_interval_hours: u32,
    pub language: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "light".to_string(),
            ai_provider: "gemini".to_string(),
            gemini_api_key: String::new(),
            claude_api_key: String::new(),
            autostart: false,
            minimize_to_tray: true,
            update_check_interval_hours: 24,
            language: "de".to_string(),
        }
    }
}

#[tauri::command]
pub async fn get_settings(state: tauri::State<'_, AppState>) -> AppResult<AppSettings> {
    let db = state.db.lock().map_err(|e| {
        crate::error::AppError::Database(format!("lock error: {e}"))
    })?;

    let mut stmt = db.prepare(
        "SELECT key, value FROM settings WHERE key = 'app_settings'",
    )?;

    let row: Option<String> = stmt
        .query_row([], |r| r.get(1))
        .ok();

    if let Some(json) = row {
        let settings: AppSettings = serde_json::from_str(&json)
            .unwrap_or_default();
        Ok(settings)
    } else {
        Ok(AppSettings::default())
    }
}

#[tauri::command]
pub async fn update_settings(
    state: tauri::State<'_, AppState>,
    settings: AppSettings,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| {
        crate::error::AppError::Database(format!("lock error: {e}"))
    })?;

    let json = serde_json::to_string(&settings)?;
    db.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('app_settings', ?1, datetime('now'))",
        rusqlite::params![json],
    )?;
    Ok(())
}

#[tauri::command]
pub async fn get_setting(
    state: tauri::State<'_, AppState>,
    key: String,
) -> AppResult<Option<String>> {
    let db = state.db.lock().map_err(|e| {
        crate::error::AppError::Database(format!("lock error: {e}"))
    })?;

    let result: Option<String> = db
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![key],
            |r| r.get(0),
        )
        .ok();

    Ok(result)
}

#[tauri::command]
pub async fn set_setting(
    state: tauri::State<'_, AppState>,
    key: String,
    value: String,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| {
        crate::error::AppError::Database(format!("lock error: {e}"))
    })?;

    db.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))",
        rusqlite::params![key, value],
    )?;
    Ok(())
}
