use crate::error::{AppError, AppResult};
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use tokio::process::Command;
use tokio::time::{timeout, Duration};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ServiceEntry {
    pub name: String,
    pub display_name: String,
    pub status: String,
    pub start_type: String,
    pub category: String,
    pub safe_to_disable: bool,
    pub reason: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct ServiceActionResult {
    pub name: String,
    pub success: bool,
    pub message: String,
    pub previous_start_type: String,
}

#[derive(Deserialize)]
struct PsService {
    #[serde(rename = "Name")]
    name: String,
    #[serde(rename = "DisplayName")]
    display_name: String,
    #[serde(rename = "Status")]
    status: serde_json::Value,
    #[serde(rename = "StartType")]
    start_type: serde_json::Value,
}

// (name, category, safe_to_disable, reason)
const KNOWN_SERVICES: &[(&str, &str, bool, &str)] = &[
    ("XblAuthManager", "Gaming", true, "Xbox Live Authentifizierung — nicht nötig ohne Xbox"),
    ("XblGameSave", "Gaming", true, "Xbox Live Spielstand-Synchronisierung"),
    ("XboxGipSvc", "Gaming", true, "Xbox-Zubehörverwaltung"),
    ("XboxNetApiSvc", "Gaming", true, "Xbox Live Netzwerkdienste"),
    ("DiagTrack", "Telemetrie", true, "Sendet Nutzungsdaten an Microsoft"),
    ("dmwappushservice", "Telemetrie", true, "WAP Push-Nachrichten für Telemetrie"),
    ("WMPNetworkSvc", "Optional", true, "Windows Media Player Netzwerkfreigabe"),
    ("RemoteRegistry", "Fernzugriff", true, "Ermöglicht Remote-Registry-Zugriff — Sicherheitsrisiko"),
    ("MapsBroker", "Optional", true, "Hintergrunddownloads für Karten-App"),
    ("RetailDemo", "Optional", true, "Demo-Modus für Ladengeschäfte — nicht benötigt"),
    ("Fax", "Drucken", true, "Legacy-Fax-Dienst"),
    ("lmhosts", "Netzwerk", true, "NetBIOS-Namensauflösung — selten benötigt"),
    ("TapiSrv", "Optional", true, "Telefonie-API — benötigt für Modem-/Faxnutzung"),
    ("WerSvc", "Telemetrie", true, "Windows-Fehlerberichterstattung an Microsoft"),
    ("SysMain", "System", false, "Superfetch — verbessert Programm-Ladezeiten"),
    ("Themes", "System", false, "Windows-Design-Verwaltung"),
    ("Spooler", "Drucken", false, "Druckwarteschlange — nötig zum Drucken"),
    ("Dhcp", "Netzwerk", false, "DHCP-Client — für Netzwerkverbindungen benötigt"),
    ("Dnscache", "Netzwerk", false, "DNS-Cache — verbessert Netzwerkleistung"),
];

fn lookup(name: &str) -> Option<(&'static str, bool, &'static str)> {
    KNOWN_SERVICES
        .iter()
        .find(|(n, _, _, _)| n.eq_ignore_ascii_case(name))
        .map(|(_, cat, safe, reason)| (*cat, *safe, *reason))
}

async fn run_ps(script: &str) -> Result<String, AppError> {
    let out = timeout(
        Duration::from_secs(20),
        Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .output(),
    )
    .await
    .map_err(|_| AppError::Timeout)?
    .map_err(|e| AppError::Process(e.to_string()))?;
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

fn parse_status(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::Number(n) => match n.as_u64() {
            Some(1) => "Stopped".into(),
            Some(4) => "Running".into(),
            Some(7) => "Paused".into(),
            _ => "Unknown".into(),
        },
        serde_json::Value::String(s) => s.clone(),
        _ => "Unknown".into(),
    }
}

fn parse_start_type(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::Number(n) => match n.as_u64() {
            Some(0) => "Boot".into(),
            Some(1) => "System".into(),
            Some(2) => "Automatic".into(),
            Some(3) => "Manual".into(),
            Some(4) => "Disabled".into(),
            _ => "Unknown".into(),
        },
        serde_json::Value::String(s) => s.clone(),
        _ => "Unknown".into(),
    }
}

