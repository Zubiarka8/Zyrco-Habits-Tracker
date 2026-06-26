# Zyrco — Feature Checklist

Legend: ✅ Done · 🔧 Partial · ⬜ Pending

---

## 🔐 Authentication
- ⬜ Anonymous login ("Continue without account") — full app access, data stored locally only
- ⬜ Anonymous → registered account upgrade (keep all local data)
- ⬜ Login screen (email + password)
- ⬜ Registration
- ⬜ Forgot password / reset
- ⬜ Session persistence (stay logged in)
- ⬜ OAuth (Google / Apple)
- ⬜ Logout
- ⬜ Profile page (name, avatar)

> **Design rule:** anonymous users get the full core experience. Account is only required for cloud sync, cross-device, and premium features — never forced on first launch.

---

## 👤 User Roles
- ⬜ **Free** tier definition:
  - ⬜ Unlimited habits (no cap)
  - ⬜ Local storage only
  - ⬜ Basic stats (7 / 30 days)
  - ⬜ Non-intrusive ads (banner bottom, never in habit flow)
- ⬜ **Premium** tier definition:
  - ⬜ No ads
  - ⬜ Cloud sync + multi-device
  - ⬜ Full stats (90 days + heatmap + correlation)
  - ⬜ Export (PDF, CSV, PNG)
  - ⬜ Advanced reminders (streak alerts, weekly report)
  - ⬜ Streak freeze
  - ⬜ Gamification (XP, badges, leaderboard)
- ⬜ Role stored in user profile (local + cloud)
- ⬜ Premium purchase flow (in-app subscription or one-time)
- ⬜ Premium badge in profile
- ⬜ Restore purchase

---

## 💰 Monetization (non-intrusive ads)
> **Constraint:** ads must never interrupt the check-in flow, appear inside modals, block content, or auto-play audio/video.

- ⬜ Ad SDK integrated (AdMob for mobile, custom web ads for browser)
- ⬜ Banner ad — bottom of Stats page only (free users)
- ⬜ Banner ad — bottom of Settings page only (free users)
- ⬜ Interstitial ad — only on app open, max once per day (free users)
- ⬜ "Remove ads" upsell CTA — shown in settings, never as a popup
- ⬜ Ads completely hidden for premium users
- ⬜ Ad-free during active check-in (Today page always ad-free)

---

## 📋 Habit Creation
- ✅ Create habit with name
- ✅ Optional description
- ✅ Custom color
- ✅ Custom icon (emoji picker)
- ✅ Assign to category
- ✅ Habit type: **Good** / **Normal** / **Bad**
- ⬜ Habit difficulty level (Easy / Medium / Hard)
- ⬜ Habit goal (e.g. "30 consecutive days")
- ⬜ Preset habit templates (e.g. "Drink water", "Exercise", "No sugar")
- ⬜ Optional start time + end time per habit (e.g. 07:00–07:30)
- ⬜ Timeless mode (no schedule, just track completion)

---

## 🗂️ Categories
- ✅ Create category with name, color, icon
- ✅ Edit category
- ✅ Delete category
- ✅ Assign category to habit
- ⬜ Category type: Good habits / Bad habits / Neutral
- ⬜ Filter habits by category on Today page
- ⬜ Category stats (completion rate per category)

---

## 📅 Frequency & Scheduling
- ✅ Daily frequency
- ✅ Weekly frequency (every Monday)
- ✅ Custom days (pick specific weekdays)
- ⬜ X times per week (e.g. "3 times per week", any days)
- ⬜ X times per month
- ⬜ Every N days (e.g. every 3 days)
- ⬜ Start date / end date for a habit (habit lifespan)
- ⬜ Time block per habit: optional start time + end time (e.g. 07:00–07:30)
- ⬜ Timeless mode: mark habit as "no fixed time"

---

## 📆 Calendar View
> Habits with a time block appear as events on the calendar. Timeless habits appear as all-day items.

