import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getCurrentMode } from '@/lib/tauri'
import { getModeById } from '@/types/smart_modes'
import { cn } from '@/lib/utils'

export default function ModeWidget() {
  const { data } = useQuery({
    queryKey: ['smart-mode'],
    queryFn: getCurrentMode,
    refetchInterval: 15_000,
    staleTime: 10_000,
  })

  if (!data) return null

  const mode = getModeById(data.mode)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'mx-3 mb-2 px-3 py-2 rounded-xl border flex items-center gap-2.5 transition-all',
        mode.color,
      )}
      title={data.reason}
    >
      <span className="text-[14px] leading-none flex-shrink-0">{mode.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold leading-tight truncate">{mode.label} Mode</div>
        <div className="text-[9px] opacity-70 truncate leading-tight mt-0.5">
          {Math.round(data.confidence * 100)}% Konfidenz
        </div>
      </div>
    </motion.div>
  )
}
