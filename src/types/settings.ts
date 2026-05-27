export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  ai_provider: 'gemini' | 'claude'
  gemini_api_key: string
  claude_api_key: string
  autostart: boolean
  minimize_to_tray: boolean
  update_check_interval_hours: number
  language: string
}
