use crate::{
    error::{AppError, AppResult},
    state::AppState,
};
use serde::Serialize;
use tauri::State;
use uuid::Uuid;

fn lock_err(e: impl std::fmt::Display) -> AppError {
    AppError::Database(format!("lock error: {e}"))
}

#[derive(Serialize, Clone, Debug)]
pub struct FocusStats {
    pub today_sessions: i64,
    pub today_minutes: i64,
    pub week_sessions: i64,
    pub week_minutes: i64,
    pub longest_session_minutes: i64,
}

/// Start a new focus session; returns the session ID.
#[tauri::command]
pub async fn start_focus_session(
    state: State<'_, AppState>,
    duration_planned: u32,
) -> AppResult<String> {
    let id = Uuid::new_v4().to_string();
    let db = state.db.lock().map_err(lock_err)?;
    db.execute(
        "INSERT INTO focus_sessions (id, duration_planned, started_at)
         VALUES (?1, ?2, datetime('now'))",
        rusqlite::params![id, duration_planned],
    )?;
    Ok(id)
}

/// Stop a focus session and record its actual duration.
#[tauri::command]
pub async fn stop_focus_session(
    state: State<'_, AppState>,
    id: String,
    completed: bool,
) -> AppResult<()> {
    let db = state.db.lock().map_err(lock_err)?;
    db.execute(
        "UPDATE focus_sessions
         SET ended_at        = datetime('now'),
             duration_actual = CAST((julianday('now') - julianday(started_at)) * 1440 AS INTEGER),
             completed       = ?2
         WHERE id = ?1",
        rusqlite::params![id, completed as i32],
    )?;
    Ok(())
}

/// Aggregate focus statistics.
#[tauri::command]
pub async fn get_focus_stats(state: State<'_, AppState>) -> AppResult<FocusStats> {
    let db = state.db.lock().map_err(lock_err)?;

    let today_sessions: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM focus_sessions WHERE completed = 1 AND date(started_at) = date('now')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let today_minutes: i64 = db
        .query_row(
            "SELECT COALESCE(SUM(duration_actual), 0) FROM focus_sessions WHERE completed = 1 AND date(started_at) = date('now')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let week_sessions: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM focus_sessions WHERE completed = 1 AND started_at >= datetime('now', '-7 days')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let week_minutes: i64 = db
        .query_row(
            "SELECT COALESCE(SUM(duration_actual), 0) FROM focus_sessions WHERE completed = 1 AND started_at >= datetime('now', '-7 days')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let longest_session_minutes: i64 = db
        .query_row(
            "SELECT COALESCE(MAX(duration_actual), 0) FROM focus_sessions WHERE completed = 1",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    Ok(FocusStats {
        today_sessions,
        today_minutes,
        week_sessions,
        week_minutes,
        longest_session_minutes,
    })
}
