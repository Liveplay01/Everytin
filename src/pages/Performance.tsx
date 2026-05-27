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
    if (!confirm(`Prozess "${proc.name}" (PID ${proc.pid}) wirklich beenden?`)) return
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
        <h1 className="text-[24px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Performance</h1>
        <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Echtzeit-Metriken und Prozess-Management</p>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl p-5 shadow-card border border-border/70 dark:border-white/[0.04]"
        >
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">CPU-Auslastung</p>
            <span className="text-[24px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              {formatPercent(current?.cpu_usage ?? 0)}
            </span>
          </div>
          <p className="text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 mb-4">{current?.cpu_model ?? ''}</p>
          <LiveChart data={cpuHistory} color="#4F46E5" height={90} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl p-5 shadow-card border border-border/70 dark:border-white/[0.04]"
        >
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Arbeitsspeicher</p>
            <span className="text-[24px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              {formatPercent(ramPct, 0)}
            </span>
          </div>
          <p className="text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 mb-4">
            {current ? `${formatBytes(current.ram_used)} belegt / ${formatBytes(current.ram_total)} gesamt` : ''}
          </p>
          <LiveChart data={ramHistory} color="#10B981" height={90} />
        </motion.div>
      </div>

      {/* Autostart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl shadow-card border border-border/70 dark:border-white/[0.04] overflow-hidden mb-6"
      >
        <div className="px-5 py-4 border-b border-border/60 dark:border-white/[0.04]">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Autostart-Programme</h2>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
            Diese Programme starten automatisch beim Anmelden. Deaktiviere unnötige Einträge für schnelleres Hochfahren.
          </p>
        </div>

        {elevationEntry && (
          <div className="mx-5 mt-4 flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-[13px] text-amber-800 dark:text-amber-400">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="font-bold">Administratorrechte erforderlich</p>
              <p className="mt-0.5 opacity-80">Dieser Eintrag liegt in HKLM und kann nur mit Administratorrechten geändert werden.</p>
              <button onClick={() => setElevationEntry(null)} className="mt-1.5 text-[12.5px] underline font-bold">Schließen</button>
            </div>
          </div>
        )}

        {autostart.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-slate-400 dark:text-slate-500">Keine Autostart-Einträge gefunden.</p>
        ) : (
          <div className="divide-y divide-border/60 dark:divide-white/[0.04] max-h-[300px] overflow-y-auto">
            {autostart.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{entry.name}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[480px] mt-0.5 font-medium" title={entry.path}>{entry.path}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04] px-2.5 py-1 rounded-md border border-border/60 dark:border-white/[0.04] flex-shrink-0">{entry.location}</span>
                <button
                  onClick={() => toggleMutation.mutate({ entryId: entry.id, enabled: !entry.enabled })}
                  disabled={toggleMutation.isPending}
                  className="flex-shrink-0 text-slate-400 hover:text-accent transition-colors disabled:opacity-50"
                  title={entry.enabled ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {entry.enabled
                    ? <ToggleRight size={24} className="text-accent dark:text-[#818CF8]" />
                    : <ToggleLeft size={24} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Process Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl shadow-card border border-border/70 dark:border-white/[0.04] overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 dark:border-white/[0.04]">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Prozesse</h2>
          <div className="flex gap-1.5 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl">
            {(['cpu', 'memory', 'name'] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-[11.5px] font-bold transition-all',
                  sortBy === key
                    ? 'bg-accent dark:bg-[#8B5CF6] text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
                )}
              >
                {key === 'cpu' ? 'CPU' : key === 'memory' ? 'Arbeitsspeicher' : 'Name'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-auto max-h-[400px]">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-slate-100 dark:bg-[#151322] select-none shadow-sm z-10">
              <tr>
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  <button className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" onClick={() => setSortBy('name')}>
                    Name <ArrowUpDown size={11} />
                  </button>
                </th>
                <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">PID</th>
                <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  <button className="flex items-center gap-1 ml-auto hover:text-slate-700 dark:hover:text-slate-200 transition-colors" onClick={() => setSortBy('cpu')}>
                    CPU <ArrowUpDown size={11} />
                  </button>
                </th>
                <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  <button className="flex items-center gap-1 ml-auto hover:text-slate-700 dark:hover:text-slate-200 transition-colors" onClick={() => setSortBy('memory')}>
                    RAM <ArrowUpDown size={11} />
                  </button>
                </th>
                <th className="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 dark:divide-white/[0.02]">
              {processes.map((p, i) => (
                <tr
                  key={`${p.pid}-${i}`}
                  className="hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-colors group"
                >
                  <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">
                    {p.name}
                  </td>
                  <td className="px-3 py-3 text-slate-400 dark:text-slate-500 font-mono text-[11.5px]">{p.pid}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={cn(
                      'font-bold',
                      p.cpu_usage > 20 ? 'text-danger' : p.cpu_usage > 5 ? 'text-warning' : 'text-slate-500 dark:text-slate-400',
                    )}>
                      {formatPercent(p.cpu_usage)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">
                    {formatBytes(p.memory)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => handleKill(p)}
                      disabled={killing === p.pid}
                      className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-500 transition-all disabled:opacity-50"
                      title="Prozess beenden"
                    >
                      <X size={14} />
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
