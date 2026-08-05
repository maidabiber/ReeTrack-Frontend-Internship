import type { TableColumn, TableResult } from '../../../types/customReport'
import { ChartCard, EmptyNote } from '../ChartCard'

function isNumericColumn(columnType: TableColumn['columnType']): boolean {
  return columnType !== 'Text' && columnType !== 'Date'
}

export function TableBlockView({ block }: { block: TableResult }) {
  const title = block.title ?? 'Breakdown'

  if (block.columns.length === 0) {
    return (
      <ChartCard title={title}>
        <EmptyNote text="No columns in this table." />
      </ChartCard>
    )
  }

  const firstColumnKey = block.columns[0]?.key

  return (
    <ChartCard title={title}>
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="w-max min-w-full">
          <table className="min-w-full border-collapse text-left text-body">
            <thead>
              <tr className="border-b border-canvas bg-surface-muted/60">
                {block.columns.map((column, index) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-3 py-2 text-caption font-medium text-navy/55 ${
                      index === 0
                        ? 'sticky left-0 z-10 bg-surface-muted/95 backdrop-blur-sm'
                        : ''
                    } ${isNumericColumn(column.columnType) ? 'text-right' : 'text-left'}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={block.columns.length}
                    className="px-3 py-10 text-center text-navy/55"
                  >
                    No rows for this breakdown.
                  </td>
                </tr>
              ) : (
                block.rows.map((row) => {
                  const kind = row.kind ?? 'Detail'
                  const depth = row.depth ?? 0
                  const isGroupHeader = kind === 'GroupHeader'
                  const isSubtotal = kind === 'GroupSubtotal'
                  return (
                    <tr
                      key={row.key}
                      className={`border-b border-canvas/80 last:border-0 ${
                        isSubtotal ? 'bg-surface-muted/50 font-medium' : ''
                      }`}
                    >
                      {block.columns.map((column, index) => {
                        const cell = row.cells[column.key]
                        const numeric = isNumericColumn(column.columnType)
                        const isFirst = column.key === firstColumnKey || index === 0
                        return (
                          <td
                            key={column.key}
                            style={isFirst && depth > 0 ? { paddingLeft: `${0.75 + depth * 1.25}rem` } : undefined}
                            className={`px-3 py-2.5 ${
                              isFirst
                                ? `sticky left-0 z-[1] font-medium text-navy ${
                                    isSubtotal ? 'bg-surface-muted/50' : 'bg-white'
                                  } ${isGroupHeader ? 'font-semibold' : ''}`
                                : numeric
                                  ? `text-right font-mono tabular-nums ${
                                      isSubtotal ? 'text-navy' : 'text-navy/70'
                                    }`
                                  : 'text-navy'
                            }`}
                          >
                            {cell?.display ?? (isGroupHeader && !isFirst ? '' : '—')}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
            {block.totals ? (
              <tfoot>
                <tr className="border-t border-canvas bg-surface-muted/40 font-medium">
                  {block.columns.map((column, index) => {
                    const cell = block.totals?.cells[column.key]
                    const numeric = isNumericColumn(column.columnType)
                    const isFirst = column.key === firstColumnKey || index === 0
                    return (
                      <td
                        key={column.key}
                        className={`px-3 py-2.5 ${
                          isFirst
                            ? 'sticky left-0 z-[1] bg-surface-muted/95 text-navy'
                            : numeric
                              ? 'text-right font-mono tabular-nums text-navy'
                              : 'text-navy'
                        }`}
                      >
                        {cell?.display ?? (isFirst ? 'Total' : '—')}
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
      {block.footnote ? (
        <p className="mt-3 text-caption text-navy/45">{block.footnote}</p>
      ) : null}
    </ChartCard>
  )
}
