/// Background automation engine.
/// Runs every 60 seconds, checks all enabled rules, and executes due actions.
use crate::commands::automation::Rule;
use crate::commands::settings::AppSettings;
use crate::state::AppState;
use log::{info, warn};
use std::time::Duration;
use tauri::Manager;

pub async fn automation_loop(app: tauri::AppHandle) {
    let mut ticker = tokio::time::interval(Duration::from_secs(60));
    let mut tick_count: u64 = 0;

    loop {
        ticker.tick().await;

        // Clone settings — never hold Mutex across await
        let settings = {
            let Some(state) = app.try_state::<AppState>() else { break };
            let x = match state.cached_settings.lock() {
                Ok(s) => s.clone(),
                Err(_) => {
                    tick_count += 1;
                    continue;
                }
            }; x
        };

        let rules = load_rules(&app);

        for rule in &rules {
            if !rule.enabled {
                continue;
            }

            let should_run = match rule.trigger_type.as_str() {
                "on_startup" => tick_count == 0 && startup_action_enabled(&rule.action_type, &settings),
                "schedule" => is_schedule_due(rule),
                _ => false,
            };

            if should_run {
                info!("automation: running rule '{}' ({})", rule.name, rule.action_type);
                execute_rule(&app, rule, &settings).await;
                mark_rule_run(&app, &rule.id);
            }
        }

        tick_count += 1;
    }
}

fn startup_action_enabled(action_type: &str, settings: &AppSettings) -> bool {
    match action_type {
        "ram_boost" => settings.startup_ram_boost,
        "cleanup" => settings.auto_cleanup_enabled,
        "update_scan" => settings.auto_update_scan_enabled,
        "driver_scan" => settings.notify_on_driver_issues,
        _ => true,
    }
}

fn is_schedule_due(rule: &Rule) -> bool {
    let interval_hours = rule
        .trigger_config
        .get("interval_hours")
        .and_then(|v| v.as_u64())
        .unwrap_or(24);

    if let Some(last_run_str) = &rule.last_run {
        // SQLite stores datetime as "YYYY-MM-DD HH:MM:SS"
        if let Ok(last_run) =
            chrono::NaiveDateTime::parse_from_str(last_run_str, "%Y-%m-%d %H:%M:%S")
        {
            let now = chrono::Local::now().naive_local();
            let elapsed = (now - last_run).num_hours() as u64;
            return elapsed >= interval_hours;
        }
    }

    // Never run → run now
    true
}

fn load_rules(app: &tauri::AppHandle) -> Vec<Rule> {
    let Some(state) = app.try_state::<AppState>() else { return vec![] };
    let Ok(db) = state.db.lock() else { return vec![] };

    let Ok(mut stmt) = db.prepare(
        "SELECT id, name, enabled, trigger_type, trigger_config, action_type, action_config, last_run, run_count
         FROM automation_rules WHERE enabled = 1 ORDER BY created_at ASC",
    ) else { return vec![] };

    stmt.query_map([], |r| {
        Ok(Rule {
            id: r.get(0)?,
            name: r.get(1)?,
            enabled: r.get::<_, i64>(2)? != 0,
            trigger_type: r.get(3)?,
            trigger_config: serde_json::from_str(&r.get::<_, String>(4).unwrap_or_default())
                .unwrap_or_default(),
            action_type: r.get(5)?,
            action_config: serde_json::from_str(&r.get::<_, String>(6).unwrap_or_default())
                .unwrap_or_default(),
            last_run: r.get(7)?,
            run_count: r.get::<_, i64>(8)? as u32,
        })
    })
    .map(|rows| rows.flatten().collect())
    .unwrap_or_default()
}

pub fn mark_rule_run(app: &tauri::AppHandle, id: &str) {
    let Some(state) = app.try_state::<AppState>() else { return };
    let Ok(db) = state.db.lock() else { return };
    db.execute(
        "UPDATE automation_rules SET last_run = datetime('now'), run_count = run_count + 1, updated_at = datetime('now') WHERE id = ?1",
        rusqlite::params![id],
    ).ok();
}

pub fn write_alert(app: &tauri::AppHandle, severity: &str, category: &str, title: &str, body: &str) {
    let Some(state) = app.try_state::<AppState>() else { return };
    let Ok(db) = state.db.lock() else { return };
    let id = uuid::Uuid::new_v4().to_string();
    db.execute(
        "INSERT INTO alerts (id, severity, category, title, body) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, severity, category, title, body],
    ).ok();
    // Keep alerts table lean: drop entries older than 30 days
    db.execute(
        "DELETE FROM alerts WHERE created_at < datetime('now', '-30 days')",
        [],
    ).ok();
}

