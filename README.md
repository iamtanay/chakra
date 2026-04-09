# ⚡ Chakra

> **Personal Work Telemetry** — a mobile-first PWA that keeps your tasks, habits, and output in one calm, focused place.

Chakra is built for people who want deep insight into how they actually spend their time — not just a to-do list. It tracks tasks, projects, habits, streaks, and focus areas, then surfaces smart insights about where your hours really go. No subscription. No paid tier. No noise.

---

## ✨ Features

### 🗂️ Canvas — Your Task Board
The main workspace. Three views, one shortcut:

- **Kanban** — classic Todo / In Progress / Done columns with drag-and-drop on desktop and swipe gestures on mobile
- **List** — flat, scannable task list with inline filtering
- **Calendar** — see your tasks laid out by due date

Switch between views instantly from the top bar. On mobile, the board adapts automatically.

---

### 📅 Today — Daily Focus Mode
A dedicated daily view that cuts through everything else:

- Shows only tasks flagged for today, sorted by priority
- Highlights recurring tasks due today with their recurrence label (daily, weekly, etc.)
- Tracks your **warm streak** — consecutive days you've completed at least one task
- Includes the **Karma widget** in full checklist mode (see below)
- Live **Daily Pulse** header showing tasks completed and hours logged so far today

---

### 🏠 Home — Dashboard & Insights
A smart overview of your productivity across time:

