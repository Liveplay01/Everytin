// Phase 2 – stub for update scanning
use crate::error::AppResult;
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct UpdateEntry {
    pub id: String,
    pub title: String,
    pub kb_number: Option<String>,
    pub update_type: String,
    pub severity: String,
    pub size_bytes: Option<u64>,
    pub reboot_required: bool,
}

#[tauri::command]
pub async fn scan_windows_updates() -> AppResult<Vec<UpdateEntry>> {
    // Phase 2: implement WMI/PowerShell Windows Update scanning
    Ok(vec![])
}

#[tauri::command]
pub async fn scan_winget_updates() -> AppResult<Vec<UpdateEntry>> {
    use tokio::process::Command;
    let output = Command::new("winget")
        .args([
            "upgrade",
            "--accept-source-agreements",
            "--disable-interactivity",
        ])
        .output()
        .await
        .map_err(|e| crate::error::AppError::Process(e.to_string()))?;

    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    Ok(parse_winget_upgrade_output(&stdout))
}

fn parse_winget_upgrade_output(raw: &str) -> Vec<UpdateEntry> {
    let mut entries = Vec::new();
    let lines: Vec<&str> = raw.lines().collect();
    let sep = lines.iter().position(|l| l.starts_with('-'));
    let start = sep.map(|i| i + 1).unwrap_or(2);

    for line in lines.iter().skip(start) {
        let line = line.trim();
        if line.is_empty() || line.starts_with("upgrades available") {
            continue;
        }
        let parts: Vec<&str> = line
            .split("  ")
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .collect();

        if parts.len() >= 3 {
            if let Some(&id) = parts.iter().find(|p| p.contains('.')) {
                entries.push(UpdateEntry {
                    id: id.to_string(),
                    title: parts[0].to_string(),
                    kb_number: None,
                    update_type: "software".to_string(),
                    severity: "normal".to_string(),
                    size_bytes: None,
                    reboot_required: false,
                });
            }
        }
    }
    entries
}

#[tauri::command]
pub async fn install_winget_update(package_id: String) -> AppResult<bool> {
    let output = tokio::process::Command::new("winget")
        .args([
            "upgrade",
            "--id",
            &package_id,
            "--silent",
            "--accept-package-agreements",
            "--accept-source-agreements",
        ])
        .output()
        .await
        .map_err(|e| crate::error::AppError::Process(e.to_string()))?;
    Ok(output.status.success())
}
