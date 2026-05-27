export interface Rule {
  id: string
  name: string
  enabled: boolean
  trigger_type: 'schedule' | 'on_startup' | 'on_idle' | 'on_shutdown'
  trigger_config: Record<string, unknown>
  action_type: 'cleanup' | 'update_scan' | 'install_updates' | 'ram_boost' | 'driver_scan'
  action_config: Record<string, unknown>
  last_run: string | null
  run_count: number
}

export interface Alert {
  id: string
  severity: 'info' | 'warning' | 'error' | 'success'
  category: string
  title: string
  body: string
  acknowledged: boolean
  created_at: string
}
