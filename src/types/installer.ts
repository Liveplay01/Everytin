export interface Package {
  id: string
  name: string
  version: string
  available_version: string | null
  publisher: string | null
  installed: boolean
  source: string | null
}

export interface InstallResult {
  package_id: string
  success: boolean
  message: string
}

export interface InstallJob {
  id: string
  package_ids: string[]
  status: 'queued' | 'running' | 'done' | 'failed'
  progress: Record<string, number>
  results: InstallResult[]
  started_at: string
  completed_at: string | null
}
