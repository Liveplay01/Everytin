import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Download, RotateCcw, ExternalLink, AlertTriangle } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-shell'
import { cn } from '@/lib/utils'
import { toast } from '@/components/shared/Toast'
import type { UpdateEntry } from '@/types/updates'

function severityBadge(s: string) {
  switch (s) {
    case 'critical': return 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
    case 'important': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
    case 'moderate': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
    default: return 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-border/60'
  }
}

function formatBytes(b: number) {
  if (b === 0) return '—'
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function Updates() {
  const queryClient = useQueryClient()
  const [installing, setInstalling] = useState<string | null>(null)

  useEffect(() => {
    let unW: (() => void) | undefined
    let unWin: (() => void) | undefined

    listen('cache://winget-ready', () => {
      queryClient.invalidateQueries({ queryKey: ['winget-updates'] })
    }).then((fn) => { unW = fn })

    listen('cache://windows-updates-ready', () => {
      queryClient.invalidateQueries({ queryKey: ['windows-updates'] })
    }).then((fn) => { unWin = fn })

    return () => { unW?.(); unWin?.() }
  }, [queryClient])

  const {
    data: winUpdates = [],
    isLoading: loadingWin,
    isFetching: fetchingWin,
    refetch: refetchWin,
  } = useQuery<UpdateEntry[]>({
    queryKey: ['windows-updates'],
    queryFn: () => invoke('scan_windows_updates'),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: appUpdates = [],
    isLoading: loadingApps,
    isFetching: fetchingApps,
    refetch: refetchApps,
  } = useQuery<UpdateEntry[]>({
    queryKey: ['winget-updates'],
    queryFn: () => invoke('scan_winget_updates'),
    staleTime: 5 * 60 * 1000,
  })

  const installMutation = useMutation({
    mutationFn: (packageId: string) =>
      invoke<boolean>('install_winget_update', { packageId }),
    onSuccess: (_ok, packageId) => {
      toast.success(`Update installiert: ${packageId}`)
      queryClient.invalidateQueries({ queryKey: ['winget-updates'] })
    },
    onError: (err, packageId) => {
      toast.error(`Update fehlgeschlagen: ${packageId} — ${err}`)
    },
    onSettled: () => setInstalling(null),
  })

  function handleInstallApp(id: string) {
    setInstalling(id)
    installMutation.mutate(id)
  }

  const criticalCount = winUpdates.filter((u) => u.severity === 'critical').length

  return (
    <div className="p-8 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[24px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Updates</h1>
        <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Windows-Updates und App-Aktualisierungen im Überblick</p>
      </motion.div>

      {/* Windows Updates */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl shadow-card border border-border/70 dark:border-white/[0.04] overflow-hidden mb-6"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 dark:border-white/[0.04]">
          <div>
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Windows-Updates</h2>
            {!loadingWin && (
              <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold">
                {winUpdates.length === 0
                  ? 'Kein Update ausstehend'
                  : `${winUpdates.length} Update${winUpdates.length > 1 ? 's' : ''} verfügbar${criticalCount > 0 ? ` — ${criticalCount} kritisch` : ''}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {winUpdates.length > 0 && (
              <button
                onClick={() => open('ms-settings:windowsupdate').catch(() => null)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-600 text-white rounded-xl text-[12px] font-bold transition-all duration-150 shadow-sm"
              >
                <ExternalLink size={13} />
                In Windows öffnen
              </button>
            )}
            <button
              onClick={() => refetchWin()}
              disabled={fetchingWin}
              className="w-8.5 h-8.5 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition-colors disabled:opacity-40"
              title="Neu laden"
            >
              <RefreshCw size={14} className={fetchingWin ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loadingWin ? (
          <div className="px-5 py-10 text-center text-[13px] text-slate-400 dark:text-slate-500">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-accent" />
            Windows Update wird abgefragt… (kann bis zu 30 s dauern)
          </div>
        ) : winUpdates.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-slate-400 dark:text-slate-500 font-medium">
            Alles aktuell — keine ausstehenden Updates.
          </div>
        ) : (
          <div className="divide-y divide-border/60 dark:divide-white/[0.04] max-h-[300px] overflow-y-auto">
            {winUpdates.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md capitalize', severityBadge(u.severity))}>
                      {u.severity}
                    </span>
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{u.title}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                    {u.kb_number && (
                      <span className="font-mono bg-slate-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded">KB{u.kb_number}</span>
                    )}
                    {u.size_bytes != null && u.size_bytes > 0 && (
                      <span>{formatBytes(u.size_bytes)}</span>
                    )}
                    {u.reboot_required && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <RotateCcw size={11} /> Neustart erforderlich
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div className="px-5 py-3.5 bg-slate-100/30 dark:bg-white/[0.01]">
              <button
                onClick={() => open('ms-settings:windowsupdate').catch(() => null)}
                className="flex items-center gap-1.5 text-[12px] text-accent dark:text-[#A5B4FC] font-bold hover:underline"
              >
                <ExternalLink size={12} /> Alle Updates in Windows-Einstellungen installieren
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* App Updates (winget) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl shadow-card border border-border/70 dark:border-white/[0.04] overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 dark:border-white/[0.04]">
          <div>
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">App-Updates</h2>
            {!loadingApps && (
              <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold">
                {appUpdates.length === 0
                  ? 'Alle Apps aktuell'
                  : `${appUpdates.length} App${appUpdates.length > 1 ? 's' : ''} können aktualisiert werden`}
              </p>
            )}
          </div>
          <button
            onClick={() => refetchApps()}
            disabled={fetchingApps}
            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition-colors disabled:opacity-40"
            title="Neu laden"
          >
            <RefreshCw size={14} className={fetchingApps ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingApps ? (
          <div className="px-5 py-10 text-center text-[13px] text-slate-400 dark:text-slate-500">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-accent" />
            App-Updates werden abgefragt…
          </div>
        ) : appUpdates.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-slate-400 dark:text-slate-500 font-medium">
            Alle installierten Apps sind aktuell.
          </div>
        ) : (
          <div className="divide-y divide-border/60 dark:divide-white/[0.04] max-h-[300px] overflow-y-auto">
            {appUpdates.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100 truncate">{u.title}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 font-medium">{u.id}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleInstallApp(u.id)}
                  disabled={installing === u.id || installMutation.isPending}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-all',
                    installing === u.id
                      ? 'bg-accent/25 text-accent dark:bg-[#8B5CF6]/20 dark:text-[#A5B4FC] cursor-wait'
                      : 'bg-accent text-white hover:bg-accent-600',
                    'disabled:opacity-50',
                  )}
                >
                  {installing === u.id ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  Update
                </motion.button>
              </div>
            ))}
            <div className="px-5 py-3.5 bg-slate-100/30 dark:bg-white/[0.01]">
              <p className="text-[11.5px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-2">
                <AlertTriangle size={13} className="text-amber-500" />
                Updates werden im Hintergrund über winget installiert. Das Fenster bleibt dabei offen.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
