import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { Cpu, MemoryStick, HardDrive, Clock, Shield, RefreshCw, Download, Zap, CheckCircle, AlertTriangle, Info, XCircle, Sparkles } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import MetricCard from '@/components/shared/MetricCard'
import StatusBadge from '@/components/shared/StatusBadge'
import { useSystemMetrics } from '@/hooks/useSystemMetrics'
import { formatBytes, formatUptime, formatPercent } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAlerts, getMetricHistory } from '@/lib/tauri'
import type { Alert } from '@/types/automation'
import { cn } from '@/lib/utils'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}

const QUICK_ACTIONS = [
  {
    label: 'Updates suchen',
    icon: RefreshCw,
    to: '/updates',
    color: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    glow: 'hover:shadow-[0_8px_25px_rgba(59,130,246,0.15)] hover:border-blue-500/30'
  },
  {
    label: 'Apps installieren',
    icon: Download,
    to: '/installer',
    color: 'text-indigo-500 dark:text-indigo-400',
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    glow: 'hover:shadow-[0_8px_25px_rgba(99,102,241,0.15)] hover:border-indigo-500/30'
  },
  {
    label: 'Systemleistung',
    icon: Zap,
    to: '/performance',
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    glow: 'hover:shadow-[0_8px_25px_rgba(245,158,11,0.15)] hover:border-amber-500/30'
  },
  {
    label: 'Sicherheit',
    icon: Shield,
    to: '/security',
    color: 'text-emerald-500 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    glow: 'hover:shadow-[0_8px_25px_rgba(16,185,129,0.15)] hover:border-emerald-500/30'
  },
]

const SEVERITY_ICONS: Record<string, React.ElementType> = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
}

