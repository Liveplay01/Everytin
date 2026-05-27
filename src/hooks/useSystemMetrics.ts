import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSystemSnapshot, onSystemMetrics } from '@/lib/tauri'
import { useMetricsStore } from '@/lib/store'

export function useSystemMetrics() {
  const { current, history, addSnapshot } = useMetricsStore()

  // Initial fetch
  const { isLoading, error } = useQuery({
    queryKey: ['system-snapshot'],
    queryFn: async () => {
      const snap = await getSystemSnapshot()
      addSnapshot(snap)
      return snap
    },
    refetchInterval: 2000,
  })

  // Also listen for server-push events from the Rust metrics loop
  useEffect(() => {
    let unlisten: (() => void) | undefined

    onSystemMetrics((snap) => addSnapshot(snap)).then((fn) => {
      unlisten = fn
    })

    return () => {
      unlisten?.()
    }
  }, [addSnapshot])

  return { current, history, isLoading, error }
}
