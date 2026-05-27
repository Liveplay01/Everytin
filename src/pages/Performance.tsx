import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { X, ArrowUpDown } from 'lucide-react'
import { useSystemMetrics } from '@/hooks/useSystemMetrics'
import { getProcessList, killProcess } from '@/lib/tauri'
import LiveChart from '@/components/shared/LiveChart'
import { formatBytes, formatPercent, cn } from '@/lib/utils'
import type { ProcessInfo } from '@/types/system'

type SortKey = 'cpu' | 'memory' | 'name'

export default function Performance() {
  const { current, history } = useSystemMetrics()
  const [sortBy, setSortBy] = useState<SortKey>('memory')
  const [killing, setKilling] = useState<number | null>(null)

  const cpuHistory = history.map((s) => s.cpu_usage)
  const ramHistory = history.map((s) => (s.ram_used / s.ram_total) * 100)

  const { data: processes = [], refetch } = useQuery({
    queryKey: ['process-list', sortBy],
    queryFn: () => getProcessList(sortBy, 60),
    refetchInterval: 3000,
  })

  async function handleKill(proc: ProcessInfo) {
    if (!confirm(`Kill "${proc.name}" (PID ${proc.pid})?`)) return
    setKilling(proc.pid)
    try {
      await killProcess(proc.pid)
      await refetch()
    } catch (e) {
      alert(`Failed to kill process: ${e}`)
    } finally {
      setKilling(null)
    }
  }

  const ramPct = current ? (current.ram_used / current.ram_total) * 100 : 0

  return (
    <div className="p-8 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[24px] font-bold text-[#1A1A1A]">Performance</h1>
        <p className="text-[14px] text-[#6B7280] mt-0.5">Live system metrics and process management</p>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white rounded-xl p-5 shadow-card border border-border"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[#9CA3AF]">CPU Usage</p>
            <span className="text-[22px] font-bold text-[#1A1A1A]">
              {formatPercent(current?.cpu_usage ?? 0)}
            </span>
          </div>
          <p className="text-[12px] text-[#9CA3AF] mb-3">{current?.cpu_model ?? ''}</p>
          <LiveChart data={cpuHistory} color="#4F46E5" height={80} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-5 shadow-card border border-border"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[#9CA3AF]">RAM Usage</p>
            <span className="text-[22px] font-bold text-[#1A1A1A]">
              {formatPercent(ramPct, 0)}
            </span>
          </div>
          <p className="text-[12px] text-[#9CA3AF] mb-3">
            {current ? `${formatBytes(current.ram_used)} / ${formatBytes(current.ram_total)}` : ''}
          </p>
          <LiveChart data={ramHistory} color="#10B981" height={80} />
        </motion.div>
      </div>

      {/* Process Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-xl shadow-card border border-border overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Processes</h2>
          <div className="flex gap-1">
            {(['cpu', 'memory', 'name'] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                  sortBy === key
                    ? 'bg-accent text-white'
                    : 'text-[#6B7280] hover:bg-surface-2',
                )}
              >
                {key === 'cpu' ? 'CPU' : key === 'memory' ? 'Memory' : 'Name'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-auto max-h-[400px]">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-surface">
              <tr>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  <button className="flex items-center gap-1" onClick={() => setSortBy('name')}>
                    Name <ArrowUpDown size={10} />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">PID</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  <button className="flex items-center gap-1 ml-auto" onClick={() => setSortBy('cpu')}>
                    CPU <ArrowUpDown size={10} />
                  </button>
                </th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  <button className="flex items-center gap-1 ml-auto" onClick={() => setSortBy('memory')}>
                    Memory <ArrowUpDown size={10} />
                  </button>
                </th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {processes.map((p, i) => (
                <tr
                  key={`${p.pid}-${i}`}
                  className="border-t border-border hover:bg-surface-2 transition-colors group"
                >
                  <td className="px-5 py-2.5 font-medium text-[#1A1A1A] truncate max-w-[200px]">
                    {p.name}
                  </td>
                  <td className="px-3 py-2.5 text-[#9CA3AF] font-mono">{p.pid}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={cn(
                      'font-medium',
                      p.cpu_usage > 20 ? 'text-danger' : p.cpu_usage > 5 ? 'text-warning' : 'text-[#6B7280]',
                    )}>
                      {formatPercent(p.cpu_usage)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[#6B7280]">
                    {formatBytes(p.memory)}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => handleKill(p)}
                      disabled={killing === p.pid}
                      className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-500 transition-all disabled:opacity-50"
                      title="Kill process"
                    >
                      <X size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
