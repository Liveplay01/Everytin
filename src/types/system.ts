export interface SystemSnapshot {
  hostname: string
  os_version: string
  cpu_usage: number
  cpu_count: number
  cpu_model: string
  ram_used: number
  ram_total: number
  swap_used: number
  swap_total: number
  disk_used: number
  disk_total: number
  uptime: number
  load_avg: [number, number, number]
}

export interface ProcessInfo {
  pid: number
  name: string
  cpu_usage: number
  memory: number
  status: string
  exe: string | null
}

export interface DiskInfo {
  name: string
  mount_point: string
  total: number
  available: number
  used: number
  fs_type: string
}

export interface NetworkInfo {
  name: string
  received: number
  transmitted: number
}

export interface ThermalZone {
  name: string
  temperature_celsius: number
}

export interface AutostartEntry {
  id: string
  name: string
  path: string
  enabled: boolean
  location: string
}
