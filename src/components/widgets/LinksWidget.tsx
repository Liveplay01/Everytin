import { useState, useEffect } from 'react'
import { open } from '@tauri-apps/plugin-shell'
import { Plus, X, Link as LinkIcon } from 'lucide-react'

interface LinkEntry { id: string; label: string; url: string }

const STORAGE_KEY = 'everytin_widget_links'

function loadLinks(): LinkEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as LinkEntry[]
  } catch {}
  return []
}

function saveLinks(links: LinkEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links))
}

export default function LinksWidget() {
  const [links, setLinks] = useState<LinkEntry[]>(loadLinks)
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  function add() {
    if (!label.trim() || !url.trim()) return
    const entry: LinkEntry = { id: Date.now().toString(), label: label.trim(), url: url.trim() }
    const next = [...links, entry]
    setLinks(next)
    saveLinks(next)
    setLabel('')
    setUrl('')
    setAdding(false)
  }

  function remove(id: string) {
    const next = links.filter((l) => l.id !== id)
    setLinks(next)
    saveLinks(next)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 dark:border-white/[0.04]">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <LinkIcon size={12} />
          Links
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
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Name"
            className="text-[11px] px-2 py-1 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 bg-transparent dark:text-slate-200"
          />
          <div className="flex gap-1">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="flex-1 text-[11px] px-2 py-1 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 bg-transparent dark:text-slate-200"
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <button
              onClick={add}
              className="px-2 py-1 rounded-md bg-accent text-white text-[10px] font-bold hover:bg-accent/90 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {links.length === 0 ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-4">
            Keine Links — klicke +
          </p>
        ) : (
          links.map((l) => (
            <div key={l.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors border-b border-border/30 dark:border-white/[0.03] last:border-0 group">
              <button
                onClick={() => open(l.url).catch(() => null)}
                className="flex-1 text-left text-[11.5px] text-accent dark:text-[#A5B4FC] truncate font-medium hover:underline"
              >
                {l.label}
              </button>
              <button
                onClick={() => remove(l.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:text-red-400 transition-all"
              >
                <X size={11} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
