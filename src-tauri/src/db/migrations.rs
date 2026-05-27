pub const MIGRATIONS: &[&str] = &[
    // v1 – initial schema
    r#"
    CREATE TABLE IF NOT EXISTS schema_version (
        version     INTEGER NOT NULL
    );
    INSERT OR IGNORE INTO schema_version VALUES (0);

    CREATE TABLE IF NOT EXISTS settings (
        key         TEXT PRIMARY KEY,
        value       TEXT NOT NULL,
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS metric_history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        metric      TEXT NOT NULL,
        value       REAL NOT NULL,
        recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_metric_history_lookup
        ON metric_history (metric, recorded_at DESC);

    CREATE TABLE IF NOT EXISTS update_history (
        id              TEXT PRIMARY KEY,
        title           TEXT NOT NULL,
        kb_number       TEXT,
        update_type     TEXT NOT NULL,
        status          TEXT NOT NULL,
        installed_at    TEXT NOT NULL,
        size_bytes      INTEGER,
        reboot_required INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS packages_cache (
        id                  TEXT PRIMARY KEY,
        name                TEXT NOT NULL,
        version             TEXT NOT NULL,
        publisher           TEXT,
        available_version   TEXT,
        cached_at           TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
        id              TEXT PRIMARY KEY,
        severity        TEXT NOT NULL,
        category        TEXT NOT NULL,
        title           TEXT NOT NULL,
        body            TEXT NOT NULL,
        acknowledged    INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_created
        ON alerts (created_at DESC);

    CREATE TABLE IF NOT EXISTS automation_rules (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        enabled         INTEGER NOT NULL DEFAULT 1,
        trigger_type    TEXT NOT NULL,
        trigger_config  TEXT NOT NULL DEFAULT '{}',
        action_type     TEXT NOT NULL,
        action_config   TEXT NOT NULL DEFAULT '{}',
        last_run        TEXT,
        run_count       INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    "#,
    // v2 – seed default automation rules
    r#"
    INSERT OR IGNORE INTO automation_rules (id, name, enabled, trigger_type, trigger_config, action_type, action_config)
    VALUES
        ('daily_cleanup',      'Daily Cleanup',        1, 'schedule',   '{"interval_hours":24}',  'cleanup',      '{}'),
        ('weekly_update_scan', 'Weekly Update Scan',   1, 'schedule',   '{"interval_hours":168}', 'update_scan',  '{}'),
        ('startup_ram_boost',  'Startup RAM Boost',    1, 'on_startup',  '{}',                    'ram_boost',    '{}'),
        ('driver_check',       'Weekly Driver Check',  1, 'schedule',   '{"interval_hours":168}', 'driver_scan',  '{}');
    "#,
];

pub fn run(conn: &rusqlite::Connection) -> rusqlite::Result<()> {
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")?;
    for sql in MIGRATIONS {
        conn.execute_batch(sql)?;
    }
    Ok(())
}
