import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Play,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRules, toggleRule, runRuleNow, getAlerts } from '@/lib/tauri'
import type { Rule, Alert } from '@/types/automation'
import { cn } from '@/lib/utils'
import { toast } from '@/components/shared/Toast'

const ACTION_LABELS: Record<string, string> = {
  cleanup: 'Junk Cleanup',
  ram_boost: 'RAM-Boost',
  update_scan: 'Update-Suche',
  driver_scan: 'Treiber-Scan',
  install_updates: 'Updates installieren',
}

const TRIGGER_LABELS: Record<string, (cfg: Record<string, unknown>) => string> = {
  schedule: (cfg) => {
    const h = cfg.interval_hours as number | undefined
    if (!h) return 'Geplant'
    if (h === 24) return 'Täglich'
    if (h === 168) return 'Wöchentlich'
    return `Alle ${h}h`
  },
  on_startup: () => 'Beim Start',
  on_idle: () => 'Bei Inaktivität',
  on_shutdown: () => 'Beim Herunterfahren',
}

const SEVERITY_CONFIG = {
  success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
  error:   { icon: XCircle,       color: 'text-red-500',   bg: 'bg-red-50' },
  info:    { icon: Info,           color: 'text-blue-500',  bg: 'bg-blue-50' },
}

function RuleCard({ rule }: { rule: Rule }) {
  const qc = useQueryClient()
  const [running, setRunning] = useState(false)

  const toggleMutation = useMutation({
    mutationFn: ({ enabled }: { enabled: boolean }) => toggleRule(rule.id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  })

  const runMutation = useMutation({
    mutationFn: () => runRuleNow(rule.id),
    onMutate: () => setRunning(true),
    onSettled: () => setRunning(false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      toast.success(`${ACTION_LABELS[rule.action_type] ?? rule.action_type} gestartet`)
    },
    onError: (e: unknown) => toast.error(String(e)),
  })

  const triggerLabel = TRIGGER_LABELS[rule.trigger_type]?.(rule.trigger_config as Record<string, unknown>) ?? rule.trigger_type

  return (
    <div className={cn(
      'flex items-center gap-4 px-5 py-4 rounded-xl border transition-colors',
      rule.enabled ? 'bg-white border-border' : 'bg-[#F9FAFB] border-border opacity-60',
    )}>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-[#1A1A1A]">{rule.name}</p>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          {ACTION_LABELS[rule.action_type] ?? rule.action_type} · {triggerLabel}
          {rule.last_run && (
            <span className="ml-2 text-[#9CA3AF]">
              · Zuletzt: {new Date(rule.last_run).toLocaleDateString('de-DE')}
            </span>
          )}
          {rule.run_count > 0 && (
            <span className="ml-2 text-[#9CA3AF]">· {rule.run_count}x ausgeführt</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => runMutation.mutate()}
          disabled={running}
          title="Jetzt ausführen"
          className="p-1.5 rounded-lg text-[#6B7280] hover:text-accent hover:bg-accent-50 transition-colors disabled:opacity-50"
        >
          {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
        </button>
        <button
          onClick={() => toggleMutation.mutate({ enabled: !rule.enabled })}
          className={cn(
            'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
            rule.enabled ? 'bg-accent' : 'bg-[#E5E7EB]',
            toggleMutation.isPending && 'opacity-50',
          )}
        >
          <span className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition duration-200',
            rule.enabled ? 'translate-x-4' : 'translate-x-0',
          )} />
        </button>
      </div>
    </div>
  )
}

function AlertRow({ alert }: { alert: Alert }) {
  const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info
  const Icon = cfg.icon
  const time = new Date(alert.created_at)

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className={cn('p-1.5 rounded-lg mt-0.5 flex-shrink-0', cfg.bg)}>
        <Icon size={13} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#1A1A1A]">{alert.title}</p>
        <p className="text-[12px] text-[#6B7280] mt-0.5">{alert.body}</p>
      </div>
      <time className="text-[11px] text-[#9CA3AF] flex-shrink-0 flex items-center gap-1 mt-0.5">
        <Clock size={11} />
        {time.toLocaleDateString('de-DE')} {time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
      </time>
    </div>
  )
}

export default function Automation() {
  const { data: rules = [], isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ['rules'],
    queryFn: getRules,
  })

  const { data: alerts = [], isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => getAlerts(20),
    refetchInterval: 30_000,
  })

  return (
    <div className="p-8 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-[#1A1A1A]">Automation</h1>
            <p className="text-[14px] text-[#6B7280] mt-0.5">Everytin arbeitet automatisch im Hintergrund</p>
          </div>
          <button
            onClick={() => { refetchRules(); refetchAlerts() }}
            className="p-2 rounded-lg text-[#6B7280] hover:text-accent hover:bg-accent-50 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </motion.div>

      {/* Rules */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-accent" />
          <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Automatisierungsregeln</h2>
          {!rulesLoading && (
            <span className="ml-auto text-[12px] text-[#9CA3AF]">
              {rules.filter((r) => r.enabled).length} / {rules.length} aktiv
            </span>
          )}
        </div>

        {rulesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[#F1F3F5] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 text-[#9CA3AF] text-[14px]">
            Keine Regeln vorhanden
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {rules.map((rule) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  <RuleCard rule={rule} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-card border border-border overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Letzte Aktivitäten</h2>
        </div>
        <div className="px-6">
          {alertsLoading ? (
            <div className="py-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-[#F1F3F5] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#9CA3AF]">
              Noch keine Aktivitäten aufgezeichnet
            </p>
          ) : (
            <div>
              {alerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
