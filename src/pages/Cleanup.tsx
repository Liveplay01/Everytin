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
          <img src="/logo.png" alt="everytin" className="w-8 h-8 rounded-xl" />
          <h1 className="text-[24px] font-bold text-[#1A1A1A]">Cleanup & Boost</h1>
        </div>
        <p className="text-[14px] text-[#6B7280]">
          Free up RAM and remove junk files to keep your PC fast
        </p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">

        {/* ── Boost Card ── */}
        <motion.div variants={item} className="bg-white rounded-2xl border border-border shadow-card p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Zap size={14} className="text-accent" />
                </div>
                <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Memory Boost</h2>
              </div>
              <p className="text-[13px] text-[#6B7280] mb-5">
                Trims process working sets to instantly free up RAM
              </p>

              {/* RAM bar */}
              <div className="mb-2">
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="text-[#9CA3AF]">RAM Usage</span>
                  <span className={cn(
                    'font-semibold',
                    ramPct > 80 ? 'text-danger' : ramPct > 60 ? 'text-warning' : 'text-success'
                  )}>
                    {Math.round(ramPct)}%
                  </span>
                </div>
                <div className="h-2 bg-[#F1F3F5] rounded-full overflow-hidden w-56">
                  <motion.div
                    className={cn('h-full rounded-full', ramPct > 80 ? 'bg-danger' : ramPct > 60 ? 'bg-warning' : 'bg-success')}
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
                    className="flex items-center gap-1.5 mt-3 text-[12.5px] text-emerald-600 font-medium"
                  >
                    <CheckCircle2 size={13} />
                    {boostResult.freed > 1024 * 1024
                      ? `Freed ${formatBytes(boostResult.freed)} of RAM`
                      : 'Memory already optimized'}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              onClick={() => { setBoostResult(null); boostMut.mutate() }}
              disabled={boostMut.isPending}
              whileHover={!boostMut.isPending ? { scale: 1.04 } : {}}
              whileTap={!boostMut.isPending ? { scale: 0.96 } : {}}
              className={cn(
                'flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-colors',
                boostMut.isPending
                  ? 'bg-[#F1F3F5] text-[#9CA3AF]'
                  : 'bg-accent text-white hover:bg-accent-600 shadow-sm'
              )}
            >
              {boostMut.isPending
                ? <><Loader2 size={14} className="animate-spin" />Boosting…</>
                : <><Zap size={14} />Boost</>
              }
            </motion.button>
          </div>
        </motion.div>

        {/* ── Junk Files Card ── */}
        <motion.div variants={item} className="bg-white rounded-2xl border border-border shadow-card p-6">
          <div className="flex items-start justify-between gap-6 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Trash2 size={14} className="text-amber-600" />
                </div>
                <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Junk Files</h2>
              </div>
              <p className="text-[13px] text-[#6B7280]">
                {scanning
                  ? 'Scanning your drive…'
                  : totalJunk > 0
                    ? `${formatBytes(totalJunk)} of unnecessary files found`
                    : 'Your PC is clean!'
                }
              </p>
            </div>

            {!scanning && totalJunk > 0 && (
              <motion.button
                onClick={() => cleanMut.mutate()}
                disabled={selected.size === 0 || cleanMut.isPending}
                whileHover={selected.size > 0 && !cleanMut.isPending ? { scale: 1.04 } : {}}
                whileTap={selected.size > 0 && !cleanMut.isPending ? { scale: 0.96 } : {}}
                className={cn(
                  'flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-colors',
                  selected.size === 0 || cleanMut.isPending
                    ? 'bg-[#F1F3F5] text-[#9CA3AF]'
                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                )}
              >
                {cleanMut.isPending
                  ? <><Loader2 size={14} className="animate-spin" />Cleaning…</>
                  : <><Trash2 size={14} />{selected.size > 0 ? `Clean ${formatBytes(selectedSize)}` : 'Select files'}</>
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
                className="mb-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[13px] text-emerald-700 font-medium"
              >
                <CheckCircle2 size={14} />
                Cleaned {formatBytes(cleanResult.freed)} successfully
              </motion.div>
            )}
          </AnimatePresence>

          {scanning ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#9CA3AF]">
              <Loader2 size={16} className="animate-spin" />
              Scanning directories…
            </div>
          ) : cats && cats.length > 0 ? (
            <>
              <div className="space-y-0.5">
                {cats.map(cat => (
                  <motion.label
                    key={cat.id}
                    whileHover={!cat.requires_elevation ? { x: 1 } : {}}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors',
                      cat.requires_elevation
                        ? 'opacity-45 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-[#F8F9FA]',
                      selected.has(cat.id) && 'bg-accent-50'
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
                      className="w-3.5 h-3.5 rounded accent-accent"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-medium text-[#1A1A1A]">{cat.name}</span>
                        {cat.requires_elevation && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-semibold border border-amber-100">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-[#9CA3AF] truncate">{cat.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[13px] font-semibold text-[#374151]">{formatBytes(cat.size_bytes)}</p>
                      <p className="text-[11px] text-[#9CA3AF]">{cat.file_count.toLocaleString()} files</p>
                    </div>
                  </motion.label>
                ))}
              </div>

              <div className="pt-3 mt-2 border-t border-border">
                <button
                  onClick={() => setSelected(allSelected ? new Set() : new Set(selectableIds))}
                  className="text-[12px] text-accent font-medium hover:underline"
                >
                  {allSelected ? 'Deselect all' : 'Select all (user-level)'}
                </button>
              </div>
            </>
          ) : (
            <div className="py-10 text-center">
              <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-400" />
              <p className="text-[13px] text-[#9CA3AF]">Your PC is already clean!</p>
            </div>
          )}
        </motion.div>

        {/* Admin note */}
        <motion.div variants={item} className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-[12.5px] text-blue-700">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span>
            Files marked <strong>Admin</strong> require elevated privileges.
            UAC elevation support will be added in a future update.
          </span>
        </motion.div>

      </motion.div>
    </div>
  )
}
