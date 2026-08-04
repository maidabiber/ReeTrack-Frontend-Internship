import { useId, useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { BREAKPOINT, useMediaQuery } from '../../../hooks/useMediaQuery'
import type { SeriesResult } from '../../../types/customReport'
import { ChartCard, EmptyNote } from '../ChartCard'

const SERIES_COLORS = [
  'var(--color-brand)',
  'var(--color-brand-hi)',
  'var(--color-blue)',
  'var(--color-purple-mid)',
  'var(--color-orange)',
  'var(--color-amber)',
]

export function ChartBlockView({ block }: { block: SeriesResult }) {
  const title = block.title ?? 'Chart'
  const chartId = useId()
  const showAxes = useMediaQuery(BREAKPOINT.sm)

  const { chartData, chartConfig } = useMemo(() => {
    const config: ChartConfig = {}
    for (const [index, series] of block.series.entries()) {
      config[series.key] = {
        label: series.label,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
      }
    }

    const data = block.categories.map((category, categoryIndex) => {
      const point: Record<string, string | number> = { category }
      for (const series of block.series) {
        point[series.key] = Number(series.values[categoryIndex] ?? 0)
      }
      return point
    })

    return { chartData: data, chartConfig: config }
  }, [block.categories, block.series])

  if (block.categories.length === 0 || block.series.length === 0) {
    return (
      <ChartCard title={title}>
        <EmptyNote text="No chart data for this block." />
      </ChartCard>
    )
  }

  const primaryKey = block.series[0]?.key ?? 'value'
  const strokeId = `${chartId}-stroke`
  const fillId = `${chartId}-fill`

  return (
    <ChartCard title={title}>
      {block.kind === 'Area' ? (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
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
            {showAxes ? (
              <>
                <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={6} />
                <YAxis tickLine={false} axisLine={false} width={36} allowDecimals />
              </>
            ) : null}
            <ChartTooltip content={<ChartTooltipContent />} />
            {block.series.length > 1 ? (
              <ChartLegend content={<ChartLegendContent />} />
            ) : null}
            {block.series.map((series, index) => (
              <Area
                key={series.key}
                dataKey={series.key}
                type="monotone"
                stroke={index === 0 ? `url(#${strokeId})` : SERIES_COLORS[index % SERIES_COLORS.length]}
                strokeWidth={2}
                fill={index === 0 ? `url(#${fillId})` : SERIES_COLORS[index % SERIES_COLORS.length]}
                fillOpacity={index === 0 ? 1 : 0.12}
                activeDot={{ r: 4.5, fill: 'var(--color-brand-hi)', stroke: '#fff', strokeWidth: 2 }}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      ) : block.kind === 'Line' ? (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-gray-tint)" />
            {showAxes ? (
              <>
                <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={6} />
                <YAxis tickLine={false} axisLine={false} width={36} allowDecimals />
              </>
            ) : null}
            <ChartTooltip content={<ChartTooltipContent />} />
            {block.series.length > 1 ? (
              <ChartLegend content={<ChartLegendContent />} />
            ) : null}
            {block.series.map((series, index) => (
              <Line
                key={series.key}
                dataKey={series.key}
                type="monotone"
                stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      ) : block.kind === 'Donut' ? (
        <ChartContainer config={chartConfig} className="mx-auto h-52 w-full max-w-sm">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey={primaryKey}
              nameKey="category"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
              ))}
            </Pie>
            {block.series.length > 1 ? (
              <ChartLegend content={<ChartLegendContent nameKey="category" />} />
            ) : null}
          </PieChart>
        </ChartContainer>
      ) : (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-gray-tint)" />
            {showAxes ? (
              <>
                <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={6} />
                <YAxis tickLine={false} axisLine={false} width={36} allowDecimals />
              </>
            ) : null}
            <ChartTooltip
              cursor={{ fill: 'var(--color-brand-tint)' }}
              content={<ChartTooltipContent />}
            />
            {block.series.length > 1 ? (
              <ChartLegend content={<ChartLegendContent />} />
            ) : null}
            {block.series.map((series, index) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                fill={SERIES_COLORS[index % SERIES_COLORS.length]}
              />
            ))}
          </BarChart>
        </ChartContainer>
      )}
      {block.footnote ? (
        <p className="mt-3 text-caption text-navy/45">{block.footnote}</p>
      ) : null}
    </ChartCard>
  )
}
