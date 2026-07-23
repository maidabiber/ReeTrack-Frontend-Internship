export interface ProjectTaskCost {
  projectTaskId: string
  calculatedCost: number
  totalHours: number
  weekendHours: number
  holidayHours: number
  overtimeHours: number
}

export interface ProjectCost {
  projectId: string
  calculatedCost: number
  totalHours: number
  weekendHours: number
  holidayHours: number
  overtimeHours: number
  calculatedAtUtc: string
  taskCosts: ProjectTaskCost[]
}
