# Zyrco — Habit Tracker

Desktop habit tracker built with Tauri 2 + React 18 + TypeScript. Local-first, no account required.

## Stack

| Layer | Tech |
|-------|------|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | React 19, TypeScript 5.8, Vite 7 |
| Database | SQLite via `@tauri-apps/plugin-sql` (local, no cloud) |
| Styling | CSS custom properties, no utility framework |
| i18n | react-i18next — English + Spanish |

## Dev setup

```bash
npm install
npm run tauri dev      # dev server + Tauri window
npx tsc --noEmit       # type check
npm run tauri build    # production .exe installer
```

## Features

### Habit management
- Daily / weekly / custom schedules (weekdays, month-days, every N days)
- Start date, end date, time windows
- Categories with color + icon — auto-matched when adding from template library
- Archive / delete with full history preserved
- **Pause a habit** for 3/7/14/30 days without archiving

### Tracking
- **Binary** — explicit Done / Skip buttons per habit (skip creates a `completed=false` log, distinguishable from "no action")
- **Numeric** — count + unit, target threshold
- **Timer** — stopwatch or countdown modes; countdown auto-completes with motivational toast + haptic
- Retroactive logging — edit the last 30 days from the Habits page
- Skip individual days, notes per log entry
- Session grouping: Morning / Afternoon / Evening / Anytime

### Stats & motivation
- **6-card overview**: current streak, best streak, completion rate, total completions, perfect days, active days
- **Completion rate chart** (area chart) — per-day/week/month trend over selected period
- **Day-of-week distribution** (horizontal bar chart) — shows which days you perform best
- **EMA strength score** (0–100, 90-day window) shown as inline bar in habit rows
- **Streak milestone badges** with 🏆 crown at 7 / 21 / 30 / 66 / 100 days
- **Streak freeze / grace days** — 0/1/2 missed days before a streak breaks (Settings)
- **Annual heatmap** (52×7 grid) in Stats page
- **Perfect Day banner** — circular SVG ring showing daily completion %
- **Weekly digest** — summary card shown once per week

### UX
- **First-run onboarding** — pick a starter habit template in < 60 seconds
- **Template library** — 27 pre-built habits in 6 categories (bilingual EN/ES), always visible inline in the Habits page
- **Compact view** toggle in Today header
- **At-risk banner** after 20:00 when pending habits have streak ≥ 3
- **Habit count advisory** — soft warning at habit #8
- **Monthly + Weekly + Daily calendar views** — weekly day click stays in weekly mode, showing that day's habits below
- **Import / Export** — JSON (full data) and CSV (log history); uses OS native save dialog on Windows/macOS
- Responsive layout — works from 600 px mobile to 1920 px+ widescreen

## Project structure

```
src/
├── components/    # HabitForm, TemplateLibrary, HabitCalendar, Onboarding, RetroLogModal,
│                  # AnnualHeatmap, StreakBadge, WeeklyDigest, ImportExport, Modal...
├── pages/         # Today, Habits, HabitDetail, Stats, Todos, Settings
├── hooks/         # useHabits, useLogs, useStats, useCategories, useSkips, useTodayProgress
├── db/            # database.ts — SQLite singleton, all CRUD + idempotent ALTER TABLE migrations
├── data/          # habitTemplates.ts — 27 bilingual templates
├── utils/         # schedule.ts — isHabitDueOnDay (single source of truth)
├── types/         # index.ts — all shared interfaces
└── i18n/          # locales/en.json + locales/es.json
src-tauri/         # Rust backend
```

## localStorage keys

| Key | Default | Purpose |
|-----|---------|---------|
| `zyrco-theme` | `"system"` | light / dark / system |
| `zyrco-language` | `"en"` | en / es |
| `zyrco-grace-days` | `"1"` | streak freeze (0/1/2 days) |
| `zyrco-compact-view` | `"false"` | compact habit list in Today |
| `zyrco-onboarding-done` | unset | first-run onboarding flag |
| `zyrco-timers` | `{}` | active timer state per habit (survives page nav) |

## DB schema notes

- Tables: `categories`, `habits`, `logs`, `todos`, `skips`
- Habit columns added via migration: `session`, `completion_type`, `completion_target`, `completion_unit`, `paused_until`, `start_date`, `end_date`, `interval_days`, `custom_type`
- Log columns added via migration: `value` (numeric completion value)
- `logs.completed = 0` means explicitly skipped; absence of a log row means no action taken

## Pending

- OS notifications: plugin installed, background scheduling not wired yet
- System tray quick check-in
- No tests — Vitest setup pending
- App icon uses Tauri default
