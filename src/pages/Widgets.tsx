import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Plus, RotateCcw } from 'lucide-react'
import WidgetWrapper from '@/components/widgets/WidgetWrapper'
import ClockWidget from '@/components/widgets/ClockWidget'
import SystemStatsWidget from '@/components/widgets/SystemStatsWidget'
import QuickActionsWidget from '@/components/widgets/QuickActionsWidget'
import WeatherWidget from '@/components/widgets/WeatherWidget'
import { useWidgetLayout, type WidgetId } from '@/hooks/useWidgetLayout'
import { cn } from '@/lib/utils'

const WIDGET_META: Record<WidgetId, { title: string; emoji: string }> = {
  'clock':         { title: 'Uhrzeit',       emoji: '🕐' },
  'system-stats':  { title: 'System',        emoji: '📊' },
  'quick-actions': { title: 'Schnellzugriff',emoji: '⚡' },
  'weather':       { title: 'Wetter',        emoji: '🌤️' },
}

function renderWidget(id: WidgetId) {
  switch (id) {
    case 'clock':         return <ClockWidget />
    case 'system-stats':  return <SystemStatsWidget />
    case 'quick-actions': return <QuickActionsWidget />
    case 'weather':       return <WeatherWidget />
  }
}

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
}

export default function Widgets() {
  const { layout, removeWidget, addWidget, resetLayout, availableToAdd } = useWidgetLayout()

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="p-8 max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <LayoutDashboard size={18} className="text-accent" />
            <h1 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              Widgets
            </h1>
          </div>
          <p className="text-[14px] text-slate-400 dark:text-slate-500">
            Dein persönliches Dashboard — Widgets hinzufügen oder entfernen
          </p>
        </div>

        <div className="flex items-center gap-2">
          {availableToAdd.map((id) => (
            <button
              key={id}
              onClick={() => addWidget(id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-border/60 bg-white/60 dark:bg-white/[0.03] text-slate-500 hover:text-accent hover:border-accent/40 transition-all"
            >
              <Plus size={12} />
              {WIDGET_META[id].emoji} {WIDGET_META[id].title}
            </button>
          ))}
          <button
            onClick={resetLayout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-border/50 bg-white/60 dark:bg-white/[0.03] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
            title="Layout zurücksetzen"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Widget Grid */}
      {layout.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <LayoutDashboard size={32} className="opacity-30" />
          <p className="text-[13px]">Keine Widgets aktiv</p>
          <p className="text-[12px] text-slate-300 dark:text-slate-600">
            Füge oben Widgets hinzu
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-2 gap-4 auto-rows-[200px]">
            {layout.map((id) => {
              const meta = WIDGET_META[id]
              return (
                <WidgetWrapper
                  key={id}
                  title={meta.title}
                  onRemove={() => removeWidget(id)}
                >
                  {renderWidget(id)}
                </WidgetWrapper>
              )
            })}
          </div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
