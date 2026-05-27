use crate::commands::settings::AppSettings;
use rusqlite::Connection;
use std::sync::Mutex;
use sysinfo::System;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub system: Mutex<System>,
    /// Cached copy of AppSettings for synchronous access (e.g. window-close handler).
    /// Always kept in sync with the DB by update_settings.
    pub cached_settings: Mutex<AppSettings>,
}

impl AppState {
    pub fn new(db: Connection) -> Self {
        let mut system = System::new_all();
        system.refresh_all();

        // Load settings synchronously at startup
        let cached = db
            .query_row(
                "SELECT value FROM settings WHERE key = 'app_settings'",
                [],
                |r| r.get::<_, String>(0),
            )
            .ok()
            .and_then(|s| serde_json::from_str::<AppSettings>(&s).ok())
            .unwrap_or_default();

        Self {
            db: Mutex::new(db),
            system: Mutex::new(system),
            cached_settings: Mutex::new(cached),
        }
    }
}
