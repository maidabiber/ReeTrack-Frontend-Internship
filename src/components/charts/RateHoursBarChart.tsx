import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

export interface RateHours {
  totalHours: number
  weekendHours: number
  holidayHours: number
  overtimeHours: number
}

export interface RateHoursSeriesItem extends RateHours {
  name: string
}

const projectChartConfig = {
  hours: {
    label: 'Hours',
    color: 'var(--color-brand)',
  },
} satisfies ChartConfig

const stackedChartConfig = {
  normal: { label: 'Normal', color: 'var(--color-navy)' },
  weekend: { label: 'Weekend', color: 'var(--color-brand)' },
  holiday: { label: 'Holiday', color: 'var(--color-brand-hi)' },
  overtime: { label: 'Overtime', color: 'var(--color-orange)' },
} satisfies ChartConfig

const PROJECT_BAR_COLORS: Record<string, string> = {
  Total: 'var(--color-navy)',
  Weekend: 'var(--color-brand)',
  Holiday: 'var(--color-brand-hi)',
  Overtime: 'var(--color-orange)',
}

function formatHours(hours: number): string {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(hours)} h`
}

/**
 * Original project overview: four separate horizontal bars (Total / Weekend / Holiday / Overtime).
 */
export function ProjectRateHoursBarChart({
  hours,
  className = 'h-[220px] w-full',
}: {
  hours: RateHours
  className?: string
}) {
  const chartData = useMemo(
    () => [
      { name: 'Total', hours: hours.totalHours, fill: PROJECT_BAR_COLORS.Total },
      { name: 'Weekend', hours: hours.weekendHours, fill: PROJECT_BAR_COLORS.Weekend },
      { name: 'Holiday', hours: hours.holidayHours, fill: PROJECT_BAR_COLORS.Holiday },
      { name: 'Overtime', hours: hours.overtimeHours, fill: PROJECT_BAR_COLORS.Overtime },
    ],
    [hours.totalHours, hours.weekendHours, hours.holidayHours, hours.overtimeHours],
  )

  return (
    <ChartContainer config={projectChartConfig} className={className}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickLine={false} axisLine={false} unit=" h" />
        <YAxis type="category" dataKey="name" width={72} tickLine={false} axisLine={false} />
        <ChartTooltip
          cursor={{ fill: 'rgba(27, 37, 64, 0.04)' }}
          content={<ChartTooltipContent formatter={(value) => formatHours(Number(value))} />}
        />
        <Bar dataKey="hours" radius={[0, 8, 8, 0]} maxBarSize={28}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/** Split overlapping premium flags into exclusive segments that sum to totalHours. */
function partitionRateHours(item: Omit<RateHoursSeriesItem, 'name'>): {
  normal: number
  weekend: number
  holiday: number
  overtime: number
  totalHours: number
} {
  const totalHours = Math.max(0, item.totalHours)
  let weekend = Math.max(0, item.weekendHours)
  let holiday = Math.max(0, item.holidayHours)
  let overtime = Math.max(0, item.overtimeHours)
  const premiumSum = weekend + holiday + overtime

  if (premiumSum > totalHours && premiumSum > 0) {
    const scale = totalHours / premiumSum
    weekend *= scale
    holiday *= scale
    overtime *= scale
  }

  const normal = Math.max(0, totalHours - weekend - holiday - overtime)
  return { normal, weekend, holiday, overtime, totalHours }
}

/**
 * Upright stacked bars: one bar per series item (task), height = total hours,
 * segments = Normal / Weekend / Holiday / Overtime share of that total.
 */
export function TaskRateStackedBarChart({
  series,
  className = 'h-[280px] w-full',
}: {
  series: RateHoursSeriesItem[]
  className?: string
}) {
  const chartData = useMemo(
    () =>
      series.map((item) => {
        const parts = partitionRateHours(item)
        return {
          name: item.name,
          normal: parts.normal,
          weekend: parts.weekend,
          holiday: parts.holiday,
          overtime: parts.overtime,
          totalHours: parts.totalHours,
        }
      }),
    [series],
  )

  return (
    <ChartContainer config={stackedChartConfig} className={className}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
        <YAxis tickLine={false} axisLine={false} width={40} unit=" h" allowDecimals />
        <ChartTooltip
          cursor={{ fill: 'rgba(27, 37, 64, 0.04)' }}
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => {
                const hours = Number(value)
                if (hours <= 0) return null
                const total = Number(
                  (item.payload as { totalHours?: number } | undefined)?.totalHours ?? 0,
                )
                const pct = total > 0 ? (hours / total) * 100 : 0
                const label =
                  stackedChartConfig[name as keyof typeof stackedChartConfig]?.label ??
                  String(name)
                return (
                  <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{ background: item.color }}
                      />
                      <span className="text-muted-foreground">{label}</span>
                    </div>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatHours(hours)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                )
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="normal" stackId="hours" fill="var(--color-normal)" maxBarSize={48} />
        <Bar dataKey="weekend" stackId="hours" fill="var(--color-weekend)" maxBarSize={48} />
        <Bar dataKey="holiday" stackId="hours" fill="var(--color-holiday)" maxBarSize={48} />
        <Bar
          dataKey="overtime"
          stackId="hours"
          fill="var(--color-overtime)"
          maxBarSize={48}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}
