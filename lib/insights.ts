import type { Task, Project, Category } from '@/types'

export interface ReportData {
  tasksCompleted: number
  totalHours: number
  projectsActive: number
  categoriesUsed: number
  byProject: Array<{
    projectId: string
    projectName: string
    projectColor: string
    projectType: string
    count: number
    hours: number
  }>
  byCategory: Array<{
    category: Category
    count: number
    hours: number
  }>
  insights: string[]
  completedTasks: Task[]
}

export function generateReportData(
  tasks: Task[],
  projects: Project[],
  timeRange: 'month' | 'quarter' | 'year'
): ReportData {
  const now = new Date()
  const startDate = new Date()

  if (timeRange === 'month') {
    startDate.setMonth(now.getMonth() - 1)
  } else if (timeRange === 'quarter') {
    startDate.setMonth(now.getMonth() - 3)
  } else {
    startDate.setFullYear(now.getFullYear() - 1)
  }

  const completedTasks = tasks.filter((task) => {
    if (!task.completed_at) return false
    return new Date(task.completed_at) >= startDate
  })

  const tasksCompleted = completedTasks.length
  const totalHours = completedTasks.reduce((sum, task) => {
    return sum + (task.actual_hours ?? task.estimated_hours ?? 0)
  }, 0)

  const projectsMap = new Map(projects.map((p) => [p.id, p]))

  // Build project map then extract values
  const byProjectMap = new Map<string, {
    projectId: string
    projectName: string
    projectColor: string
    projectType: string
    count: number
    hours: number
  }>()

  for (const task of completedTasks) {
    const project = projectsMap.get(task.project_id)
    if (!project) continue
    const hours = task.actual_hours ?? task.estimated_hours ?? 0
    const existing = byProjectMap.get(task.project_id)
    if (existing) {
      existing.count += 1
      existing.hours += hours
    } else {
      byProjectMap.set(task.project_id, {
        projectId:    task.project_id,
        projectName:  project.name,
        projectColor: project.color,
        projectType:  project.type,
        count: 1,
        hours,
      })
    }
  }

  // Build category map then extract values
  const byCategoryMap = new Map<string, { category: Category; count: number; hours: number }>()

  for (const task of completedTasks) {
    const hours = task.actual_hours ?? task.estimated_hours ?? 0
    const existing = byCategoryMap.get(task.category)
    if (existing) {
      existing.count += 1
      existing.hours += hours
    } else {
      byCategoryMap.set(task.category, { category: task.category, count: 1, hours })
    }
  }

  const byProject  = Array.from(byProjectMap.values())
  const byCategory = Array.from(byCategoryMap.values())

  const projectsActive = new Set(completedTasks.map((t) => t.project_id)).size
  const categoriesUsed = new Set(completedTasks.map((t) => t.category)).size

  const insights: string[] = []

  if (tasksCompleted >= 3) {
    const topCategoryByHours = byCategory.reduce(
      (max, current) => (current.hours > max.hours ? current : max),
      { category: 'Development' as Category, count: 0, hours: 0 }
    )

    const rangeLabel =
      timeRange === 'month' ? 'this month'
      : timeRange === 'quarter' ? 'this quarter'
      : 'this year'

    insights.push(
      `Most time spent on: ${topCategoryByHours.category} ${rangeLabel} — ${topCategoryByHours.hours}h`
    )

    if (topCategoryByHours.hours > 0 && byCategory.length > 0) {
      const ratio = topCategoryByHours.hours / topCategoryByHours.count
      const averageEstimate =
        byCategory.reduce((sum, cat) => {
          const catTasks = completedTasks.filter((t) => t.category === cat.category)
          const totalEstimate = catTasks.reduce((s, t) => s + (t.estimated_hours ?? 0), 0)
          return sum + (totalEstimate > 0 ? totalEstimate / catTasks.length : 0)
        }, 0) / byCategory.length

      if (averageEstimate > 0 && ratio > averageEstimate * 1.3) {
        insights.push(
          `${topCategoryByHours.category} tasks take ${Math.round((ratio / averageEstimate) * 10) / 10}× estimated time on average`
        )
      }
    }

    const topProjectByCount = byProject.reduce(
      (max, current) => (current.count > max.count ? current : max),
      { projectId: '', projectName: '', projectColor: '', projectType: '', count: 0, hours: 0 }
    )

    if (topProjectByCount.projectName) {
      insights.push(
        `Highest output project: ${topProjectByCount.projectName} — ${topProjectByCount.count} tasks completed`
      )
    }
  }

  return {
    tasksCompleted,
    totalHours:   Math.round(totalHours * 10) / 10,
    projectsActive,
    categoriesUsed,
    byProject:  byProject.sort((a, b) => b.hours - a.hours),
    byCategory: byCategory.sort((a, b) => b.hours - a.hours),
    insights,
    completedTasks: completedTasks.sort(
      (a, b) =>
        new Date(b.completed_at || 0).getTime() -
        new Date(a.completed_at || 0).getTime()
    ),
  }
}