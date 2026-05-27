use crate::error::{AppError, AppResult};
use crate::state::AppState;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Clone, Debug)]
pub struct JunkCategory {
    pub id: String,
    pub name: String,
    pub description: String,
    pub size_bytes: u64,
    pub file_count: u64,
    pub path: String,
    pub requires_elevation: bool,
}

#[derive(Serialize, Clone, Debug)]
pub struct CleanResult {
    pub freed_bytes: u64,
    pub files_deleted: u64,
    pub errors: Vec<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct BoostResult {
    pub ram_freed_bytes: u64,
    pub ram_before: u64,
    pub ram_after: u64,
}

fn dir_stats(path: &PathBuf) -> (u64, u64) {
    let mut size = 0u64;
    let mut count = 0u64;
    let Ok(entries) = fs::read_dir(path) else {
        return (0, 0);
    };
    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_symlink() {
            continue;
        }
        if p.is_file() {
            size += p.metadata().map(|m| m.len()).unwrap_or(0);
            count += 1;
        } else if p.is_dir() {
            let (s, c) = dir_stats(&p);
            size += s;
            count += c;
        }
    }
    (size, count)
}

fn probe(
    id: &str,
    name: &str,
    description: &str,
    path: PathBuf,
    requires_elevation: bool,
) -> Option<JunkCategory> {
    if !path.exists() {
        return None;
    }
    let (size, count) = dir_stats(&path);
    if size == 0 {
        return None;
    }
    Some(JunkCategory {
        id: id.into(),
        name: name.into(),
        description: description.into(),
        size_bytes: size,
        file_count: count,
        path: path.to_string_lossy().into_owned(),
        requires_elevation,
    })
}

#[tauri::command]
pub async fn scan_junk_files() -> AppResult<Vec<JunkCategory>> {
    tokio::task::spawn_blocking(|| {
        let mut cats: Vec<JunkCategory> = Vec::new();
        let local = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let sysroot = std::env::var("SYSTEMROOT").unwrap_or_else(|_| "C:\\Windows".into());

        // User %TEMP%
        if let Ok(tmp) = std::env::var("TEMP") {
            if let Some(c) = probe("user_temp", "Temporary Files",
                "App and system temp files", PathBuf::from(tmp), false) {
                cats.push(c);
            }
        }

        // Thumbnail cache
        if !local.is_empty() {
            if let Some(c) = probe("thumb_cache", "Thumbnail Cache",
                "Windows Explorer thumbnail previews",
                PathBuf::from(format!("{}\\Microsoft\\Windows\\Explorer", local)), false) {
                cats.push(c);
            }
        }

        // Browser caches
        let browsers = [
            ("chrome", "Chrome Cache",   "Google\\Chrome\\User Data\\Default\\Cache"),
            ("edge",   "Edge Cache",     "Microsoft\\Edge\\User Data\\Default\\Cache"),
            ("brave",  "Brave Cache",    "BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache"),
        ];
        for (id, name, rel) in &browsers {
            if !local.is_empty() {
                if let Some(c) = probe(
                    &format!("{}_cache", id), name,
                    &format!("Cached web data ({})", name),
                    PathBuf::from(format!("{}\\{}", local, rel)), false) {
                    cats.push(c);
                }
            }
        }

        // Windows System Temp (needs elevation)
        if let Some(c) = probe("win_temp", "Windows System Temp",
            "System-level temp files (requires admin)",
            PathBuf::from(format!("{}\\Temp", sysroot)), true) {
            cats.push(c);
        }

        // Windows Update download cache (needs elevation)
        if let Some(c) = probe("wu_cache", "Windows Update Cache",
            "Downloaded update files no longer needed (requires admin)",
            PathBuf::from("C:\\Windows\\SoftwareDistribution\\Download"), true) {
            cats.push(c);
        }

        Ok(cats)
    })
    .await
    .map_err(|e| AppError::System(e.to_string()))?
}

#[tauri::command]
pub async fn clean_junk_files(category_ids: Vec<String>) -> AppResult<CleanResult> {
    let categories = scan_junk_files().await?;
    let to_clean: Vec<_> = categories
        .into_iter()
        .filter(|c| category_ids.contains(&c.id) && !c.requires_elevation)
        .collect();

    tokio::task::spawn_blocking(move || {
        let mut freed = 0u64;
        let mut deleted = 0u64;
        let mut errors: Vec<String> = Vec::new();

        for cat in &to_clean {
            let Ok(entries) = fs::read_dir(&cat.path) else { continue };
            for entry in entries.flatten() {
                let p = entry.path();
                let size = p.metadata().map(|m| m.len()).unwrap_or(0);
                if p.is_file() {
                    match fs::remove_file(&p) {
                        Ok(_) => { freed += size; deleted += 1; }
                        Err(e) => {
                            errors.push(format!(
                                "{}: {}",
                                p.file_name().unwrap_or_default().to_string_lossy(), e
                            ));
                        }
                    }
                } else if p.is_dir() {
                    if fs::remove_dir_all(&p).is_ok() {
                        freed += size;
                        deleted += 1;
                    }
                }
            }
        }

        Ok(CleanResult { freed_bytes: freed, files_deleted: deleted, errors })
    })
    .await
    .map_err(|e| AppError::System(e.to_string()))?
}

#[tauri::command]
pub async fn boost_system(state: tauri::State<'_, AppState>) -> AppResult<BoostResult> {
    let ram_before = {
        let mut sys = state.system.lock().map_err(|e| AppError::System(e.to_string()))?;
        sys.refresh_memory();
        sys.used_memory()
    };

    #[cfg(target_os = "windows")]
    tokio::task::spawn_blocking(trim_working_sets).await.ok();

    tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;

    let ram_after = {
        let mut sys = state.system.lock().map_err(|e| AppError::System(e.to_string()))?;
        sys.refresh_memory();
        sys.used_memory()
    };

    Ok(BoostResult {
        ram_freed_bytes: ram_before.saturating_sub(ram_after),
        ram_before,
        ram_after,
    })
}

#[cfg(target_os = "windows")]
fn trim_working_sets() {
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
