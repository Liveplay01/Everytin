use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use tokio::process::Command;
use tokio::time::{timeout, Duration};

#[derive(Serialize, Clone, Debug)]
pub struct DriverEntry {
    pub device_name: String,
    pub driver_version: String,
    pub driver_date_display: String,
    pub manufacturer: String,
    pub device_class: String,
    pub is_signed: bool,
    pub potentially_outdated: bool,
    pub age_days: u32,
}

#[derive(Deserialize)]
struct PsDriver {
    #[serde(rename = "DeviceName")]
    device_name: Option<String>,
    #[serde(rename = "DriverVersion")]
    driver_version: Option<String>,
    #[serde(rename = "DriverDate")]
    driver_date: Option<String>,
    #[serde(rename = "Manufacturer")]
    manufacturer: Option<String>,
    #[serde(rename = "DeviceClass")]
    device_class: Option<String>,
    #[serde(rename = "IsSigned")]
    is_signed: Option<serde_json::Value>,
}

/// Parse WMI date format: "20210315000000.000000+000" → (YYYY, MM, DD)
fn parse_wmi_date(s: &str) -> Option<(u32, u32, u32)> {
    if s.len() < 8 {
        return None;
    }
    let year: u32 = s[0..4].parse().ok()?;
    let month: u32 = s[4..6].parse().ok()?;
    let day: u32 = s[6..8].parse().ok()?;
    Some((year, month, day))
}

fn days_since(year: u32, month: u32, day: u32) -> u32 {
    // Simple approximation — accurate enough for "older than 2 years" threshold
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let now_days = (now / 86400) as i64;

    // Rough days since epoch for given date (Julian Day approximation)
    let a = (14i64 - month as i64) / 12;
    let y = year as i64 + 4800 - a;
    let m = month as i64 + 12 * a - 3;
    let jdn = day as i64 + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045;
    let unix_day = jdn - 2440588; // Unix epoch = JDN 2440588

    let diff = now_days - unix_day;
    diff.max(0) as u32
}

#[tauri::command]
pub async fn get_drivers() -> AppResult<Vec<DriverEntry>> {
    let script = r#"
Get-WmiObject Win32_PnPSignedDriver |
  Where-Object { $_.DeviceName -ne $null -and $_.DeviceName -ne '' } |
  Select-Object DeviceName, DriverVersion, DriverDate, Manufacturer, DeviceClass, IsSigned |
  ConvertTo-Json -Compress -Depth 2
"#;

    let out = timeout(
        Duration::from_secs(30),
        Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .output(),
    )
    .await
    .map_err(|_| AppError::Timeout)?
    .map_err(|e| AppError::Process(e.to_string()))?;

    let raw = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if raw.is_empty() {
        return Ok(vec![]);
    }

    let value: serde_json::Value =
        serde_json::from_str(&raw).unwrap_or(serde_json::Value::Array(vec![]));

    let arr = match value {
        serde_json::Value::Array(a) => a,
        obj @ serde_json::Value::Object(_) => vec![obj],
        _ => vec![],
    };

    let mut entries: Vec<DriverEntry> = arr
        .into_iter()
        .filter_map(|v| serde_json::from_value::<PsDriver>(v).ok())
        .filter_map(|d| {
            let device_name = d.device_name.filter(|s| !s.is_empty())?;
            let driver_version = d.driver_version.unwrap_or_default();
            let manufacturer = d.manufacturer.unwrap_or_default();
            let device_class = d.device_class.unwrap_or_default();
            let is_signed = match &d.is_signed {
                Some(serde_json::Value::Bool(b)) => *b,
                Some(serde_json::Value::String(s)) => s.to_lowercase() == "true",
                _ => true, // assume signed if unknown
            };

            let (age_days, date_display) = if let Some(raw_date) = &d.driver_date {
                if let Some((y, m, day)) = parse_wmi_date(raw_date) {
                    let age = days_since(y, m, day);
                    let display = format!("{:04}-{:02}-{:02}", y, m, day);
                    (age, display)
                } else {
                    (0, String::new())
                }
            } else {
                (0, String::new())
            };

            let potentially_outdated = age_days > 730; // older than ~2 years

            Some(DriverEntry {
                device_name,
                driver_version,
                driver_date_display: date_display,
                manufacturer,
                device_class,
                is_signed,
                potentially_outdated,
                age_days,
            })
        })
        .collect();

    // Sort: unsigned first, then oldest first
    entries.sort_by(|a, b| {
        a.is_signed
            .cmp(&b.is_signed) // unsigned (false) sorts before signed (true)
            .then(b.age_days.cmp(&a.age_days))
    });

    Ok(entries)
}