### Views
- ⬜ **Daily view** — hour-by-hour timeline of the day's habits (like Google Calendar day view)
- ⬜ **Weekly view** — 7-column grid with time blocks per habit per day
- ⬜ **Monthly view** — month grid showing completion dots / streaks per day
- ⬜ Switch between views (toggle: Day / Week / Month)
- ⬜ Navigate to previous / next period (arrows + "Today" button)
- ⬜ Click on a day in Month view → jump to Daily view for that day

### Events & interaction
- ⬜ Habits with start+end time shown as colored time-block events
- ⬜ Timeless habits shown as all-day chips at top of day/week column
- ⬜ Click event → mark as done / avoided directly from calendar
- ⬜ Click event → open detail panel (note, streak, stats)
- ⬜ Drag event to reschedule (change time block for that day only)
- ⬜ Color-coded by habit color
- ⬜ Completed events visually distinct (e.g. faded + checkmark)
- ⬜ Overflow indicator when too many habits overlap (e.g. "+2 more")

### Data
- ⬜ Calendar reads from existing `logs` table (no new table needed for basic view)
- ⬜ Time block stored in habits table (`start_time`, `end_time` columns)
- ⬜ Per-day override of time block (e.g. "today I'll do it at 8 instead of 7")

---

## ✅ Daily Check-in (Today page)
- ✅ List habits due today
- ✅ Mark habit as done / undone
- ✅ Progress bar (X of Y done)
- ✅ Add/edit note per check-in
- ✅ "All done" celebration state
- ⬜ Partial completion (e.g. "did 15 min instead of 30")
- ⬜ Mood rating per check-in (1–5)
- ⬜ Skip option with reason (sick, travel, etc.)
- ⬜ View past days (calendar navigation)

---

## 🔥 Streaks
- ✅ Current streak per habit
- ✅ Streak badge (color changes at 7 and 30 days)
- ⬜ Best streak per habit (tracked in DB, not shown in Today)
- ⬜ Streak freeze — skip one day without breaking streak 🔒 Premium
- ⬜ Streak milestone notifications (7, 30, 60, 100 days)

---

## 📊 Statistics
- ✅ Bar chart: daily completions over 7 / 30 / 90 days
- ✅ Per-habit completion rate with progress bar
- ✅ Overall current streak and best streak
- ✅ Total completions count
- ⬜ Calendar heatmap (GitHub-style) 🔒 Premium
- ⬜ Best day of the week 🔒 Premium
- ⬜ Habit correlation 🔒 Premium
- ⬜ Monthly summary view
- ⬜ "Good vs Bad" habit balance chart

---

## 🔔 Reminders & Notifications
- 🔧 Reminder time per habit (UI toggle + time picker done)
- 🔧 OS notification permission request (Settings page done)
- ⬜ Actually schedule notifications at the set time
- ⬜ "Daily summary" notification (e.g. 9 PM: "You have 3 habits pending")
- ⬜ Streak at-risk alert 🔒 Premium
- ⬜ Weekly report notification 🔒 Premium

---

## 📥 Import
- ⬜ Import habits from JSON file
- ⬜ Import habits from CSV file
- ⬜ Import from preset library (curated list of popular habits)
- ⬜ Import past check-in history from JSON/CSV

---

## 📤 Export
- ⬜ Export all habits to JSON
- ⬜ Export all habits to CSV 🔒 Premium
- ⬜ Export check-in history to CSV 🔒 Premium
- ⬜ Export stats as PDF report 🔒 Premium
- ⬜ Export stats chart as image (PNG) 🔒 Premium

---

## 🏆 Gamification
- ⬜ Points / XP per check-in 🔒 Premium
- ⬜ Level system (based on total XP) 🔒 Premium
- ⬜ Achievement badges (e.g. "7-day streak", "First bad habit broken") 🔒 Premium
- ⬜ Weekly challenge 🔒 Premium
- ⬜ Leaderboard (requires cloud + account) 🔒 Premium

---

## 🌐 i18n & Accessibility
- ✅ Spanish UI
- ✅ English UI
- ✅ Language switch at runtime (persisted)
- ⬜ Basque (Euskera) UI
- ⬜ Keyboard navigation
- ⬜ Screen reader support (ARIA labels)

---

