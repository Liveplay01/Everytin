use crate::{
    error::{AppError, AppResult},
    state::AppState,
};
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

fn lock_err(e: impl std::fmt::Display) -> AppError {
    AppError::Database(format!("lock error: {e}"))
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SessionApp {
    pub name: String,
    pub exe_path: String,
    pub window_title: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct SavedSession {
    pub id: String,
    pub label: String,
    pub apps: Vec<SessionApp>,
    pub created_at: String,
}

/// Capture all visible, non-system windows and save as a session.
#[tauri::command]
pub async fn save_session(
    state: State<'_, AppState>,
    label: String,
) -> AppResult<String> {
    let apps = capture_open_apps();
    let id = Uuid::new_v4().to_string();
    let apps_json = serde_json::to_string(&apps)
        .map_err(|e| AppError::Parse(e.to_string()))?;

    let db = state.db.lock().map_err(lock_err)?;
    db.execute(
        "INSERT INTO sessions (id, label, apps, created_at)
         VALUES (?1, ?2, ?3, datetime('now'))",
        rusqlite::params![id, label, apps_json],
    )?;
    Ok(id)
}

/// List all saved sessions (newest first).
#[tauri::command]
pub async fn list_sessions(state: State<'_, AppState>) -> AppResult<Vec<SavedSession>> {
    let db = state.db.lock().map_err(lock_err)?;
    let mut stmt = db.prepare(
        "SELECT id, label, apps, created_at FROM sessions ORDER BY created_at DESC LIMIT 10",
    )?;

    let sessions = stmt
        .query_map([], |row| {
            let apps_json: String = row.get(2)?;
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                apps_json,
                row.get::<_, String>(3)?,
            ))
        })?
        .filter_map(|r| r.ok())
        .map(|(id, label, apps_json, created_at)| {
            let apps: Vec<SessionApp> = serde_json::from_str(&apps_json).unwrap_or_default();
            SavedSession { id, label, apps, created_at }
        })
        .collect();

    Ok(sessions)
}

/// Re-launch all apps from a saved session.
#[tauri::command]
pub async fn restore_session(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<u32> {
    let apps: Vec<SessionApp> = {
        let db = state.db.lock().map_err(lock_err)?;
        let json: String = db.query_row(
            "SELECT apps FROM sessions WHERE id = ?1",
            rusqlite::params![id],
            |r| r.get(0),
        ).map_err(|_| AppError::NotFound("Session nicht gefunden".to_string()))?;
        serde_json::from_str(&json).map_err(|e| AppError::Parse(e.to_string()))?
    };

    let mut launched = 0u32;
    for app in &apps {
        if !app.exe_path.is_empty() {
            if std::process::Command::new("cmd")
                .args(["/C", "start", "", &app.exe_path])
                .spawn()
                .is_ok()
            {
                launched += 1;
            }
        }
    }
    Ok(launched)
}

/// Delete a saved session.
#[tauri::command]
pub async fn delete_session(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<()> {
    let db = state.db.lock().map_err(lock_err)?;
    db.execute("DELETE FROM sessions WHERE id = ?1", rusqlite::params![id])?;
    Ok(())
}

fn capture_open_apps() -> Vec<SessionApp> {
    #[cfg(target_os = "windows")]
    {
        capture_windows_apps()
    }
    #[cfg(not(target_os = "windows"))]
    {
        vec![]
    }
}

#[cfg(target_os = "windows")]
fn capture_windows_apps() -> Vec<SessionApp> {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use std::collections::HashSet;

    // System process names to skip
    let skip: HashSet<&str> = [
        "explorer.exe", "SearchHost.exe", "StartMenuExperienceHost.exe",
        "ShellExperienceHost.exe", "RuntimeBroker.exe", "TextInputHost.exe",
        "svchost.exe", "conhost.exe", "csrss.exe", "wininit.exe",
        "everytin.exe",
    ].iter().copied().collect();

    let mut apps: Vec<SessionApp> = Vec::new();
    let mut seen_paths: HashSet<String> = HashSet::new();

    unsafe {
        // Enumerate visible top-level windows
        extern "system" fn enum_proc(hwnd: winapi::shared::windef::HWND, lparam: winapi::shared::minwindef::LPARAM) -> winapi::shared::minwindef::BOOL {
            unsafe {
                let apps = &mut *(lparam as *mut Vec<(winapi::shared::windef::HWND, u32)>);
                if winapi::um::winuser::IsWindowVisible(hwnd) == 0 {
                    return 1;
                }
                let mut title = [0u16; 256];
                if winapi::um::winuser::GetWindowTextW(hwnd, title.as_mut_ptr(), 256) == 0 {
                    return 1;
                }
                let mut pid: u32 = 0;
                winapi::um::winuser::GetWindowThreadProcessId(hwnd, &mut pid);
                apps.push((hwnd, pid));
                1
            }
        }

        let mut windows: Vec<(winapi::shared::windef::HWND, u32)> = Vec::new();
        winapi::um::winuser::EnumWindows(
            Some(enum_proc),
            &mut windows as *mut _ as winapi::shared::minwindef::LPARAM,
        );

        for (hwnd, pid) in windows {
            // Get window title
            let mut title_buf = [0u16; 256];
            let title_len = winapi::um::winuser::GetWindowTextW(hwnd, title_buf.as_mut_ptr(), 256);
            if title_len == 0 { continue; }
            let title = OsString::from_wide(&title_buf[..title_len as usize])
                .to_string_lossy().into_owned();

            // Get process path
            let proc_handle = winapi::um::processthreadsapi::OpenProcess(
                winapi::um::winnt::PROCESS_QUERY_LIMITED_INFORMATION,
                0,
                pid,
            );
            if proc_handle.is_null() { continue; }

            let mut path_buf = [0u16; 1024];
            let mut path_len: u32 = 1024;
            let ok = winapi::um::winbase::QueryFullProcessImageNameW(
                proc_handle,
                0,
                path_buf.as_mut_ptr(),
                &mut path_len,
            );
            winapi::um::handleapi::CloseHandle(proc_handle);

            if ok == 0 { continue; }
            let exe_path = OsString::from_wide(&path_buf[..path_len as usize])
                .to_string_lossy().into_owned();

            // Extract exe filename
            let exe_name = std::path::Path::new(&exe_path)
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default();

            if skip.contains(exe_name.as_str()) { continue; }
            if seen_paths.contains(&exe_path) { continue; }

            seen_paths.insert(exe_path.clone());
            apps.push(SessionApp {
                name: exe_name,
                exe_path,
                window_title: title,
            });
        }
    }

    apps
}
