import { useSystemMetrics } from '@/hooks/useSystemMetrics'
import { formatPercent, formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'

function MiniGauge({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.08] overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-700', color)}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

export default function SystemStatsWidget() {
  const { current } = useSystemMetrics()

  if (!current) {
    return <div className="text-[12px] text-slate-400 flex items-center justify-center h-full">Laden…</div>
  }

  const ramPct = (current.ram_used / current.ram_total) * 100

  const stats = [
    { label: 'CPU', value: current.cpu_usage, color: 'bg-accent', display: formatPercent(current.cpu_usage) },
    { label: 'RAM', value: ramPct, color: 'bg-violet-500', display: formatBytes(current.ram_used) },
  ]

  return (
    <div className="flex flex-col gap-3 py-2 h-full justify-center">
      {stats.map(({ label, value, color, display }) => (
        <div key={label} className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{display}</span>
          </div>
          <MiniGauge value={value} color={color} />
        </div>
      ))}
      <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1">
        {current.cpu_count} Kerne · {formatBytes(current.ram_total)} RAM
      </div>
    </div>
  )
}
