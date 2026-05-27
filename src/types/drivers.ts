export interface DriverEntry {
  device_name: string
  driver_version: string
  driver_date_display: string
  manufacturer: string
  device_class: string
  is_signed: boolean
  potentially_outdated: boolean
  age_days: number
}
