import { cn } from '@/lib/utils'

type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface StatusBadgeProps {
  status: StatusType
  label: string
  dot?: boolean
  className?: string
}

const styles: Record<StatusType, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-[#F1F3F5] text-[#6B7280] border-[#E9ECEF]',
}

const dotStyles: Record<StatusType, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-[#9CA3AF]',
}

export default function StatusBadge({
  status,
  label,
  dot = true,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold border',
        styles[status],
        className,
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotStyles[status])} />
      )}
      {label}
    </span>
  )
}
