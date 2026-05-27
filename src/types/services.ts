export interface ServiceEntry {
  name: string
  display_name: string
  status: 'Running' | 'Stopped' | 'Paused' | 'Unknown'
  start_type: 'Automatic' | 'AutomaticDelayedStart' | 'Manual' | 'Disabled' | 'Boot' | 'System' | 'Unknown'
  category: string
  safe_to_disable: boolean
  reason: string
}

export interface ServiceActionResult {
  name: string
  success: boolean
  message: string
  previous_start_type: string
}
