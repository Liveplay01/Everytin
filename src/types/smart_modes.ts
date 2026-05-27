export type SmartModeId = 'work' | 'gaming' | 'study' | 'night' | 'custom' | 'idle'

export interface SmartMode {
  id: SmartModeId
  label: string
  emoji: string
  description: string
  color: string
}

export const SMART_MODES: SmartMode[] = [
  {
    id: 'work',
    label: 'Work',
    emoji: '💼',
    description: 'Office-Apps erkannt — Performance balanced, leise Notifications',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/30',
  },
  {
    id: 'gaming',
    label: 'Gaming',
    emoji: '🎮',
    description: 'Game-Prozess aktiv — GPU priorisiert, Notifications deaktiviert',
    color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30 border-violet-200/50 dark:border-violet-800/30',
  },
  {
    id: 'study',
    label: 'Lernen',
    emoji: '📚',
    description: 'Browser + Notizen — Focus Mode empfohlen, Ambient Sound',
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30',
  },
  {
    id: 'night',
    label: 'Nacht',
    emoji: '🌙',
    description: 'Nach 22:00 Uhr — Dunkler Modus, Lüfter leiser',
    color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200/50 dark:border-indigo-800/30',
  },
  {
    id: 'idle',
    label: 'Bereit',
    emoji: '✨',
    description: 'Kein aktiver Kontext erkannt',
    color: 'text-slate-500 bg-slate-50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-700/30',
  },
]

export function getModeById(id: SmartModeId): SmartMode {
  return SMART_MODES.find((m) => m.id === id) ?? SMART_MODES[SMART_MODES.length - 1]
}
