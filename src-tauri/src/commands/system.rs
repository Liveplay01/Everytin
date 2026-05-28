use crate::{error::AppResult, state::AppState};
use serde::{Deserialize, Serialize};
use sysinfo::{Disks, Networks, Pid, System};

#[derive(Serialize, Clone, Debug)]
pub struct MetricPoint {
    pub value: f64,
    pub recorded_at: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct SystemSnapshot {
    pub hostname: String,
    pub os_version: String,
    pub cpu_usage: f32,
    pub cpu_count: usize,
    pub cpu_model: String,
    pub ram_used: u64,
    pub ram_total: u64,
    pub swap_used: u64,
    pub swap_total: u64,
    pub disk_used: u64,
    pub disk_total: u64,
    pub uptime: u64,
    pub load_avg: [f64; 3],
}

#[derive(Serialize, Clone, Debug)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory: u64,
    pub status: String,
    pub exe: Option<String>,
}

#[derive(serde::Deserialize)]
pub enum ProcessSort {
    #[serde(rename = "cpu")]
    Cpu,
    #[serde(rename = "memory")]
    Memory,
    #[serde(rename = "name")]
    Name,
}

pub fn snapshot_from_sys(sys: &mut System, disk_override: Option<(u64, u64)>) -> SystemSnapshot {
    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let hostname = System::host_name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = System::long_os_version().unwrap_or_else(|| "Windows".to_string());
    let cpu_usage = sys.global_cpu_usage();
    let cpu_count = sys.cpus().len();
    let cpu_model = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".to_string());
    let ram_used = sys.used_memory();
    let ram_total = sys.total_memory();
    let swap_used = sys.used_swap();
    let swap_total = sys.total_swap();
    let uptime = System::uptime();
    let load_avg = System::load_average();

    let (disk_used, disk_total) = disk_override.unwrap_or_else(|| {
        let disks = Disks::new_with_refreshed_list();
        disks.list().iter().fold((0u64, 0u64), |(used, total), d| {
            let d_used = d.total_space().saturating_sub(d.available_space());
            (used + d_used, total + d.total_space())
        })
    });

    SystemSnapshot {
        hostname,
        os_version,
        cpu_usage,
        cpu_count,
        cpu_model,
        ram_used,
        ram_total,
        swap_used,
        swap_total,
        disk_used,
        disk_total,
        uptime,
        load_avg: [load_avg.one, load_avg.five, load_avg.fifteen],
    }
}

#[tauri::command]
pub async fn get_system_snapshot(
    state: tauri::State<'_, AppState>,
) -> AppResult<SystemSnapshot> {
    let mut sys = state.system.lock().map_err(|e| {
        crate::error::AppError::System(format!("lock error: {e}"))
    })?;
    Ok(snapshot_from_sys(&mut sys, None))
}

#[tauri::command]
pub async fn get_process_list(
    state: tauri::State<'_, AppState>,
    sort_by: Option<ProcessSort>,
    limit: Option<usize>,
) -> AppResult<Vec<ProcessInfo>> {
    let mut sys = state.system.lock().map_err(|e| {
        crate::error::AppError::System(format!("lock error: {e}"))
    })?;
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All);

    let mut processes: Vec<ProcessInfo> = sys
        .processes()
        .values()
        .map(|p| ProcessInfo {
            pid: p.pid().as_u32(),
            name: p.name().to_string_lossy().into_owned(),
            cpu_usage: p.cpu_usage(),
            memory: p.memory(),
            status: format!("{:?}", p.status()),
            exe: p.exe().map(|e| e.to_string_lossy().into_owned()),
        })
        .collect();

    match sort_by {
        Some(ProcessSort::Memory) | None => {
            processes.sort_by(|a, b| b.memory.cmp(&a.memory));
        }
        Some(ProcessSort::Cpu) => {
            processes.sort_by(|a, b| {
                b.cpu_usage
                    .partial_cmp(&a.cpu_usage)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }
        Some(ProcessSort::Name) => {
            processes.sort_by(|a, b| a.name.cmp(&b.name));
        }
    }

    let limit = limit.unwrap_or(50);
    processes.truncate(limit);

    Ok(processes)
}

#[tauri::command]
pub async fn kill_process(
    state: tauri::State<'_, AppState>,
    pid: u32,
) -> AppResult<()> {
    let sys = state.system.lock().map_err(|e| {
        crate::error::AppError::System(format!("lock error: {e}"))
    })?;
    let pid = Pid::from_u32(pid);
    if let Some(process) = sys.process(pid) {
        process.kill();
        Ok(())
    } else {
        Err(crate::error::AppError::NotFound(format!("PID {}", pid)))
    }
}

#[derive(Serialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total: u64,
    pub available: u64,
    pub used: u64,
    pub fs_type: String,
}

