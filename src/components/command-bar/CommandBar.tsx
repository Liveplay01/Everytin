import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Command } from 'lucide-react'
import { useCommandBarStore } from '@/lib/store'
import { COMMANDS, filterCommands } from './commandRegistry'
import CommandItem from './CommandItem'
import { boostSystem, scanJunkFiles, cleanJunkFiles } from '@/lib/tauri'

const CATEGORY_ORDER = ['navigation', 'action'] as const
const CATEGORY_LABELS: Record<string, string> = {
  navigation: 'Seiten',
  action: 'Aktionen',
}

export default function CommandBar() {
  const { isOpen, query, selectedIndex, close, setQuery, setSelectedIndex } = useCommandBarStore()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = filterCommands(COMMANDS, query)

  // Flat ordered results with category grouping
  const grouped = CATEGORY_ORDER
    .map((cat) => ({ cat, items: filtered.filter((c) => c.category === cat) }))
    .filter((g) => g.items.length > 0)

  const flatItems = grouped.flatMap((g) => g.items)

  const executeCommand = useCallback(
    async (id: string) => {
      const cmd = COMMANDS.find((c) => c.id === id)
      if (!cmd) return

      if (cmd.route) {
        navigate(cmd.route)
        close()
        return
      }

      // Actions
      if (id === 'action-boost') {
        close()
        try { await boostSystem() } catch {}
        return
      }
      if (id === 'action-cleanup') {
        close()
        navigate('/cleanup')
        return
      }
      if (id === 'action-clipboard') {
        close()
        navigate('/clipboard')
        return
      }
      if (id === 'action-focus') {
        close()
        navigate('/focus')
        return
      }

      close()
    },
    [navigate, close],
  )

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(Math.min(selectedIndex + 1, flatItems.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(Math.max(selectedIndex - 1, 0))
      }
      if (e.key === 'Enter' && flatItems[selectedIndex]) {
        e.preventDefault()
        executeCommand(flatItems[selectedIndex].id)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, selectedIndex, flatItems, close, setSelectedIndex, executeCommand])

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Reset on query change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, setSelectedIndex])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
            onClick={close}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[620px] rounded-2xl bg-white/96 dark:bg-[#0F0D16]/96 border border-border/60 shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
              style={{ maxHeight: '500px' }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 border-b border-border/50 h-[54px] flex-shrink-0">
                <Search size={16} className="text-slate-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Seiten, Aktionen, Apps…"
                  className="flex-1 bg-transparent text-[14px] font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none"
                />
                <kbd className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-white/10 border border-border/50 font-mono">Esc</span>
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="overflow-y-auto py-2 flex-1">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                    <Command size={24} className="opacity-40" />
                    <p className="text-[13px]">Keine Ergebnisse für „{query}"</p>
                  </div>
                ) : (
                  grouped.map((group) => {
                    const groupOffset = flatItems.indexOf(group.items[0])
                    return (
                      <div key={group.cat} className="mb-1">
                        <div className="px-6 py-1.5">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            {CATEGORY_LABELS[group.cat]}
                          </span>
                        </div>
                        {group.items.map((cmd, i) => {
                          const flatIndex = groupOffset + i
                          return (
                            <div key={cmd.id} data-index={flatIndex}>
                              <CommandItem
                                command={cmd}
                                isSelected={selectedIndex === flatIndex}
                                onSelect={() => executeCommand(cmd.id)}
                                onHover={() => setSelectedIndex(flatIndex)}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border/50 px-4 py-2.5 flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 border border-border/50 font-mono">↑↓</kbd>
                  navigieren
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 border border-border/50 font-mono">↩</kbd>
                  öffnen
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 border border-border/50 font-mono">Esc</kbd>
                  schließen
                </span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
