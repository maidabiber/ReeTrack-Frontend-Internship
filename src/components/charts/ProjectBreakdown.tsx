import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { formatHoursLabel, loggedSeriesConfig } from './chartFormat'

export interface ProjectHours {
  /** Project name; entries without a project bucket as "No project". */
  name: string
  seconds: number
}

/** Horizontal per-project totals with direct value labels. */
export function ProjectBreakdown({ data }: { data: ProjectHours[] }) {
  return (
    <ChartContainer
      config={loggedSeriesConfig}
      style={{ height: Math.max(56, data.length * 40) }}
      className="w-full"
    >
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={120}
          tick={{ fill: 'var(--color-navy)' }}
        />
        <ChartTooltip
          cursor={{ fill: 'var(--color-brand-tint)' }}
          content={<ChartTooltipContent formatter={(value) => formatHoursLabel(Number(value))} />}
        />
        <Bar dataKey="seconds" fill="var(--color-brand)" radius={[0, 4, 4, 0]} maxBarSize={18}>
          <LabelList
            dataKey="seconds"
            position="right"
            formatter={(value: number | string) => formatHoursLabel(Number(value ?? 0))}
            className="fill-gray font-mono"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
