import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Trash2, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scanJunkFiles, cleanJunkFiles, boostSystem } from '@/lib/tauri'
import { formatBytes } from '@/lib/utils'
import { useSystemMetrics } from '@/hooks/useSystemMetrics'
import { cn } from '@/lib/utils'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
}

export default function Cleanup() {
  const { current } = useSystemMetrics()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [boostResult, setBoostResult] = useState<{ freed: number } | null>(null)
  const [cleanResult, setCleanResult] = useState<{ freed: number } | null>(null)

  const { data: cats, isLoading: scanning, refetch: rescan } = useQuery({
    queryKey: ['junk-scan'],
    queryFn: scanJunkFiles,
    staleTime: 60_000,
  })

  const boostMut = useMutation({
    mutationFn: boostSystem,
    onSuccess: (r) => {
      setBoostResult({ freed: r.ram_freed_bytes })
      queryClient.invalidateQueries({ queryKey: ['system-snapshot'] })
    },
  })

  const cleanMut = useMutation({
    mutationFn: () => cleanJunkFiles(Array.from(selected)),
    onSuccess: (r) => {
      setCleanResult({ freed: r.freed_bytes })
      setSelected(new Set())
      rescan()
    },
  })

  const totalJunk = cats?.reduce((s, c) => s + c.size_bytes, 0) ?? 0
  const selectedSize = cats
    ?.filter(c => selected.has(c.id) && !c.requires_elevation)
    .reduce((s, c) => s + c.size_bytes, 0) ?? 0

  const ramPct = current ? (current.ram_used / current.ram_total) * 100 : 0
  const selectableIds = cats?.filter(c => !c.requires_elevation).map(c => c.id) ?? []
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selected.has(id))

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <img src="/logo.jpg" alt="everytin" className="w-8 h-8 rounded-xl shadow-sm" />
          <h1 className="text-[24px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Cleanup & Boost</h1>
        </div>
        <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
          Gib Arbeitsspeicher frei und lösche Datenmüll, um deinen PC schnell zu halten
        </p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">

        {/* ── Boost Card ── */}
        <motion.div variants={item} className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl border border-border/70 dark:border-white/[0.04] shadow-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent dark:text-[#A5B4FC]">
                  <Zap size={15} />
                </div>
                <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Arbeitsspeicher optimieren</h2>
              </div>
              <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mb-5">
                Bereinigt RAM-Arbeitsbereiche im Hintergrund, um sofort Leistung freizugeben.
              </p>

              {/* RAM bar */}
              <div className="mb-2">
                <div className="flex justify-between text-[11px] font-semibold mb-1.5 uppercase tracking-wider">
                  <span className="text-slate-400 dark:text-slate-500">Auslastung RAM</span>
                  <span className={cn(
                    'font-bold',
                    ramPct > 80 ? 'text-danger' : ramPct > 60 ? 'text-warning' : 'text-success'
                  )}>
                    {Math.round(ramPct)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-200/50 dark:bg-white/[0.04] rounded-full overflow-hidden w-64">
                  <motion.div
                    className={cn('h-full rounded-full', ramPct > 80 ? 'bg-gradient-to-r from-red-500 to-rose-600' : ramPct > 60 ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500')}
                    animate={{ width: `${ramPct}%` }}
                    transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                  />
                </div>
              </div>

              <AnimatePresence>
                {boostResult && !boostMut.isPending && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 mt-4 text-[12.5px] text-emerald-600 dark:text-emerald-400 font-bold"
                  >
                    <CheckCircle2 size={14} />
                    {boostResult.freed > 1024 * 1024
                      ? `${formatBytes(boostResult.freed)} Arbeitsspeicher erfolgreich freigegeben`
                      : 'Arbeitsspeicher bereits optimal bereinigt'}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              onClick={() => { setBoostResult(null); boostMut.mutate() }}
              disabled={boostMut.isPending}
              whileHover={!boostMut.isPending ? { scale: 1.03, y: -1 } : {}}
              whileTap={!boostMut.isPending ? { scale: 0.97 } : {}}
              className={cn(
                'flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-bold transition-all duration-150',
                boostMut.isPending
                  ? 'bg-slate-200/50 dark:bg-white/[0.04] text-slate-400 dark:text-slate-600'
                  : 'bg-accent text-white hover:bg-accent-600 shadow-sm hover:shadow-[0_4px_12px_rgba(79,70,229,0.2)]'
              )}
            >
              {boostMut.isPending
                ? <><Loader2 size={14} className="animate-spin" />Optimieren…</>
                : <><Zap size={14} />Boost</>
              }
            </motion.button>
          </div>
        </motion.div>

        {/* ── Junk Files Card ── */}
        <motion.div variants={item} className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl border border-border/70 dark:border-white/[0.04] shadow-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Trash2 size={15} />
                </div>
                <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Datenmüll (Junk-Dateien)</h2>
              </div>
              <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
                {scanning
                  ? 'Festplatte wird gescannt…'
                  : totalJunk > 0
                    ? `${formatBytes(totalJunk)} an unnötigen Systemdateien gefunden`
                    : 'Dein PC ist sauber!'
                }
              </p>
            </div>

            {!scanning && totalJunk > 0 && (
              <motion.button
                onClick={() => cleanMut.mutate()}
                disabled={selected.size === 0 || cleanMut.isPending}
                whileHover={selected.size > 0 && !cleanMut.isPending ? { scale: 1.03, y: -1 } : {}}
                whileTap={selected.size > 0 && !cleanMut.isPending ? { scale: 0.97 } : {}}
                className={cn(
                  'flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-bold transition-all duration-150',
                  selected.size === 0 || cleanMut.isPending
                    ? 'bg-slate-200/50 dark:bg-white/[0.04] text-slate-400 dark:text-slate-600'
                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm hover:shadow-[0_4px_12px_rgba(245,158,11,0.2)]'
                )}
              >
                {cleanMut.isPending
                  ? <><Loader2 size={14} className="animate-spin" />Löschen…</>
                  : <><Trash2 size={14} />{selected.size > 0 ? `Lösche ${formatBytes(selectedSize)}` : 'Wähle Dateien'}</>
                }
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {cleanResult && !cleanMut.isPending && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[12.5px] text-emerald-700 dark:text-emerald-400 font-semibold"
              >
                <CheckCircle2 size={14} />
                Erfolgreich {formatBytes(cleanResult.freed)} gelöscht
              </motion.div>
            )}
          </AnimatePresence>

          {scanning ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-slate-400 dark:text-slate-500">
              <Loader2 size={15} className="animate-spin" />
              Verzeichnisse werden analysiert…
            </div>
          ) : cats && cats.length > 0 ? (
            <>
              <div className="space-y-0.5 max-h-[300px] overflow-y-auto pr-1">
                {cats.map(cat => (
                  <motion.label
                    key={cat.id}
                    whileHover={!cat.requires_elevation ? { x: 2 } : {}}
                    className={cn(
                      'flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-150',
                      cat.requires_elevation
                        ? 'opacity-40 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.03]',
                      selected.has(cat.id) && 'bg-accent/5 dark:bg-[#8B5CF6]/5 border-l-2 border-accent'
                    )}
                  >
                    <input
                      type="checkbox"
                      disabled={cat.requires_elevation}
                      checked={selected.has(cat.id)}
                      onChange={() => {
                        const n = new Set(selected)
                        n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id)
                        setSelected(n)
                      }}
                      className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{cat.name}</span>
                        {cat.requires_elevation && (
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{cat.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-[13px] font-extrabold text-slate-800 dark:text-slate-200">{formatBytes(cat.size_bytes)}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{cat.file_count.toLocaleString()} Dateien</p>
                    </div>
                  </motion.label>
                ))}
              </div>

              <div className="pt-3 mt-3 border-t border-border/60 dark:border-white/[0.04] flex items-center justify-between">
                <button
                  onClick={() => setSelected(allSelected ? new Set() : new Set(selectableIds))}
                  className="text-[11.5px] font-bold text-accent dark:text-[#A5B4FC] hover:underline"
                >
                  {allSelected ? 'Alle abwählen' : 'Alle auswählen (Benutzer-Ebene)'}
                </button>
              </div>
            </>
          ) : (
            <div className="py-10 text-center">
              <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
              <p className="text-[13px] text-slate-400 dark:text-slate-500">Dein PC ist bereits vollständig optimiert!</p>
            </div>
          )}
        </motion.div>

        {/* Admin note */}
        <motion.div variants={item} className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[12.5px] text-blue-700 dark:text-blue-400">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-blue-500" />
          <span>
            Als <strong>Admin</strong> markierte Kategorien erfordern erhöhte Rechte. Die UAC-Rechteverwaltung wird in einem zukünftigen Update integriert.
          </span>
        </motion.div>

      </motion.div>
    </div>
  )
}
