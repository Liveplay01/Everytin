use crate::error::AppResult;
use serde::Serialize;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

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

#[derive(Serialize, Clone, Debug)]
pub struct DriverUpdateEntry {
    pub id: String,
    pub title: String,
    pub device_description: String,
    pub driver_version: String,
    pub severity: String,
    pub size_bytes: Option<u64>,
    pub reboot_required: bool,
}

// ── Windows Software Updates ─────────────────────────────────────────────────

#[tauri::command]
pub async fn scan_windows_updates() -> AppResult<Vec<UpdateEntry>> {
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

    let value: Value = serde_json::from_str(raw).unwrap_or(Value::Array(vec![]));
    let arr = match value {
        Value::Array(a) => a,
        Value::Object(_) => vec![value],
        _ => vec![],
    };

    Ok(arr
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
        .collect())
}

// ── Winget App Updates ───────────────────────────────────────────────────────

#[tauri::command]
pub async fn scan_winget_updates() -> AppResult<Vec<UpdateEntry>> {
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
    let output = Command::new("winget")
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

// ── Driver Updates via Windows Update API ───────────────────────────────────

#[tauri::command]
pub async fn scan_driver_updates() -> AppResult<Vec<DriverUpdateEntry>> {
    use serde_json::Value;

    let script = r#"
$ErrorActionPreference = 'Stop'
try {
    $Session = New-Object -ComObject Microsoft.Update.Session
    $Searcher = $Session.CreateUpdateSearcher()
    $Result = $Searcher.Search("IsInstalled=0 and Type='Driver'")
    $updates = $Result.Updates | ForEach-Object {
        $desc = if ($_.Description) { $_.Description } else { $_.Title }
        [PSCustomObject]@{
            UpdateID    = $_.Identity.UpdateID
            Title       = $_.Title
            Description = ($desc -replace '\s+', ' ').Trim()
            Version     = if ($_.DriverModel) { $_.DriverModel } else { '' }
            SizeBytes   = $_.MaxDownloadSize
            RebootReq   = [bool]$_.RebootRequired
            Severity    = if ($_.MsrcSeverity) { $_.MsrcSeverity } else { 'Normal' }
        }
    }
    if ($updates) { $updates | ConvertTo-Json -Depth 3 -Compress } else { '[]' }
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

    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if raw.is_empty() || raw == "[]" {
        return Ok(vec![]);
    }

    let value: Value = serde_json::from_str(&raw).unwrap_or(Value::Array(vec![]));
    let arr = match value {
        Value::Array(a) => a,
        Value::Object(_) => vec![value],
        _ => vec![],
    };

    Ok(arr
        .into_iter()
        .filter_map(|v| {
            let id = v.get("UpdateID")?.as_str()?.to_string();
            let title = v.get("Title")?.as_str()?.to_string();
            let device_description = v
                .get("Description")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .chars()
                .take(120)
                .collect();
            let driver_version = v
                .get("Version")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string();
            let size_bytes = v.get("SizeBytes").and_then(|x| x.as_u64());
            let reboot_required = v.get("RebootReq").and_then(|x| x.as_bool()).unwrap_or(false);
            let severity = v
                .get("Severity")
                .and_then(|x| x.as_str())
                .unwrap_or("normal")
                .to_lowercase();
            Some(DriverUpdateEntry {
                id,
                title,
                device_description,
                driver_version,
                severity,
                size_bytes,
                reboot_required,
            })
        })
        .collect())
}

#[tauri::command]
pub async fn install_driver_update(update_id: String) -> AppResult<bool> {
    // Create a restore point first — best effort, don't fail if it doesn't work
    let rp_script = r#"
try {
    Enable-ComputerRestore -Drive "C:\" -ErrorAction SilentlyContinue
    Checkpoint-Computer -Description "Before everytin Driver Update" -RestorePointType "MODIFY_SETTINGS" -ErrorAction SilentlyContinue
} catch {}
"#;
    let _ = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", rp_script])
        .output()
        .await;

    let install_script = format!(
        r#"
$ErrorActionPreference = 'Stop'
try {{
    $Session = New-Object -ComObject Microsoft.Update.Session
    $Searcher = $Session.CreateUpdateSearcher()
    $Result = $Searcher.Search("IsInstalled=0 and Type='Driver'")
    $update = $Result.Updates | Where-Object {{ $_.Identity.UpdateID -eq '{update_id}' }}
    if (-not $update) {{ Write-Output '0'; exit }}
    $Coll = New-Object -ComObject Microsoft.Update.UpdateColl
    $Coll.Add($update) | Out-Null
    $Downloader = $Session.CreateUpdateDownloader()
    $Downloader.Updates = $Coll
    $Downloader.Download() | Out-Null
    $Installer = $Session.CreateUpdateInstaller()
    $Installer.Updates = $Coll
    $InstallResult = $Installer.Install()
    if ($InstallResult.ResultCode -eq 2) {{ Write-Output '1' }} else {{ Write-Output '0' }}
}} catch {{
    Write-Output '0'
}}
"#
    );

    let output = timeout(
        Duration::from_secs(300),
        Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &install_script])
            .output(),
    )
    .await
    .map_err(|_| crate::error::AppError::Timeout)?
    .map_err(|e| crate::error::AppError::Process(e.to_string()))?;

    let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(result == "1")
}

// ── Shutdown Task Scheduler ──────────────────────────────────────────────────

#[tauri::command]
pub async fn register_shutdown_update_task(enable: bool) -> AppResult<()> {
    let script = if enable {
        let exe = std::env::current_exe()
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_else(|_| "everytin.exe".to_string());
        format!(
            r#"
$action  = New-ScheduledTaskAction -Execute '"{exe}"' -Argument '--run-updates-task'
$trigger = New-ScheduledTaskTrigger -AtLogOff
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
Unregister-ScheduledTask -TaskName 'EverytinShutdownUpdates' -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName 'EverytinShutdownUpdates' -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force | Out-Null
Write-Output 'ok'
"#
        )
    } else {
        r#"
Unregister-ScheduledTask -TaskName 'EverytinShutdownUpdates' -Confirm:$false -ErrorAction SilentlyContinue
Write-Output 'ok'
"#
        .to_string()
    };

    // Write to temp file to avoid escaping issues, then run elevated
    let tmp = std::env::temp_dir().join("everytin_task.ps1");
    tokio::fs::write(&tmp, script.as_bytes())
        .await
        .map_err(|e| crate::error::AppError::Io(e.to_string()))?;

    let tmp_str = tmp.to_string_lossy().into_owned();
    let elevate_cmd = format!(
        "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"{tmp_str}\"' -Verb RunAs -Wait -WindowStyle Hidden"
    );

    let output = timeout(
        Duration::from_secs(60),
        Command::new("powershell")
            .args(["-NoProfile", "-Command", &elevate_cmd])
            .output(),
    )
    .await
    .map_err(|_| crate::error::AppError::Timeout)?
    .map_err(|e| crate::error::AppError::Process(e.to_string()))?;

    let _ = tokio::fs::remove_file(&tmp).await;

    if output.status.success() {
        Ok(())
    } else {
        Err(crate::error::AppError::ElevationRequired)
    }
}
