use crate::{
    error::{AppError, AppResult},
    state::AppState,
};
use serde::Serialize;
use tauri::State;

fn lock_err(e: impl std::fmt::Display) -> AppError {
    AppError::Database(format!("lock error: {e}"))
}

#[derive(Serialize, Clone, Debug)]
pub struct ClipboardEntry {
    pub id: i64,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub content: String,
    pub pinned: bool,
    pub created_at: String,
}

/// Fetch the last N clipboard entries (pinned first, then by date desc).
#[tauri::command]
pub async fn get_clipboard_history(
    state: State<'_, AppState>,
    limit: u32,
) -> AppResult<Vec<ClipboardEntry>> {
    let db = state.db.lock().map_err(lock_err)?;
    let mut stmt = db.prepare(
        "SELECT id, type, content, pinned, created_at
         FROM clipboard_history
         ORDER BY pinned DESC, created_at DESC
         LIMIT ?1",
    )?;

    let entries = stmt
        .query_map(rusqlite::params![limit], |row| {
            Ok(ClipboardEntry {
                id: row.get(0)?,
                entry_type: row.get(1)?,
                content: row.get(2)?,
                pinned: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(entries)
}

/// Clear all non-pinned clipboard entries.
#[tauri::command]
pub async fn clear_clipboard_history(state: State<'_, AppState>) -> AppResult<()> {
    let db = state.db.lock().map_err(lock_err)?;
    db.execute("DELETE FROM clipboard_history WHERE pinned = 0", [])?;
    Ok(())
}

/// Toggle the pinned state of a clipboard entry.
#[tauri::command]
pub async fn pin_clipboard_entry(
    state: State<'_, AppState>,
    id: i64,
    pinned: bool,
) -> AppResult<()> {
    let db = state.db.lock().map_err(lock_err)?;
    db.execute(
        "UPDATE clipboard_history SET pinned = ?2 WHERE id = ?1",
        rusqlite::params![id, pinned as i32],
    )?;
    Ok(())
}
