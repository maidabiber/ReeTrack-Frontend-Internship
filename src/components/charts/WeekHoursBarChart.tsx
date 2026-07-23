import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { formatHoursLabel, formatHoursTick, loggedSeriesConfig } from './chartFormat'

export interface WeekDayHours {
  /** Short day label, e.g. "Mon". */
  day: string
  seconds: number
}

/**
 * Hours logged per day of the visible week. Single series — no legend needed.
 * Pass todayIndex to pick today's bar out in brand purple.
 */
export function WeekHoursBarChart({
  data,
  todayIndex,
}: {
  data: WeekDayHours[]
  todayIndex?: number
}) {
  return (
    <ChartContainer config={loggedSeriesConfig} className="h-44 w-full">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-gray-tint)" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={6} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={30}
          tickFormatter={formatHoursTick}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={{ fill: 'var(--color-brand-tint)' }}
          content={<ChartTooltipContent formatter={(value) => formatHoursLabel(Number(value))} />}
        />
        <Bar dataKey="seconds" radius={[4, 4, 0, 0]} maxBarSize={24}>
          {data.map((point, index) => (
            <Cell
              key={point.day}
              fill={index === todayIndex ? 'var(--color-brand-hi)' : 'var(--color-brand)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
