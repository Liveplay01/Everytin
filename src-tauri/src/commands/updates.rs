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
    use tokio::process::Command;
    use tokio::time::{timeout, Duration};
    use serde_json::Value;

    let script = r#"
$ErrorActionPreference = 'Stop'
try {
    $Session = New-Object -ComObject Microsoft.Update.Session
    $Searcher = $Session.CreateUpdateSearcher()
    $Result = $Searcher.Search("IsInstalled=0 and Type='Software'")
    $updates = $Result.Updates | ForEach-Object {
        [PSCustomObject]@{
            Title        = $_.Title
            KB           = ($_.KBArticleIDs | Select-Object -First 1)
            SizeBytes    = $_.MaxDownloadSize
            RebootReq    = [bool]$_.RebootRequired
            Severity     = if ($_.MsrcSeverity) { $_.MsrcSeverity } else { 'Normal' }
        }
    }
    $updates | ConvertTo-Json -Depth 3 -Compress
} catch {
    '[]'
}
"#;

    let output = timeout(
        Duration::from_secs(30),
        Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .output(),
    )
    .await
    .map_err(|_| crate::error::AppError::Timeout)?
    .map_err(|e| crate::error::AppError::Process(e.to_string()))?;

    let raw = String::from_utf8_lossy(&output.stdout).into_owned();
    let raw = raw.trim();

    if raw.is_empty() || raw == "[]" {
        return Ok(vec![]);
    }

    // PowerShell returns a bare object (not array) when there is exactly 1 result — normalise.
    let value: Value = serde_json::from_str(raw)
        .unwrap_or(Value::Array(vec![]));

    let arr = match value {
        Value::Array(a) => a,
        Value::Object(_) => vec![value],
        _ => vec![],
    };

    let entries = arr
        .into_iter()
        .filter_map(|v| {
            let title = v.get("Title")?.as_str()?.to_string();
            let kb = v.get("KB").and_then(|x| x.as_str()).map(|s| s.to_string());
            let size_bytes = v.get("SizeBytes").and_then(|x| x.as_u64());
            let reboot_required = v.get("RebootReq").and_then(|x| x.as_bool()).unwrap_or(false);
            let severity_raw = v.get("Severity").and_then(|x| x.as_str()).unwrap_or("Normal");
            let severity = match severity_raw.to_lowercase().as_str() {
                "critical" => "critical",
                "important" => "important",
                "moderate" => "moderate",
                _ => "normal",
            }
            .to_string();
            let id = kb.clone().unwrap_or_else(|| {
                title.chars().filter(|c| c.is_alphanumeric()).take(16).collect()
            });
            Some(UpdateEntry {
                id,
                title,
                kb_number: kb,
                update_type: "windows".to_string(),
                severity,
                size_bytes,
                reboot_required,
            })
        })
        .collect();

    Ok(entries)
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
