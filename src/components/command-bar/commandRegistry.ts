import {
  LayoutDashboard, Bot, Activity, Sparkles, Zap, BatteryCharging,
  RefreshCw, Download, Wrench, Cpu, Shield, Settings,
  Rocket, Trash2, ClipboardList, Focus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type CommandCategory = 'navigation' | 'action'

export interface CommandDef {
  id: string
  title: string
  description?: string
  icon: LucideIcon
  category: CommandCategory
  route?: string
  keywords?: string[]
  shortcut?: string
}

export const COMMANDS: CommandDef[] = [
  // ── Navigation ────────────────────────────────────────────────────────────
  {
    id: 'nav-dashboard',
    title: 'Dashboard',
    description: 'Systemübersicht und Aktivitäten',
    icon: LayoutDashboard,
    category: 'navigation',
    route: '/dashboard',
    keywords: ['übersicht', 'home', 'start'],
  },
  {
    id: 'nav-assistant',
    title: 'AI Assistant',
    description: 'Fragen stellen, Aufgaben ausführen',
    icon: Bot,
    category: 'navigation',
    route: '/assistant',
    keywords: ['ki', 'chat', 'claude', 'gemini', 'gpt', 'ai'],
  },
  {
    id: 'nav-performance',
    title: 'Performance',
    description: 'CPU, RAM und Prozesse in Echtzeit',
    icon: Activity,
    category: 'navigation',
    route: '/performance',
    keywords: ['cpu', 'ram', 'prozesse', 'tasks', 'speicher'],
  },
  {
    id: 'nav-cleanup',
    title: 'Cleanup & Boost',
    description: 'Speicherplatz freigeben und RAM optimieren',
    icon: Sparkles,
    category: 'navigation',
    route: '/cleanup',
    keywords: ['temp', 'junk', 'bereinigen', 'säubern', 'müll'],
  },
  {
    id: 'nav-automation',
    title: 'Automation',
    description: 'Automatische Hintergrundaufgaben',
    icon: Zap,
    category: 'navigation',
    route: '/automation',
    keywords: ['regeln', 'automatisch', 'schedule', 'rules'],
  },
  {
    id: 'nav-battery',
    title: 'Akku & Energie',
    description: 'Akkugesundheit und Energieverbrauch',
    icon: BatteryCharging,
    category: 'navigation',
    route: '/battery',
    keywords: ['akku', 'batterie', 'energie', 'strom', 'ladung'],
  },
  {
    id: 'nav-updates',
    title: 'Updates',
    description: 'Windows & App Updates installieren',
    icon: RefreshCw,
    category: 'navigation',
    route: '/updates',
    keywords: ['update', 'windows', 'patch', 'aktualisieren'],
  },
  {
    id: 'nav-installer',
    title: 'App Installer',
    description: 'Software suchen und installieren',
    icon: Download,
    category: 'navigation',
    route: '/installer',
    keywords: ['install', 'software', 'winget', 'app', 'programm'],
  },
  {
    id: 'nav-services',
    title: 'Dienste',
    description: 'Windows-Dienste verwalten',
    icon: Wrench,
    category: 'navigation',
    route: '/services',
    keywords: ['service', 'dienste', 'windows', 'deamon'],
  },
  {
    id: 'nav-drivers',
    title: 'Treiber',
    description: 'Treiber prüfen und aktualisieren',
    icon: Cpu,
    category: 'navigation',
    route: '/drivers',
    keywords: ['driver', 'treiber', 'grafik', 'hardware', 'gpu'],
  },
  {
    id: 'nav-security',
    title: 'Sicherheit',
    description: 'Defender, Firewall & UAC-Status',
    icon: Shield,
    category: 'navigation',
    route: '/security',
    keywords: ['sicherheit', 'antivirus', 'firewall', 'defender', 'virus'],
  },
  {
    id: 'nav-settings',
    title: 'Einstellungen',
    description: 'App-Konfiguration und Themes',
    icon: Settings,
    category: 'navigation',
    route: '/settings',
    keywords: ['settings', 'einstellungen', 'konfiguration', 'theme', 'sprache'],
  },

  // ── Aktionen ──────────────────────────────────────────────────────────────
  {
    id: 'action-boost',
    title: 'System Boost',
    description: 'RAM freigeben und System beschleunigen',
    icon: Rocket,
    category: 'action',
    keywords: ['boost', 'ram', 'beschleunigen', 'optimieren', 'schnell'],
  },
  {
    id: 'action-cleanup',
    title: 'Cleanup starten',
    description: 'Temporäre Dateien und Junk löschen',
    icon: Trash2,
    category: 'action',
    keywords: ['cleanup', 'bereinigen', 'temp', 'junk', 'löschen'],
  },
  {
    id: 'action-clipboard',
    title: 'Zwischenablage-Verlauf',
    description: 'Kopierten Text und Bilder abrufen',
    icon: ClipboardList,
    category: 'action',
    keywords: ['clipboard', 'zwischenablage', 'kopieren', 'paste'],
  },
  {
    id: 'action-focus',
    title: 'Focus Mode starten',
    description: 'Ablenkungsfreies Arbeiten',
    icon: Focus,
    category: 'action',
    keywords: ['focus', 'fokus', 'pomodoro', 'arbeiten', 'konzentration'],
  },
]

export function filterCommands(commands: CommandDef[], query: string): CommandDef[] {
  if (!query.trim()) return commands
  const q = query.toLowerCase().trim()
  return commands.filter((cmd) => {
    const searchable = [
      cmd.title,
      cmd.description ?? '',
      ...(cmd.keywords ?? []),
    ].join(' ').toLowerCase()
    return searchable.includes(q) || fuzzyMatch(q, searchable)
  })
}

function fuzzyMatch(query: string, text: string): boolean {
  let qi = 0
  for (let i = 0; i < text.length && qi < query.length; i++) {
    if (text[i] === query[qi]) qi++
  }
  return qi === query.length
}
