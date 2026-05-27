use crate::error::AppResult;
use serde::Serialize;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

#[derive(Serialize, Clone, Debug)]
pub struct BatteryInfo {
    pub charge_percent: u32,
    pub is_charging: bool,
    /// Minutes remaining (None if charging or unavailable)
    pub estimated_minutes_remaining: Option<u32>,
    /// Design capacity in mWh (if available)
    pub design_capacity_mwh: Option<u64>,
    /// Full charge capacity in mWh (if available)
    pub full_charge_capacity_mwh: Option<u64>,
    /// Approximate health percent (full_charge / design * 100)
    pub health_percent: Option<u32>,
}

#[tauri::command]
pub async fn get_battery_info() -> AppResult<Option<BatteryInfo>> {
    let script = r#"
$b = Get-WmiObject Win32_Battery -ErrorAction SilentlyContinue
if (-not $b) { Write-Output 'null'; exit }
$designCap = $null
$fullCap = $null
try {
    $report = (Get-WmiObject -Namespace "ROOT\WMI" -Class BatteryStaticData -ErrorAction Stop)
    $designCap = $report.DesignedCapacity
} catch {}
try {
    $fullData = (Get-WmiObject -Namespace "ROOT\WMI" -Class BatteryFullChargedCapacity -ErrorAction Stop)
    $fullCap = $fullData.FullChargedCapacity
} catch {}
$health = $null
if ($designCap -and $fullCap -and $designCap -gt 0) {
    $health = [int]([math]::Round($fullCap / $designCap * 100))
}
[PSCustomObject]@{
    ChargePercent     = $b.EstimatedChargeRemaining
    IsCharging        = ($b.BatteryStatus -eq 2)
    MinutesRemaining  = if ($b.BatteryStatus -ne 2) { $b.EstimatedRunTime } else { $null }
    DesignCapacityMwh = $designCap
    FullCapacityMwh   = $fullCap
    HealthPercent     = $health
} | ConvertTo-Json -Compress
"#;

    let result = timeout(
        Duration::from_secs(15),
        Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .output(),
    )
    .await
    .map_err(|_| crate::error::AppError::Timeout)?
    .map_err(|e| crate::error::AppError::System(e.to_string()))?;

    let stdout = String::from_utf8_lossy(&result.stdout).trim().to_string();
    if stdout == "null" || stdout.is_empty() {
        return Ok(None);
    }

    let v: serde_json::Value = serde_json::from_str(&stdout)
        .unwrap_or(serde_json::Value::Null);

    if v.is_null() {
        return Ok(None);
    }

    Ok(Some(BatteryInfo {
        charge_percent: v["ChargePercent"].as_u64().unwrap_or(0) as u32,
        is_charging: v["IsCharging"].as_bool().unwrap_or(false),
        estimated_minutes_remaining: v["MinutesRemaining"].as_u64().map(|m| m as u32),
        design_capacity_mwh: v["DesignCapacityMwh"].as_u64(),
        full_charge_capacity_mwh: v["FullCapacityMwh"].as_u64(),
        health_percent: v["HealthPercent"].as_u64().map(|h| h as u32),
    }))
}
