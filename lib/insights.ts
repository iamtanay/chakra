import type { Task, Project, Category, TaskOccurrence } from '@/types'

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
  driftByCategory: DriftEntry[]
  insights: string[]
  completedTasks: Task[]
}

export interface DriftEntry {
  category: Category
  /** actual / estimated ratio. 1.0 = spot on, >1 = took longer, <1 = faster */
  ratio: number
  sampleCount: number
}

export const MIN_DRIFT_SAMPLES = 3

function roundHours(raw: number): number {
  return Math.round(raw * 100) / 100
}

// ── Drift computation ─────────────────────────────────────────────────────────

export function computeDrift(completedTasks: Task[]): DriftEntry[] {
  const map = new Map<
    string,
    { totalActual: number; totalEstimated: number; count: number; category: Category }
  >()

  for (const task of completedTasks) {
    if (
      task.actual_hours == null ||
      task.estimated_hours == null ||
      task.actual_hours <= 0 ||
      task.estimated_hours <= 0
    ) {
      continue
    }

    const existing = map.get(task.category)
    if (existing) {
      existing.totalActual    += task.actual_hours
      existing.totalEstimated += task.estimated_hours
      existing.count          += 1
    } else {
      map.set(task.category, {
        totalActual:    task.actual_hours,
        totalEstimated: task.estimated_hours,
        count:          1,
        category:       task.category,
      })
    }
  }

  const entries: DriftEntry[] = []

  for (const { totalActual, totalEstimated, count, category } of map.values()) {
    if (count < MIN_DRIFT_SAMPLES) continue
    if (totalEstimated === 0) continue

    entries.push({
      category,
      ratio:       Math.round((totalActual / totalEstimated) * 100) / 100,
      sampleCount: count,
    })
  }

  return entries.sort((a, b) => b.ratio - a.ratio)
}

export function driftLabel(entry: DriftEntry): string {
  const { category, ratio } = entry
  const SPOT_ON_TOLERANCE = 0.1

  if (Math.abs(ratio - 1.0) <= SPOT_ON_TOLERANCE) {
    return `Your ${category} estimates are spot on.`
  }

  if (ratio > 1.0) {
    const rounded = Math.round(ratio * 10) / 10
    return `Your ${category} tasks take ${rounded}× longer than estimated.`
  }

  const pctFaster = Math.round((1 - ratio) * 100)
  return `Your ${category} tasks take ${pctFaster}% less time than estimated.`
}

export function getDriftSuggestion(
  category: Category,
  allTasks: Task[],
  estimatedHours: number,
): { adjustedHours: number; ratio: number; sampleCount: number } | null {
  if (!estimatedHours || estimatedHours <= 0) return null

  const completedWithBoth = allTasks.filter(
    (t) =>
      t.status === 'Done' &&
      t.category === category &&
      t.actual_hours != null &&
      t.estimated_hours != null &&
      t.actual_hours > 0 &&
      t.estimated_hours > 0,
  )

  if (completedWithBoth.length < MIN_DRIFT_SAMPLES) return null

  const totalActual    = completedWithBoth.reduce((s, t) => s + (t.actual_hours ?? 0), 0)
  const totalEstimated = completedWithBoth.reduce((s, t) => s + (t.estimated_hours ?? 0), 0)

  if (totalEstimated === 0) return null

  const ratio         = totalActual / totalEstimated
  const adjustedHours = Math.round(estimatedHours * ratio * 4) / 4

  if (Math.abs(ratio - 1.0) <= 0.1) return null

  return {
    adjustedHours,
    ratio:       Math.round(ratio * 100) / 100,
    sampleCount: completedWithBoth.length,
  }
}

// ── Main report generator ─────────────────────────────────────────────────────