pub async fn get_services_core() -> AppResult<Vec<ServiceEntry>> {
    let script = "Get-Service | Select-Object Name,DisplayName,Status,StartType | ConvertTo-Json -Compress -Depth 2";
    let raw = run_ps(script).await?;

    let value: serde_json::Value =
        serde_json::from_str(&raw).unwrap_or(serde_json::Value::Array(vec![]));

    let arr = match value {
        serde_json::Value::Array(a) => a,
        obj @ serde_json::Value::Object(_) => vec![obj],
        _ => vec![],
    };

    let mut entries: Vec<ServiceEntry> = arr
        .into_iter()
        .filter_map(|v| serde_json::from_value::<PsService>(v).ok())
        .map(|svc| {
            let (category, safe_to_disable, reason) = lookup(&svc.name)
                .unwrap_or(("System", false, ""));
            ServiceEntry {
                name: svc.name,
                display_name: svc.display_name,
                status: parse_status(&svc.status),
                start_type: parse_start_type(&svc.start_type),
                category: category.to_string(),
                safe_to_disable,
                reason: reason.to_string(),
            }
        })
        .collect();

    // Sort: safe-to-disable first, then by name
    entries.sort_by(|a, b| {
        b.safe_to_disable
            .cmp(&a.safe_to_disable)
            .then(a.name.cmp(&b.name))
    });

    Ok(entries)
}

#[tauri::command]
pub async fn get_services(state: tauri::State<'_, AppState>) -> AppResult<Vec<ServiceEntry>> {
    // Cache-first: use result if fresher than 5 minutes
    if let Ok(db) = state.db.lock() {
        if let Ok(json) = db.query_row(
            "SELECT data_json FROM scan_cache WHERE key = 'services' \
             AND (CAST(strftime('%s','now') AS INTEGER) \
                  - CAST(strftime('%s', scanned_at) AS INTEGER)) < 300",
            [],
            |r| r.get::<_, String>(0),
        ) {
            if let Ok(cached) = serde_json::from_str::<Vec<ServiceEntry>>(&json) {
                return Ok(cached);
            }
        }
    }

    let result = get_services_core().await?;

    if let Ok(json) = serde_json::to_string(&result) {
        if let Ok(db) = state.db.lock() {
            db.execute(
                "INSERT OR REPLACE INTO scan_cache (key, data_json) VALUES (?1, ?2)",
                rusqlite::params!["services", json],
            ).ok();
        }
    }

    Ok(result)
}

#[tauri::command]
pub async fn set_service_start_type(
    name: String,
    start_type: String,
    previous_start_type: String,
) -> AppResult<ServiceActionResult> {
    // Validate start_type to prevent injection
    let valid = matches!(
        start_type.as_str(),
        "Automatic" | "AutomaticDelayedStart" | "Manual" | "Disabled"
    );
    if !valid {
        return Err(AppError::Parse(format!("Ungültiger StartType: {start_type}")));
    }

    let script = format!(
        "try {{ Set-Service -Name '{name}' -StartupType '{start_type}' -ErrorAction Stop; 'ok' }} \
         catch [System.UnauthorizedAccessException] {{ 'elevation' }} \
         catch {{ \"err:$($_.Exception.Message)\" }}"
    );

    let result = run_ps(&script).await?;
    let result = result.trim();

    if result == "ok" {
        Ok(ServiceActionResult {
            name,
            success: true,
            message: format!("StartType auf '{start_type}' gesetzt"),
            previous_start_type,
        })
    } else if result == "elevation" {
        Err(AppError::ElevationRequired)
    } else {
        let msg = result
            .strip_prefix("err:")
            .unwrap_or(result)
            .to_string();
        Ok(ServiceActionResult {
            name,
            success: false,
            message: msg,
            previous_start_type,
        })
    }
}
