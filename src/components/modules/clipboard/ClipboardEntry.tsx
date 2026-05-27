import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Pin, PinOff, Code, Link, Image, FileText, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import type { ClipboardEntry as Entry } from '@/types/clipboard'

interface ClipboardEntryProps {
  entry: Entry
  onPin: (id: number, pinned: boolean) => void
}

const TYPE_ICONS = {
  text: FileText,
  image: Image,
  code: Code,
  url: Link,
}

const TYPE_LABELS = {
  text: 'Text',
  image: 'Bild',
  code: 'Code',
  url: 'URL',
}

const TYPE_COLORS = {
  text:  'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400',
  image: 'bg-pink-50 dark:bg-pink-950/30 text-pink-500 dark:text-pink-400',
  code:  'bg-violet-50 dark:bg-violet-950/30 text-violet-500 dark:text-violet-400',
  url:   'bg-blue-50 dark:bg-blue-950/30 text-blue-500 dark:text-blue-400',
}

export default function ClipboardEntryCard({ entry, onPin }: ClipboardEntryProps) {
  const [copied, setCopied] = useState(false)
  const Icon = TYPE_ICONS[entry.type]

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(entry.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const preview = entry.type === 'image'
    ? '[Bild]'
    : entry.content.length > 120
      ? entry.content.slice(0, 120) + '…'
      : entry.content

  const timeAgo = formatDistanceToNow(new Date(entry.created_at), {
    addSuffix: true,
    locale: de,
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        'group relative flex gap-3 p-4 rounded-xl border transition-all cursor-pointer',
        'bg-white/60 dark:bg-white/[0.02] border-border/50 hover:border-border hover:shadow-sm',
        entry.pinned && 'border-accent/30 dark:border-accent/20 bg-accent/[0.02]',
      )}
      onClick={handleCopy}
    >
      {/* Type icon */}
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', TYPE_COLORS[entry.type])}>
        <Icon size={14} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={cn(
          'text-[12px] leading-relaxed break-words',
          entry.type === 'code'
            ? 'font-mono text-slate-600 dark:text-slate-300'
            : 'text-slate-700 dark:text-slate-200',
        )}>
          {preview}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn('text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md', TYPE_COLORS[entry.type])}>
            {TYPE_LABELS[entry.type]}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{timeAgo}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy() }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent hover:bg-accent/10 transition-all"
          title="Kopieren"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onPin(entry.id, !entry.pinned) }}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
            entry.pinned
              ? 'text-accent bg-accent/10'
              : 'text-slate-400 hover:text-accent hover:bg-accent/10',
          )}
          title={entry.pinned ? 'Entpinnen' : 'Pinnen'}
        >
          {entry.pinned ? <PinOff size={13} /> : <Pin size={13} />}
        </button>
      </div>
    </motion.div>
  )
}
