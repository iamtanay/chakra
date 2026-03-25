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
  let startDate = new Date()

  if (timeRange === 'month') {
    startDate.setMonth(now.getMonth() - 1)
  } else if (timeRange === 'quarter') {
    startDate.setMonth(now.getMonth() - 3)
  } else if (timeRange === 'year') {
    startDate.setFullYear(now.getFullYear() - 1)
  }

  const completedTasks = tasks.filter((task) => {
    if (!task.completed_at) return false
    return new Date(task.completed_at) >= startDate
  })

  const tasksCompleted = completedTasks.length
  const totalHours = completedTasks.reduce((sum, task) => {
    const hours = task.actual_hours ?? task.estimated_hours ?? 0
    return sum + hours
  }, 0)

  const projectsMap = new Map(projects.map((p) => [p.id, p]))

  const byProject = Array.from(
    completedTasks.reduce(
      (acc, task) => {
        const project = projectsMap.get(task.project_id)
        if (!project) return acc

        const key = task.project_id
        const existing = acc.get(key)
        const hours = task.actual_hours ?? task.estimated_hours ?? 0

        if (existing) {
          existing.count += 1
          existing.hours += hours
        } else {
          acc.set(key, {
            projectId: task.project_id,
            projectName: project.name,
            projectColor: project.color,
            projectType: project.type,
            count: 1,
            hours,
          })
        }

        return acc
      },
      new Map<
        string,
        {
          projectId: string
          projectName: string
          projectColor: string
          projectType: string
          count: number
          hours: number
        }
      >()
    )
  )

  const byCategory = Array.from(
    completedTasks.reduce(
      (acc, task) => {
        const key = task.category
        const hours = task.actual_hours ?? task.estimated_hours ?? 0

        const existing = acc.get(key)
        if (existing) {
          existing.count += 1
          existing.hours += hours
        } else {
          acc.set(key, {
            category: task.category,
            count: 1,
            hours,
          })
        }

        return acc
      },
      new Map<string, { category: Category; count: number; hours: number }>()
    )
  )

  const projectsActive = new Set(completedTasks.map((t) => t.project_id)).size
  const categoriesUsed = new Set(completedTasks.map((t) => t.category)).size

  const insights: string[] = []

  if (tasksCompleted >= 3) {
    const topCategoryByHours = byCategory.reduce(
      (max, current) => (current.hours > max.hours ? current : max),
      { category: 'Development' as Category, count: 0, hours: 0 }
    )

    const rangeLabel =
      timeRange === 'month'
        ? 'this month'
        : timeRange === 'quarter'
          ? 'this quarter'
          : 'this year'

    insights.push(
      `Most time spent on: ${topCategoryByHours.category} ${rangeLabel} — ${topCategoryByHours.hours}h`
    )

    if (topCategoryByHours.hours > 0) {
      const ratio = topCategoryByHours.hours / topCategoryByHours.count
      const averageEstimate = byCategory.reduce((sum, cat) => {
        const tasks = completedTasks.filter((t) => t.category === cat.category)
        const totalEstimate = tasks.reduce((s, t) => s + (t.estimated_hours ?? 0), 0)
        return sum + (totalEstimate > 0 ? totalEstimate / tasks.length : 0)
      }, 0) / byCategory.length

      if (ratio > averageEstimate * 1.3) {
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
    totalHours: Math.round(totalHours * 10) / 10,
    projectsActive,
    categoriesUsed,
    byProject: byProject.sort((a, b) => b.hours - a.hours),
    byCategory: byCategory.sort((a, b) => b.hours - a.hours),
    insights,
    completedTasks: completedTasks.sort(
      (a, b) =>
        new Date(b.completed_at || 0).getTime() -
        new Date(a.completed_at || 0).getTime()
    ),
  }
}
