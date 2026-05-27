import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WidgetWrapperProps {
  title: string
  children: React.ReactNode
  onRemove?: () => void
  className?: string
  minHeight?: string
}

export default function WidgetWrapper({
  title,
  children,
  onRemove,
  className,
  minHeight = '160px',
}: WidgetWrapperProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative group bg-white/60 dark:bg-white/[0.02] backdrop-blur-md',
        'rounded-2xl border border-border/70 shadow-card p-4 flex flex-col',
        className,
      )}
      style={{ minHeight }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
          {title}
        </span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </motion.div>
  )
}
