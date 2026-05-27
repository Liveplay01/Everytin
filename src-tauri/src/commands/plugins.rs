use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub permissions: Vec<String>,
    pub entry: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct Plugin {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub enabled: bool,
    pub path: String,
}

fn plugins_dir() -> PathBuf {
    std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("everytin")
        .join("plugins")
}

fn enabled_file() -> PathBuf {
    plugins_dir().join(".enabled")
}

fn load_enabled() -> std::collections::HashSet<String> {
    std::fs::read_to_string(enabled_file())
        .unwrap_or_default()
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect()
}

fn save_enabled(set: &std::collections::HashSet<String>) -> std::io::Result<()> {
    let content: String = set.iter().cloned().collect::<Vec<_>>().join("\n");
    std::fs::write(enabled_file(), content)
}

/// Scan the plugins directory and return all installed plugins.
#[tauri::command]
pub async fn list_plugins() -> AppResult<Vec<Plugin>> {
    let dir = plugins_dir();
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| AppError::Io(e.to_string()))?;
    }

    let enabled = load_enabled();
    let mut plugins = Vec::new();

    let entries = std::fs::read_dir(&dir).map_err(|e| AppError::Io(e.to_string()))?;
    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_dir() { continue; }

        let manifest_path = path.join("manifest.json");
        if !manifest_path.exists() { continue; }

        let raw = std::fs::read_to_string(&manifest_path)
            .map_err(|e| AppError::Io(e.to_string()))?;
        let manifest: PluginManifest = serde_json::from_str(&raw)
            .map_err(|e| AppError::Parse(e.to_string()))?;

        plugins.push(Plugin {
            enabled: enabled.contains(&manifest.id),
            path: path.to_string_lossy().into_owned(),
            id: manifest.id,
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            author: manifest.author,
        });
    }

    Ok(plugins)
}

/// Toggle a plugin on or off.
#[tauri::command]
pub async fn set_plugin_enabled(id: String, enabled: bool) -> AppResult<()> {
    let mut set = load_enabled();
    if enabled { set.insert(id); } else { set.remove(&id); }
    save_enabled(&set).map_err(|e| AppError::Io(e.to_string()))
}

/// Remove an installed plugin directory.
#[tauri::command]
pub async fn uninstall_plugin(id: String) -> AppResult<()> {
    let dir = plugins_dir().join(&id);
    if dir.exists() {
        std::fs::remove_dir_all(&dir).map_err(|e| AppError::Io(e.to_string()))?;
    }
    let mut set = load_enabled();
    set.remove(&id);
    save_enabled(&set).map_err(|e| AppError::Io(e.to_string()))
}
