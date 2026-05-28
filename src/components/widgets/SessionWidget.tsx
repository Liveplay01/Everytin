import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { History, Plus, Play, Trash2 } from 'lucide-react'
import { toast } from '@/components/shared/Toast'

interface Session {
  id: string
  label: string
  app_count: number
  created_at: string
}

export default function SessionWidget() {
  const qc = useQueryClient()
  const [label, setLabel] = useState('')

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['sessions-widget'],
    queryFn: () => invoke('list_sessions'),
  })

  const saveMutation = useMutation({
    mutationFn: (l: string) => invoke('save_session', { label: l }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions-widget'] })
      setLabel('')
      toast.success('Session gespeichert')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => invoke<number>('restore_session', { id }),
    onSuccess: (count) => toast.success(`${count} Apps gestartet`),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoke('delete_session', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions-widget'] }),
  })

  return (
    <div className="flex flex-col h-full">
      {/* Save row */}
      <div className="flex gap-1.5 px-2 pt-2 pb-1.5 border-b border-border/40 dark:border-white/[0.04]">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Session-Name…"
          className="flex-1 text-[11px] px-2 py-1 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 bg-transparent dark:text-slate-200"
          onKeyDown={(e) => e.key === 'Enter' && label.trim() && saveMutation.mutate(label.trim())}
        />
        <button
          onClick={() => label.trim() && saveMutation.mutate(label.trim())}
          disabled={!label.trim() || saveMutation.isPending}
          className="w-6 h-6 flex items-center justify-center rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-4">Keine Sessions</p>
        ) : (
          sessions.slice(0, 4).map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors border-b border-border/30 dark:border-white/[0.03] last:border-0">
              <History size={11} className="text-slate-400 flex-shrink-0" />
              <span className="flex-1 text-[11.5px] text-slate-700 dark:text-slate-200 truncate font-medium">{s.label}</span>
              <button
                onClick={() => restoreMutation.mutate(s.id)}
                disabled={restoreMutation.isPending}
                className="text-accent hover:text-accent/80 transition-colors"
              >
                <Play size={11} />
              </button>
              <button
                onClick={() => deleteMutation.mutate(s.id)}
                className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
