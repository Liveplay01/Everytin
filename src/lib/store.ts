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
