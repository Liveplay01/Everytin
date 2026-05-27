mod commands;
mod db;
mod error;
mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let db = db::init().expect("Failed to initialize everytin database");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
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
            // performance
            commands::performance::get_autostart_entries,
            commands::performance::get_temperatures,
            commands::performance::toggle_autostart,
            // security
            commands::security::get_security_status,
            // cleanup / boost
            commands::cleanup::scan_junk_files,
            commands::cleanup::clean_junk_files,
            commands::cleanup::boost_system,
            // automation
            commands::automation::get_rules,
            // ai
            commands::ai::get_system_context,
            commands::ai::send_message,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                metrics_loop(handle).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running everytin");
}

async fn metrics_loop(app: tauri::AppHandle) {
    use tauri::Emitter;
    use tokio::time::{interval, Duration};

    let mut ticker = interval(Duration::from_secs(2));
    let mut tick_count: u64 = 0;
    loop {
        ticker.tick().await;

        // Build snapshot synchronously — State is acquired and dropped before any await
        let snapshot = {
            let state = app.state::<AppState>();
            state
                .system
                .lock()
                .ok()
                .map(|mut sys| commands::system::snapshot_from_sys(&mut sys))
        };

        let Some(snapshot) = snapshot else { continue };

        app.emit("system://metrics", &snapshot).ok();

        tick_count += 1;
        if tick_count % 5 == 0 {
            let state = app.state::<AppState>();
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