## 🎨 Appearance
- ✅ Light mode
- ✅ Dark mode
- ✅ System theme (auto)
- ⬜ Custom accent color
- ⬜ Compact / comfortable density toggle
- ⬜ Custom app icon
- ⬜ Responsive layout for small screens (tablet / mobile web)

---

## 🗃️ Data Management
- ✅ Archive habit (hide without deleting)
- ✅ Unarchive habit
- ✅ Delete habit (with confirmation)
- ⬜ Bulk delete / bulk archive
- ⬜ Reorder habits (drag and drop)
- ⬜ Backup database manually
- ⬜ Restore database from backup
- ⬜ Clear all data (reset app)

---

## ☁️ Sync & Multi-device
- ⬜ Cloud sync (Supabase) 🔒 Premium + account required
- ⬜ Offline-first with sync on reconnect
- ⬜ Conflict resolution (last-write-wins or manual merge)
- ⬜ Sync status indicator in UI

---

## 📱 Platform Support
> Target: same codebase across all platforms via Tauri (desktop) + Tauri Mobile + responsive web build.

- ✅ Windows — dev build running
- ⬜ Windows — production .exe installer
- ⬜ macOS — build tested (.dmg)
- ⬜ Linux — build tested (.AppImage / .deb)
- ⬜ Android — APK via Tauri Mobile
- ⬜ iOS — IPA via Tauri Mobile (requires macOS + Apple Developer account)
- ⬜ Web app (PWA) — browser build with localStorage fallback
- ⬜ PWA installable (manifest + service worker)
- ⬜ GitHub Releases with auto-update (Tauri updater plugin)
- ⬜ Play Store submission
- ⬜ App Store submission (iOS)

> **Architecture note:** the web build will replace SQLite with IndexedDB or Supabase. Mobile uses Tauri Mobile with the same SQLite plugin.

---

## 🧪 Quality
- ⬜ Unit tests (Vitest — hooks and DB layer)
- ⬜ E2E tests (Playwright)
- ⬜ CI pipeline (GitHub Actions — type check + tests on PR)
- ⬜ Error boundary (catch React crashes gracefully)
- ⬜ Loading skeletons instead of "Loading..." text

---

## Summary

| Area | Done | Partial | Pending |
|---|---|---|---|
| Authentication | 0 | 0 | 9 |
| User roles | 0 | 0 | 14 |
| Monetization | 0 | 0 | 7 |
| Habit creation | 6 | 0 | 5 |
| Categories | 4 | 0 | 3 |
| Frequency & scheduling | 3 | 0 | 6 |
| Calendar view | 0 | 0 | 16 |
| Daily check-in | 5 | 0 | 4 |
| Streaks | 2 | 0 | 3 |
| Statistics | 4 | 0 | 5 |
| Reminders | 0 | 2 | 4 |
| Import | 0 | 0 | 4 |
| Export | 1 | 0 | 4 |
| Gamification | 0 | 0 | 5 |
| i18n & a11y | 3 | 0 | 3 |
| Appearance | 3 | 0 | 4 |
| Data management | 3 | 0 | 5 |
| Sync | 0 | 0 | 4 |
| Platform support | 1 | 0 | 10 |
| Quality | 0 | 0 | 5 |
| **Total** | **35** | **2** | **120** |

---

## 🗺️ Suggested build order

| Phase | Focus | Prerequisite |
|---|---|---|
| **1 — Core** ✅ | Habit type Good/Normal/Bad, import/export JSON, reminder scheduling | — |
| **2 — Calendar** | Time blocks on habits, daily/weekly/monthly calendar view | Phase 1 |
| **3 — Auth** | Anonymous login, email login, account upgrade | — |
| **4 — Roles** | Free/Premium flag, feature gates, ad integration | Auth |
| **5 — Platform** | Responsive layout, web PWA build, Linux/macOS builds | Core |
| **6 — Mobile** | Android APK via Tauri Mobile | Platform |
| **7 — Cloud** | Supabase sync, multi-device | Auth + Mobile |
| **8 — Premium features** | Heatmap, streak freeze, gamification, PDF export | Cloud |
