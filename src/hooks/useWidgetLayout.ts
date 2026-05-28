import { useState, useCallback } from 'react'

export type WidgetId =
  | 'clock'
  | 'system-stats'
  | 'quick-actions'
  | 'weather'
  | 'focus'
  | 'clipboard'
  | 'session'
  | 'links'
  | 'app-launcher'

const ALL_WIDGET_IDS: WidgetId[] = [
  'clock', 'system-stats', 'quick-actions', 'weather',
  'focus', 'clipboard', 'session', 'links', 'app-launcher',
]

const DEFAULT_LAYOUT: WidgetId[] = ['clock', 'system-stats', 'quick-actions', 'weather']
const STORAGE_KEY = 'everytin_widget_layout'

function loadLayout(): WidgetId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as WidgetId[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_LAYOUT
}

export function useWidgetLayout() {
  const [layout, setLayout] = useState<WidgetId[]>(loadLayout)

  const removeWidget = useCallback((id: WidgetId) => {
    setLayout((prev) => {
      const next = prev.filter((w) => w !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const addWidget = useCallback((id: WidgetId) => {
    setLayout((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const resetLayout = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LAYOUT))
    setLayout(DEFAULT_LAYOUT)
  }, [])

  const availableToAdd = ALL_WIDGET_IDS.filter((id) => !layout.includes(id))

  return { layout, removeWidget, addWidget, resetLayout, availableToAdd }
}
