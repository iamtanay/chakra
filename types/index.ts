export type Priority = 'High' | 'Medium' | 'Low'

export type Category =
  | 'Document Generation'
  | 'Journal Writing'
  | 'Research'
  | 'Development'
  | 'Review / QA'
  | 'Design'

export type Status = 'Todo' | 'In Progress' | 'Done'

export type ProjectType = 'Work' | 'Study' | 'Personal'

export interface Project {
  id: string
  name: string
  color: string
  type: ProjectType
  created_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: Status
  priority: Priority
  category: Category
  due_date: string | null
  estimated_hours: number | null
  actual_hours: number | null
  today_flag: boolean
  created_at: string
  completed_at: string | null
}

export interface DailyPulse {
  tasks_completed_today: number
  hours_today: number
  top_project: string | null
}

export interface ReportInsight {
  line: string
}

export interface TaskWithProject extends Task {
  project?: Project
}
