export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  ai_provider: 'gemini' | 'claude'
  gemini_api_key: string
  claude_api_key: string
  autostart: boolean
  minimize_to_tray: boolean
  update_check_interval_hours: number
  language: string
  // Automation / notification
  auto_cleanup_enabled: boolean
  auto_cleanup_interval_days: number
  auto_update_scan_enabled: boolean
  auto_update_scan_interval_hours: number
  install_updates_on_shutdown: boolean
  notify_on_updates: boolean
  notify_on_cleanup: boolean
  notify_on_driver_issues: boolean
  driver_update_mode: 'notify_only' | 'auto_install_signed_only'
  startup_ram_boost: boolean
}
