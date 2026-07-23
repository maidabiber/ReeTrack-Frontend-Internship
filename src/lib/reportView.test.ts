import { describe, expect, it } from 'vitest'
import {
  formatWeekLabel,
  toActivityChartData,
  toProjectBreakdownData,
  toWeeklyTrendChartData,
} from './reportView'

describe('reportView', () => {
  it('toActivityChartData shortens day names', () => {
    expect(
      toActivityChartData([
        { dayOfWeek: 'Monday', totalSeconds: 3600 },
        { dayOfWeek: 'Saturday', totalSeconds: 1800 },
      ]),
    ).toEqual([
      { day: 'Mon', seconds: 3600 },
      { day: 'Sat', seconds: 1800 },
    ])
  })

  it('toWeeklyTrendChartData formats labels and blanks status', () => {
    expect(
      toWeeklyTrendChartData([
        { weekStartDate: '2026-07-13', totalSeconds: 7200 },
        { weekStartDate: '2026-07-20', totalSeconds: 0 },
      ]),
    ).toEqual([
      { week: '13 Jul', seconds: 7200, status: '' },
      { week: '20 Jul', seconds: 0, status: '' },
    ])
  })

  it('toProjectBreakdownData maps name and seconds', () => {
    expect(
      toProjectBreakdownData([
        {
          projectId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          name: 'Alpha',
          currencyCode: 'EUR',
          totalSeconds: 5400,
          calculatedCost: 120,
          overtimeHours: 1,
          weekendHours: 0,
          holidayHours: 0,
        },
      ]),
    ).toEqual([{ name: 'Alpha', seconds: 5400 }])
  })

  it('formatWeekLabel falls back for unexpected input', () => {
    expect(formatWeekLabel('not-a-date')).toBe('not-a-date')
  })
})
