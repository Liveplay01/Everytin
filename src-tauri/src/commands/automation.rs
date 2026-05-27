use crate::error::AppResult;
use crate::state::AppState;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Rule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub trigger_type: String,
    pub trigger_config: serde_json::Value,
    pub action_type: String,
    pub action_config: serde_json::Value,
    pub last_run: Option<String>,
    pub run_count: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Alert {
    pub id: String,
    pub severity: String,
    pub category: String,
    pub title: String,
    pub body: String,
    pub acknowledged: bool,
    pub created_at: String,
}

// ── Rule CRUD ────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_rules(state: tauri::State<'_, AppState>) -> AppResult<Vec<Rule>> {
    let db = state.db.lock().map_err(|e| {
        crate::error::AppError::Database(format!("lock error: {e}"))
    })?;

    let mut stmt = db.prepare(
        "SELECT id, name, enabled, trigger_type, trigger_config, action_type, action_config, last_run, run_count
         FROM automation_rules ORDER BY created_at ASC",
    )?;

    let rows = stmt.query_map([], |r| {
        Ok(Rule {
            id:             r.get(0)?,
            name:           r.get(1)?,
            enabled:        r.get::<_, i64>(2)? != 0,
            trigger_type:   r.get(3)?,
            trigger_config: serde_json::from_str(&r.get::<_, String>(4).unwrap_or_default())
                .unwrap_or(serde_json::Value::Object(Default::default())),
            action_type:    r.get(5)?,
            action_config:  serde_json::from_str(&r.get::<_, String>(6).unwrap_or_default())
                .unwrap_or(serde_json::Value::Object(Default::default())),
            last_run:       r.get(7)?,
            run_count:      r.get::<_, i64>(8)? as u32,
        })
    })?;

    Ok(rows.flatten().collect())
}

#[tauri::command]
pub async fn toggle_rule(
    state: tauri::State<'_, AppState>,
    id: String,
    enabled: bool,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| {
        crate::error::AppError::Database(format!("lock error: {e}"))
    })?;
    db.execute(
        "UPDATE automation_rules SET enabled = ?1, updated_at = datetime('now') WHERE id = ?2",
        rusqlite::params![enabled as i64, id],
    )?;
    Ok(())
}

#[tauri::command]
pub async fn run_rule_now(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: String,
) -> AppResult<()> {
    let rule = {
        let db = state.db.lock().map_err(|e| {
            crate::error::AppError::Database(format!("lock error: {e}"))
        })?;
        let result: rusqlite::Result<Rule> = db.query_row(
            "SELECT id, name, enabled, trigger_type, trigger_config, action_type, action_config, last_run, run_count
             FROM automation_rules WHERE id = ?1",
            rusqlite::params![id],
            |r| Ok(Rule {
                id:             r.get(0)?,
                name:           r.get(1)?,
                enabled:        r.get::<_, i64>(2)? != 0,
                trigger_type:   r.get(3)?,
                trigger_config: serde_json::from_str(&r.get::<_, String>(4).unwrap_or_default())
                    .unwrap_or(serde_json::Value::Object(Default::default())),
                action_type:    r.get(5)?,
                action_config:  serde_json::from_str(&r.get::<_, String>(6).unwrap_or_default())
                    .unwrap_or(serde_json::Value::Object(Default::default())),
                last_run:       r.get(7)?,
                run_count:      r.get::<_, i64>(8)? as u32,
            }),
        );
        result.map_err(|_| crate::error::AppError::NotFound(id.clone()))?
    };

    let settings = {
        state.cached_settings.lock()
            .map(|s| s.clone())
            .unwrap_or_default()
    };

    crate::automation::execute_rule(&app, &rule, &settings).await;
    crate::automation::mark_rule_run(&app, &rule.id);
    Ok(())
}

// ── Alerts ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_alerts(
    state: tauri::State<'_, AppState>,
    limit: Option<u32>,
) -> AppResult<Vec<Alert>> {
    let lim = limit.unwrap_or(20).min(100);
    let db = state.db.lock().map_err(|e| {
        crate::error::AppError::Database(format!("lock error: {e}"))
    })?;

    let mut stmt = db.prepare(
        "SELECT id, severity, category, title, body, acknowledged, created_at
         FROM alerts ORDER BY created_at DESC LIMIT ?1",
    )?;

    let rows = stmt.query_map(rusqlite::params![lim], |r| {
        Ok(Alert {
            id:           r.get(0)?,
            severity:     r.get(1)?,
            category:     r.get(2)?,
            title:        r.get(3)?,
            body:         r.get(4)?,
            acknowledged: r.get::<_, i64>(5)? != 0,
            created_at:   r.get(6)?,
        })
    })?;

    Ok(rows.flatten().collect())
}

#[tauri::command]
pub async fn acknowledge_alert(
    state: tauri::State<'_, AppState>,
    id: String,
) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| {
        crate::error::AppError::Database(format!("lock error: {e}"))
    })?;
    db.execute(
        "UPDATE alerts SET acknowledged = 1 WHERE id = ?1",
        rusqlite::params![id],
    )?;
    Ok(())
}
