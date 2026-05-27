import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'
import { RefreshCw, AlertTriangle, Search, ShieldAlert, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DriverEntry } from '@/types/drivers'

type Filter = 'all' | 'unsigned' | 'outdated'

const CLASS_COLORS: Record<string, string> = {
  Display: 'bg-purple-100 text-purple-700',
  Net: 'bg-blue-100 text-blue-700',
  DiskDrive: 'bg-emerald-100 text-emerald-700',
  USB: 'bg-amber-100 text-amber-700',
  Audio: 'bg-pink-100 text-pink-700',
  System: 'bg-[#F1F3F5] text-[#6B7280]',
  Processor: 'bg-red-100 text-red-700',
}

function classColor(cls: string) {
  return CLASS_COLORS[cls] ?? 'bg-[#F1F3F5] text-[#6B7280]'
}

function formatAge(days: number) {
  if (days === 0) return '—'
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}

export default function Drivers() {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  const { data: drivers = [], isLoading, isFetching, refetch } = useQuery<DriverEntry[]>({
    queryKey: ['drivers'],
    queryFn: () => invoke('get_drivers'),
    staleTime: 5 * 60 * 1000,
  })

  const unsignedCount = drivers.filter((d) => !d.is_signed).length
  const outdatedCount = drivers.filter((d) => d.potentially_outdated).length

  const filtered = drivers.filter((d) => {
    const matchFilter =
      filter === 'all' ||
      (filter === 'unsigned' && !d.is_signed) ||
      (filter === 'outdated' && d.potentially_outdated)
    const matchSearch =
      !search ||
      d.device_name.toLowerCase().includes(search.toLowerCase()) ||
      d.manufacturer.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="p-8 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[24px] font-bold text-[#1A1A1A]">Treiber</h1>
        <p className="text-[14px] text-[#6B7280] mt-0.5">Übersicht aller installierten Treiber — veraltete und unsignierte erkennen</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
        className="grid grid-cols-3 gap-4 mb-6"
      >
        {[
          { label: 'Treiber gesamt', value: drivers.length },
          { label: 'Unsigniert', value: unsignedCount, color: unsignedCount > 0 ? 'text-red-500' : 'text-[#1A1A1A]' },
          { label: 'Mögl. veraltet (>2 J.)', value: outdatedCount, color: outdatedCount > 0 ? 'text-amber-600' : 'text-[#1A1A1A]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl px-5 py-4 shadow-card border border-border">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[#9CA3AF]">{label}</p>
            <p className={cn('text-[24px] font-bold mt-1', color ?? 'text-[#1A1A1A]')}>{isLoading ? '—' : value}</p>
          </div>
        ))}
      </motion.div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3.5 mb-6"
      >
        <AlertTriangle size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-blue-800">
          Treiber-Updates werden nicht automatisch installiert — zu riskant. Nutze den <strong>Suche Update</strong>-Button um den Hersteller-Treiber zu finden.
          Unsignierte Treiber können ein Sicherheitsrisiko darstellen.
        </p>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="bg-white rounded-xl shadow-card border border-border overflow-hidden"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap">
          <div className="flex gap-1">
            {([
              { key: 'all', label: 'Alle' },
              { key: 'unsigned', label: `Unsigniert${unsignedCount > 0 ? ` (${unsignedCount})` : ''}` },
              { key: 'outdated', label: `Veraltet${outdatedCount > 0 ? ` (${outdatedCount})` : ''}` },
            ] as { key: Filter; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                  filter === key ? 'bg-accent text-white' : 'text-[#6B7280] hover:bg-surface-2',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suchen…"
                className="pl-8 pr-3 py-1.5 text-[12px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent w-40"
              />
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-surface-2 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="px-5 py-12 text-center text-[13px] text-[#9CA3AF]">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
            Treiber werden geladen… (kann einen Moment dauern)
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-[#9CA3AF]">Keine Treiber gefunden.</div>
        ) : (
          <div className="overflow-auto max-h-[520px]">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-surface">
                <tr>
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Gerät</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Klasse</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Version</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Datum</th>
                  <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Alter</th>
                  <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr key={i} className="border-t border-border hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-[#1A1A1A] truncate max-w-[200px]" title={d.device_name}>{d.device_name}</p>
                      <p className="text-[11px] text-[#9CA3AF] truncate max-w-[200px]">{d.manufacturer}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      {d.device_class ? (
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded', classColor(d.device_class))}>
                          {d.device_class}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#9CA3AF]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-[#6B7280] font-mono">{d.driver_version || '—'}</td>
                    <td className="px-3 py-2.5 text-[12px] text-[#6B7280]">{d.driver_date_display || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      {d.potentially_outdated ? (
                        <span className="flex items-center justify-center gap-1 text-[11px] text-amber-600 font-medium">
                          <Clock size={11} /> {formatAge(d.age_days)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#9CA3AF]">{formatAge(d.age_days)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {!d.is_signed ? (
                        <span className="flex items-center justify-center gap-1 text-[11px] text-red-500 font-semibold" title="Unsignierter Treiber — mögliches Sicherheitsrisiko">
                          <ShieldAlert size={13} /> Unsigniert
                        </span>
                      ) : d.potentially_outdated ? (
                        <span className="text-[11px] text-amber-600">Veraltet</span>
                      ) : (
                        <span className="text-[11px] text-emerald-600">OK</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() =>
                          open(
                            `https://www.google.com/search?q=${encodeURIComponent(d.device_name + ' ' + d.manufacturer + ' driver update')}`,
                          ).catch(() => null)
                        }
                        className="flex items-center gap-1 text-[11px] text-accent font-medium opacity-0 group-hover:opacity-100 hover:underline transition-opacity"
                        title="Treiber-Update suchen"
                      >
                        <Search size={11} /> Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
