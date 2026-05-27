import { useQuery } from '@tanstack/react-query'
import { Clock, Target, TrendingUp } from 'lucide-react'
import { getFocusStats } from '@/lib/tauri'

export default function FocusStats() {
  const { data: stats } = useQuery({
    queryKey: ['focus-stats'],
    queryFn: getFocusStats,
    staleTime: 30_000,
  })

  if (!stats) return null

  const items = [
    {
      icon: Clock,
      label: 'Heute',
      value: `${stats.today_minutes}min`,
      sub: `${stats.today_sessions} Session${stats.today_sessions !== 1 ? 's' : ''}`,
    },
    {
      icon: Target,
      label: 'Diese Woche',
      value: `${stats.week_minutes}min`,
      sub: `${stats.week_sessions} Sessions`,
    },
    {
      icon: TrendingUp,
      label: 'Längste Session',
      value: `${stats.longest_session_minutes}min`,
      sub: 'Bestzeit',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ icon: Icon, label, value, sub }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-1 p-4 rounded-xl bg-white/60 dark:bg-white/[0.03] border border-border/50"
        >
          <Icon size={14} className="text-accent dark:text-[#A5B4FC] mb-0.5" />
          <span className="text-[18px] font-bold text-slate-800 dark:text-slate-100 tabular-nums">
            {value}
          </span>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            {label}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</span>
        </div>
      ))}
    </div>
  )
}
