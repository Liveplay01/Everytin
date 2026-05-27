import { create } from 'zustand'
import type { SystemSnapshot } from '@/types/system'

const MAX_HISTORY = 60 // 2 minutes at 2s intervals

interface MetricsStore {
  current: SystemSnapshot | null
  history: SystemSnapshot[]
  addSnapshot: (snap: SystemSnapshot) => void
}

export const useMetricsStore = create<MetricsStore>((set) => ({
  current: null,
  history: [],
  addSnapshot: (snap) =>
    set((state) => ({
      current: snap,
      history: [...state.history.slice(-(MAX_HISTORY - 1)), snap],
    })),
}))

// ── Command Bar ───────────────────────────────────────────────────────────────

interface CommandBarStore {
  isOpen: boolean
  query: string
  selectedIndex: number
  open: () => void
  close: () => void
  toggle: () => void
  setQuery: (q: string) => void
  setSelectedIndex: (i: number) => void
}

export const useCommandBarStore = create<CommandBarStore>((set) => ({
  isOpen: false,
  query: '',
  selectedIndex: 0,
  open: () => set({ isOpen: true, query: '', selectedIndex: 0 }),
  close: () => set({ isOpen: false, query: '', selectedIndex: 0 }),
  toggle: () => set((s) => ({
    isOpen: !s.isOpen,
    query: '',
    selectedIndex: 0,
  })),
  setQuery: (query) => set({ query }),
  setSelectedIndex: (selectedIndex) => set({ selectedIndex }),
}))
