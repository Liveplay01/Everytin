export interface UpdateEntry {
  id: string
  title: string
  kb_number: string | null
  update_type: 'windows' | 'driver' | 'software'
  severity: 'critical' | 'important' | 'normal'
  size_bytes: number | null
  reboot_required: boolean
}
