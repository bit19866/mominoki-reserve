# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev    # Start dev server (runs on :3000, falls back to :3001 if busy)
npm run build  # Build for production
npm run lint   # ESLint check
```

**Important:** After changing `npm run dev` port, update `NEXT_PUBLIC_APP_URL` in `.env.local` to match. The availability API makes internal HTTP calls to this URL — a mismatch causes all slots to appear fully booked.

## Architecture

**Stack:** Next.js 14 App Router · Supabase (Postgres + Auth) · Tailwind CSS · TypeScript

### Route Structure

| Route | Description |
|-------|-------------|
| `/` | Customer-facing top page (menus fetched from DB, grouped by category) |
| `/reserve` | Multi-step reservation wizard (requires auth) |
| `/my-reservations` | Customer's reservation list + cancellation |
| `/admin` | Admin schedule grid (`予約管理表`) |
| `/admin/shifts` | Shift management |
| `/admin/analytics` | Sales analytics |
| `/admin/menus` | Menu CRUD |
| `/admin/staff` | Staff CRUD |
| `/admin/settings` | Store settings |
| `/print` | Print-only schedule (separate layout, no sidebar) |
| `/auth/login` | Login page |

### Authentication & Authorization

Middleware at `src/middleware.ts` handles all auth:
- `/admin/*` → requires auth + row in `admin_users` table
- `/admin/compensation` → requires `admin_users.role = 'owner'`
- `/reserve`, `/my-reservations` → requires auth
- Public routes: `/`, `/auth/*`

Two Supabase clients exist:
- `src/lib/supabase/client.ts` — browser (Client Components)
- `src/lib/supabase/server.ts` — server (Server Components, API routes, middleware)

### Reservation Wizard Flow

`src/components/reservation/ReservationWizard.tsx` manages state across 5 steps:
1. **StepDate** — date picker (blocks store holidays from `store_holidays` table)
2. **StepMenu** — menu selection from DB
3. **StepStaff** — optional staff designation (+¥1,650 fee)
4. **StepTime** — shows current time + "今すぐ予約" button + grouped time picker (10-min slots)
5. **StepConfirm** — customer info + payment method selection (`cash` | `online`)

### Availability Logic (`/api/availability`)

The critical booking engine. Determines slot availability by:
1. Checking store holidays
2. Reading settings: `business_start_time`, `last_checkin_time`, `cutoff_minutes_before`, `reservation_slot_minutes`, `total_beds`
3. Filtering past slots using **local-time minutes comparison** (not Date objects, to avoid UTC timezone bugs):
   ```ts
   const nowMinutes = now.getHours() * 60 + now.getMinutes()
   if (minutes <= nowMinutes + cutoffMinutes) isCutoffPassed = true
   ```
4. Checking staff shift hours and day-offs
5. Checking bed count against concurrent reservations

The `isToday` check uses string comparison to avoid timezone issues:
```ts
const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
const isToday = date === todayStr
```

### Admin Schedule Grid

`src/components/admin/ScheduleGrid.tsx`:
- Staff name column is sticky (CSS `position: sticky; left: 0`)
- Click empty grid cell → opens `ManualReservationModal` pre-filled with staff/time
- Each staff row has a colored left border accent (`rowAccentColors` array)
- 会計 button triggers `ReservationEditModal`

### Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Customer profiles (linked to Supabase Auth) |
| `staff` | Staff members |
| `menus` | Services (category, price, duration_minutes) |
| `reservations` | Bookings (status: confirmed/cancelled/completed, payment_method: cash/online) |
| `settings` | Key-value store config (business hours, slot interval, etc.) |
| `admin_users` | Admin whitelist (role: owner or staff) |
| `store_holidays` | Closed dates |
| `staff_day_offs` | Per-staff off days |
| `weekly_shift_templates` | Default weekly shift patterns |
| `shift_overrides` | One-off shift changes |

### Key Settings (in `settings` table)

| Key | Default | Description |
|-----|---------|-------------|
| `business_start_time` | `10:00` | Opening time |
| `last_checkin_time` | `23:00` | Last booking time |
| `cutoff_minutes_before` | `60` | How far ahead required to book |
| `reservation_slot_minutes` | `10` | Time slot granularity |
| `total_beds` | `5` | Max concurrent reservations |

### Email

Resend is used for transactional email:
- Confirmation: `/api/email/confirmation` — triggered after reservation creation
- Reminder: `/api/email/reminder` — Vercel cron at UTC 11:00 (JST 20:00)

### Payment

`payment_method` column on `reservations` is `cash` (default) or `online`. Online payment UI shows "準備中" — Stripe integration is planned but not implemented.
