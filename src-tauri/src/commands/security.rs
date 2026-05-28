use crate::error::{AppError, AppResult};
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use tokio::process::Command;
use tokio::time::{timeout, Duration};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SecurityStatus {
    pub defender_enabled: bool,
    pub defender_realtime: bool,
    pub defender_up_to_date: bool,
    pub defender_last_scan: Option<String>,
    pub firewall_domain: bool,
    pub firewall_private: bool,
    pub firewall_public: bool,
    pub bitlocker_protected: bool,
    pub uac_enabled: bool,
    pub auto_update_enabled: bool,
    pub score: u8,
    pub issues: Vec<String>,
}

async fn run_ps(script: &str) -> Result<String, AppError> {
    let out = timeout(
        Duration::from_secs(15),
        Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .output(),
    )
    .await
    .map_err(|_| AppError::Timeout)?
    .map_err(|e| AppError::Process(e.to_string()))?;
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

pub async fn security_scan_core() -> SecurityStatus {
    // ── Defender ──────────────────────────────────────────────────────────────
    let (defender_enabled, defender_realtime, defender_up_to_date, defender_last_scan) =
        match run_ps(
            "try { $s = Get-MpComputerStatus -ErrorAction Stop; \
             \"$($s.AMServiceEnabled)|$($s.RealTimeProtectionEnabled)|$($s.AntivirusSignatureAge)|$($s.QuickScanAge)\" } catch { 'err' }",
        )
        .await
        {
            Ok(raw) if raw != "err" => {
                let parts: Vec<&str> = raw.split('|').collect();
                let svc = parts.first().map(|s| s.trim().to_lowercase() == "true").unwrap_or(false);
                let rtp = parts.get(1).map(|s| s.trim().to_lowercase() == "true").unwrap_or(false);
                let sig_age: u32 = parts.get(2).and_then(|s| s.trim().parse().ok()).unwrap_or(999);
                let scan_age: u32 = parts.get(3).and_then(|s| s.trim().parse().ok()).unwrap_or(999);
                let up_to_date = sig_age <= 3;
                let last_scan = if scan_age < 365 {
                    Some(format!("vor {} Tag(en)", scan_age))
                } else {
                    None
                };
                (svc, rtp, up_to_date, last_scan)
            }
            _ => (true, true, true, None), // graceful fallback
        };

    // ── Firewall ─────────────────────────────────────────────────────────────
    let (fw_domain, fw_private, fw_public) = match run_ps(
        "try { Get-NetFirewallProfile | ForEach-Object { $_.Enabled } | Join-String -Separator '|' } catch { 'err' }",
    )
    .await
    {
        Ok(raw) if raw != "err" => {
            let parts: Vec<bool> = raw
                .split('|')
                .map(|s| s.trim().to_lowercase() == "true")
                .collect();
            (
                parts.first().copied().unwrap_or(true),
                parts.get(1).copied().unwrap_or(true),
                parts.get(2).copied().unwrap_or(true),
            )
        }
        _ => (true, true, true),
    };

    // ── BitLocker ─────────────────────────────────────────────────────────────
    let bitlocker_protected = match run_ps(
        "try { (Get-BitLockerVolume -MountPoint C: -ErrorAction Stop).ProtectionStatus } catch { 'Unknown' }",
    )
    .await
    {
        Ok(raw) => raw.trim().to_lowercase() == "on",
        _ => false,
    };

    // ── UAC ───────────────────────────────────────────────────────────────────
    let uac_enabled = match run_ps(
        "try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' -ErrorAction Stop).EnableLUA } catch { '1' }",
    )
    .await
    {
        Ok(raw) => raw.trim() != "0",
        _ => true,
    };

    // ── Auto-Update ───────────────────────────────────────────────────────────
    let auto_update_enabled = match run_ps(
        "try { $v = (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU' -ErrorAction Stop).NoAutoUpdate; $v } catch { '0' }",
    )
    .await
    {
        Ok(raw) => raw.trim() != "1",
        _ => true,
    };

    // ── Score & issues ────────────────────────────────────────────────────────
    let mut issues: Vec<String> = Vec::new();
    let mut score: i32 = 100;

    if !defender_enabled {
        issues.push("Windows Defender ist deaktiviert".into());
        score -= 30;
    }
    if !defender_realtime {
        issues.push("Echtzeitschutz von Defender ist aus".into());
        score -= 20;
    }
    if !defender_up_to_date {
        issues.push("Defender-Signaturen sind älter als 3 Tage".into());
        score -= 15;
    }
    if !fw_public || !fw_private || !fw_domain {
        issues.push("Mindestens ein Firewall-Profil ist deaktiviert".into());
        score -= 20;
    }
    if !uac_enabled {
        issues.push("UAC (Benutzerkontensteuerung) ist deaktiviert".into());
        score -= 15;
    }
    if !auto_update_enabled {
        issues.push("Automatische Windows-Updates sind deaktiviert".into());
        score -= 10;
    }

    SecurityStatus {
        defender_enabled,
        defender_realtime,
        defender_up_to_date,
        defender_last_scan,
        firewall_domain: fw_domain,
        firewall_private: fw_private,
        firewall_public: fw_public,
        bitlocker_protected,
        uac_enabled,
        auto_update_enabled,
        score: score.max(0) as u8,
        issues,
    }
}

#[tauri::command]
pub async fn get_security_status(state: tauri::State<'_, AppState>) -> AppResult<SecurityStatus> {
    // Check cache (5-minute TTL)
    if let Ok(db) = state.db.lock() {
        if let Ok(json) = db.query_row(
            "SELECT data_json FROM scan_cache \
             WHERE key = 'security_status' \
             AND (CAST(strftime('%s', 'now') AS INTEGER) - CAST(strftime('%s', scanned_at) AS INTEGER)) < 300",
            [],
            |r| r.get::<_, String>(0),
        ) {
            if let Ok(cached) = serde_json::from_str::<SecurityStatus>(&json) {
                return Ok(cached);
            }
        }
    }
    let result = security_scan_core().await;
    if let Ok(json) = serde_json::to_string(&result) {
        if let Ok(db) = state.db.lock() {
            let _ = db.execute(
                "INSERT OR REPLACE INTO scan_cache (key, data_json, scanned_at) VALUES ('security_status', ?1, datetime('now'))",
                rusqlite::params![json],
            );
        }
    }
    Ok(result)
}
