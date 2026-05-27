import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import {
  RefreshCw, AlertTriangle, RotateCcw, X, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/shared/Toast'
import type { ServiceEntry, ServiceActionResult } from '@/types/services'

type Filter = 'all' | 'recommended' | 'Gaming' | 'Telemetrie' | 'Optional' | 'Fernzugriff' | 'Drucken'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'recommended', label: 'Empfohlen zu deaktivieren' },
  { key: 'Gaming', label: 'Gaming' },
  { key: 'Telemetrie', label: 'Telemetrie' },
  { key: 'Optional', label: 'Optional' },
  { key: 'Fernzugriff', label: 'Fernzugriff' },
]

const categoryColors: Record<string, string> = {
  Gaming: 'bg-purple-100 text-purple-700',
  Telemetrie: 'bg-amber-100 text-amber-700',
  Optional: 'bg-blue-100 text-blue-700',
  Fernzugriff: 'bg-red-100 text-red-700',
  Drucken: 'bg-emerald-100 text-emerald-700',
  Netzwerk: 'bg-sky-100 text-sky-700',
  System: 'bg-[#F1F3F5] text-[#6B7280]',
}

function statusDot(status: string) {
  if (status === 'Running') return 'bg-emerald-500'
  if (status === 'Stopped') return 'bg-[#D1D5DB]'
  return 'bg-amber-400'
}

interface UndoItem {
  name: string
  display_name: string
  prevStartType: string
}

