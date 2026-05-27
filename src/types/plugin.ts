export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  permissions: PluginPermission[]
  entry: string
}

export type PluginPermission = 'system.read' | 'clipboard.read' | 'files.read' | 'network'

export interface Plugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  enabled: boolean
  path: string
}

export const PERMISSION_LABELS: Record<PluginPermission, string> = {
  'system.read': 'Systemdaten lesen',
  'clipboard.read': 'Zwischenablage lesen',
  'files.read': 'Dateien lesen',
  'network': 'Netzwerkzugriff',
}
