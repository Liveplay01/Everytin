import { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AMBIENT_SOUNDS, type AmbientSound } from '@/types/focus'

const SOUND_URLS: Record<AmbientSound, string | null> = {
  none: null,
  rain: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_1e3c9bfbfe.mp3',
  forest: 'https://cdn.pixabay.com/download/audio/2022/02/23/audio_ea34e2c8af.mp3',
  lofi: 'https://cdn.pixabay.com/download/audio/2023/08/13/audio_9f46f24083.mp3',
  'white-noise': 'https://cdn.pixabay.com/download/audio/2022/03/09/audio_c8c8a73467.mp3',
  coffee: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d1718ab41b.mp3',
}

interface AmbientSoundsProps {
  disabled?: boolean
}

export default function AmbientSounds({ disabled }: AmbientSoundsProps) {
  const [active, setActive] = useState<AmbientSound>('none')
  const [volume, setVolume] = useState(0.4)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    const url = SOUND_URLS[active]
    if (!url) return

    const audio = new Audio(url)
    audio.loop = true
    audio.volume = volume
    audio.play().catch(() => {}) // ignore autoplay policy errors
    audioRef.current = audio

    return () => {
      audio.pause()
    }
  }, [active])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h3 className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Ambient Sound
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {AMBIENT_SOUNDS.map((sound) => (
          <button
            key={sound.id}
            disabled={disabled}
            onClick={() => setActive(sound.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition-all text-center',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              active === sound.id
                ? 'bg-accent/10 dark:bg-accent/15 border-accent/40 dark:border-accent/30'
                : 'bg-white/60 dark:bg-white/[0.03] border-border/50 hover:border-border hover:bg-white/80 dark:hover:bg-white/[0.06]',
            )}
          >
            <span className="text-[18px] leading-none">{sound.emoji}</span>
            <span className={cn(
              'text-[11px] font-semibold leading-tight',
              active === sound.id
                ? 'text-accent dark:text-[#A5B4FC]'
                : 'text-slate-500 dark:text-slate-400',
            )}>
              {sound.label}
            </span>
          </button>
        ))}
      </div>

      {/* Volume */}
      {active !== 'none' && (
        <div className="flex items-center gap-3 px-1">
          <VolumeX size={13} className="text-slate-400 flex-shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 h-1.5 appearance-none rounded-full bg-slate-200 dark:bg-white/10 accent-accent"
          />
          <Volume2 size={13} className="text-slate-400 flex-shrink-0" />
        </div>
      )}
    </div>
  )
}
