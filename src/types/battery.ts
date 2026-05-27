export interface BatteryInfo {
  charge_percent: number
  is_charging: boolean
  estimated_minutes_remaining: number | null
  design_capacity_mwh: number | null
  full_charge_capacity_mwh: number | null
  health_percent: number | null
}
