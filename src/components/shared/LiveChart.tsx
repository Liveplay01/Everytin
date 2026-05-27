import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  value: number
  index: number
}

interface LiveChartProps {
  data: number[]
  color?: string
  height?: number
  unit?: string
  maxY?: number
}

export default function LiveChart({
  data,
  color = '#4F46E5',
  height = 80,
  unit = '%',
  maxY = 100,
}: LiveChartProps) {
  const chartData: DataPoint[] = data.map((value, index) => ({ value, index }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="index" hide />
        <YAxis domain={[0, maxY]} hide />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="bg-white border border-border rounded-lg px-2.5 py-1.5 shadow-card text-[12px] font-medium text-[#1A1A1A]">
                {payload[0].value?.toFixed(1)}{unit}
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${color.replace('#', '')})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
