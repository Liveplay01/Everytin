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
  default: {
    gradId: 'grad-default',
    from: '#4F46E5',
    to: '#8B5CF6',
    text: 'text-[#4F46E5] dark:text-[#A5B4FC]',
    bg: 'bg-gradient-to-br from-[#4F46E5]/10 to-[#8B5CF6]/10',
    shadow: 'hover:shadow-[0_8px_30px_rgba(99,102,241,0.12)]',
    border: 'hover:border-[#4F46E5]/30'
  },
  success: {
    gradId: 'grad-success',
    from: '#10B981',
    to: '#06B6D4',
    text: 'text-[#10B981] dark:text-[#34D399]',
    bg: 'bg-gradient-to-br from-[#10B981]/10 to-[#06B6D4]/10',
    shadow: 'hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)]',
    border: 'hover:border-[#10B981]/30'
  },
  warning: {
    gradId: 'grad-warning',
    from: '#F59E0B',
    to: '#EF4444',
    text: 'text-[#F59E0B] dark:text-[#FBBF24]',
    bg: 'bg-gradient-to-br from-[#F59E0B]/10 to-[#EF4444]/10',
    shadow: 'hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)]',
    border: 'hover:border-[#F59E0B]/30'
  },
  danger: {
    gradId: 'grad-danger',
    from: '#EF4444',
    to: '#EC4899',
    text: 'text-[#EF4444] dark:text-[#F87171]',
    bg: 'bg-gradient-to-br from-[#EF4444]/10 to-[#EC4899]/10',
    shadow: 'hover:shadow-[0_8px_30px_rgba(239,68,68,0.12)]',
    border: 'hover:border-[#EF4444]/30'
  },
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
      whileHover={{ y: -3, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'relative overflow-hidden rounded-2xl p-5 transition-colors duration-200',
        'bg-white/60 dark:bg-white/[0.02] backdrop-blur-md',
        'border border-border/70 dark:border-white/[0.04]',
        colors.shadow,
        colors.border,
        className
      )}
    >
      {/* Visual background reflection */}
      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-md pointer-events-none -z-10" />

      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] dark:text-slate-500">
          {title}
        </span>
        {icon && (
          <div className={cn(
            'w-7.5 h-7.5 rounded-xl flex items-center justify-center shadow-sm backdrop-blur-sm',
            colors.bg,
            colors.text
          )}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div className="min-w-0">
          <div className="mb-0.5">
            <span className="text-[26px] font-extrabold text-[#0F172A] dark:text-slate-100 leading-none tracking-tight">
              {value}
            </span>
          </div>
          {subtitle && (
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate" title={subtitle}>
              {subtitle}
            </p>
          )}
        </div>

        {progress !== undefined && (
          <div className="relative w-[56px] h-[28px] mb-1 flex-shrink-0">
            <svg viewBox="0 0 56 28" className="w-[56px] h-[28px]">
              <defs>
                <linearGradient id={colors.gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={colors.from} />
                  <stop offset="100%" stopColor={colors.to} />
                </linearGradient>
              </defs>
              {/* Background Arc */}
              <path
                d="M 4 28 A 24 24 0 0 1 52 28"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="4.5"
                strokeLinecap="round"
                opacity="0.3"
              />
              {/* Progress Arc */}
              <motion.path
                d="M 4 28 A 24 24 0 0 1 52 28"
                fill="none"
                stroke={`url(#${colors.gradId})`}
                strokeWidth="4.5"
                strokeLinecap="round"
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
