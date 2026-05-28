import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-shell'
import {
  Shield, CheckCircle, XCircle, RefreshCw, ExternalLink,
  Lock, Wifi, HardDrive, AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SecurityStatus } from '@/types/security'

function AnimatedScore({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 80, damping: 20 })
  const rounded = useTransform(spring, Math.round)
  useEffect(() => { spring.set(value) }, [value, spring])
  return <motion.span>{rounded}</motion.span>
}

function scoreColor(s: number) {
  if (s >= 80) return '#10B981'
  if (s >= 50) return '#F59E0B'
  return '#EF4444'
}

function scoreLabel(s: number) {
  if (s >= 80) return 'Gut geschützt'
  if (s >= 50) return 'Verbesserbar'
  return 'Risiko vorhanden'
}

interface CheckRowProps {
  label: string
  detail?: string
  ok: boolean
  fixLabel?: string
  fixUrl?: string
  icon: React.ReactNode
}

function CheckRow({ label, detail, ok, fixLabel, fixUrl, icon }: CheckRowProps) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-colors border-b border-border/60 dark:border-white/[0.04] last:border-0">
      <div className={cn(
        'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold',
        ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500 dark:text-red-400',
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{label}</p>
        {detail && <p className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">{detail}</p>}
      </div>
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {ok ? (
          <CheckCircle size={17} className="text-emerald-500" />
        ) : (
          <>
            <XCircle size={17} className="text-red-400" />
            {fixLabel && fixUrl && (
              <button
                onClick={() => open(fixUrl).catch(() => null)}
                className="flex items-center gap-1 text-[12px] text-accent dark:text-[#A5B4FC] font-bold hover:underline"
              >
                {fixLabel} <ExternalLink size={11} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function Security() {
  const queryClient = useQueryClient()
  const { data, isLoading, isFetching, refetch } = useQuery<SecurityStatus>({
    queryKey: ['security-status'],
    queryFn: () => invoke('get_security_status'),
    staleTime: 2 * 60 * 1000,
  })

  useEffect(() => {
    let unlisten: (() => void) | undefined
    listen('cache://security-ready', () => {
      queryClient.invalidateQueries({ queryKey: ['security-status'] })
    }).then((fn) => { unlisten = fn })
    return () => { unlisten?.() }
  }, [queryClient])

  const score = data?.score ?? 0

  return (
    <div className="p-8 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[24px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Sicherheit</h1>
        <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Übersicht über den Sicherheitsstatus deines PCs</p>
      </motion.div>

      {/* Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="flex items-center gap-6 bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl px-6 py-5 shadow-card border border-border/70 dark:border-white/[0.04] mb-6"
      >
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-border)" strokeWidth="3.5" opacity="0.3" />
            <motion.circle
              cx="18" cy="18" r="14" fill="none"
              stroke={scoreColor(score)}
              strokeWidth="3.5"
              strokeLinecap="round"
              initial={{ strokeDasharray: '0 87.96' }}
              animate={{ strokeDasharray: `${(score / 100) * 87.96} 87.96` }}
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold text-slate-800 dark:text-slate-100">
            {isLoading ? '—' : <AnimatedScore value={score} />}
          </span>
        </div>

        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-accent" /> Sicherheits-Score
          </p>
          <p className="text-[20px] font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
            {isLoading ? 'Wird geladen…' : scoreLabel(score)}
          </p>
          {data && data.issues.length > 0 && (
            <p className="text-[12px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
              {data.issues.length} Problem{data.issues.length > 1 ? 'e' : ''} gefunden
            </p>
          )}
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-8.5 h-8.5 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </motion.div>

      {/* Issues Banner */}
      {data && data.issues.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 mb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-red-500" />
            <p className="text-[13.5px] font-bold text-red-700 dark:text-red-400">Probleme gefunden</p>
          </div>
          <ul className="space-y-1">
            {data.issues.map((issue, i) => (
              <li key={i} className="text-[12px] text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 dark:bg-red-500 flex-shrink-0" />
                {issue}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Check List */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl shadow-card border border-border/70 dark:border-white/[0.04] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border/60 dark:border-white/[0.04]">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Sicherheitsprüfung</h2>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-center text-[13px] text-slate-400 dark:text-slate-500">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-accent" />
            Wird abgefragt…
          </div>
        ) : data ? (
          <>
            <CheckRow
              icon={<Shield size={16} />}
              label="Windows Defender aktiviert"
              detail={data.defender_enabled ? 'Schutz läuft' : 'Defender ist nicht aktiv'}
              ok={data.defender_enabled}
              fixLabel="Öffnen"
              fixUrl="windowsdefender:"
            />
            <CheckRow
              icon={<Shield size={16} />}
              label="Echtzeitschutz aktiv"
              detail={data.defender_realtime ? 'Dateien werden in Echtzeit überwacht' : 'Echtzeitschutz ist deaktiviert'}
              ok={data.defender_realtime}
              fixLabel="Öffnen"
              fixUrl="windowsdefender:"
            />
            <CheckRow
              icon={<RefreshCw size={16} />}
              label="Defender-Signaturen aktuell"
              detail={data.defender_last_scan ? `Letzter Scan: ${data.defender_last_scan}` : 'Kein Scan-Datum verfügbar'}
              ok={data.defender_up_to_date}
              fixLabel="Aktualisieren"
              fixUrl="windowsdefender://threat"
            />
            <CheckRow
              icon={<Wifi size={16} />}
              label="Firewall aktiv (Alle Profile)"
              detail={
                data.firewall_domain && data.firewall_private && data.firewall_public
                  ? 'Domain, Privat und Öffentlich aktiv'
                  : `Inaktiv: ${[!data.firewall_domain && 'Domain', !data.firewall_private && 'Privat', !data.firewall_public && 'Öffentlich'].filter(Boolean).join(', ')}`
              }
              ok={data.firewall_domain && data.firewall_private && data.firewall_public}
              fixLabel="Öffnen"
              fixUrl="ms-settings:windowsdefender"
            />
            <CheckRow
              icon={<Lock size={16} />}
              label="BitLocker-Laufwerksverschlüsselung"
              detail={data.bitlocker_protected ? 'Laufwerk C: ist verschlüsselt' : 'Laufwerk C: ist nicht verschlüsselt'}
              ok={data.bitlocker_protected}
              fixLabel="Einrichten"
              fixUrl="ms-settings:deviceencryption"
            />
            <CheckRow
              icon={<ShieldCheck size={16} />}
              label="Benutzerkontensteuerung (UAC)"
              detail={data.uac_enabled ? 'UAC ist aktiv' : 'UAC ist deaktiviert — Sicherheitsrisiko'}
              ok={data.uac_enabled}
              fixLabel="Öffnen"
              fixUrl="ms-settings:privacy-general"
            />
            <CheckRow
              icon={<HardDrive size={16} />}
              label="Automatische Windows-Updates"
              detail={data.auto_update_enabled ? 'Updates werden automatisch installiert' : 'Automatische Updates sind deaktiviert'}
              ok={data.auto_update_enabled}
              fixLabel="Öffnen"
              fixUrl="ms-settings:windowsupdate"
            />
          </>
        ) : null}
      </motion.div>
    </div>
  )
}
