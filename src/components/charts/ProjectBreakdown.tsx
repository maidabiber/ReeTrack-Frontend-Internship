import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BREAKPOINT, useMediaQuery } from '../../hooks/useMediaQuery'
import { formatHoursLabel, loggedSeriesConfig } from './chartFormat'

export interface ProjectHours {
  /** Project name; entries without a project bucket as "No project". */
  name: string
  seconds: number
}

function formatSecondsLabel(value: unknown): string {
  return formatHoursLabel(Number(value ?? 0))
}

/** Horizontal per-project totals with direct value labels. */
export function ProjectBreakdown({ data }: { data: ProjectHours[] }) {
  const isSm = useMediaQuery(BREAKPOINT.sm)

  return (
    <ChartContainer
      config={loggedSeriesConfig}
      initialDimension={{ width: 280, height: Math.max(56, data.length * 40) }}
      style={{ height: Math.max(56, data.length * 40) }}
      className="min-w-0 w-full max-w-full overflow-hidden"
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: isSm ? 48 : 36, left: 0, bottom: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={isSm ? 120 : 84}
          tick={{ fill: 'var(--color-navy)' }}
        />
        <ChartTooltip
          cursor={{ fill: 'var(--color-brand-tint)' }}
          content={<ChartTooltipContent formatter={(value) => formatSecondsLabel(value)} />}
        />
        <Bar dataKey="seconds" fill="var(--color-brand)" radius={[0, 4, 4, 0]} maxBarSize={18}>
          <LabelList
            dataKey="seconds"
            position="right"
            formatter={formatSecondsLabel}
            className="fill-gray font-mono"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
