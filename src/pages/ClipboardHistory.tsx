import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Search, Trash2, Pin } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClipboardHistory, clearClipboardHistory, pinClipboardEntry } from '@/lib/tauri'
import ClipboardEntryCard from '@/components/modules/clipboard/ClipboardEntry'

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
}

export default function ClipboardHistory() {
  const [search, setSearch] = useState('')
  const [showPinned, setShowPinned] = useState(false)
  const queryClient = useQueryClient()

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['clipboard-history'],
    queryFn: () => getClipboardHistory(100),
    refetchInterval: 3000,
  })

  const clearMutation = useMutation({
    mutationFn: clearClipboardHistory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clipboard-history'] }),
  })

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: number; pinned: boolean }) =>
      pinClipboardEntry(id, pinned),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clipboard-history'] }),
  })

  const filtered = entries.filter((e) => {
    if (showPinned && !e.pinned) return false
    if (!search) return true
    return e.content.toLowerCase().includes(search.toLowerCase())
  })

  const pinned = filtered.filter((e) => e.pinned)
  const unpinned = filtered.filter((e) => !e.pinned)

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="p-8 max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <ClipboardList size={18} className="text-accent" />
            <h1 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              Zwischenablage
            </h1>
          </div>
          <p className="text-[14px] text-slate-400 dark:text-slate-500">
            Deine letzten {entries.length} kopierten Inhalte
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPinned((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
              showPinned
                ? 'bg-accent/10 border-accent/30 text-accent dark:text-[#A5B4FC]'
                : 'bg-white/60 dark:bg-white/[0.03] border-border/50 text-slate-500 hover:border-border'
            }`}
          >
            <Pin size={12} />
            Gepinnt
          </button>
          <button
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-red-200/50 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all bg-white/60 dark:bg-white/[0.02]"
          >
            <Trash2 size={12} />
            Leeren
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Verlauf durchsuchen…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/60 dark:bg-white/[0.03] border border-border/60 text-[13px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all"
        />
      </div>

      {/* Entries */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-[13px]">Lade Verlauf…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-[13px]">Noch nichts kopiert</p>
          <p className="text-[12px] mt-1 text-slate-300 dark:text-slate-600">
            Kopiere etwas und es erscheint hier
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {pinned.length > 0 && (
            <div>
              <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                Gepinnt
              </h2>
              <AnimatePresence>
                <div className="space-y-2">
                  {pinned.map((e) => (
                    <ClipboardEntryCard
                      key={e.id}
                      entry={e}
                      onPin={(id, p) => pinMutation.mutate({ id, pinned: p })}
                    />
                  ))}
                </div>
              </AnimatePresence>
            </div>
          )}

          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                  Verlauf
                </h2>
              )}
              <AnimatePresence>
                <div className="space-y-2">
                  {unpinned.map((e) => (
                    <ClipboardEntryCard
                      key={e.id}
                      entry={e}
                      onPin={(id, p) => pinMutation.mutate({ id, pinned: p })}
                    />
                  ))}
                </div>
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
