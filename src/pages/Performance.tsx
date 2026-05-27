import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ArrowUpDown, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react'
import { useSystemMetrics } from '@/hooks/useSystemMetrics'
import { getProcessList, killProcess, getAutostartEntries } from '@/lib/tauri'
import { invoke } from '@tauri-apps/api/core'
import LiveChart from '@/components/shared/LiveChart'
import { formatBytes, formatPercent, cn } from '@/lib/utils'
import { toast } from '@/components/shared/Toast'
import type { ProcessInfo } from '@/types/system'

type SortKey = 'cpu' | 'memory' | 'name'

export default function Performance() {
  const { current, history } = useSystemMetrics()
  const queryClient = useQueryClient()
  const [sortBy, setSortBy] = useState<SortKey>('memory')
  const [killing, setKilling] = useState<number | null>(null)
  const [elevationEntry, setElevationEntry] = useState<string | null>(null)

  const cpuHistory = history.map((s) => s.cpu_usage)
  const ramHistory = history.map((s) => (s.ram_used / s.ram_total) * 100)

  const { data: processes = [], refetch: refetchProcesses } = useQuery({
    queryKey: ['process-list', sortBy],
    queryFn: () => getProcessList(sortBy, 60),
    refetchInterval: 3000,
  })

  const { data: autostart = [] } = useQuery({
    queryKey: ['autostart'],
    queryFn: getAutostartEntries,
    staleTime: 30_000,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ entryId, enabled }: { entryId: string; enabled: boolean }) =>
      invoke<void>('toggle_autostart', { entryId, enabled }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['autostart'] })
      toast.success(vars.enabled ? 'Autostart aktiviert' : 'Autostart deaktiviert')
    },
    onError: (err: unknown) => {
      const msg = String(err)
      if (msg.includes('ElevationRequired') || msg.includes('elevation')) {
        setElevationEntry(String(err))
      } else {
        toast.error(`Fehler: ${msg}`)
      }
    },
  })

  async function handleKill(proc: ProcessInfo) {
    if (!confirm(`Kill "${proc.name}" (PID ${proc.pid})?`)) return
    setKilling(proc.pid)
    try {
      await killProcess(proc.pid)
      await refetchProcesses()
    } catch (e) {
      toast.error(`Prozess konnte nicht beendet werden: ${e}`)
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

      {/* Autostart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="bg-white rounded-xl shadow-card border border-border overflow-hidden mb-6"
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Autostart-Programme</h2>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">
            Diese Programme starten automatisch mit Windows. Deaktiviere unnötige Einträge für schnelleres Hochfahren.
          </p>
        </div>

        {elevationEntry && (
          <div className="mx-5 mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-[13px] text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold">Administratorrechte erforderlich</p>
              <p className="mt-0.5 opacity-80">Dieser Eintrag liegt in HKLM und kann nur mit Administratorrechten geändert werden.</p>
              <button onClick={() => setElevationEntry(null)} className="mt-1.5 text-[12px] underline font-medium">Schließen</button>
            </div>
          </div>
        )}

        {autostart.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-[#9CA3AF]">Keine Autostart-Einträge gefunden.</p>
        ) : (
          <div className="divide-y divide-border">
            {autostart.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{entry.name}</p>
                  <p className="text-[11px] text-[#9CA3AF] truncate max-w-[480px]" title={entry.path}>{entry.path}</p>
                </div>
                <span className="text-[11px] text-[#9CA3AF] bg-surface px-2 py-0.5 rounded flex-shrink-0">{entry.location}</span>
                <button
                  onClick={() => toggleMutation.mutate({ entryId: entry.id, enabled: !entry.enabled })}
                  disabled={toggleMutation.isPending}
                  className="flex-shrink-0 text-[#9CA3AF] hover:text-accent transition-colors disabled:opacity-50"
                  title={entry.enabled ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {entry.enabled
                    ? <ToggleRight size={22} className="text-accent" />
                    : <ToggleLeft size={22} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Process Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-xl shadow-card border border-border overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Prozesse</h2>
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
