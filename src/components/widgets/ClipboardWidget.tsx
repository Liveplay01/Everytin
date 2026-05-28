import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { ClipboardList, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClipboardEntry {
  id: string
  content: string
  content_type: string
  created_at: string
  pinned: boolean
}

export default function ClipboardWidget() {
  const [expanded, setExpanded] = useState(false)

  const { data: entries = [] } = useQuery<ClipboardEntry[]>({
    queryKey: ['clipboard-widget'],
    queryFn: () => invoke('get_clipboard_history', { limit: expanded ? 30 : 5 }),
    refetchInterval: 3000,
  })

  async function copyToClipboard(text: string) {
    try { await navigator.clipboard.writeText(text) } catch {}
  }

  const displayed = entries.slice(0, expanded ? 30 : 5)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 dark:border-white/[0.04]">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <ClipboardList size={12} />
          Zwischenablage
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[10px] text-accent dark:text-[#A5B4FC] font-semibold flex items-center gap-0.5 hover:underline"
        >
          {expanded ? 'Weniger' : 'Alle'}
          <ChevronDown size={11} className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>

      <div className={cn('flex-1 overflow-y-auto', expanded && 'max-h-[400px]')}>
        {displayed.length === 0 ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-4">Leer</p>
        ) : (
          displayed.map((e) => (
            <button
              key={e.id}
              onClick={() => copyToClipboard(e.content)}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors border-b border-border/30 dark:border-white/[0.03] last:border-0"
            >
              <p className="text-[11.5px] text-slate-700 dark:text-slate-200 truncate font-medium">
                {e.content}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
