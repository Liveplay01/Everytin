mod automation;
mod clipboard_monitor;
mod commands;
mod db;
mod error;
mod notifications;
mod state;
mod tray;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let db = db::init().expect("Failed to initialize everytin database");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(AppState::new(db))
        .invoke_handler(tauri::generate_handler![
            // system
            commands::system::get_system_snapshot,
            commands::system::get_process_list,
            commands::system::kill_process,
            commands::system::get_disk_info,
            commands::system::get_network_info,
            commands::system::get_metric_history,
            commands::system::boost_system_all,
            commands::system::global_system_check,
            // installer
            commands::installer::search_packages,
            commands::installer::get_installed_packages,
            commands::installer::install_package,
            commands::installer::uninstall_package,
            // settings
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::get_setting,
            commands::settings::set_setting,
            // updates
            commands::updates::scan_windows_updates,
            commands::updates::scan_winget_updates,
            commands::updates::install_winget_update,
            commands::updates::scan_driver_updates,
            commands::updates::install_driver_update,
            commands::updates::register_shutdown_update_task,
            // performance
            commands::performance::get_autostart_entries,
            commands::performance::get_temperatures,
            commands::performance::toggle_autostart,
            // security
            commands::security::get_security_status,
            // services
            commands::services::get_services,
            commands::services::set_service_start_type,
            // drivers
            commands::drivers::get_drivers,
            // cleanup / boost
            commands::cleanup::scan_junk_files,
            commands::cleanup::clean_junk_files,
            commands::cleanup::boost_system,
            // automation
            commands::automation::get_rules,
            commands::automation::toggle_rule,
            commands::automation::run_rule_now,
            commands::automation::get_alerts,
            commands::automation::acknowledge_alert,
            // battery
            commands::battery::get_battery_info,
            // command bar
            commands::command_bar::launch_app,
            commands::command_bar::get_installed_apps,
            // focus mode
            commands::focus::start_focus_session,
            commands::focus::stop_focus_session,
            commands::focus::get_focus_stats,
            // clipboard
            commands::clipboard::get_clipboard_history,
            commands::clipboard::clear_clipboard_history,
            commands::clipboard::pin_clipboard_entry,
            // smart modes
            commands::smart_modes::get_current_mode,
            // session restore
            commands::session::save_session,
            commands::session::list_sessions,
            commands::session::restore_session,
            commands::session::delete_session,
            // plugins
            commands::plugins::list_plugins,
            commands::plugins::set_plugin_enabled,
            commands::plugins::uninstall_plugin,
            // ai
            commands::ai::get_system_context,
            commands::ai::send_message,
        ])
        .setup(|app| {
            // System tray
            tray::setup_tray(app)?;

            let handle = app.handle().clone();

            // Window close → minimize to tray (if setting enabled)
            if let Some(win) = app.get_webview_window("main") {
                let handle_wc = handle.clone();
                win.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        let minimize = handle_wc
                            .try_state::<AppState>()
                            .and_then(|s| s.cached_settings.lock().ok().map(|c| c.minimize_to_tray))
                            .unwrap_or(true);
                        if minimize {
                            api.prevent_close();
                            if let Some(w) = handle_wc.get_webview_window("main") {
                                w.hide().ok();
                            }
                        }
                    }
                });
            }

            // Metrics loop (real-time system stats)
            let handle_metrics = handle.clone();
            tauri::async_runtime::spawn(async move {
                metrics_loop(handle_metrics).await;
            });

            // Automation engine
            let handle_auto = handle.clone();
            tauri::async_runtime::spawn(async move {
                automation::automation_loop(handle_auto).await;
            });

            // Clipboard monitor — opens a dedicated WAL-mode connection to the same DB file
            {
                use std::sync::Arc;
                let db_path = db::data_dir().join("everytin.db");
                if let Ok(conn) = rusqlite::Connection::open(&db_path) {
                    conn.execute_batch("PRAGMA journal_mode=WAL;").ok();
                    let db_arc = Arc::new(std::sync::Mutex::new(conn));
                    tauri::async_runtime::spawn(async move {
                        clipboard_monitor::start(db_arc).await;
                    });
                }
            }

            // Startup scanner — pre-populate update/security caches in background
            let handle_scan = handle.clone();
            tauri::async_runtime::spawn(async move {
                startup_scan(handle_scan).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running everytin");
}

async fn metrics_loop(app: tauri::AppHandle) {
    use sysinfo::Disks;
    use tauri::Emitter;
    use tokio::time::{interval, Duration};

    let mut ticker = interval(Duration::from_secs(2));
    let mut tick_count: u64 = 0;
    let mut last_disk: (u64, u64) = (0, 0);

    loop {
        ticker.tick().await;
        tick_count += 1;

        // Check window visibility once per tick (cheap IPC call)
        let visible = app
            .get_webview_window("main")
            .and_then(|w| w.is_visible().ok())
            .unwrap_or(true);

        // When hidden: only process every 5th tick (~10s) to save CPU
        if !visible && tick_count % 5 != 0 {
            continue;
        }

        // Refresh disk every 15 ticks (~30s) — disk usage doesn't change per-second
        if last_disk == (0, 0) || tick_count % 15 == 0 {
            let disks = Disks::new_with_refreshed_list();
            last_disk = disks.list().iter().fold((0u64, 0u64), |(u, t), d| {
                (u + d.total_space().saturating_sub(d.available_space()), t + d.total_space())
            });
        }

        let snapshot = {
            let Some(state) = app.try_state::<AppState>() else { break };
            state
                .system
                .lock()
                .ok()
                .map(|mut sys| commands::system::snapshot_from_sys(&mut sys, Some(last_disk)))
        };

        let Some(snapshot) = snapshot else { continue };

        // Update tray tooltip (always — cheap, user expects live stats in tray)
        tray::update_tray_tooltip(&app, snapshot.cpu_usage, snapshot.ram_used, snapshot.ram_total);

        // Emit to frontend only when window is visible
        if visible {
            app.emit("system://metrics", &snapshot).ok();
        }

        // DB recording: every 10s when visible, every 30s when hidden
        let should_record = if visible {
            tick_count % 5 == 0
        } else {
            tick_count % 15 == 0
        };

        if should_record {
            let Some(state) = app.try_state::<AppState>() else { break };
            let lock = state.db.lock();
            if let Ok(db) = lock {
                let _ = db.execute(
                    "INSERT INTO metric_history (metric, value, recorded_at) VALUES (?1, ?2, datetime('now'))",
                    rusqlite::params!["cpu", snapshot.cpu_usage],
                );
                let _ = db.execute(
                    "INSERT INTO metric_history (metric, value, recorded_at) VALUES (?1, ?2, datetime('now'))",
                    rusqlite::params!["ram_pct", snapshot.ram_used as f64 / snapshot.ram_total as f64 * 100.0],
                );
                let _ = db.execute(
                    "DELETE FROM metric_history WHERE recorded_at < datetime('now', '-24 hours')",
                    [],
                );
            }
        }
    }
}

async fn startup_scan(app: tauri::AppHandle) {
    use tauri::Emitter;
    use tokio::time::{sleep, Duration};

    // Wait for the UI to finish mounting before hitting PowerShell
    sleep(Duration::from_secs(3)).await;

    let scan_enabled = app
        .try_state::<AppState>()
        .and_then(|s| s.cached_settings.lock().ok().map(|c| c.auto_update_scan_enabled))
        .unwrap_or(true);

    // 1. Winget scan (~5-10s, fastest)
    if scan_enabled {
        let result = commands::updates::winget_scan_core().await;
        if let Ok(json) = serde_json::to_string(&result) {
            if let Some(state) = app.try_state::<AppState>() {
                if let Ok(db) = state.db.lock() {
                    let _ = db.execute(
                        "INSERT OR REPLACE INTO scan_cache (key, data_json, scanned_at) VALUES ('winget_updates', ?1, datetime('now'))",
                        rusqlite::params![json],
                    );
                }
            }
        }
        app.emit("cache://winget-ready", ()).ok();
    }

    // 2. Security scan (~15s, always run — independent of update setting)
    sleep(Duration::from_secs(3)).await;
    let security = commands::security::security_scan_core().await;
    if let Ok(json) = serde_json::to_string(&security) {
        if let Some(state) = app.try_state::<AppState>() {
            if let Ok(db) = state.db.lock() {
                let _ = db.execute(
                    "INSERT OR REPLACE INTO scan_cache (key, data_json, scanned_at) VALUES ('security_status', ?1, datetime('now'))",
                    rusqlite::params![json],
                );
            }
        }
    }
    app.emit("cache://security-ready", ()).ok();

    // 3. Windows Update scan (~30s, optional)
    if scan_enabled {
        sleep(Duration::from_secs(5)).await;
        let updates = commands::updates::windows_scan_core().await;
        if let Ok(json) = serde_json::to_string(&updates) {
            if let Some(state) = app.try_state::<AppState>() {
                if let Ok(db) = state.db.lock() {
                    let _ = db.execute(
                        "INSERT OR REPLACE INTO scan_cache (key, data_json, scanned_at) VALUES ('windows_updates', ?1, datetime('now'))",
                        rusqlite::params![json],
                    );
                }
            }
        }
        app.emit("cache://windows-updates-ready", ()).ok();
    }

    // 4. Services scan
    sleep(Duration::from_secs(2)).await;
    if let Ok(services) = commands::services::get_services_core().await {
        if let Ok(json) = serde_json::to_string(&services) {
            if let Some(state) = app.try_state::<AppState>() {
                if let Ok(db) = state.db.lock() {
                    let _ = db.execute(
                        "INSERT OR REPLACE INTO scan_cache (key, data_json, scanned_at) VALUES ('services', ?1, datetime('now'))",
                        rusqlite::params![json],
                    );
                }
            }
        }
        app.emit("cache://services-ready", ()).ok();
    }

    // 5. Drivers scan (slowest)
    sleep(Duration::from_secs(3)).await;
    if let Ok(drivers) = commands::drivers::get_drivers_core().await {
        if let Ok(json) = serde_json::to_string(&drivers) {
            if let Some(state) = app.try_state::<AppState>() {
                if let Ok(db) = state.db.lock() {
                    let _ = db.execute(
                        "INSERT OR REPLACE INTO scan_cache (key, data_json, scanned_at) VALUES ('drivers', ?1, datetime('now'))",
                        rusqlite::params![json],
                    );
                }
            }
        }
        app.emit("cache://drivers-ready", ()).ok();
    }

    // 6. Battery (fast, no extra delay)
    if let Ok(battery) = commands::battery::get_battery_core().await {
        if let Ok(json) = serde_json::to_string(&battery) {
            if let Some(state) = app.try_state::<AppState>() {
                if let Ok(db) = state.db.lock() {
                    let _ = db.execute(
                        "INSERT OR REPLACE INTO scan_cache (key, data_json, scanned_at) VALUES ('battery', ?1, datetime('now'))",
                        rusqlite::params![json],
                    );
                }
            }
        }
        app.emit("cache://battery-ready", ()).ok();
    }
}
