import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export default function ClockWidget() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-1 py-2">
      <div className="text-[32px] font-bold tabular-nums tracking-tight text-slate-800 dark:text-slate-100">
        {format(now, 'HH:mm')}
        <span className="text-[20px] text-slate-400 dark:text-slate-500">
          :{String(now.getSeconds()).padStart(2, '0')}
        </span>
      </div>
      <div className="text-[12px] text-slate-400 dark:text-slate-500 capitalize">
        {format(now, 'EEEE, d. MMMM', { locale: de })}
      </div>
    </div>
  )
}
