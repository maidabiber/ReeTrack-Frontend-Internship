import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { formatHoursLabel } from './chartFormat'

export interface ProjectHours {
  /** Project name; entries without a project bucket as "No project". */
  name: string
  seconds: number
}

const config = {
  seconds: { label: 'Logged', color: 'var(--color-brand)' },
} satisfies ChartConfig

/** Horizontal per-project totals with direct value labels. */
export function ProjectBreakdown({ data }: { data: ProjectHours[] }) {
  return (
    <ChartContainer config={config} style={{ height: Math.max(56, data.length * 40) }} className="w-full">
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
        <Bar dataKey="seconds" fill="var(--color-seconds)" radius={[0, 4, 4, 0]} maxBarSize={18}>
          <LabelList
            dataKey="seconds"
            position="right"
            formatter={(value) => formatHoursLabel(Number(value))}
            className="fill-gray font-mono"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