const SEVERITY_COLORS: Record<string, string> = {
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
  info: 'text-blue-500',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

function cpuColor(v: number): 'success' | 'warning' | 'danger' {
  if (v < 60) return 'success'
  if (v < 80) return 'warning'
  return 'danger'
}

function AnimatedScore({ value }: { value: number }) {
  const springValue = useSpring(value, { stiffness: 100, damping: 20 })
  const roundedValue = useTransform(springValue, (latest) => Math.round(latest))

  useEffect(() => {
    springValue.set(value)
  }, [value, springValue])

  return <motion.span>{roundedValue}</motion.span>
}

function AlertFeed({ alerts }: { alerts: Alert[] }) {
  return (
    <div>
      {alerts.length === 0 ? (
        <p className="text-[12px] text-slate-400 dark:text-slate-500 py-4 text-center">Noch keine Aktivitäten</p>
      ) : (
        <div className="space-y-2.5">
          {alerts.map((a) => {
            const Icon = SEVERITY_ICONS[a.severity] ?? Info
            const color = SEVERITY_COLORS[a.severity] ?? 'text-blue-500'
            return (
              <div key={a.id} className="flex items-start gap-3">
                <Icon size={14} className={cn('flex-shrink-0 mt-0.5', color)} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200 truncate">{a.title}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {new Date(a.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatTime(str: string) {
  try {
    const d = new Date(str.replace(' ', 'T'))
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return str.slice(11, 16)
  }
}

export default function Dashboard() {
  const { current, isLoading } = useSystemMetrics()

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => getAlerts(5),
    refetchInterval: 30_000,
  })

  const { data: cpuHistory = [] } = useQuery({
    queryKey: ['metric-history', 'cpu'],
    queryFn: () => getMetricHistory('cpu', 6),
    refetchInterval: 60_000,
  })

  const { data: ramHistory = [] } = useQuery({
    queryKey: ['metric-history', 'ram_pct'],
    queryFn: () => getMetricHistory('ram_pct', 6),
    refetchInterval: 60_000,
  })

  const cpuPct = current?.cpu_usage ?? 0
  const ramPct = current ? (current.ram_used / current.ram_total) * 100 : 0
  const diskPct = current ? (current.disk_used / current.disk_total) * 100 : 0
  const systemScore = Math.round(100 - (cpuPct * 0.4 + ramPct * 0.4 + diskPct * 0.2))

  // Merge CPU + RAM into combined chart data
  const chartData = cpuHistory.map((p, i) => ({
    time: formatTime(p.recorded_at),
    cpu: Math.round(p.value),
    ram: Math.round(ramHistory[i]?.value ?? 0),
  }))

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-[28px] font-extrabold text-slate-800 dark:text-slate-100 leading-tight tracking-tight">
            {getGreeting()},{' '}
            <span className="bg-gradient-to-r from-accent to-[#8B5CF6] bg-clip-text text-transparent">
              {isLoading ? '…' : current?.hostname ?? 'dein PC'}
            </span>
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
            {current?.os_version ?? 'Systeminfo wird geladen…'}
          </p>
        </motion.div>

        <div className="flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-500/15 px-3 py-1.5 rounded-full border border-emerald-500/20 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Health Score + Status Row */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4 bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl px-5 py-3 shadow-card border border-border/70 dark:border-white/[0.04]"
        >
          <div className="relative w-12 h-12 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-border)" strokeWidth="3" opacity="0.3" />
              <motion.circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke={systemScore > 75 ? 'url(#score-grad-success)' : systemScore > 45 ? 'url(#score-grad-warning)' : 'url(#score-grad-danger)'}
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 97.38" }}
                animate={{ strokeDasharray: `${(systemScore / 100) * 97.38} 97.38` }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              />
              <defs>
                <linearGradient id="score-grad-success" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
                <linearGradient id="score-grad-warning" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
                <linearGradient id="score-grad-danger" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-slate-800 dark:text-slate-100">
              {isLoading ? '—' : <AnimatedScore value={systemScore} />}
            </span>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-0.5">
              <img src="/logo.jpg" alt="" className="w-3.5 h-3.5 rounded-sm opacity-70" />
              System Zustand
            </p>
            <p className="text-[14px] font-bold text-slate-800 dark:text-slate-100">
              {systemScore > 75 ? 'Hervorragend' : systemScore > 45 ? 'Ausgezeichnet' : 'Optimierung empfohlen'}
            </p>
          </div>
        </motion.div>

        <div className="flex flex-wrap items-center gap-2">
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
            <StatusBadge status="success" label="Defender Aktiv" />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <StatusBadge status="neutral" label={`${current?.cpu_count ?? '?'} Kerne`} />
          </motion.div>
          {current && (
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <StatusBadge status="neutral" label={`Laufzeit ${formatUptime(current.uptime)}`} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <motion.div variants={item}>
          <MetricCard
            title="CPU Auslastung"
            value={isLoading ? '—' : formatPercent(cpuPct)}
            subtitle={current?.cpu_model?.split(' ').slice(0, 3).join(' ')}
            icon={<Cpu size={15} />}
            color={cpuColor(cpuPct)}
            progress={cpuPct}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            title="Arbeitsspeicher"
            value={isLoading ? '—' : formatPercent(ramPct, 0)}
            subtitle={current ? `${formatBytes(current.ram_used)} / ${formatBytes(current.ram_total)}` : ''}
            icon={<MemoryStick size={15} />}
            color={ramPct > 80 ? 'danger' : ramPct > 65 ? 'warning' : 'success'}
            progress={ramPct}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            title="Festplatte"
            value={isLoading ? '—' : formatPercent(diskPct, 0)}
            subtitle={current ? `${formatBytes(current.disk_used)} belegt` : ''}
            icon={<HardDrive size={15} />}
            color={diskPct > 90 ? 'danger' : diskPct > 75 ? 'warning' : 'default'}
            progress={diskPct}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            title="Betriebszeit"
            value={isLoading ? '—' : formatUptime(current?.uptime ?? 0)}
            subtitle="Seit letztem Neustart"
            icon={<Clock size={15} />}
            color="success"
          />
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-8">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 px-1">
          Schnellzugriff
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map(({ label, icon: Icon, to, color, bg, glow }) => (
            <Link key={to} to={to} className="block">
              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={cn(
                  'flex flex-col items-center gap-3 p-5 rounded-2xl cursor-pointer group transition-all duration-200',
                  'bg-white/60 dark:bg-white/[0.02] backdrop-blur-md',
                  'border border-border/70 dark:border-white/[0.04]',
                  glow
                )}
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm', bg, color)}>
                  <Icon size={18} />
                </div>
                <span className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Bottom Row: Activity Feed + Health Trends */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Activity Feed */}
        <div className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl border border-border/70 dark:border-white/[0.04] shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 dark:border-white/[0.04] flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Letzte Aktivitäten</h2>
            <Link to="/automation" className="text-[11px] font-bold text-accent dark:text-[#A5B4FC] hover:underline">Alle anzeigen</Link>
          </div>
          <div className="px-5 py-4">
            <AlertFeed alerts={alerts} />
          </div>
        </div>

        {/* Health Trends */}
        <div className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl border border-border/70 dark:border-white/[0.04] shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 dark:border-white/[0.04] flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Verlauf (letzte 6h)</h2>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-1.5 bg-[#4F46E5] rounded-sm" />CPU</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-1.5 bg-[#8B5CF6] rounded-sm" />RAM</span>
            </div>
          </div>
          <div className="px-2 py-4">
            {chartData.length === 0 ? (
              <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center py-8">Noch keine Verlaufsdaten</p>
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chart-cpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="chart-ram" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity="0.3" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 9, fill: 'currentColor' }}
                    className="text-slate-400 dark:text-slate-500"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: 'currentColor' }}
                    className="text-slate-400 dark:text-slate-500"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 12,
                      fontSize: 11,
                      color: 'var(--text-primary)'
                    }}
                    formatter={(v: number) => [`${v}%`]}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#chart-cpu)" name="CPU" />
                  <Area type="monotone" dataKey="ram" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#chart-ram)" name="RAM" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
