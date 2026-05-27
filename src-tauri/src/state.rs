use rusqlite::Connection;
use std::sync::Mutex;
use sysinfo::System;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub system: Mutex<System>,
}

impl AppState {
    pub fn new(db: Connection) -> Self {
        let mut system = System::new_all();
        system.refresh_all();
        Self {
            db: Mutex::new(db),
            system: Mutex::new(system),
        }
    }
}
