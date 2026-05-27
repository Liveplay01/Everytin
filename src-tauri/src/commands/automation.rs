// Phase 3 – automation rules stub
use crate::error::AppResult;
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

#[tauri::command]
pub async fn get_rules() -> AppResult<Vec<Rule>> {
    Ok(vec![])
}
