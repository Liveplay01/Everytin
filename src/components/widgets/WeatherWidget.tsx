import { useQuery } from '@tanstack/react-query'

interface WeatherData {
  temperature: number
  weathercode: number
}

const WMO_CODES: Record<number, { label: string; emoji: string }> = {
  0: { label: 'Klar', emoji: '☀️' },
  1: { label: 'Überwiegend klar', emoji: '🌤️' },
  2: { label: 'Teilweise bewölkt', emoji: '⛅' },
  3: { label: 'Bewölkt', emoji: '☁️' },
  45: { label: 'Nebel', emoji: '🌫️' },
  61: { label: 'Leichter Regen', emoji: '🌦️' },
  63: { label: 'Regen', emoji: '🌧️' },
  71: { label: 'Leichter Schnee', emoji: '🌨️' },
  80: { label: 'Schauer', emoji: '🌦️' },
  95: { label: 'Gewitter', emoji: '⛈️' },
}

function getWeatherInfo(code: number) {
  return WMO_CODES[code] ?? { label: 'Unbekannt', emoji: '🌡️' }
}

async function fetchWeather(): Promise<WeatherData> {
  // Use browser geolocation or fall back to Berlin coordinates
  const { coords } = await new Promise<GeolocationPosition>((res, rej) =>
    navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }),
  ).catch(() => ({ coords: { latitude: 52.52, longitude: 13.4 } } as GeolocationPosition))

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true`
  const res = await fetch(url)
  const data = await res.json()
  return {
    temperature: Math.round(data.current_weather.temperature),
    weathercode: data.current_weather.weathercode,
  }
}

export default function WeatherWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['weather'],
    queryFn: fetchWeather,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-[12px] text-slate-400">Lade Wetter…</div>
  }

  if (isError || !data) {
    return <div className="flex items-center justify-center h-full text-[12px] text-slate-400">Wetter nicht verfügbar</div>
  }

  const info = getWeatherInfo(data.weathercode)

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 py-2">
      <span className="text-[40px] leading-none">{info.emoji}</span>
      <div className="text-[28px] font-bold text-slate-800 dark:text-slate-100 tabular-nums">
        {data.temperature}°C
      </div>
      <div className="text-[11px] text-slate-400 dark:text-slate-500">{info.label}</div>
    </div>
  )
}
