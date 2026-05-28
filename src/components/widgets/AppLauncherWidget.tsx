import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { Plus, X, Rocket } from 'lucide-react'
import { toast } from '@/components/shared/Toast'

interface AppEntry { id: string; name: string; path: string }

const STORAGE_KEY = 'everytin_widget_launchers'

function loadApps(): AppEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AppEntry[]
  } catch {}
  return []
}

function saveApps(apps: AppEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))
}

export default function AppLauncherWidget() {
  const [apps, setApps] = useState<AppEntry[]>(loadApps)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [path, setPath] = useState('')

  async function browsePath() {
    const selected = await open({ multiple: false, filters: [{ name: 'Executables', extensions: ['exe', 'bat', 'cmd'] }] }).catch(() => null)
    if (selected && typeof selected === 'string') {
      setPath(selected)
      if (!name) {
        const parts = selected.replace(/\\/g, '/').split('/')
        setName(parts[parts.length - 1].replace(/\.(exe|bat|cmd)$/i, ''))
      }
    }
  }

  function add() {
    if (!name.trim() || !path.trim()) return
    const entry: AppEntry = { id: Date.now().toString(), name: name.trim(), path: path.trim() }
    const next = [...apps, entry]
    setApps(next)
    saveApps(next)
    setName('')
    setPath('')
    setAdding(false)
  }

  function remove(id: string) {
    const next = apps.filter((a) => a.id !== id)
    setApps(next)
    saveApps(next)
  }

  async function launch(appEntry: AppEntry) {
    try {
      await invoke('launch_app', { path: appEntry.path })
    } catch (e) {
      toast.error(`Konnte ${appEntry.name} nicht starten`)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 dark:border-white/[0.04]">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <Rocket size={12} />
          App-Starter
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="w-5 h-5 flex items-center justify-center rounded-md text-slate-400 hover:text-accent hover:bg-accent/10 transition-colors"
        >
          {adding ? <X size={12} /> : <Plus size={12} />}
        </button>
      </div>

      {adding && (
        <div className="flex flex-col gap-1 px-2 py-2 border-b border-border/40 dark:border-white/[0.04]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="text-[11px] px-2 py-1 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 bg-transparent dark:text-slate-200"
          />
          <div className="flex gap-1">
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="Pfad zur .exe…"
              className="flex-1 text-[11px] px-2 py-1 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 bg-transparent dark:text-slate-200 font-mono"
            />
            <button
              onClick={browsePath}
              className="px-2 py-1 rounded-md border border-border text-[10px] font-bold text-slate-500 hover:border-accent/40 transition-colors"
            >
              …
            </button>
          </div>
          <button
            onClick={add}
            className="w-full py-1 rounded-md bg-accent text-white text-[11px] font-bold hover:bg-accent/90 transition-colors"
          >
            Hinzufügen
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {apps.length === 0 ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-4">
            Keine Apps — klicke +
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-2">
            {apps.map((a) => (
              <div key={a.id} className="relative group">
                <button
                  onClick={() => launch(a)}
                  className="w-full flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border border-border/60 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] hover:bg-white/90 dark:hover:bg-white/[0.05] hover:border-accent/40 transition-all text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                >
                  <Rocket size={16} className="text-accent" />
                  <span className="truncate w-full text-center px-1">{a.name}</span>
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-400 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <X size={9} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
