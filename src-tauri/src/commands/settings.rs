use crate::{error::AppResult, state::AppState};
use serde::{Deserialize, Serialize};

fn default_true() -> bool { true }
fn default_7() -> u32 { 7 }
fn default_24() -> u32 { 24 }
fn default_notify_only() -> String { "notify_only".to_string() }
fn default_ollama_url() -> String { "http://localhost:11434".to_string() }
fn default_ollama_model() -> String { "llama3.2".to_string() }

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppSettings {
    // ── Existing fields ─────────────────────────────────────────────────────
    pub theme: String,
    pub ai_provider: String,
    pub gemini_api_key: String,
    pub claude_api_key: String,
    pub autostart: bool,
    pub minimize_to_tray: bool,
    pub update_check_interval_hours: u32,
    pub language: String,

    // ── New automation / notification fields ────────────────────────────────
    // All use #[serde(default)] so existing DB JSON blobs remain compatible.
    #[serde(default = "default_true")]
    pub auto_cleanup_enabled: bool,
    #[serde(default = "default_7")]
    pub auto_cleanup_interval_days: u32,
    #[serde(default = "default_true")]
    pub auto_update_scan_enabled: bool,
    #[serde(default = "default_24")]
    pub auto_update_scan_interval_hours: u32,
    #[serde(default)]
    pub install_updates_on_shutdown: bool,
    #[serde(default = "default_true")]
    pub notify_on_updates: bool,
    #[serde(default = "default_true")]
    pub notify_on_cleanup: bool,
    #[serde(default = "default_true")]
    pub notify_on_driver_issues: bool,
    /// "notify_only" | "auto_install_signed_only"
    #[serde(default = "default_notify_only")]
    pub driver_update_mode: String,
    #[serde(default = "default_true")]
    pub startup_ram_boost: bool,

    // ── Ollama (local, free) ────────────────────────────────────────────────
    #[serde(default = "default_ollama_url")]
    pub ollama_url: String,
    #[serde(default = "default_ollama_model")]
    pub ollama_model: String,
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
            auto_cleanup_enabled: true,
            auto_cleanup_interval_days: 7,
            auto_update_scan_enabled: true,
            auto_update_scan_interval_hours: 24,
            install_updates_on_shutdown: false,
            notify_on_updates: true,
            notify_on_cleanup: true,
            notify_on_driver_issues: true,
            driver_update_mode: "notify_only".to_string(),
            startup_ram_boost: true,
            ollama_url: "http://localhost:11434".to_string(),
            ollama_model: "llama3.2".to_string(),
        }
    }
}

#[tauri::command]
pub async fn get_settings(state: tauri::State<'_, AppState>) -> AppResult<AppSettings> {
    let db = state.db.lock().map_err(|e| {
        crate::error::AppError::Database(format!("lock error: {e}"))
    })?;

    let row: Option<String> = db
        .query_row("SELECT value FROM settings WHERE key = 'app_settings'", [], |r| r.get(0))
        .ok();

    if let Some(json) = row {
        Ok(serde_json::from_str(&json).unwrap_or_default())
    } else {
        Ok(AppSettings::default())
    }
}

#[tauri::command]
pub async fn update_settings(
    state: tauri::State<'_, AppState>,
    settings: AppSettings,
) -> AppResult<()> {
    let json = serde_json::to_string(&settings)?;
    {
        let db = state.db.lock().map_err(|e| {
            crate::error::AppError::Database(format!("lock error: {e}"))
        })?;
        db.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('app_settings', ?1, datetime('now'))",
            rusqlite::params![json],
        )?;
    }
    // Update the in-memory cache
    if let Ok(mut cache) = state.cached_settings.lock() {
        *cache = settings;
    }
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
