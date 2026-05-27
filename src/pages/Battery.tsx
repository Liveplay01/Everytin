import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { BatteryCharging, Battery as BatteryIconLucide, BatteryFull, BatteryLow, BatteryMedium, RefreshCw, Zap } from 'lucide-react'
import { getBatteryInfo } from '@/lib/tauri'
import { cn } from '@/lib/utils'

function BatteryIcon({ pct, charging, size = 32 }: { pct: number; charging: boolean; size?: number }) {
  if (charging) return <BatteryCharging size={size} className="text-emerald-500" />
  if (pct > 80) return <BatteryFull size={size} className="text-emerald-500" />
  if (pct > 40) return <BatteryMedium size={size} className="text-amber-500" />
  if (pct > 20) return <BatteryLow size={size} className="text-orange-500" />
  return <BatteryIconLucide size={size} className="text-red-500" />
}

function batteryColor(pct: number) {
  if (pct > 80) return '#10B981'
  if (pct > 40) return '#F59E0B'
  if (pct > 20) return '#F97316'
  return '#EF4444'
}

function formatMinutes(min: number | null) {
  if (!min) return null
  if (min < 60) return `${min} Min.`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatMwh(mwh: number | null) {
  if (!mwh) return '—'
  return `${(mwh / 1000).toFixed(1)} Wh`
}

export default function Battery() {
  const { data: battery, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['battery'],
    queryFn: getBatteryInfo,
    refetchInterval: 30_000,
  })

  const hasNoBattery = !isLoading && !battery

  return (
    <div className="p-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Akku</h1>
            <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Akkustand, Gesundheit und Kapazitätsdaten</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-accent dark:hover:text-[#A5B4FC] hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all disabled:opacity-40"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-48 bg-slate-200/50 dark:bg-white/[0.03] rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-200/50 dark:bg-white/[0.03] rounded-2xl animate-pulse" />
        </div>
      ) : hasNoBattery ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <BatteryFull size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
          <p className="text-[16px] font-bold text-slate-500 dark:text-slate-400">Kein Akku erkannt</p>
          <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-1">Dieses Gerät hat keinen eingebauten Akku.</p>
        </motion.div>
      ) : battery ? (
        <div className="space-y-4">
          {/* Main charge card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl shadow-card border border-border/70 dark:border-white/[0.04] px-8 py-8"
          >
            <div className="flex items-center gap-6">
              <BatteryIcon pct={battery.charge_percent} charging={battery.is_charging} size={48} />
              <div className="flex-1">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-[48px] font-extrabold leading-none text-slate-800 dark:text-slate-100 tracking-tight">
                    {Math.round(battery.charge_percent)}
                  </span>
                  <span className="text-[20px] font-bold text-slate-500 dark:text-slate-400 mb-1">%</span>
                  {battery.is_charging && (
                    <span className="flex items-center gap-1 text-[13px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 ml-2">
                      <Zap size={14} /> Lädt
                    </span>
                  )}
                </div>
                {/* Charge bar */}
                <div className="h-3 bg-slate-200/50 dark:bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: batteryColor(battery.charge_percent) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${battery.charge_percent}%` }}
                    transition={{ type: 'spring', stiffness: 60, damping: 20 }}
                  />
                </div>
                {!battery.is_charging && battery.estimated_minutes_remaining && (
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-2 font-semibold">
                    Verbleibend: <strong>{formatMinutes(battery.estimated_minutes_remaining)}</strong>
                  </p>
                )}
                {battery.is_charging && battery.estimated_minutes_remaining && (
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-2 font-semibold">
                    Vollgeladen in: <strong>{formatMinutes(battery.estimated_minutes_remaining)}</strong>
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Health + Capacity */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl shadow-card border border-border/70 dark:border-white/[0.04] overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border/60 dark:border-white/[0.04]">
              <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Akku-Gesundheit</h2>
            </div>
            <div className="divide-y divide-border/60 dark:divide-white/[0.04]">
              {battery.health_percent != null && (
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Gesundheit</p>
                    <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Verbleibende Ladekapazität im Vergleich zum Neuzustand</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-24 h-2 bg-slate-200/50 dark:bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${battery.health_percent}%`,
                          backgroundColor: battery.health_percent > 80 ? '#10B981' : battery.health_percent > 60 ? '#F59E0B' : '#EF4444',
                        }}
                      />
                    </div>
                    <span className={cn(
                      'text-[15px] font-extrabold w-12 text-right',
                      battery.health_percent > 80 ? 'text-emerald-600 dark:text-emerald-400' :
                      battery.health_percent > 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400',
                    )}>
                      {Math.round(battery.health_percent)}%
                    </span>
                  </div>
                </div>
              )}
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Vollladungskapazität</p>
                  <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Aktuelle maximale Kapazität des Akkus</p>
                </div>
                <span className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100">
                  {formatMwh(battery.full_charge_capacity_mwh)}
                </span>
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Ursprüngliche Kapazität</p>
                  <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Kapazität laut Hersteller (Neuzustand)</p>
                </div>
                <span className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100">
                  {formatMwh(battery.design_capacity_mwh)}
                </span>
              </div>
            </div>
          </motion.div>

          {battery.health_percent != null && battery.health_percent < 80 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-3.5"
            >
              <BatteryLow size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-amber-800 dark:text-amber-400 font-semibold leading-relaxed">
                Die Akkugesundheit liegt unter 80 %. Der Akku hält weniger lang als im Neuzustand.
                Erwäge einen Akku-Austausch beim Hersteller oder einem autorisierten Fachbetrieb.
              </p>
            </motion.div>
          )}
        </div>
      ) : null}
    </div>
  )
}
