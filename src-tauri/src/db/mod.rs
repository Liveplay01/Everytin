pub mod migrations;

use rusqlite::Connection;
use std::path::PathBuf;

pub fn data_dir() -> PathBuf {
    dirs_or_appdata().join("everytin")
}

fn dirs_or_appdata() -> PathBuf {
    std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            std::env::var("HOME")
                .map(PathBuf::from)
                .unwrap_or_else(|_| PathBuf::from("."))
        })
}

pub fn init() -> rusqlite::Result<Connection> {
    let dir = data_dir();
    std::fs::create_dir_all(&dir).ok();
    let db_path = dir.join("everytin.db");
    let conn = Connection::open(&db_path)?;
    migrations::run(&conn)?;
    Ok(conn)
}
