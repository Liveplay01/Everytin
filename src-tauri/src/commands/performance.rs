// Phase 2+ – autostart + temperature stubs
use crate::error::AppResult;
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct AutostartEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    pub enabled: bool,
    pub location: String,
}

#[tauri::command]
pub async fn get_autostart_entries() -> AppResult<Vec<AutostartEntry>> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::HKEY_CURRENT_USER;
        use winreg::RegKey;
        let mut entries = Vec::new();

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok(run) = hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run") {
            // Collect names first to avoid borrow conflict
            let names: Vec<String> = run
                .enum_values()
                .filter_map(|r| r.ok())
                .map(|(name, _)| name)
                .collect();

            for name in names {
                if let Ok(path) = run.get_value::<String, _>(&name) {
                    entries.push(AutostartEntry {
                        id: format!("hkcu_run_{}", name),
                        name: name.clone(),
                        path,
                        enabled: true,
                        location: "HKCU\\Run".to_string(),
                    });
                }
            }
        }
        Ok(entries)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(vec![])
    }
}

#[derive(Serialize, Clone, Debug)]
pub struct ThermalZone {
    pub name: String,
    pub temperature_celsius: f32,
}

#[tauri::command]
pub async fn get_temperatures() -> AppResult<Vec<ThermalZone>> {
    use sysinfo::Components;
    let components = Components::new_with_refreshed_list();
    let zones: Vec<ThermalZone> = components
        .iter()
        .map(|c| ThermalZone {
            name: c.label().to_string(),
            temperature_celsius: c.temperature(),
        })
        .collect();
    Ok(zones)
}

#[tauri::command]
pub async fn toggle_autostart(entry_id: String, enabled: bool) -> AppResult<()> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::{HKEY_CURRENT_USER, KEY_READ, KEY_WRITE};
        use winreg::RegKey;
        use crate::error::AppError;

        // entry_id format: "hkcu_run_{name}"
        let name = entry_id
            .strip_prefix("hkcu_run_")
            .ok_or_else(|| AppError::NotFound(format!("Unknown entry id: {entry_id}")))?;

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let run_key = hkcu
            .open_subkey_with_flags(
                "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                KEY_READ | KEY_WRITE,
            )
            .map_err(|e| AppError::System(e.to_string()))?;

        if enabled {
            // Re-read existing disabled backup (stored under a separate key)
            let disabled_key = hkcu
                .open_subkey_with_flags(
                    "Software\\Microsoft\\Windows\\CurrentVersion\\Run_Disabled_Everytin",
                    KEY_READ | KEY_WRITE,
                )
                .map_err(|e| AppError::NotFound(format!("No disabled backup found: {e}")))?;

            let path: String = disabled_key
                .get_value(name)
                .map_err(|e| AppError::NotFound(format!("Backup value not found: {e}")))?;

            run_key
                .set_value(name, &path)
                .map_err(|e| AppError::System(e.to_string()))?;

            disabled_key
                .delete_value(name)
                .ok();
        } else {
            // Back up the path, then remove from Run
            let path: String = run_key
                .get_value(name)
                .map_err(|e| AppError::NotFound(format!("Entry not found: {e}")))?;

            let (disabled_key, _) = hkcu
                .create_subkey(
                    "Software\\Microsoft\\Windows\\CurrentVersion\\Run_Disabled_Everytin",
                )
                .map_err(|e| AppError::System(e.to_string()))?;

            disabled_key
                .set_value(name, &path)
                .map_err(|e| AppError::System(e.to_string()))?;

            run_key
                .delete_value(name)
                .map_err(|e| AppError::System(e.to_string()))?;
        }

        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (entry_id, enabled);
        Ok(())
    }
}
