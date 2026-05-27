use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use tokio::process::Command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Package {
    pub id: String,
    pub name: String,
    pub version: String,
    pub available_version: Option<String>,
    pub publisher: Option<String>,
    pub installed: bool,
    pub source: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct InstallResult {
    pub package_id: String,
    pub success: bool,
    pub message: String,
}

async fn run_winget(args: &[&str]) -> AppResult<String> {
    let output = Command::new("winget")
        .args(args)
        .output()
        .await
        .map_err(|e| AppError::Process(format!("winget not found: {e}")))?;

    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).into_owned();

    // winget exit code -1978335212 means "no results found" – not an error
    if !output.status.success() {
        let code = output.status.code().unwrap_or(0);
        if code != -1978335212i32 && code != 0x8A15002C_u32 as i32 {
            return Err(AppError::Process(format!(
                "winget failed ({}): {}",
                code, stderr
            )));
        }
    }

    Ok(stdout)
}

fn parse_winget_search(raw: &str) -> Vec<Package> {
    let mut packages = Vec::new();
    let lines: Vec<&str> = raw.lines().collect();

    // Find the separator line (all dashes) to locate header
    let sep_idx = lines.iter().position(|l| l.starts_with('-') || l.contains("---"));
    let start = sep_idx.map(|i| i + 1).unwrap_or(2);

    for line in lines.iter().skip(start) {
        let line = line.trim();
        if line.is_empty() || line.starts_with("An update") || line.starts_with("This command") {
            continue;
        }

        // Winget columns are fixed-width; we split on 2+ consecutive spaces
        let parts: Vec<&str> = line
            .split("  ")
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .collect();

        if parts.len() >= 2 {
            // Heuristic: second non-empty part with a dot looks like a package ID
            let id_candidate = parts.iter().find(|p| p.contains('.'));
            if let Some(&id) = id_candidate {
                let name = parts[0].to_string();
                let version = parts.get(2).copied().unwrap_or("").to_string();
                let source = parts.last().copied().map(String::from);
                packages.push(Package {
                    id: id.to_string(),
                    name,
                    version,
                    available_version: None,
                    publisher: None,
                    installed: false,
                    source,
                });
            }
        }
    }

    packages
}

#[tauri::command]
pub async fn search_packages(query: String) -> AppResult<Vec<Package>> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    let raw = run_winget(&[
        "search",
        "--query",
        &query,
        "--accept-source-agreements",
        "--disable-interactivity",
    ])
    .await?;
    Ok(parse_winget_search(&raw))
}

#[tauri::command]
pub async fn get_installed_packages() -> AppResult<Vec<Package>> {
    let raw = run_winget(&[
        "list",
        "--accept-source-agreements",
        "--disable-interactivity",
    ])
    .await?;
    let mut packages = parse_winget_search(&raw);
    for p in &mut packages {
        p.installed = true;
    }
    Ok(packages)
}

#[tauri::command]
pub async fn install_package(
    app: tauri::AppHandle,
    package_id: String,
) -> AppResult<InstallResult> {
    use tauri::Emitter;

    let id = package_id.clone();
    app.emit(
        "install://progress",
        serde_json::json!({ "package_id": id, "pct": 0, "status": "starting" }),
    )
    .ok();

    let output = Command::new("winget")
        .args([
            "install",
            "--id",
            &package_id,
            "--silent",
            "--accept-package-agreements",
            "--accept-source-agreements",
            "--disable-interactivity",
        ])
        .output()
        .await
        .map_err(|e| AppError::Process(e.to_string()))?;

    let success = output.status.success()
        || output.status.code() == Some(0)
        || output.status.code() == Some(-1978335189); // already installed

    let message = if success {
        "Installation successful".to_string()
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
        format!("Installation failed: {}", stderr.trim())
    };

    app.emit(
        "install://progress",
        serde_json::json!({ "package_id": id, "pct": 100, "status": if success { "done" } else { "failed" } }),
    )
    .ok();

    Ok(InstallResult {
        package_id,
        success,
        message,
    })
}

#[tauri::command]
pub async fn uninstall_package(package_id: String) -> AppResult<InstallResult> {
    let output = Command::new("winget")
        .args([
            "uninstall",
            "--id",
            &package_id,
            "--silent",
            "--accept-source-agreements",
            "--disable-interactivity",
        ])
        .output()
        .await
        .map_err(|e| AppError::Process(e.to_string()))?;

    let success = output.status.success();
    Ok(InstallResult {
        package_id,
        success,
        message: if success {
            "Uninstalled successfully".to_string()
        } else {
            "Uninstall failed".to_string()
        },
    })
}
