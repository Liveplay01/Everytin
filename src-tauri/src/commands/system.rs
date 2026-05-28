use crate::{error::AppResult, state::AppState};
use serde::Serialize;
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