export function generateReportData(
  tasks: Task[],
  projects: Project[],
  timeRange: 'week' | 'month' | 'year',
  currentUserId?: string | null,
  occurrences: TaskOccurrence[] = [],   // ← NEW param (defaults to [] for backward compat)
): ReportData {
  const now = new Date()
  const startDate = new Date()

  if (timeRange === 'week') {
    const day = now.getDay()
    const diffToMonday = (day === 0 ? -6 : 1 - day)
    startDate.setDate(now.getDate() + diffToMonday)
    startDate.setHours(0, 0, 0, 0)
  } else if (timeRange === 'month') {
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)
  } else {
    startDate.setMonth(0, 1)
    startDate.setHours(0, 0, 0, 0)
  }

  // ── Non-recurring completed tasks in range ────────────────────────────────
  const nonRecurringCompleted = tasks.filter((task) => {
    if (!task.completed_at) return false
    if (task.is_recurring) return false   // handled via occurrences below
    if (new Date(task.completed_at) < startDate) return false
    if (currentUserId && task.completed_by !== currentUserId) return false
    return true
  })

  // ── Recurring occurrences in range ────────────────────────────────────────
  // Build a lookup so we can enrich occurrences with task metadata (category, project, etc.)
  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  const recurringOccurrencesInRange = occurrences.filter((o) => {
    if (new Date(o.completed_at) < startDate) return false
    if (currentUserId && o.completed_by && o.completed_by !== currentUserId) return false
    return true
  })

  // ── Combined counts & hours ───────────────────────────────────────────────
  const tasksCompleted = nonRecurringCompleted.length + recurringOccurrencesInRange.length

  const nonRecurringHours = nonRecurringCompleted.reduce(
    (sum, task) => sum + (task.actual_hours ?? task.estimated_hours ?? 0), 0
  )
  const recurringHours = recurringOccurrencesInRange.reduce(
    (sum, o) => sum + (o.actual_hours ?? 0), 0
  )
  const totalHoursRaw = nonRecurringHours + recurringHours

  const projectsMap = new Map(projects.map((p) => [p.id, p]))

  // ── Build by-project map ──────────────────────────────────────────────────
  const byProjectMap = new Map<string, {
    projectId: string
    projectName: string
    projectColor: string
    projectType: string
    count: number
    hours: number
  }>()

  const addToProjectMap = (projectId: string, hours: number) => {
    const project = projectsMap.get(projectId)
    if (!project) return
    const existing = byProjectMap.get(projectId)
    if (existing) {
      existing.count += 1
      existing.hours += hours
    } else {
      byProjectMap.set(projectId, {
        projectId,
        projectName:  project.name,
        projectColor: project.color,
        projectType:  project.type,
        count: 1,
        hours,
      })
    }
  }

  for (const task of nonRecurringCompleted) {
    addToProjectMap(task.project_id, task.actual_hours ?? task.estimated_hours ?? 0)
  }
  for (const o of recurringOccurrencesInRange) {
    const task = taskMap.get(o.task_id)
    if (task) addToProjectMap(task.project_id, o.actual_hours ?? 0)
  }

  // ── Build by-category map ─────────────────────────────────────────────────
  const byCategoryMap = new Map<string, { category: Category; count: number; hours: number }>()

  const addToCategoryMap = (category: Category, hours: number) => {
    const existing = byCategoryMap.get(category)
    if (existing) {
      existing.count += 1
      existing.hours += hours
    } else {
      byCategoryMap.set(category, { category, count: 1, hours })
    }
  }

  for (const task of nonRecurringCompleted) {
    addToCategoryMap(task.category, task.actual_hours ?? task.estimated_hours ?? 0)
  }
  for (const o of recurringOccurrencesInRange) {
    const task = taskMap.get(o.task_id)
    if (task) addToCategoryMap(task.category, o.actual_hours ?? 0)
  }

  const byProject = Array.from(byProjectMap.values()).map((p) => ({
    ...p,
    hours: roundHours(p.hours),
  }))
  const byCategory = Array.from(byCategoryMap.values()).map((c) => ({
    ...c,
    hours: roundHours(c.hours),
  }))

  const projectsActive = new Set([
    ...nonRecurringCompleted.map((t) => t.project_id),
    ...recurringOccurrencesInRange.map((o) => taskMap.get(o.task_id)?.project_id).filter(Boolean) as string[],
  ]).size

  const categoriesUsed = new Set([
    ...nonRecurringCompleted.map((t) => t.category),
    ...recurringOccurrencesInRange.map((o) => taskMap.get(o.task_id)?.category).filter(Boolean) as Category[],
  ]).size

  // ── Drift: all-time completed (non-recurring only — need est vs actual) ────
  const driftByCategory = computeDrift(
    tasks.filter((t) => t.status === 'Done' && !t.is_recurring && (!currentUserId || t.completed_by === currentUserId))
  )

  // ── Insights ──────────────────────────────────────────────────────────────
  const insights: string[] = []

  if (tasksCompleted >= 3) {
    const topCategoryByHours = byCategory.reduce(
      (max, current) => (current.hours > max.hours ? current : max),
      { category: 'Development' as Category, count: 0, hours: 0 }
    )

    const rangeLabel =
      timeRange === 'week' ? 'this week'
      : timeRange === 'month' ? 'this month'
      : 'this year'

    insights.push(
      `Most time spent on: ${topCategoryByHours.category} ${rangeLabel} — ${topCategoryByHours.hours}h`
    )

    if (topCategoryByHours.hours > 0 && byCategory.length > 0) {
      const ratio = topCategoryByHours.hours / topCategoryByHours.count
      const averageEstimate =
        byCategory.reduce((sum, cat) => {
          const catTasks = nonRecurringCompleted.filter((t) => t.category === cat.category)
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
    totalHours:      roundHours(totalHoursRaw),
    projectsActive,
    categoriesUsed,
    byProject:       byProject.sort((a, b) => b.hours - a.hours),
    byCategory:      byCategory.sort((a, b) => b.hours - a.hours),
    driftByCategory,
    insights,
    // completedTasks stays as non-recurring only (for the task list in the report UI)
    completedTasks:  nonRecurringCompleted.sort(
      (a, b) =>
        new Date(b.completed_at || 0).getTime() -
        new Date(a.completed_at || 0).getTime()
    ),
  }
}
