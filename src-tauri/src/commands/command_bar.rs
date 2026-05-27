use crate::error::AppResult;
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct InstalledApp {
    pub name: String,
    pub path: String,
}

/// Launch an application by its executable path or name.
#[tauri::command]
pub async fn launch_app(path: String) -> AppResult<()> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| crate::error::AppError::Io(e.to_string()))?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
        Ok(())
    }
}

/// Return a list of installed applications from the Windows registry.
#[tauri::command]
pub async fn get_installed_apps() -> AppResult<Vec<InstalledApp>> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
        use winreg::RegKey;

        let mut apps: Vec<InstalledApp> = Vec::new();

        let roots: Vec<(winreg::HKEY, &str)> = vec![
            (HKEY_LOCAL_MACHINE, "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths"),
            (HKEY_CURRENT_USER, "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths"),
        ];

        for (hive, subkey) in roots {
            let root = RegKey::predef(hive);
            if let Ok(key) = root.open_subkey(subkey) {
                let names: Vec<String> = key
                    .enum_keys()
                    .filter_map(|r| r.ok())
                    .collect();

                for name in names {
                    if let Ok(app_key) = key.open_subkey(&name) {
                        let path: String = app_key
                            .get_value("")
                            .unwrap_or_default();
                        let display_name = name
                            .trim_end_matches(".exe")
                            .to_string();
                        if !path.is_empty() && !apps.iter().any(|a| a.name == display_name) {
                            apps.push(InstalledApp {
                                name: display_name,
                                path,
                            });
                        }
                    }
                }
            }
        }

        apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(apps)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(vec![])
    }
}
