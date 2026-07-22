import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { formatHoursLabel, formatHoursTick } from './chartFormat'

export interface WeekTrendPoint {
  /** Short week label, e.g. "13 Jul". */
  week: string
  seconds: number
  /** "None" | "Submitted" | "Approved" | "Rejected" — shown in the tooltip. */
  status: string
}

const config = {
  seconds: { label: 'Logged', color: 'var(--color-brand)' },
} satisfies ChartConfig

/**
 * Total logged time across recent weeks, oldest to newest. The stroke wears the
 * brand trademark gradient (135°, brand → brand-hi) — the one flourish the
 * design guide reserves for hairline-thin brand moments.
 */
export function RecentWeeksTrend({ data }: { data: WeekTrendPoint[] }) {
  const id = useId()
  const strokeId = `${id}-stroke`
  const fillId = `${id}-fill`

  return (
    <ChartContainer config={config} className="h-48 w-full">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" />
            <stop offset="100%" stopColor="var(--color-brand-hi)" />
          </linearGradient>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.16} />
            <stop offset="70%" stopColor="var(--color-brand-hi)" stopOpacity={0.05} />
            <stop offset="100%" stopColor="var(--color-brand-hi)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-gray-tint)" />
        <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={6} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={30}
          tickFormatter={formatHoursTick}
          allowDecimals={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) =>
                `${formatHoursLabel(Number(value))} · ${(item?.payload as WeekTrendPoint | undefined)?.status ?? ''}`
              }
            />
          }
        />
        <Area
          dataKey="seconds"
          type="monotone"
          stroke={`url(#${strokeId})`}
          strokeWidth={2}
          fill={`url(#${fillId})`}
          activeDot={{ r: 4.5, fill: 'var(--color-brand-hi)', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
