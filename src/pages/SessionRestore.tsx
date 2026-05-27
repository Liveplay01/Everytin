import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { History, Save, Play, Trash2, Monitor } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { listSessions, saveSession, restoreSession, deleteSession } from '@/lib/tauri'

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
}

export default function SessionRestore() {
  const [label, setLabel] = useState('')
  const [restoredCount, setRestoredCount] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: listSessions,
  })

  const saveMutation = useMutation({
    mutationFn: () => saveSession(label || `Session ${new Date().toLocaleString('de')}`),
    onSuccess: () => {
      setLabel('')
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreSession(id),
    onSuccess: (count) => {
      setRestoredCount(count)
      setTimeout(() => setRestoredCount(null), 3000)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  })

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
            <History size={18} className="text-accent" />
            <h1 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              Session Restore
            </h1>
          </div>
          <p className="text-[14px] text-slate-400 dark:text-slate-500">
            Arbeitsumgebungen speichern und wiederherstellen
          </p>
        </div>
      </div>

      {/* Save new session */}
      <div className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl border border-border/70 p-5 mb-6">
        <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
          Aktuelle Session speichern
        </h2>
        <div className="flex gap-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Session-Name (optional)"
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-white/[0.05] border border-border/60 text-[13px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all"
          />
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-[13px] font-semibold transition-all disabled:opacity-60 shadow-sm"
          >
            <Save size={14} />
            Speichern
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2.5">
          Alle aktuell geöffneten Programme werden erfasst
        </p>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {restoredCount !== null && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30 text-[13px] text-emerald-600 dark:text-emerald-400 font-semibold"
          >
            {restoredCount} App{restoredCount !== 1 ? 's' : ''} erfolgreich gestartet
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved sessions */}
      <div>
        <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">
          Gespeicherte Sessions
        </h2>

        {isLoading ? (
          <p className="text-[13px] text-slate-400 text-center py-8">Lade Sessions…</p>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <History size={28} className="mx-auto mb-3 opacity-30" />
            <p className="text-[13px]">Noch keine Sessions gespeichert</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {sessions.map((session) => (
                <motion.div
                  key={session.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="bg-white/60 dark:bg-white/[0.02] rounded-xl border border-border/50 p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 dark:bg-accent/15 flex items-center justify-center flex-shrink-0">
                    <Monitor size={18} className="text-accent dark:text-[#A5B4FC]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {session.label}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {session.apps.length} App{session.apps.length !== 1 ? 's' : ''} ·{' '}
                      {formatDistanceToNow(new Date(session.created_at), { addSuffix: true, locale: de })}
                    </div>
                    <div className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5 truncate">
                      {session.apps.slice(0, 4).map((a) => a.name).join(', ')}
                      {session.apps.length > 4 && ` +${session.apps.length - 4} weitere`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => restoreMutation.mutate(session.id)}
                      disabled={restoreMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-accent/10 dark:bg-accent/15 text-accent dark:text-[#A5B4FC] hover:bg-accent/20 transition-all disabled:opacity-60"
                    >
                      <Play size={12} />
                      Restore
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(session.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}
