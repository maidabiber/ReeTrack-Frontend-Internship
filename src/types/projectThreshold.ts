/** Mirrors backend ProjectThresholdResponse / ProjectThresholdMetricType. */
export type ProjectThresholdMetricType = 'Cost' | 'TimeEstimate'

export interface ProjectThreshold {
  id: string
  projectId: string
  metricType: ProjectThresholdMetricType
  thresholdPercentage: number
  isTriggered: boolean
  createdAtUtc: string
  updatedAtUtc: string
}
