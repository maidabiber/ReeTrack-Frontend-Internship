import { Cell, Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { BillableSplit } from '../../lib/timesheetStats'
import { formatHoursLabel } from './chartFormat'

const config = {
  billable: { label: 'Billable', color: 'var(--color-brand)' },
  nonBillable: { label: 'Non-billable', color: 'var(--color-brand-hi)' },
} satisfies ChartConfig

/** Donut of billable vs non-billable time, with a direct-labeled legend. */
export function BillableSplitCard({ split }: { split: BillableSplit }) {
  const { billableSeconds, nonBillableSeconds, totalSeconds, billablePct } = split
  const data = [
    { key: 'billable', seconds: billableSeconds, fill: 'var(--color-brand)' },
    { key: 'nonBillable', seconds: nonBillableSeconds, fill: 'var(--color-brand-hi)' },
  ]

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <ChartContainer config={config} className="h-28 w-28">
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="key" formatter={(value) => formatHoursLabel(Number(value))} />}
            />
            <Pie
              data={data}
              dataKey="seconds"
              nameKey="key"
              innerRadius={38}
              outerRadius={52}
              paddingAngle={totalSeconds === 0 ? 0 : 2}
              cornerRadius={4}
              strokeWidth={0}
            >
              {data.map((slice) => (
                <Cell key={slice.key} fill={slice.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-medium text-navy">{billablePct}%</span>
          <span className="text-xs text-gray">billable</span>
        </div>
      </div>
      <dl className="space-y-1.5 text-caption">
        {(['billable', 'nonBillable'] as const).map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ background: config[key].color }}
            />
            <dt className="text-gray">{config[key].label}</dt>
            <dd className="ml-auto pl-3 font-mono text-navy tabular-nums">
              {formatHoursLabel(key === 'billable' ? billableSeconds : nonBillableSeconds)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
