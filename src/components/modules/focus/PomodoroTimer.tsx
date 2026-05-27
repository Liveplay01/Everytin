import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react'
import { cn } from '@/lib/utils'

type Phase = 'work' | 'break'

interface PomodoroTimerProps {
  workMinutes?: number
  breakMinutes?: number
  onSessionStart?: () => void
  onSessionEnd?: (completed: boolean) => void
}

const RADIUS = 88
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function PomodoroTimer({
  workMinutes = 25,
  breakMinutes = 5,
  onSessionStart,
  onSessionEnd,
}: PomodoroTimerProps) {
  const [phase, setPhase] = useState<Phase>('work')
  const [totalSeconds, setTotalSeconds] = useState(workMinutes * 60)
  const [remaining, setRemaining] = useState(workMinutes * 60)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const progress = remaining / totalSeconds
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    const secs = (phase === 'work' ? workMinutes : breakMinutes) * 60
    setTotalSeconds(secs)
    setRemaining(secs)
    onSessionEnd?.(false)
  }, [phase, workMinutes, breakMinutes, onSessionEnd])

  const switchPhase = useCallback(() => {
    const next: Phase = phase === 'work' ? 'break' : 'work'
    const secs = (next === 'work' ? workMinutes : breakMinutes) * 60
    setPhase(next)
    setTotalSeconds(secs)
    setRemaining(secs)
    setRunning(false)
  }, [phase, workMinutes, breakMinutes])

  useEffect(() => {
    if (!running) return

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          setRunning(false)
          onSessionEnd?.(true)
          // Auto-switch to next phase after a short delay
          setTimeout(() => switchPhase(), 800)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, switchPhase, onSessionEnd])

  const handleToggle = () => {
    if (!running) onSessionStart?.()
    setRunning((r) => !r)
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Phase indicator */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { reset(); setPhase('work'); setTotalSeconds(workMinutes * 60); setRemaining(workMinutes * 60) }}
          className={cn(
            'px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all',
            phase === 'work'
              ? 'bg-accent text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
          )}
        >
          Fokus
        </button>
        <button
          onClick={() => { reset(); setPhase('break'); setTotalSeconds(breakMinutes * 60); setRemaining(breakMinutes * 60) }}
          className={cn(
            'px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all',
            phase === 'break'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
          )}
        >
          <Coffee size={11} className="inline mr-1.5" />
          Pause
        </button>
      </div>

      {/* Ring timer */}
      <div className="relative">
        <svg width="220" height="220" className="-rotate-90">
          {/* Track */}
          <circle
            cx="110" cy="110" r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-slate-100 dark:text-white/[0.06]"
          />
          {/* Progress */}
          <motion.circle
            cx="110" cy="110" r={RADIUS}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            className={phase === 'work' ? 'text-accent' : 'text-emerald-500'}
            stroke="currentColor"
            style={{ transition: 'stroke-dashoffset 0.9s ease, stroke 0.4s ease' }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={`${minutes}-${seconds}`}
              initial={{ opacity: 0.7, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[42px] font-bold tabular-nums tracking-tight text-slate-800 dark:text-slate-100"
            >
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </motion.span>
          </AnimatePresence>
          <span className="text-[11px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">
            {phase === 'work' ? 'Fokuszeit' : 'Pause'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={reset}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
          title="Zurücksetzen"
        >
          <RotateCcw size={16} />
        </button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all font-semibold',
            phase === 'work'
              ? 'bg-accent hover:bg-accent/90 text-white'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white',
          )}
        >
          {running ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
        </motion.button>

        <div className="w-10 h-10" /> {/* spacer */}
      </div>
    </div>
  )
}