export default function Services() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('recommended')
  const [undoStack, setUndoStack] = useState<UndoItem[]>([])
  const [elevationWarning, setElevationWarning] = useState(false)
  const [expandedReason, setExpandedReason] = useState<string | null>(null)

  const { data: services = [], isLoading, isFetching, refetch } = useQuery<ServiceEntry[]>({
    queryKey: ['services'],
    queryFn: () => invoke('get_services'),
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: (vars: { name: string; startType: string; previousStartType: string }) =>
      invoke<ServiceActionResult>('set_service_start_type', {
        name: vars.name,
        startType: vars.startType,
        previousStartType: vars.previousStartType,
      }),
    onSuccess: (result, vars) => {
      if (result.success) {
        toast.success(`${vars.name}: ${result.message}`)
        queryClient.invalidateQueries({ queryKey: ['services'] })
      } else {
        toast.error(`${vars.name}: ${result.message}`)
      }
    },
    onError: (err: unknown) => {
      const msg = String(err)
      if (msg.includes('ElevationRequired')) {
        setElevationWarning(true)
      } else {
        toast.error(`Fehler: ${msg}`)
      }
    },
  })

  const handleDisable = useCallback((svc: ServiceEntry) => {
    setUndoStack((prev) => [
      ...prev,
      { name: svc.name, display_name: svc.display_name, prevStartType: svc.start_type },
    ])
    mutation.mutate({ name: svc.name, startType: 'Disabled', previousStartType: svc.start_type })
  }, [mutation])

  const handleEnable = useCallback((svc: ServiceEntry) => {
    mutation.mutate({ name: svc.name, startType: 'Manual', previousStartType: svc.start_type })
  }, [mutation])

  const handleUndo = useCallback(() => {
    const item = undoStack[undoStack.length - 1]
    if (!item) return
    setUndoStack((prev) => prev.slice(0, -1))
    mutation.mutate({ name: item.name, startType: item.prevStartType, previousStartType: 'Disabled' })
  }, [undoStack, mutation])

  const filtered = services.filter((s) => {
    if (filter === 'all') return true
    if (filter === 'recommended') return s.safe_to_disable && s.start_type !== 'Disabled'
    return s.category === filter
  })

  const recommendedCount = services.filter((s) => s.safe_to_disable && s.start_type !== 'Disabled').length
  const disabledCount = services.filter((s) => s.start_type === 'Disabled').length

  return (
    <div className="p-8 max-w-5xl pb-24">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[24px] font-bold text-[#1A1A1A]">Windows-Dienste</h1>
        <p className="text-[14px] text-[#6B7280] mt-0.5">Unnötige Hintergrunddienste deaktivieren für mehr Leistung</p>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
        className="grid grid-cols-3 gap-4 mb-6"
      >
        {[
          { label: 'Gesamt', value: services.length },
          { label: 'Deaktivierbar', value: recommendedCount, color: 'text-amber-600' },
          { label: 'Deaktiviert', value: disabledCount, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl px-5 py-4 shadow-card border border-border">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[#9CA3AF]">{label}</p>
            <p className={cn('text-[24px] font-bold mt-1', color ?? 'text-[#1A1A1A]')}>{isLoading ? '—' : value}</p>
          </div>
        ))}
      </motion.div>

      {/* Warning banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 mb-6"
      >
        <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-amber-800">
          Änderungen können jederzeit rückgängig gemacht werden. Deaktiviere nur Dienste aus der Kategorie <strong>"Empfohlen zu deaktivieren"</strong>. Systemdienste nicht anfassen.
        </p>
      </motion.div>

      {/* Elevation warning */}
      <AnimatePresence>
        {elevationWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 mb-6"
          >
            <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-red-700">Administratorrechte erforderlich</p>
              <p className="text-[12px] text-red-600 mt-0.5">Dieser Dienst erfordert erhöhte Rechte. Starte everytin als Administrator.</p>
            </div>
            <button onClick={() => setElevationWarning(false)}><X size={14} className="text-red-400" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Bar + Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="bg-white rounded-xl shadow-card border border-border overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-4 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                  filter === key ? 'bg-accent text-white' : 'text-[#6B7280] hover:bg-surface-2',
                )}
              >
                {label}
                {key === 'recommended' && recommendedCount > 0 && (
                  <span className={cn('ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full', filter === key ? 'bg-white/20' : 'bg-amber-100 text-amber-700')}>
                    {recommendedCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-surface-2 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>

        {isLoading ? (
          <div className="px-5 py-12 text-center text-[13px] text-[#9CA3AF]">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
            Dienste werden geladen…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-[#9CA3AF]">Keine Dienste in dieser Kategorie.</div>
        ) : (
          <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
            {filtered.map((svc) => (
              <div key={svc.name}>
                <div className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusDot(svc.status))} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{svc.display_name}</p>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', categoryColors[svc.category] ?? 'bg-surface text-[#6B7280]')}>
                        {svc.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] font-mono">{svc.name} · {svc.start_type}</p>
                    {svc.reason && (
                      <button
                        onClick={() => setExpandedReason(expandedReason === svc.name ? null : svc.name)}
                        className="flex items-center gap-1 text-[11px] text-accent mt-0.5"
                      >
                        <ChevronDown size={11} className={cn('transition-transform', expandedReason === svc.name && 'rotate-180')} />
                        Warum deaktivieren?
                      </button>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {svc.start_type === 'Disabled' ? (
                      <button
                        onClick={() => handleEnable(svc)}
                        disabled={mutation.isPending}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border text-[#6B7280] hover:bg-surface-2 transition-colors disabled:opacity-40"
                      >
                        Aktivieren
                      </button>
                    ) : svc.safe_to_disable ? (
                      <button
                        onClick={() => handleDisable(svc)}
                        disabled={mutation.isPending}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40"
                      >
                        Deaktivieren
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#9CA3AF]">Systemdienst</span>
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {expandedReason === svc.name && svc.reason && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-10 pb-3 text-[12px] text-[#6B7280]">{svc.reason}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Undo Sticky Footer */}
      <AnimatePresence>
        {undoStack.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#1A1A1A] text-white px-5 py-3 rounded-xl shadow-xl z-40"
          >
            <RotateCcw size={14} />
            <span className="text-[13px]">
              <strong>{undoStack[undoStack.length - 1].display_name}</strong> deaktiviert
            </span>
            <button
              onClick={handleUndo}
              className="ml-2 text-[12px] font-semibold bg-white text-[#1A1A1A] px-3 py-1 rounded-lg hover:bg-white/90 transition-colors"
            >
              Rückgängig
            </button>
            <button onClick={() => setUndoStack([])} className="text-white/50 hover:text-white ml-1">
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
