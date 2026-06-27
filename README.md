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
- Categories with color + icon
- Archive / delete with full history preserved
- **Pause a habit** for 3/7/14/30 days without archiving

### Tracking
- **Binary**, **Numeric** (count + unit), **Timer** (live stopwatch → logs minutes)
- Retroactive logging — edit the last 30 days from the Habits page
- Skip individual days, notes per log entry
- Session grouping: Morning / Afternoon / Evening / Anytime

### Stats & motivation
- **EMA strength score** (0–100, 90-day window) shown as inline bar in habit rows
- **Streak milestone badges** with 🏆 crown at 7 / 21 / 30 / 66 / 100 days
- **Streak freeze / grace days** — 0/1/2 missed days before a streak breaks (Settings)
- **Annual heatmap** (52×7 grid) in Stats page
- **Perfect Day banner** — circular SVG ring showing daily completion %

### UX
- **First-run onboarding** — pick a starter habit template in < 60 seconds
- **Template library** — 27 pre-built habits in 6 categories (bilingual EN/ES)
- **Compact view** toggle in Today header
- **At-risk banner** after 20:00 when pending habits have streak ≥ 3
- **Habit count advisory** — soft warning at habit #8
- Monthly calendar + day panel view

## Project structure

```
src/
├── components/    # HabitForm, TemplateLibrary, Onboarding, RetroLogModal, AnnualHeatmap, StreakBadge...
├── pages/         # Today, Habits, Stats, Todos, Settings
├── hooks/         # useHabits, useLogs, useStats, useCategories, useSkips
├── db/            # database.ts — SQLite singleton, all CRUD + ALTER TABLE migrations
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

## Pending

- OS notifications: plugin installed, background scheduling not wired yet
- System tray quick check-in (R-01 from reporte.md)
- No tests — Vitest setup pending
- App icon uses Tauri default