#[tauri::command]
pub async fn get_disk_info() -> AppResult<Vec<DiskInfo>> {
    let disks = Disks::new_with_refreshed_list();
    let result = disks
        .list()
        .iter()
        .map(|d| DiskInfo {
            name: d.name().to_string_lossy().into_owned(),
            mount_point: d.mount_point().to_string_lossy().into_owned(),
            total: d.total_space(),
            available: d.available_space(),
            used: d.total_space().saturating_sub(d.available_space()),
            fs_type: d.file_system().to_string_lossy().into_owned(),
        })
        .collect();
    Ok(result)
}

#[derive(Serialize)]
pub struct NetworkInfo {
    pub name: String,
    pub received: u64,
    pub transmitted: u64,
}

#[tauri::command]
pub async fn get_network_info() -> AppResult<Vec<NetworkInfo>> {
    let networks = Networks::new_with_refreshed_list();
    let result = networks
        .iter()
        .map(|(name, data)| NetworkInfo {
            name: name.clone(),
            received: data.received(),
            transmitted: data.transmitted(),
        })
        .collect();
    Ok(result)
}

// ── Boost + Check + Launch ─────────────────────────────────────────────────

#[derive(Serialize)]
pub struct BoostResult {
    pub freed_ram_mb: u64,
    pub freed_disk_mb: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CheckItem {
    pub severity: String,
    pub category: String,
    pub title: String,
    pub action: Option<String>,
}

#[tauri::command]
pub async fn boost_system_all(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> AppResult<BoostResult> {
    // RAM before
    let ram_before = {
        if let Ok(mut sys) = state.system.lock() {
            sys.refresh_memory();
            sys.used_memory()
        } else {
            0
        }
    };

    // Trim all process working sets (Windows only)
    #[cfg(windows)]
    {
        tokio::task::spawn_blocking(crate::automation::trim_all_working_sets).await.ok();
    }

    tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;

    // RAM after
    let ram_after = {
        if let Ok(mut sys) = state.system.lock() {
            sys.refresh_memory();
            sys.used_memory()
        } else {
            0
        }
    };
    let freed_ram_mb = ram_before.saturating_sub(ram_after) / 1_000_000;

    // Disk cleanup
    let freed_disk_mb = match crate::commands::cleanup::clean_junk_files(
        vec!["user_temp".to_string(), "thumb_cache".to_string()],
    ).await {
        Ok(r) => r.freed_bytes / 1_000_000,
        Err(_) => 0,
    };

    crate::automation::write_alert(
        &app,
        "success",
        "performance",
        "System Boost",
        &format!("RAM: {freed_ram_mb} MB freigegeben, Disk: {freed_disk_mb} MB geleert"),
    );

    Ok(BoostResult { freed_ram_mb, freed_disk_mb })
}

#[tauri::command]
pub async fn global_system_check(
    state: tauri::State<'_, AppState>,
) -> AppResult<Vec<CheckItem>> {
    let mut items: Vec<CheckItem> = Vec::new();

    let db_locked = state.db.lock().ok();

    // Helper to read from scan_cache
    let read_cache = |key: &str| -> Option<String> {
        db_locked.as_ref()?.query_row(
            "SELECT data_json FROM scan_cache WHERE key = ?1",
            rusqlite::params![key],
            |r| r.get::<_, String>(0),
        ).ok()
    };

    // Security check
    if let Some(json) = read_cache("security_status") {
        if let Ok(sec) = serde_json::from_str::<serde_json::Value>(&json) {
            if !sec["defender_enabled"].as_bool().unwrap_or(true) {
                items.push(CheckItem {
                    severity: "critical".into(),
                    category: "Sicherheit".into(),
                    title: "Windows Defender ist deaktiviert".into(),
                    action: Some("windowsdefender:".into()),
                });
            }
            if !sec["defender_realtime"].as_bool().unwrap_or(true) {
                items.push(CheckItem {
                    severity: "critical".into(),
                    category: "Sicherheit".into(),
                    title: "Echtzeitschutz ist deaktiviert".into(),
                    action: Some("windowsdefender:".into()),
                });
            }
            if !sec["uac_enabled"].as_bool().unwrap_or(true) {
                items.push(CheckItem {
                    severity: "warning".into(),
                    category: "Sicherheit".into(),
                    title: "Benutzerkontensteuerung (UAC) ist deaktiviert".into(),
                    action: Some("ms-settings:privacy-general".into()),
                });
            }
            let fw_ok = sec["firewall_domain"].as_bool().unwrap_or(true)
                && sec["firewall_private"].as_bool().unwrap_or(true)
                && sec["firewall_public"].as_bool().unwrap_or(true);
            if !fw_ok {
                items.push(CheckItem {
                    severity: "warning".into(),
                    category: "Sicherheit".into(),
                    title: "Firewall ist auf einem oder mehreren Profilen deaktiviert".into(),
                    action: Some("ms-settings:windowsdefender".into()),
                });
            }
        }
    } else {
        items.push(CheckItem {
            severity: "info".into(),
            category: "Sicherheit".into(),
            title: "Sicherheitsscan noch nicht verfügbar".into(),
            action: Some("/security".into()),
        });
    }

    // Driver check
    if let Some(json) = read_cache("drivers") {
        if let Ok(drivers) = serde_json::from_str::<Vec<serde_json::Value>>(&json) {
            let unsigned = drivers.iter().filter(|d| !d["is_signed"].as_bool().unwrap_or(true)).count();
            let outdated = drivers.iter().filter(|d| d["potentially_outdated"].as_bool().unwrap_or(false)).count();
            if unsigned > 0 {
                items.push(CheckItem {
                    severity: "warning".into(),
                    category: "Treiber".into(),
                    title: format!("{unsigned} unsignierte Treiber gefunden"),
                    action: Some("/drivers".into()),
                });
            }
            if outdated > 0 {
                items.push(CheckItem {
                    severity: "info".into(),
                    category: "Treiber".into(),
                    title: format!("{outdated} möglicherweise veraltete Treiber"),
                    action: Some("/drivers".into()),
                });
            }
        }
    }

    // App updates
    if let Some(json) = read_cache("winget_updates") {
        if let Ok(updates) = serde_json::from_str::<Vec<serde_json::Value>>(&json) {
            if !updates.is_empty() {
                items.push(CheckItem {
                    severity: "info".into(),
                    category: "Updates".into(),
                    title: format!("{} App-Updates verfügbar", updates.len()),
                    action: Some("/updates".into()),
                });
            }
        }
    }

    // Windows updates
    if let Some(json) = read_cache("windows_updates") {
        if let Ok(updates) = serde_json::from_str::<Vec<serde_json::Value>>(&json) {
            let critical = updates.iter().filter(|u| u["severity"].as_str() == Some("critical")).count();
            if critical > 0 {
                items.push(CheckItem {
                    severity: "critical".into(),
                    category: "Updates".into(),
                    title: format!("{critical} kritische Windows-Updates ausstehend"),
                    action: Some("ms-settings:windowsupdate".into()),
                });
            } else if !updates.is_empty() {
                items.push(CheckItem {
                    severity: "info".into(),
                    category: "Updates".into(),
                    title: format!("{} Windows-Updates verfügbar", updates.len()),
                    action: Some("ms-settings:windowsupdate".into()),
                });
            }
        }
    }

    // RAM check (live)
    {
        if let Ok(mut sys) = state.system.lock() {
            sys.refresh_memory();
            let used = sys.used_memory();
            let total = sys.total_memory();
            if total > 0 {
                let pct = (used as f64 / total as f64 * 100.0) as u64;
                if pct > 85 {
                    items.push(CheckItem {
                        severity: "warning".into(),
                        category: "Performance".into(),
                        title: format!("Arbeitsspeicher zu {pct}% ausgelastet"),
                        action: Some("/cleanup".into()),
                    });
                }
            }
        }
    }

    // All good if no issues
    if items.is_empty() {
        items.push(CheckItem {
            severity: "ok".into(),
            category: "System".into(),
            title: "Alles in Ordnung — dein PC läuft optimal".into(),
            action: None,
        });
    }

    // Sort: critical first, then warning, info, ok
    let sev_rank = |s: &str| match s {
        "critical" => 0,
        "warning" => 1,
        "info" => 2,
        _ => 3,
    };
    items.sort_by_key(|i| sev_rank(&i.severity));

    Ok(items)
}

#[tauri::command]
pub async fn get_metric_history(
    state: tauri::State<'_, AppState>,
    metric: String,
    hours: Option<u32>,
) -> AppResult<Vec<MetricPoint>> {
    let hours = hours.unwrap_or(24);
    let db = state.db.lock().map_err(|e| crate::error::AppError::System(format!("lock: {e}")))?;
    let mut stmt = db.prepare(
        "SELECT value, recorded_at FROM metric_history WHERE metric = ?1 AND recorded_at > datetime('now', ?2) ORDER BY recorded_at ASC",
    )?;
    let rows = stmt.query_map(
        rusqlite::params![metric, format!("-{hours} hours")],
        |row| {
            Ok(MetricPoint {
                value: row.get(0)?,
                recorded_at: row.get(1)?,
            })
        },
    )?;
    Ok(rows.flatten().collect())
}
