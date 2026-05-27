export interface FocusSession {
  id: string
  started_at: string
  ended_at: string | null
  duration_planned: number
  duration_actual: number | null
  completed: boolean
}

export interface FocusStats {
  today_sessions: number
  today_minutes: number
  week_sessions: number
  week_minutes: number
  longest_session_minutes: number
}

export type AmbientSound = 'none' | 'rain' | 'forest' | 'lofi' | 'white-noise' | 'coffee'

export interface AmbientSoundConfig {
  id: AmbientSound
  label: string
  emoji: string
}

export const AMBIENT_SOUNDS: AmbientSoundConfig[] = [
  { id: 'none',        label: 'Kein Sound',    emoji: '🔇' },
  { id: 'rain',        label: 'Regen',         emoji: '🌧️' },
  { id: 'forest',      label: 'Wald',          emoji: '🌲' },
  { id: 'lofi',        label: 'Lo-Fi',         emoji: '🎵' },
  { id: 'white-noise', label: 'White Noise',   emoji: '〰️' },
  { id: 'coffee',      label: 'Coffee Shop',   emoji: '☕' },
]
