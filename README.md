# Chakra

**Personal Work Telemetry** — a mobile-first PWA for tracking tasks, projects, and daily output.

Chakra is built for people who want a calm, focused workspace to manage their day. It has a Kanban board, project grouping, recurring tasks, daily pulse metrics, and smart push notifications that brief you each morning and remind you to log your work each evening — all without any subscription or paid service.

---

## What it does

- **Kanban board** — Todo / In Progress / Done columns, drag and swipe on mobile
- **Projects** — grouped by Work, Study, Personal with colour coding
- **Recurring tasks** — daily, weekly, monthly, annual cycles
- **Today flag** — pin tasks to your current day's focus
- **Daily Pulse** — live header showing tasks completed and hours logged today
- **Reports** — weekly and historical output insights
- **Push notifications** — 11 AM morning briefing of pending tasks, 8 PM reminder to log completed work
- **Dark / Light theme** — with no flash on load
- **Mobile PWA** — installable on iPhone via Add to Home Screen

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database + Auth | Supabase |
| Hosting | Vercel |
| Styling | Tailwind CSS |
| Push notifications | Web Push (VAPID) + Vercel Cron |
| Language | TypeScript |

Everything is on free tiers. No paid services required.

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free)
- A [Vercel](https://vercel.com) account (free Hobby plan)
- Git

---

## Local setup

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

## Environment variables

### `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

1. Go to [supabase.com](https://supabase.com) → your project → **Settings** → **API**
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### `SUPABASE_SERVICE_ROLE_KEY`

Same page as above. Copy the **service_role** key (labelled "Secret"). This is used server-side only by the notification cron routes to bypass RLS and read all subscriptions.

> Never expose this in client-side code or commit it to git.

### `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`

VAPID keys authenticate your server when sending push notifications. Generate them once:
```bash
node scripts/generate-vapid-keys.mjs
```

Copy the two values from the output. They never change — generate once and store them.

> The private key must stay secret. Never commit it to git.

### `VAPID_EMAIL`

Just your email address, e.g. `you@example.com`. Used as a contact in the VAPID header.

### `CRON_SECRET`

A random secret that protects your cron routes from being triggered by anyone other than Vercel. Generate one:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Supabase setup

### 1. Create a project

Go to [supabase.com](https://supabase.com) → **New project**. Pick a name, region, and password. Wait for it to provision.

### 2. Enable email auth

Go to **Authentication** → **Providers** → **Email** → make sure it is enabled. Turn off **Confirm email** if you want to sign in immediately without a confirmation step.

### 3. Create your user

Go to **Authentication** → **Users** → **Add user**. Enter your email and password. This is the account you will log in with.

### 4. Run the migrations

Go to **SQL Editor** and run each migration file in order:

**Migration 1** — paste and run the contents of:
```
supabase/migrations/20260325141644_create_projects_and_tasks_tables.sql
```

**Migration 2** — paste and run the contents of:
```
supabase/migrations/20260328000000_add_recurring_tasks.sql
```

**Migration 3** — paste and run the contents of:
```
supabase/migrations/20260329000000_add_push_subscriptions.sql
```

Run them in this order. Each one builds on the previous.

### 5. Verify

Go to **Table Editor** — you should see three tables: `projects`, `tasks`, and `push_subscriptions`.

---

## Deploying to Vercel

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

Go to **Settings** → **Environment Variables** and add all 7 variables from the table above. For each one, select **Production**, **Preview**, and **Development**.

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

## Setting up push notifications on iPhone

1. Open Safari on your iPhone and go to your Vercel app URL
2. Tap the **Share** button → **Add to Home Screen** → **Add**
3. Open Chakra from the **home screen icon** (not from Safari — push only works in PWA mode)
4. Tap **More** in the bottom nav → find the **Notifications** toggle
5. Tap it — iOS will show a permission prompt → tap **Allow**

To test immediately without waiting for the scheduled time:
```powershell
# Windows PowerShell
(Invoke-WebRequest -Uri "https://your-app.vercel.app/api/cron/notify-morning" -Headers @{ "Authorization" = "Bearer YOUR_CRON_SECRET" }).Content
```
```bash
# macOS / Linux
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/notify-morning
```

Expected response: `{"success":true,"sent":1,"skipped":0,"failed":0}`

If you get `skipped: 1` — open Chakra, flag at least one task as **Today**, then try again.

---

## Project structure
```
chakra/
├── app/
│   ├── api/cron/
│   │   ├── notify-morning/route.ts   # 11 AM IST cron
│   │   └── notify-evening/route.ts   # 8 PM IST cron
│   ├── login/page.tsx
│   ├── projects/page.tsx
│   ├── reports/page.tsx
│   ├── page.tsx                      # Main board
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── board/                        # Kanban + mobile board
│   ├── layout/                       # Sidebar, BottomNav, DailyPulse
│   ├── modals/                       # Task + Complete modals
│   ├── projects/                     # Project card + modal
│   └── ui/                           # Button, Input, NotificationToggle, etc.
├── hooks/
│   ├── useMediaQuery.ts
│   ├── usePushNotifications.ts       # Push subscription lifecycle
│   └── useTheme.ts
├── lib/
│   ├── notifications/
│   │   ├── buildPayload.ts           # Notification message formatting
│   │   └── types.ts
│   ├── database.types.ts
│   ├── insights.ts
│   ├── recurrence.ts
│   └── supabase.ts
├── public/
│   ├── sw.js                         # Service worker
│   ├── manifest.json
│   └── icons...
├── supabase/migrations/
├── scripts/
│   └── generate-vapid-keys.mjs
├── types/index.ts
├── middleware.ts
├── vercel.json                       # Cron schedule
└── next.config.js
```

---

## Notes

- The app is currently single-user but the database and notification schema are designed for up to ~10 users. The `push_subscriptions` table has a `user_id` column and RLS policies in place.
- Push notifications on iOS require the app to be opened from the home screen icon. Opening in Safari browser does not support push.
- The evening notification is skipped entirely if there is nothing actionable — no unlogged tasks and no pending today-flagged tasks. This is intentional so it is never noise.
- VAPID keys should be generated once and never rotated. Rotating them invalidates all existing push subscriptions.