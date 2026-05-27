import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Download, CheckCircle2, AlertCircle, Loader2, Package } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { searchPackages, installPackage, onInstallProgress } from '@/lib/tauri'
import type { Package as Pkg, InstallResult } from '@/types/installer'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

interface InstallState {
  [packageId: string]: {
    status: 'idle' | 'installing' | 'done' | 'failed'
    pct: number
    message?: string
  }
}

const FEATURED = [
  { id: 'Google.Chrome', name: 'Chrome', category: 'Browser' },
  { id: 'Mozilla.Firefox', name: 'Firefox', category: 'Browser' },
  { id: 'Microsoft.VisualStudioCode', name: 'VS Code', category: 'Dev' },
  { id: 'Discord.Discord', name: 'Discord', category: 'Chat' },
  { id: 'Spotify.Spotify', name: 'Spotify', category: 'Media' },
  { id: '7zip.7zip', name: '7-Zip', category: 'Utility' },
  { id: 'Valve.Steam', name: 'Steam', category: 'Gaming' },
  { id: 'OBSProject.OBSStudio', name: 'OBS Studio', category: 'Streaming' },
]

export default function Installer() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [installStates, setInstallStates] = useState<InstallState>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const handleSearch = (value: string) => {
    setQuery(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 500)
  }

  // Listen for install progress events
  useEffect(() => {
    let unlisten: (() => void) | undefined
    onInstallProgress(({ package_id, pct, status }) => {
      setInstallStates((prev) => ({
        ...prev,
        [package_id]: { status: status === 'done' ? 'done' : status === 'failed' ? 'failed' : 'installing', pct },
      }))
    }).then((fn) => { unlisten = fn })
    return () => unlisten?.()
  }, [])

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['package-search', debouncedQuery],
    queryFn: () => searchPackages(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  })

  async function handleInstall(pkg: Pkg) {
    setInstallStates((prev) => ({
      ...prev,
      [pkg.id]: { status: 'installing', pct: 0 },
    }))
    try {
      const result: InstallResult = await installPackage(pkg.id)
      setInstallStates((prev) => ({
        ...prev,
        [pkg.id]: {
          status: result.success ? 'done' : 'failed',
          pct: 100,
          message: result.message,
        },
      }))
    } catch (e) {
      setInstallStates((prev) => ({
        ...prev,
        [pkg.id]: { status: 'failed', pct: 0, message: String(e) },
      }))
    }
  }

  const displayPkgs: Pkg[] = debouncedQuery.length >= 2
    ? results
    : FEATURED.map((f) => ({ ...f, version: '', available_version: null, publisher: null, installed: false, source: 'winget' }))

  return (
    <div className="p-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[24px] font-bold text-[#1A1A1A]">Installer</h1>
        <p className="text-[14px] text-[#6B7280] mt-0.5">Find and install software with one click</p>
      </motion.div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={17} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search for apps, tools, games…"
          className="w-full pl-11 pr-4 py-3.5 text-[14px] bg-white border border-border rounded-xl shadow-card focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
        />
        {isFetching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] animate-spin" size={16} />
        )}
      </div>

      {/* Section label */}
      <p className="text-[11px] uppercase tracking-wider font-semibold text-[#9CA3AF] mb-4">
        {debouncedQuery.length >= 2 ? `${results.length} results for "${debouncedQuery}"` : 'Popular apps'}
      </p>

      {/* Results Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={debouncedQuery}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="grid grid-cols-1 gap-3"
        >
          {displayPkgs.length === 0 && debouncedQuery.length >= 2 && !isFetching && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package size={40} className="text-[#D1D5DB] mb-3" />
              <p className="text-[14px] font-medium text-[#6B7280]">No results for "{debouncedQuery}"</p>
              <p className="text-[12px] text-[#9CA3AF] mt-1">Try a different search term</p>
            </div>
          )}

          {displayPkgs.map((pkg, i) => {
            const state = installStates[pkg.id]
            const isInstalling = state?.status === 'installing'
            const isDone = state?.status === 'done'
            const isFailed = state?.status === 'failed'

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="flex items-center justify-between bg-white rounded-xl px-5 py-4 shadow-card border border-border hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#F1F3F5] flex items-center justify-center flex-shrink-0">
                    <Package size={17} className="text-[#9CA3AF]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#1A1A1A] truncate">{pkg.name}</p>
                    <p className="text-[12px] text-[#9CA3AF] truncate">{pkg.id}{pkg.version ? ` · ${pkg.version}` : ''}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  {isInstalling && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-[#F1F3F5] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-accent rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: `${state.pct}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <Loader2 size={15} className="animate-spin text-accent" />
                    </div>
                  )}

                  {isDone && (
                    <span className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">
                      <CheckCircle2 size={15} /> Installed
                    </span>
                  )}

                  {isFailed && (
                    <span className="flex items-center gap-1.5 text-[12px] text-red-500 font-medium">
                      <AlertCircle size={15} /> Failed
                    </span>
                  )}

                  {!state && (
                    <button
                      onClick={() => handleInstall(pkg)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white text-[13px] font-medium rounded-lg hover:bg-accent-600 transition-colors"
                    >
                      <Download size={14} />
                      Install
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
