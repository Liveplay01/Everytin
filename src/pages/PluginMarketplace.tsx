import { motion } from 'framer-motion'
import { Puzzle, Power, Trash2, ExternalLink } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listPlugins, setPluginEnabled, uninstallPlugin } from '@/lib/tauri'
import { cn } from '@/lib/utils'

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
}

export default function PluginMarketplace() {
  const queryClient = useQueryClient()

  const { data: plugins = [], isLoading } = useQuery({
    queryKey: ['plugins'],
    queryFn: listPlugins,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      setPluginEnabled(id, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plugins'] }),
  })

  const uninstallMutation = useMutation({
    mutationFn: (id: string) => uninstallPlugin(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plugins'] }),
  })

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="p-8 max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <Puzzle size={18} className="text-accent" />
          <h1 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
            Plugins
          </h1>
        </div>
        <p className="text-[14px] text-slate-400 dark:text-slate-500">
          Installierte Erweiterungen verwalten
        </p>
      </div>

      {/* Plugin directory info */}
      <div className="bg-accent/5 dark:bg-accent/10 border border-accent/20 rounded-2xl p-5 mb-6">
        <h2 className="text-[11px] font-bold text-accent uppercase tracking-widest mb-2">
          Plugin installieren
        </h2>
        <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Platziere Plugin-Ordner mit einer <code className="font-mono bg-slate-100 dark:bg-white/10 px-1 rounded">manifest.json</code> in:<br />
          <code className="font-mono text-accent text-[11px]">%APPDATA%\everytin\plugins\</code>
        </p>
        <a
          href="https://github.com/affaan-m/ECC"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-[12px] text-accent font-semibold hover:underline"
        >
          Plugin-Dokumentation <ExternalLink size={11} />
        </a>
      </div>

      {/* Installed plugins */}
      {isLoading ? (
        <p className="text-[13px] text-slate-400 text-center py-8">Lade Plugins…</p>
      ) : plugins.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Puzzle size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-[13px]">Keine Plugins installiert</p>
          <p className="text-[12px] mt-1 text-slate-300 dark:text-slate-600">
            Füge Plugin-Ordner in das Plugins-Verzeichnis ein
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="bg-white/60 dark:bg-white/[0.02] rounded-xl border border-border/50 p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 dark:bg-accent/15 flex items-center justify-center flex-shrink-0">
                <Puzzle size={18} className="text-accent dark:text-[#A5B4FC]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                    {plugin.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">v{plugin.version}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{plugin.description}</div>
                <div className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">
                  von {plugin.author}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleMutation.mutate({ id: plugin.id, enabled: !plugin.enabled })}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                    plugin.enabled
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30'
                      : 'bg-slate-100 dark:bg-white/[0.05] text-slate-400 border border-border/50 hover:border-border',
                  )}
                >
                  <Power size={12} />
                  {plugin.enabled ? 'Aktiv' : 'Inaktiv'}
                </button>
                <button
                  onClick={() => uninstallMutation.mutate(plugin.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                  title="Deinstallieren"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