- **Time-ranged reports** — toggle between This Week, This Month, and This Year
- **Tasks completed** and **hours logged** with breakdowns by project and category
- **Effort drift analysis** — compares your estimated vs. actual hours per category. After 3+ data points in a category, Chakra tells you whether you consistently under- or over-estimate that kind of work
- **Active projects** summary with colour-coded breakdown
- **Karma widget** in compact mode — your streak score at a glance
- Personalised time-of-day greeting (yes, it knows when you're burning midnight oil)

---

### 🌊 Streams — Shared Focus Channels
Lightweight collaborative spaces, separate from your project board:

- **Four stream types**: Checklist, Notes, Links, or Layers (mixed)
- **Checklist streams** show a live progress bar (items done / total)
- Pin important streams to the top; archive ones you're done with
- **Share streams** with other users — they get their own view into the same stream
- Per-stream activity timestamp ("updated 3h ago")
- Streams you own vs. streams shared with you are distinguished clearly

---

### 🧘 Karma — Daily Ritual Tracker
A habit streak system built into Today and Home:

- Comes pre-loaded with six default rituals: Meditate, Workout, Read, Go outside, Drink water, Reflect
- Tick rituals off as you do them each day — all must be complete for the day to count
- **Karma score** = consecutive fully-completed days (your streak)
- Fully customisable — add, rename, reorder, or delete rituals; choose from a curated emoji palette grouped by theme
- Score resets gracefully: today only counts once every ritual is ticked

---

### 🗃️ Spaces — Project Management
Group your tasks into meaningful workspaces:

- Projects typed as **Work**, **Study**, or **Personal** — each with its own colour
- Per-project task counts and progress at a glance
- **Share projects** with other users by email — set them as viewer or editor
- Inline task creation from the project card
- Full project editing and deletion with confirmation

---

### 🔁 Recurring Tasks
Set tasks to repeat automatically, never lose track of habits:

- Frequencies: **daily, weekly, monthly, annual**
- Fine-grained control: day of week, day of month, specific month
- Automatic cycle advancement on completion — the task resets itself with a new due date
- **Current streak** tracked per recurring task
- Recurring tasks appear in Today view when they're due

---

### 🔔 Push Notifications
Two smart daily briefings, no app open required:

| Time | What it does |
|---|---|
| **11:00 AM** | Morning briefing — lists your pending Today-flagged tasks |
| **8:00 PM** | Evening reminder — prompts you to log completed work |

The evening notification is **skipped entirely** if there's nothing actionable — no unlogged tasks, no pending today items. It's designed to never be noise.

Powered by Web Push (VAPID) + Vercel Cron. Works on iOS via PWA (Add to Home Screen), Android, and desktop Chrome.

---

### 🌗 Dark / Light Theme
Full dark and light mode support with zero flash on load. The theme is stored and applied before the page renders, so there's no flicker between system preference and the app.

---

### 📱 Mobile PWA
Chakra is a Progressive Web App — install it on your iPhone or Android home screen and it feels like a native app:

- Bottom navigation bar on mobile
- Swipe gestures on the Kanban board
- Bottom sheet modals instead of desktop-style overlays
- Offline-capable service worker

---

## 🛠 Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database + Auth | Supabase |
| Hosting | Vercel |
| Styling | Tailwind CSS |
| Push notifications | Web Push (VAPID) + Vercel Cron |
| Language | TypeScript |

Everything runs on free tiers. No paid services required.

---

## 📋 Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free)
- A [Vercel](https://vercel.com) account (free Hobby plan)
- Git

---

## 🚀 Local setup

### 1. Clone the repo
```bash
git clone https://github.com/iamtanay/chakra.git
cd chakra
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create your environment file

Create a `.env.local` file in the root:
```bash
touch .env.local
```

Fill it in — see the **Environment variables** section below for where to get each value.
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
CRON_SECRET=
```

### 4. Run locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔑 Environment variables

### `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

1. Go to [supabase.com](https://supabase.com) → your project → **Settings** → **API**
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### `SUPABASE_SERVICE_ROLE_KEY`

Same page as above. Copy the **service_role** key (labelled "Secret"). Used server-side only by the notification cron routes to bypass RLS and read all subscriptions.

> ⚠️ Never expose this in client-side code or commit it to git.

### `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`

VAPID keys authenticate your server when sending push notifications. Generate them once:
```bash
node scripts/generate-vapid-keys.mjs
```

Copy the two values from the output. Generate once and store them — they never change.

> ⚠️ The private key must stay secret. Never commit it to git.

### `VAPID_EMAIL`

Your email address, e.g. `you@example.com`. Used as a contact in the VAPID header.

### `CRON_SECRET`

A random secret that protects your cron routes. Generate one:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🗄️ Supabase setup

### 1. Create a project

Go to [supabase.com](https://supabase.com) → **New project**. Pick a name, region, and password. Wait for it to provision.

### 2. Enable email auth

Go to **Authentication** → **Providers** → **Email** → make sure it is enabled. Turn off **Confirm email** if you want to sign in immediately without a confirmation step.

### 3. Create your user

Go to **Authentication** → **Users** → **Add user**. Enter your email and password. This is the account you will log in with.

### 4. Run the migrations

Go to **SQL Editor** and run each migration file in order:

**Migration 1** — paste and run:
```
supabase/migrations/20260325141644_create_projects_and_tasks_tables.sql
```

**Migration 2** — paste and run:
```
supabase/migrations/20260328000000_add_recurring_tasks.sql
```

**Migration 3** — paste and run:
```
supabase/migrations/20260329000000_add_push_subscriptions.sql
```

Run them in this order. Each one builds on the previous.

### 5. Verify

Go to **Table Editor** — you should see three core tables: `projects`, `tasks`, and `push_subscriptions`, plus `streams`, `stream_items`, `stream_members`, `karma_rituals`, `karma_logs`, and `task_occurrences`.

---

## ☁️ Deploying to Vercel

### 1. Push your code to GitHub
```bash
git add .
git commit -m "initial commit"
git push origin main
```

### 2. Import the project on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Framework will be auto-detected as **Next.js**
4. Do not deploy yet — add environment variables first

### 3. Add environment variables

Go to **Settings** → **Environment Variables** and add all 7 variables. For each one, select **Production**, **Preview**, and **Development**.

| Variable | Type |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public |
| `VAPID_PRIVATE_KEY` | Secret |
| `VAPID_EMAIL` | Plain |
| `CRON_SECRET` | Secret |

### 4. Deploy

Click **Deploy**. Vercel will build and deploy the app.

### 5. Verify cron jobs

Go to **Settings** → **Crons**. You should see two entries:

| Schedule | Route | Time (IST) |
|---|---|---|
| `30 5 * * *` | `/api/cron/notify-morning` | 11:00 AM |
| `30 14 * * *` | `/api/cron/notify-evening` | 08:00 PM |

If they are not there, make sure `vercel.json` is committed and redeploy.

---

## 📲 Setting up push notifications on iPhone

1. Open Safari on your iPhone and go to your Vercel app URL
2. Tap the **Share** button → **Add to Home Screen** → **Add**
3. Open Chakra from the **home screen icon** (not from Safari — push only works in PWA mode)
4. Tap **More** in the bottom nav → find the **Notifications** toggle
5. Tap it — iOS will show a permission prompt → tap **Allow**

To test immediately without waiting for the scheduled time:
```bash
# macOS / Linux
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/notify-morning
```
```powershell
# Windows PowerShell
(Invoke-WebRequest -Uri "https://your-app.vercel.app/api/cron/notify-morning" -Headers @{ "Authorization" = "Bearer YOUR_CRON_SECRET" }).Content
```

Expected response: `{"success":true,"sent":1,"skipped":0,"failed":0}`

If you get `skipped: 1` — open Chakra, flag at least one task as **Today**, then try again.

---

## 📁 Project structure

```
chakra/
├── app/
│   ├── api/cron/
│   │   ├── notify-morning/route.ts   # 11 AM IST cron
│   │   └── notify-evening/route.ts   # 8 PM IST cron
│   ├── canvas/                       # Main task board (Kanban / List / Calendar)
│   ├── home/                         # Dashboard + insights + karma
│   ├── today/                        # Daily focus view
│   ├── spaces/                       # Project management
│   ├── streams/                      # Collaborative focus channels
│   ├── login/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── board/                        # KanbanBoard, MobileBoard, TaskCard
│   ├── karma/                        # KarmaWidget (rituals + streak)
│   ├── layout/                       # Sidebar, BottomNav, DailyPulse
│   ├── modals/                       # TaskModal, CompleteModal
│   ├── projects/                     # ProjectCard, ProjectModal, ShareModal
│   ├── streams/                      # StreamCard, StreamDetail, StreamCreateModal, StreamShareModal
│   ├── ui/                           # Button, Input, NotificationToggle, PillToggle, etc.
│   └── views/                        # ListView, CalendarView
├── hooks/
│   ├── useMediaQuery.ts
│   ├── usePushNotifications.ts       # Push subscription lifecycle
│   └── useTheme.ts
├── lib/
│   ├── notifications/
│   │   ├── buildPayload.ts           # Notification message formatting
│   │   └── types.ts
│   ├── database.types.ts
│   ├── insights.ts                   # Report generation + drift analysis
│   ├── recurrence.ts                 # Recurring task logic + streak tracking
│   ├── supabase.ts
│   └── viewContext.tsx
├── public/
│   ├── sw.js                         # Service worker
│   ├── manifest.json
│   └── icons/
├── supabase/migrations/
├── scripts/
│   └── generate-vapid-keys.mjs
├── types/index.ts
├── middleware.ts
├── vercel.json                       # Cron schedule
└── next.config.js
```

---

## 📝 Notes

- **Single-user by default**, but the schema supports up to ~10 users. The `push_subscriptions`, `stream_members`, and `project_members` tables all have `user_id` columns and RLS policies in place — multi-user is mostly wiring, not rearchitecting.
- **Push notifications on iOS** require the app to be opened from the home screen icon. Opening it in Safari browser does not support push.
- **Evening notification** is skipped entirely if there is nothing actionable. This is intentional — it should never feel like noise.
- **VAPID keys** should be generated once and never rotated. Rotating them invalidates all existing push subscriptions and users would need to re-subscribe.
- **Effort drift** requires at least 3 completed tasks in a category with both estimated and actual hours filled in before it surfaces a signal. It's intentionally conservative.
- **Karma streak** only counts a day as complete if every configured ritual is ticked. Partial days don't extend the streak.
