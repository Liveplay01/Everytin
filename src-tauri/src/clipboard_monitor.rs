use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use tokio::time::{interval, Duration};

fn detect_type(text: &str) -> &'static str {
    let trimmed = text.trim();
    if trimmed.starts_with("data:image/") {
        return "image";
    }
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return "url";
    }
    // Heuristic: contains braces/brackets and newlines → code
    if (trimmed.contains('{') || trimmed.contains('[') || trimmed.contains(';'))
        && trimmed.contains('\n')
    {
        return "code";
    }
    "text"
}

fn content_hash(text: &str) -> String {
    // Simple FNV-1a hash — no extra dependency needed
    let mut hash: u64 = 14695981039346656037;
    for byte in text.bytes() {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(1099511628211);
    }
    format!("{:x}", hash)
}

pub async fn start(db: Arc<Mutex<Connection>>) {
    let mut ticker = interval(Duration::from_millis(600));
    let mut last_hash = String::new();

    loop {
        ticker.tick().await;

        let text = match read_clipboard_text() {
            Some(t) if !t.trim().is_empty() => t,
            _ => continue,
        };

        let hash = content_hash(&text);
        if hash == last_hash {
            continue;
        }
        last_hash = hash.clone();

        let content_type = detect_type(&text);

        if let Ok(conn) = db.lock() {
            let _ = conn.execute(
                "INSERT OR IGNORE INTO clipboard_history (type, content, hash)
                 VALUES (?1, ?2, ?3)",
                rusqlite::params![content_type, text, hash],
            );
            // Keep only the last 200 non-pinned entries
            let _ = conn.execute(
                "DELETE FROM clipboard_history
                 WHERE pinned = 0
                   AND id NOT IN (
                     SELECT id FROM clipboard_history
                     WHERE pinned = 0
                     ORDER BY created_at DESC
                     LIMIT 200
                   )",
                [],
            );
        }
    }
}

#[cfg(target_os = "windows")]
fn read_clipboard_text() -> Option<String> {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;

    unsafe {
        if winapi::um::winuser::OpenClipboard(std::ptr::null_mut()) == 0 {
            return None;
        }
        let handle =
            winapi::um::winuser::GetClipboardData(winapi::um::winuser::CF_UNICODETEXT);
        if handle.is_null() {
            winapi::um::winuser::CloseClipboard();
            return None;
        }
        let ptr = winapi::um::winbase::GlobalLock(handle) as *const u16;
        if ptr.is_null() {
            winapi::um::winuser::CloseClipboard();
            return None;
        }

        let mut len = 0;
        while *ptr.add(len) != 0 {
            len += 1;
        }
        let slice = std::slice::from_raw_parts(ptr, len);
        let text = OsString::from_wide(slice).to_string_lossy().into_owned();

        winapi::um::winbase::GlobalUnlock(handle);
        winapi::um::winuser::CloseClipboard();

        Some(text)
    }
}

#[cfg(not(target_os = "windows"))]
fn read_clipboard_text() -> Option<String> {
    None
}
