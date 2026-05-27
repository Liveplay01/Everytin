import { useState } from 'react'
import { Rocket, Sparkles, Focus, Bot } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { boostSystem } from '@/lib/tauri'
import { cn } from '@/lib/utils'

const ACTIONS = [
  { id: 'boost',   label: 'Boost',    icon: Rocket,   color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-950/30',   action: 'boost' },
  { id: 'cleanup', label: 'Cleanup',  icon: Sparkles, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30', action: '/cleanup' },
  { id: 'focus',   label: 'Focus',    icon: Focus,    color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-950/30', action: '/focus' },
  { id: 'ai',      label: 'AI',       icon: Bot,      color: 'text-accent',     bg: 'bg-accent/10',                      action: '/assistant' },
]

export default function QuickActionsWidget() {
  const [busy, setBusy] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleAction = async (id: string, action: string) => {
    if (action.startsWith('/')) {
      navigate(action)
      return
    }
    if (action === 'boost') {
      setBusy(id)
      try { await boostSystem() } catch {}
      setBusy(null)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 h-full content-center py-2">
      {ACTIONS.map(({ id, label, icon: Icon, color, bg, action }) => (
        <button
          key={id}
          onClick={() => handleAction(id, action)}
          disabled={busy === id}
          className={cn(
            'flex flex-col items-center gap-1.5 p-3 rounded-xl border border-transparent transition-all',
            bg,
            'hover:scale-[1.03] hover:border-border/50 active:scale-[0.97]',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          <Icon size={18} className={color} />
          <span className={cn('text-[11px] font-semibold', color)}>{label}</span>
        </button>
      ))}
    </div>
  )
}