pub async fn execute_rule(app: &tauri::AppHandle, rule: &Rule, settings: &AppSettings) {
    match rule.action_type.as_str() {
        "cleanup" => run_cleanup(app, settings).await,
        "ram_boost" => run_ram_boost(app).await,
        "update_scan" => run_update_scan(app, settings).await,
        "driver_scan" => run_driver_scan(app, settings).await,
        other => warn!("automation: unknown action type '{other}'"),
    }
}

async fn run_cleanup(app: &tauri::AppHandle, settings: &AppSettings) {
    if !settings.auto_cleanup_enabled {
        return;
    }
    let ids = vec![
        "user_temp".to_string(),
        "thumb_cache".to_string(),
    ];
    match crate::commands::cleanup::clean_junk_files(ids).await {
        Ok(result) => {
            let mb = result.freed_bytes / 1_000_000;
            if mb > 0 && settings.notify_on_cleanup {
                crate::notifications::notify(
                    app,
                    "Cleanup Complete",
                    &format!("Freed {mb} MB of junk files"),
                );
            }
            write_alert(app, "success", "cleanup", "Cleanup Complete", &format!("Freed {mb} MB"));
        }
        Err(e) => warn!("automation cleanup failed: {e}"),
    }
}

async fn run_ram_boost(app: &tauri::AppHandle) {
    // Acquire state, read RAM, then DROP before any await point
    let ram_before = {
        let Some(state) = app.try_state::<AppState>() else { return };
        let x = if let Ok(mut sys) = state.system.lock() {
            sys.refresh_memory();
            sys.used_memory()
        } else {
            0
        }; x
    };

    // Trim working sets (Windows-only, no borrowed state held)
    #[cfg(windows)]
    {
        tokio::task::spawn_blocking(trim_all_working_sets).await.ok();
    }

    tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;

    // Read RAM after — acquire fresh state reference after awaits
    let ram_after = {
        let Some(state) = app.try_state::<AppState>() else { return };
        let x = if let Ok(mut sys) = state.system.lock() {
            sys.refresh_memory();
            sys.used_memory()
        } else {
            0
        }; x
    };

    let mb = ram_before.saturating_sub(ram_after) / 1_000_000;
    write_alert(app, "success", "performance", "RAM Boost", &format!("Freed {mb} MB of RAM"));
}

#[cfg(windows)]
pub fn trim_all_working_sets() {
    use winapi::um::handleapi::{CloseHandle, INVALID_HANDLE_VALUE};
    use winapi::um::processthreadsapi::OpenProcess;
    use winapi::um::psapi::EmptyWorkingSet;
    use winapi::um::tlhelp32::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };
    use winapi::um::winnt::{PROCESS_QUERY_INFORMATION, PROCESS_SET_QUOTA};
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot == INVALID_HANDLE_VALUE {
            return;
        }
        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                let handle = OpenProcess(
                    PROCESS_QUERY_INFORMATION | PROCESS_SET_QUOTA,
                    0,
                    entry.th32ProcessID,
                );
                if !handle.is_null() {
                    EmptyWorkingSet(handle);
                    CloseHandle(handle);
                }
                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }
        CloseHandle(snapshot);
    }
}

async fn run_update_scan(app: &tauri::AppHandle, settings: &AppSettings) {
    if !settings.auto_update_scan_enabled {
        return;
    }
    match Ok::<_, crate::error::AppError>(crate::commands::updates::winget_scan_core().await) {
        Ok(updates) if !updates.is_empty() => {
            let n = updates.len();
            if settings.notify_on_updates {
                crate::notifications::notify(
                    app,
                    "Updates Available",
                    &format!("{n} app updates ready to install"),
                );
            }
            write_alert(app, "info", "updates", "App Updates Found", &format!("{n} updates available"));
        }
        Ok(_) => {}
        Err(e) => warn!("automation update scan failed: {e}"),
    }
}

async fn run_driver_scan(app: &tauri::AppHandle, settings: &AppSettings) {
    match crate::commands::drivers::get_drivers_core().await {
        Ok(drivers) => {
            let unsigned = drivers.iter().filter(|d| !d.is_signed).count();
            let outdated = drivers.iter().filter(|d| d.potentially_outdated).count();
            if (unsigned > 0 || outdated > 0) && settings.notify_on_driver_issues {
                crate::notifications::notify(
                    app,
                    "Driver Warning",
                    &format!("{unsigned} unsigned, {outdated} potentially outdated"),
                );
            }
            if unsigned > 0 || outdated > 0 {
                write_alert(
                    app,
                    "warning",
                    "drivers",
                    "Driver Issues Found",
                    &format!("{unsigned} unsigned, {outdated} potentially outdated drivers"),
                );
            }
        }
        Err(e) => warn!("automation driver scan failed: {e}"),
    }
}
