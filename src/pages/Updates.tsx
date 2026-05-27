import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Download, RotateCcw, ExternalLink, AlertTriangle } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'
import { cn } from '@/lib/utils'
import { toast } from '@/components/shared/Toast'
import type { UpdateEntry } from '@/types/updates'

function severityBadge(s: string) {
  switch (s) {
    case 'critical': return 'bg-red-100 text-red-700 border border-red-200'
    case 'important': return 'bg-amber-100 text-amber-700 border border-amber-200'
    case 'moderate': return 'bg-blue-100 text-blue-700 border border-blue-200'
    default: return 'bg-surface text-[#6B7280] border border-border'
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
        <h1 className="text-[24px] font-bold text-[#1A1A1A]">Updates</h1>
        <p className="text-[14px] text-[#6B7280] mt-0.5">Windows-Updates und App-Aktualisierungen im Überblick</p>
      </motion.div>

      {/* Windows Updates */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white rounded-xl shadow-card border border-border overflow-hidden mb-6"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Windows-Updates</h2>
            {!loadingWin && (
              <p className="text-[12px] text-[#9CA3AF] mt-0.5">
                {winUpdates.length === 0
                  ? 'Kein Update ausstehend'
                  : `${winUpdates.length} Update${winUpdates.length > 1 ? 's' : ''} verfügbar${criticalCount > 0 ? ` — ${criticalCount} kritisch` : ''}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {winUpdates.length > 0 && (
              <button
                onClick={() => open('ms-settings:windowsupdate').catch(() => null)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-[12px] font-medium hover:bg-accent/90 transition-colors"
              >
                <ExternalLink size={13} />
                In Windows öffnen
              </button>
            )}
            <button
              onClick={() => refetchWin()}
              disabled={fetchingWin}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-surface-2 transition-colors disabled:opacity-40"
              title="Neu laden"
            >
              <RefreshCw size={14} className={fetchingWin ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loadingWin ? (
          <div className="px-5 py-8 text-center text-[13px] text-[#9CA3AF]">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
            Windows Update wird abgefragt… (kann bis zu 30 s dauern)
          </div>
        ) : winUpdates.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-[#9CA3AF]">
            Alles aktuell — keine ausstehenden Updates.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {winUpdates.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded capitalize', severityBadge(u.severity))}>
                      {u.severity}
                    </span>
                    <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{u.title}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {u.kb_number && (
                      <span className="text-[11px] text-[#9CA3AF] font-mono">KB{u.kb_number}</span>
                    )}
                    {u.size_bytes != null && u.size_bytes > 0 && (
                      <span className="text-[11px] text-[#9CA3AF]">{formatBytes(u.size_bytes)}</span>
                    )}
                    {u.reboot_required && (
                      <span className="flex items-center gap-1 text-[11px] text-amber-600">
                        <RotateCcw size={10} /> Neustart erforderlich
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div className="px-5 py-3 bg-surface-2">
              <button
                onClick={() => open('ms-settings:windowsupdate').catch(() => null)}
                className="flex items-center gap-1.5 text-[12px] text-accent font-medium hover:underline"
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
        className="bg-white rounded-xl shadow-card border border-border overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1A1A1A]">App-Updates</h2>
            {!loadingApps && (
              <p className="text-[12px] text-[#9CA3AF] mt-0.5">
                {appUpdates.length === 0
                  ? 'Alle Apps aktuell'
                  : `${appUpdates.length} App${appUpdates.length > 1 ? 's' : ''} können aktualisiert werden`}
              </p>
            )}
          </div>
          <button
            onClick={() => refetchApps()}
            disabled={fetchingApps}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-surface-2 transition-colors disabled:opacity-40"
            title="Neu laden"
          >
            <RefreshCw size={14} className={fetchingApps ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingApps ? (
          <div className="px-5 py-8 text-center text-[13px] text-[#9CA3AF]">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
            App-Updates werden abgefragt…
          </div>
        ) : appUpdates.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-[#9CA3AF]">
            Alle installierten Apps sind aktuell.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {appUpdates.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{u.title}</p>
                  <p className="text-[11px] text-[#9CA3AF] font-mono">{u.id}</p>
                </div>
                <button
                  onClick={() => handleInstallApp(u.id)}
                  disabled={installing === u.id || installMutation.isPending}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                    installing === u.id
                      ? 'bg-accent/20 text-accent cursor-wait'
                      : 'bg-accent text-white hover:bg-accent/90',
                    'disabled:opacity-50',
                  )}
                >
                  {installing === u.id ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  Update
                </button>
              </div>
            ))}
            <div className="px-5 py-3 bg-surface-2">
              <p className="text-[11px] text-[#9CA3AF] flex items-center gap-1.5">
                <AlertTriangle size={11} />
                Updates werden im Hintergrund über winget installiert. Das Fenster bleibt dabei offen.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
