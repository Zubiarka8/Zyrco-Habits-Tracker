# Zyrco — Habit Tracker

Desktop habit tracker built with Tauri 2, React 18, and TypeScript.

## Features

- **Daily check-ins** — mark habits done with one click
- **Streaks** — consecutive day counter per habit with visual badges
- **Notes** — attach a note to each daily check-in
- **Categories** — color-coded groups with custom icons
- **Stats** — bar chart + per-habit completion rate over 7 / 30 / 90 days
- **Reminders** — configurable time per habit (OS notifications via Tauri)
- **Bilingual** — English / Spanish UI, switchable at runtime
- **Dark mode** — light / dark / system theme

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript + Vite |
| Database | SQLite via `@tauri-apps/plugin-sql` |
| Routing | react-router-dom v7 (hash router) |
| Charts | Recharts |
| i18n | react-i18next |
| Icons | lucide-react |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable)
- [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the **Desktop development with C++** workload

### Install and run

```bash
npm install
npm run tauri dev
```

First build takes 3–5 minutes (Rust compilation). Subsequent starts are fast.

### Build installer

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/`

## Project structure

```
src/
  components/    # Reusable UI components
  pages/         # Today, Habits, Stats, Settings
  hooks/         # useHabits, useCategories, useLogs, useStats
  db/            # SQLite CRUD layer (database.ts)
  types/         # TypeScript interfaces
  i18n/          # Translation files (en.json, es.json)
src-tauri/       # Rust backend + Tauri config
```

## Database

SQLite file location: `%APPDATA%\com.zubia.zyrco\zyrco.db`

Tables: `categories`, `habits`, `logs`

## Pending

- Scheduled reminder notifications (plugin wired, scheduling logic pending)
- Tests (Vitest + Playwright)
- Custom app icon
