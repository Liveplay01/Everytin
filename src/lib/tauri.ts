import { invoke } from '@tauri-apps/api/core'
import { listen, type Event } from '@tauri-apps/api/event'
import type { SystemSnapshot, ProcessInfo, DiskInfo } from '@/types/system'
import type { Package, InstallResult } from '@/types/installer'
import type { AppSettings } from '@/types/settings'
import type { AiMessage } from '@/types/ai'
import type { Rule, Alert } from '@/types/automation'
import type { BatteryInfo } from '@/types/battery'

// ── System ──────────────────────────────────────────────────────────────────

export const getSystemSnapshot = () =>
  invoke<SystemSnapshot>('get_system_snapshot')

export const getProcessList = (sortBy?: 'cpu' | 'memory' | 'name', limit = 50) =>
  invoke<ProcessInfo[]>('get_process_list', { sortBy, limit })

export const killProcess = (pid: number) =>
  invoke<void>('kill_process', { pid })

export const getDiskInfo = () =>
  invoke<DiskInfo[]>('get_disk_info')

// ── Installer ───────────────────────────────────────────────────────────────

export const searchPackages = (query: string) =>
  invoke<Package[]>('search_packages', { query })

export const getInstalledPackages = () =>
  invoke<Package[]>('get_installed_packages')

export const installPackage = (packageId: string) =>
  invoke<InstallResult>('install_package', { packageId })

export const uninstallPackage = (packageId: string) =>
  invoke<InstallResult>('uninstall_package', { packageId })

// ── Updates ─────────────────────────────────────────────────────────────────

export const scanWingetUpdates = () =>
  invoke<import('@/types/updates').UpdateEntry[]>('scan_winget_updates')

export const installWingetUpdate = (packageId: string) =>
  invoke<boolean>('install_winget_update', { packageId })

// ── Settings ────────────────────────────────────────────────────────────────

export const getSettings = () =>
  invoke<AppSettings>('get_settings')

export const updateSettings = (settings: AppSettings) =>
  invoke<void>('update_settings', { settings })

// ── AI ───────────────────────────────────────────────────────────────────────

export const sendMessage = (
  message: string,
  history: AiMessage[],
  apiKey: string,
  provider: string,
) => invoke<string>('send_message', { message, history, apiKey, provider })

// ── Cleanup / Boost ──────────────────────────────────────────────────────────

export interface JunkCategory {
  id: string
  name: string
  description: string
  size_bytes: number
  file_count: number
  path: string
  requires_elevation: boolean
}

export interface CleanResult {
  freed_bytes: number
  files_deleted: number
  errors: string[]
}

export interface BoostResult {
  ram_freed_bytes: number
  ram_before: number
  ram_after: number
}

export const scanJunkFiles = () =>
  invoke<JunkCategory[]>('scan_junk_files')

export const cleanJunkFiles = (categoryIds: string[]) =>
  invoke<CleanResult>('clean_junk_files', { categoryIds })

export const boostSystem = () =>
  invoke<BoostResult>('boost_system')

// ── Performance ──────────────────────────────────────────────────────────────

export const getTemperatures = () =>
  invoke<import('@/types/system').ThermalZone[]>('get_temperatures')

export const getAutostartEntries = () =>
  invoke<import('@/types/system').AutostartEntry[]>('get_autostart_entries')

export const toggleAutostart = (entryId: string, enabled: boolean) =>
  invoke<void>('toggle_autostart', { entryId, enabled })

// ── Updates ──────────────────────────────────────────────────────────────────

export const scanWindowsUpdates = () =>
  invoke<import('@/types/updates').UpdateEntry[]>('scan_windows_updates')

// ── Security ─────────────────────────────────────────────────────────────────

export const getSecurityStatus = () =>
  invoke<import('@/types/security').SecurityStatus>('get_security_status')

// ── Services ─────────────────────────────────────────────────────────────────

export const getServices = () =>
  invoke<import('@/types/services').ServiceEntry[]>('get_services')

export const setServiceStartType = (name: string, startType: string, previousStartType: string) =>
  invoke<import('@/types/services').ServiceActionResult>('set_service_start_type', { name, startType, previousStartType })

// ── Drivers ──────────────────────────────────────────────────────────────────

export const getDrivers = () =>
  invoke<import('@/types/drivers').DriverEntry[]>('get_drivers')

export interface DriverUpdateEntry {
  id: string
  title: string
  device_description: string
  driver_version: string
  severity: string
  size_bytes: number | null
  reboot_required: boolean
}

export const scanDriverUpdates = () =>
  invoke<DriverUpdateEntry[]>('scan_driver_updates')

export const installDriverUpdate = (updateId: string) =>
  invoke<boolean>('install_driver_update', { updateId })

export const registerShutdownUpdateTask = (enable: boolean) =>
  invoke<void>('register_shutdown_update_task', { enable })

// ── Metrics History ───────────────────────────────────────────────────────────

export interface MetricPoint {
  value: number
  recorded_at: string
}

export const getMetricHistory = (metric: string, hours = 24) =>
  invoke<MetricPoint[]>('get_metric_history', { metric, hours })

// ── Events ───────────────────────────────────────────────────────────────────

export const onSystemMetrics = (handler: (snap: SystemSnapshot) => void) =>
  listen<SystemSnapshot>('system://metrics', (e: Event<SystemSnapshot>) => handler(e.payload))

export const onInstallProgress = (
  handler: (data: { package_id: string; pct: number; status: string }) => void,
) =>
  listen<{ package_id: string; pct: number; status: string }>(
    'install://progress',
    (e) => handler(e.payload),
  )

export const onAiChunk = (
  handler: (data: { stream_id: string; delta: string }) => void,
) =>
  listen<{ stream_id: string; delta: string }>(
    'ai://stream-chunk',
    (e) => handler(e.payload),
  )

export const onAiDone = (
  handler: (data: { stream_id: string; full_text: string }) => void,
) =>
  listen<{ stream_id: string; full_text: string }>(
    'ai://stream-done',
    (e) => handler(e.payload),
  )

export const onAiError = (
  handler: (data: { stream_id: string; error: string }) => void,
) =>
  listen<{ stream_id: string; error: string }>(
    'ai://stream-error',
    (e) => handler(e.payload),
  )

// ── Automation ────────────────────────────────────────────────────────────────

export const getRules = () =>
  invoke<Rule[]>('get_rules')

export const toggleRule = (id: string, enabled: boolean) =>
  invoke<void>('toggle_rule', { id, enabled })

export const runRuleNow = (id: string) =>
  invoke<void>('run_rule_now', { id })

export const getAlerts = (limit = 20) =>
  invoke<Alert[]>('get_alerts', { limit })

export const acknowledgeAlert = (id: string) =>
  invoke<void>('acknowledge_alert', { id })

// ── Battery ───────────────────────────────────────────────────────────────────

export const getBatteryInfo = () =>
  invoke<BatteryInfo | null>('get_battery_info')

// ── Navigate event ────────────────────────────────────────────────────────────

export const onNavigate = (handler: (route: string) => void) =>
  listen<string>('app://navigate', (e) => handler(e.payload))
