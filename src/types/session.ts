export interface SessionApp {
  name: string
  exe_path: string
  window_title: string
}

export interface SavedSession {
  id: string
  label: string
  apps: SessionApp[]
  created_at: string
}
