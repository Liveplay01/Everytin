import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CommandDef } from './commandRegistry'

interface CommandItemProps {
  command: CommandDef
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
}

const CATEGORY_BADGE: Record<string, string> = {
  navigation: 'Seite',
  action: 'Aktion',
}

export default function CommandItem({ command, isSelected, onSelect, onHover }: CommandItemProps) {
  const Icon = command.icon

  return (
    <motion.button
      onMouseEnter={onHover}
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg mx-2',
        'outline-none select-none cursor-pointer',
        isSelected
          ? 'bg-accent/10 dark:bg-[#8B5CF6]/15'
          : 'hover:bg-slate-100/80 dark:hover:bg-white/[0.04]',
      )}
      style={{ width: 'calc(100% - 16px)' }}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
          isSelected
            ? 'bg-accent/15 dark:bg-[#8B5CF6]/20'
            : 'bg-slate-100 dark:bg-white/[0.06]',
        )}
      >
        <Icon
          size={15}
          className={cn(
            'transition-colors',
            isSelected ? 'text-accent dark:text-[#A5B4FC]' : 'text-slate-500 dark:text-slate-400',
          )}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className={cn(
          'text-[13px] font-semibold leading-tight',
          isSelected ? 'text-accent dark:text-[#A5B4FC]' : 'text-slate-800 dark:text-slate-100',
        )}>
          {command.title}
        </div>
        {command.description && (
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
            {command.description}
          </div>
        )}
      </div>

      {/* Badge + shortcut */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn(
          'text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wide',
          command.category === 'navigation'
            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400'
            : 'bg-violet-50 dark:bg-violet-950/40 text-violet-500 dark:text-violet-400',
        )}>
          {CATEGORY_BADGE[command.category]}
        </span>
        {isSelected && (
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-500 border border-border/50">
            ↩
          </kbd>
        )}
      </div>
    </motion.button>
  )
}
