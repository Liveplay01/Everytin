import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Focus, Flame } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import PomodoroTimer from '@/components/modules/focus/PomodoroTimer'
import AmbientSounds from '@/components/modules/focus/AmbientSounds'
import FocusStats from '@/components/modules/focus/FocusStats'
import { startFocusSession, stopFocusSession } from '@/lib/tauri'

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
}

export default function FocusMode() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionsToday, setSessionsToday] = useState(0)
  const queryClient = useQueryClient()

  const handleSessionStart = useCallback(async () => {
    try {
      const id = await startFocusSession(25)
      setSessionId(id)
    } catch {}
  }, [])

  const handleSessionEnd = useCallback(async (completed: boolean) => {
    if (!sessionId) return
    try {
      await stopFocusSession(sessionId, completed)
      setSessionId(null)
      if (completed) setSessionsToday((n) => n + 1)
      queryClient.invalidateQueries({ queryKey: ['focus-stats'] })
    } catch {}
  }, [sessionId, queryClient])

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="p-8 max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Focus size={18} className="text-accent" />
            <h1 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              Focus Mode
            </h1>
          </div>
          <p className="text-[14px] text-slate-400 dark:text-slate-500">
            Ablenkungsfreies Arbeiten mit Pomodoro-Technik
          </p>
        </div>

        {sessionsToday > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/30">
            <Flame size={13} className="text-orange-500" />
            <span className="text-[12px] font-semibold text-orange-600 dark:text-orange-400">
              {sessionsToday} Session{sessionsToday !== 1 ? 's' : ''} heute
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-6 items-start">
        {/* Timer column */}
        <div className="flex flex-col items-center gap-8">
          <div className="w-full bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl border border-border/70 shadow-card p-10 flex flex-col items-center">
            <PomodoroTimer
              workMinutes={25}
              breakMinutes={5}
              onSessionStart={handleSessionStart}
              onSessionEnd={handleSessionEnd}
            />
          </div>

          {/* Stats */}
          <div className="w-full">
            <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">
              Statistiken
            </h2>
            <FocusStats />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <div className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl border border-border/70 shadow-card p-5">
            <AmbientSounds />
          </div>

          {/* Tips */}
          <div className="bg-accent/5 dark:bg-accent/10 rounded-2xl border border-accent/20 p-5">
            <h3 className="text-[11px] font-bold text-accent uppercase tracking-widest mb-3">
              Pomodoro-Technik
            </h3>
            <ul className="space-y-2 text-[12px] text-slate-500 dark:text-slate-400">
              <li className="flex gap-2">
                <span className="text-accent font-bold">1.</span>
                25 Minuten fokussiert arbeiten
              </li>
              <li className="flex gap-2">
                <span className="text-accent font-bold">2.</span>
                5 Minuten Pause machen
              </li>
              <li className="flex gap-2">
                <span className="text-accent font-bold">3.</span>
                Nach 4 Runden: 15–30 min Pause
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
