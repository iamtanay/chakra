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
  // ── Drift ──────────────────────────────────────────────────────────────────
  // Only included for categories that have ≥ MIN_DRIFT_SAMPLES tasks with
  // both estimated_hours and actual_hours logged.
  driftByCategory: DriftEntry[]
  insights: string[]
  completedTasks: Task[]
}

export interface DriftEntry {
  category: Category
  /** actual / estimated ratio. 1.0 = spot on, >1 = took longer, <1 = faster */
  ratio: number
  /** Number of tasks used to compute this ratio (only those with both est + actual) */
  sampleCount: number
}

/**
 * Minimum number of tasks that must have BOTH estimated_hours and actual_hours
 * before we surface a Drift figure. Below this threshold the data isn't
 * meaningful enough to present as a pattern.
 */
export const MIN_DRIFT_SAMPLES = 3

/**
 * Round a raw hours value to 2 decimal places.
 * 15 min (0.25 h) → 0.25, NOT 0.3.
 */
function roundHours(raw: number): number {
  return Math.round(raw * 100) / 100
}

// ── Drift computation ─────────────────────────────────────────────────────────

/**
 * Compute the actual/estimated hours ratio per category across all
 * completed tasks that have both values logged.
 *
 * Only returns entries where sampleCount >= MIN_DRIFT_SAMPLES.
 * Sorted by ratio descending (most over-estimated categories first).
 */
export function computeDrift(completedTasks: Task[]): DriftEntry[] {
  // Accumulate per category
  const map = new Map<
    string,
    { totalActual: number; totalEstimated: number; count: number; category: Category }
  >()

  for (const task of completedTasks) {
    // Both values must exist and be positive to be meaningful
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

  // Sort: largest ratio first (most underestimated → most interesting)
  return entries.sort((a, b) => b.ratio - a.ratio)
}

/**
 * Returns a human-readable Drift string for display in the Reports page.
 *
 * Examples:
 *   ratio 1.4  → "Your Development tasks take 1.4× longer than estimated."
 *   ratio 0.6  → "Your Design tasks take 40% less time than estimated."
 *   ratio 1.05 → "Your Research estimates are spot on."
 */
export function driftLabel(entry: DriftEntry): string {
  const { category, ratio } = entry
  const SPOT_ON_TOLERANCE = 0.1   // ±10% = "spot on"

  if (Math.abs(ratio - 1.0) <= SPOT_ON_TOLERANCE) {
    return `Your ${category} estimates are spot on.`
  }

  if (ratio > 1.0) {
    const rounded = Math.round(ratio * 10) / 10
    return `Your ${category} tasks take ${rounded}× longer than estimated.`
  }

  // ratio < 1.0 — faster than estimated
  const pctFaster = Math.round((1 - ratio) * 100)
  return `Your ${category} tasks take ${pctFaster}% less time than estimated.`
}

/**
 * Given a category and completed tasks, return the suggested actual hours
 * for a new task of that category based on the Drift ratio.
 *
 * Returns null if there aren't enough samples (< MIN_DRIFT_SAMPLES).
 *
 * Usage in TaskModal:
 *   const suggestion = getDriftSuggestion('Development', tasks, 2)
 *   // → { adjustedHours: 2.8, ratio: 1.4, sampleCount: 5 } or null
 */
export function getDriftSuggestion(
  category: Category,
  allTasks: Task[],
  estimatedHours: number,
): { adjustedHours: number; ratio: number; sampleCount: number } | null {
  if (!estimatedHours || estimatedHours <= 0) return null

  // Use ALL completed tasks (not time-ranged) for more robust suggestions —
  // the more history the better.
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
  const adjustedHours = Math.round(estimatedHours * ratio * 4) / 4  // round to nearest 0.25h

  // Don't surface a suggestion if the ratio is within ±10% (spot on)
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
  // Raw sum — rounded to 2dp on the way out
  const totalHoursRaw = completedTasks.reduce((sum, task) => {
    return sum + (task.actual_hours ?? task.estimated_hours ?? 0)
  }, 0)

  const projectsMap = new Map(projects.map((p) => [p.id, p]))

  // Build project map
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
    const hours   = task.actual_hours ?? task.estimated_hours ?? 0
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

  // Build category map
  const byCategoryMap = new Map<string, { category: Category; count: number; hours: number }>()

  for (const task of completedTasks) {
    const hours    = task.actual_hours ?? task.estimated_hours ?? 0
    const existing = byCategoryMap.get(task.category)
    if (existing) {
      existing.count += 1
      existing.hours += hours
    } else {
      byCategoryMap.set(task.category, { category: task.category, count: 1, hours })
    }
  }

  // Round hours to 2dp in each aggregated row
  const byProject = Array.from(byProjectMap.values()).map((p) => ({
    ...p,
    hours: roundHours(p.hours),
  }))
  const byCategory = Array.from(byCategoryMap.values()).map((c) => ({
    ...c,
    hours: roundHours(c.hours),
  }))

  const projectsActive = new Set(completedTasks.map((t) => t.project_id)).size
  const categoriesUsed = new Set(completedTasks.map((t) => t.category)).size

  // ── Drift (computed from ALL completed tasks for maximum signal) ──────────
  const driftByCategory = computeDrift(tasks.filter((t) => t.status === 'Done'))

  // ── Insights ──────────────────────────────────────────────────────────────
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
    totalHours:      roundHours(totalHoursRaw),
    projectsActive,
    categoriesUsed,
    byProject:       byProject.sort((a, b) => b.hours - a.hours),
    byCategory:      byCategory.sort((a, b) => b.hours - a.hours),
    driftByCategory,
    insights,
    completedTasks:  completedTasks.sort(
      (a, b) =>
        new Date(b.completed_at || 0).getTime() -
        new Date(a.completed_at || 0).getTime()
    ),
  }
}
