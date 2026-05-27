import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  color?: 'default' | 'success' | 'warning' | 'danger'
  progress?: number
  className?: string
}

const colorMap = {
  default: { bar: 'stroke-accent', text: 'text-accent', bg: 'bg-accent/10', border: 'border-l-accent' },
  success: { bar: 'stroke-success', text: 'text-success', bg: 'bg-success/10', border: 'border-l-success' },
  warning: { bar: 'stroke-warning', text: 'text-warning', bg: 'bg-warning/10', border: 'border-l-warning' },
  danger: { bar: 'stroke-danger', text: 'text-danger', bg: 'bg-danger/10', border: 'border-l-danger' },
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color = 'default',
  progress,
  className,
}: MetricCardProps) {
  const colors = colorMap[color]

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className={cn(
        'bg-white rounded-xl p-5 shadow-card border border-border transition-shadow hover:shadow-card-hover relative overflow-hidden',
        color !== 'default' && `border-l-2 ${colors.border}`,
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          {title}
        </span>
        {icon && (
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center',
            colors.bg,
            colors.text
          )}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="mb-1">
            <span className="text-[28px] font-bold text-[#1A1A1A] leading-none">
              {value}
            </span>
          </div>
          {subtitle && (
            <p className="text-[12px] text-[#9CA3AF] mb-1">{subtitle}</p>
          )}
        </div>

        {progress !== undefined && (
          <div className="relative w-[56px] h-[28px] mb-1">
            <svg viewBox="0 0 56 28" className="w-[56px] h-[28px]">
              {/* Background Arc */}
              <path
                d="M 4 28 A 24 24 0 0 1 52 28"
                fill="none"
                stroke="#F1F3F5"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Progress Arc */}
              <motion.path
                d="M 4 28 A 24 24 0 0 1 52 28"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                className={colors.bar}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: Math.min(100, Math.max(0, progress)) / 100 }}
                transition={{ type: 'spring', stiffness: 60, damping: 15 }}
              />
            </svg>
          </div>
        )}
      </div>
    </motion.div>
  )
}
