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
    // Phase 2: implement registry toggle
    let _ = (entry_id, enabled);
    Ok(())
}
