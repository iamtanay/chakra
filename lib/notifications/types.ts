// lib/notifications/types.ts
//
// Shared types for the notification subsystem.

export interface PushSubscriptionRow {
  id:         string
  user_id:    string
  endpoint:   string
  p256dh:     string
  auth:       string
  user_agent: string | null
  created_at: string
  updated_at: string
}

// Minimal task shape needed for notification payloads
// (matches what the cron routes SELECT)
export interface TaskRow {
  id:           string
  title:        string
  status:       string
  priority?:    string
  today_flag:   boolean
  due_date?:    string | null
  next_due_date?: string | null
  is_recurring?:  boolean
  actual_hours?:  number | null
  completed_at?:  string | null
  project_id:   string
  projects?: {
    name:  string
    color: string
  } | null
}

// The JSON object sent inside a push message
export interface PushPayload {
  title:  string
  body:   string
  type:   'morning' | 'evening'
  badge?: string
  data?:  Record<string, unknown>
}
