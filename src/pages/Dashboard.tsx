import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { Cpu, MemoryStick, HardDrive, Clock, Shield, RefreshCw, Download, Zap } from 'lucide-react'
import MetricCard from '@/components/shared/MetricCard'
import StatusBadge from '@/components/shared/StatusBadge'
import { useSystemMetrics } from '@/hooks/useSystemMetrics'
import { formatBytes, formatUptime, formatPercent } from '@/lib/utils'
import { Link } from 'react-router-dom'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

const QUICK_ACTIONS = [
  { label: 'Check Updates', icon: RefreshCw, to: '/updates', color: 'text-blue-600 bg-blue-50' },
  { label: 'Install Apps', icon: Download, to: '/installer', color: 'text-indigo-600 bg-indigo-50' },
  { label: 'Performance', icon: Zap, to: '/performance', color: 'text-amber-600 bg-amber-50' },
  { label: 'Security', icon: Shield, to: '/security', color: 'text-emerald-600 bg-emerald-50' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
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

export default function Dashboard() {
  const { current, isLoading } = useSystemMetrics()

  const cpuPct = current?.cpu_usage ?? 0
  const ramPct = current ? (current.ram_used / current.ram_total) * 100 : 0
  const diskPct = current ? (current.disk_used / current.disk_total) * 100 : 0
  const systemScore = Math.round(100 - (cpuPct * 0.4 + ramPct * 0.4 + diskPct * 0.2))

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[13px] text-[#9CA3AF] font-medium mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-[28px] font-bold text-[#1A1A1A] leading-tight">
            {getGreeting()},{' '}
            <span className="text-accent">
              {isLoading ? '…' : current?.hostname ?? 'your PC'}
            </span>
          </h1>
          <p className="text-[14px] text-[#6B7280] mt-1">
            {current?.os_version ?? 'Loading system info…'}
          </p>
        </motion.div>

        <div className="flex items-center gap-2 bg-emerald-50/50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-tighter">Live</span>
        </div>
      </div>

      {/* Health Score + Status Row */}
      <div className="flex items-center gap-4 mb-8">
        <motion.div 
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 bg-white rounded-xl px-5 py-3.5 shadow-card border border-border"
        >
          <div className="relative w-10 h-10">
            <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#F1F3F5" strokeWidth="3.5" />
              <motion.circle
                cx="18" cy="18" r="14" fill="none"
                stroke={systemScore > 70 ? '#10B981' : systemScore > 40 ? '#F59E0B' : '#EF4444'}
                strokeWidth="3.5"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 87.96" }}
                animate={{ strokeDasharray: `${(systemScore / 100) * 87.96} 87.96` }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#1A1A1A]">
              {isLoading ? '—' : <AnimatedScore value={systemScore} />}
            </span>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[#9CA3AF] flex items-center gap-1.5">
            <img src="/logo.png" alt="" className="w-3.5 h-3.5 rounded-sm opacity-60" />
            System Score
          </p>
            <p className="text-[14px] font-semibold text-[#1A1A1A]">
              {systemScore > 70 ? 'Healthy' : systemScore > 40 ? 'Fair' : 'Needs Attention'}
            </p>
          </div>
        </motion.div>

        <div className="flex items-center gap-2 overflow-hidden">
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <StatusBadge status="success" label="Defender Active" />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <StatusBadge status="neutral" label={`${current?.cpu_count ?? '?'} cores`} />
          </motion.div>
          {current && (
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <StatusBadge status="neutral" label={`Up ${formatUptime(current.uptime)}`} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <motion.div variants={item}>
          <MetricCard
            title="CPU"
            value={isLoading ? '—' : formatPercent(cpuPct)}
            subtitle={current?.cpu_model?.split(' ').slice(0, 3).join(' ')}
            icon={<Cpu size={16} />}
            color={cpuColor(cpuPct)}
            progress={cpuPct}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            title="Memory"
            value={isLoading ? '—' : formatPercent(ramPct, 0)}
            subtitle={current ? `${formatBytes(current.ram_used)} / ${formatBytes(current.ram_total)}` : ''}
            icon={<MemoryStick size={16} />}
            color={ramPct > 80 ? 'danger' : ramPct > 65 ? 'warning' : 'success'}
            progress={ramPct}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            title="Storage"
            value={isLoading ? '—' : formatPercent(diskPct, 0)}
            subtitle={current ? `${formatBytes(current.disk_used)} used` : ''}
            icon={<HardDrive size={16} />}
            color={diskPct > 90 ? 'danger' : diskPct > 75 ? 'warning' : 'default'}
            progress={diskPct}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            title="Uptime"
            value={isLoading ? '—' : formatUptime(current?.uptime ?? 0)}
            subtitle="Since last restart"
            icon={<Clock size={16} />}
            color="default"
          />
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3 px-1">
          Quick Actions
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ label, icon: Icon, to, color }) => (
            <Link key={to} to={to} className="block">
              <motion.div
                whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(79,70,229,0.12)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex flex-col items-center gap-2.5 p-4 bg-white rounded-xl border border-border shadow-card cursor-pointer group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon size={18} />
                </div>
                <span className="text-[12.5px] font-medium text-[#374151]">{label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
