import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { useQueryClient } from '@tanstack/react-query'

const WORK_SEC = 25 * 60
const BREAK_SEC = 5 * 60

export default function FocusWidget() {
  const [seconds, setSeconds] = useState(WORK_SEC)
  const [running, setRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const qc = useQueryClient()
  const startedAt = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id)
          setRunning(false)
          if (!isBreak && sessionId) {
            invoke('stop_focus_session', { sessionId, completed: true }).then(() => {
              qc.invalidateQueries({ queryKey: ['focus-stats'] })
            })
            setSessionId(null)
          }
          setIsBreak((b) => !b)
          return isBreak ? WORK_SEC : BREAK_SEC
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, isBreak, sessionId, qc])

  async function toggle() {
    if (running) {
      setRunning(false)
      if (sessionId) {
        await invoke('stop_focus_session', { sessionId, completed: false })
        setSessionId(null)
        qc.invalidateQueries({ queryKey: ['focus-stats'] })
      }
    } else {
      setRunning(true)
      startedAt.current = Date.now()
      if (!isBreak) {
        const id = await invoke<string>('start_focus_session', { durationMinutes: 25 })
        setSessionId(id)
      }
    }
  }

  function reset() {
    setRunning(false)
    setSeconds(isBreak ? BREAK_SEC : WORK_SEC)
    if (sessionId) {
      invoke('stop_focus_session', { sessionId, completed: false })
      setSessionId(null)
    }
  }

  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  const total = isBreak ? BREAK_SEC : WORK_SEC
  const progress = ((total - seconds) / total) * 100

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {isBreak ? 'Pause' : 'Fokus'}
      </p>

      {/* Ring */}
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-200 dark:text-white/10" />
          <circle
            cx="18" cy="18" r="15.5" fill="none"
            stroke={isBreak ? '#10B981' : '#6366F1'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${(progress / 100) * 97.38} 97.38`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-slate-800 dark:text-slate-100 tabular-nums">
          {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={reset}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <RotateCcw size={13} />
        </button>
        <button
          onClick={toggle}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors"
        >
          {running ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>
    </div>
  )
}
