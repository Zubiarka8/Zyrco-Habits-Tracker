# Zyrco — Feature Checklist

Legend: ✅ Done · 🔧 Partial · ⬜ Pending

---

## 🔐 Authentication
- ⬜ Login screen (email + password)
- ⬜ Registration
- ⬜ Forgot password / reset
- ⬜ Session persistence (stay logged in)
- ⬜ Logout
- ⬜ Profile page (name, avatar)

---

## 📋 Habit Creation
- ✅ Create habit with name
- ✅ Optional description
- ✅ Custom color
- ✅ Custom icon (emoji picker)
- ✅ Assign to category
- ⬜ Habit type: **Good** (build) vs **Bad** (break)
- ⬜ Habit difficulty level (Easy / Medium / Hard)
- ⬜ Habit goal (e.g. "30 consecutive days")
- ⬜ Preset habit templates (e.g. "Drink water", "Exercise", "No sugar")

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
- ⬜ Start date / end date for a habit

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
- ⬜ Streak freeze (skip one day without breaking streak)
- ⬜ Streak milestone notifications (7, 30, 60, 100 days)

---

## 📊 Statistics
- ✅ Bar chart: daily completions over 7 / 30 / 90 days
- ✅ Per-habit completion rate with progress bar
- ✅ Overall current streak and best streak
- ✅ Total completions count
- ⬜ Calendar heatmap (GitHub-style)
- ⬜ Best day of the week (which weekday you complete most)
- ⬜ Habit correlation (do you complete habit A when you complete B?)
- ⬜ Monthly summary view
- ⬜ "Good vs Bad" habit balance chart

---

## 🔔 Reminders & Notifications
- 🔧 Reminder time per habit (UI toggle + time picker done)
- 🔧 OS notification permission request (Settings page done)
- ⬜ Actually schedule notifications at the set time
- ⬜ "Daily summary" notification (e.g. 9 PM: "You have 3 habits pending")
- ⬜ Streak at-risk alert (if you haven't checked in by evening)
- ⬜ Weekly report notification

---

## 📥 Import
- ⬜ Import habits from JSON file
- ⬜ Import habits from CSV file
- ⬜ Import from preset library (curated list of popular habits)
- ⬜ Import past check-in history from JSON/CSV

---

## 📤 Export
- ⬜ Export all habits to JSON
- ⬜ Export all habits to CSV
- ⬜ Export check-in history to CSV
- ⬜ Export stats as PDF report
- ⬜ Export stats chart as image (PNG)

---

## 🏆 Gamification
- ⬜ Points / XP per check-in
- ⬜ Level system (based on total XP)
- ⬜ Achievement badges (e.g. "7-day streak", "First bad habit broken")
- ⬜ Weekly challenge
- ⬜ Leaderboard (if multi-user / cloud)

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
- ⬜ Cloud sync (Supabase or similar)
- ⬜ Multi-device support (Windows + Android)
- ⬜ Offline-first with sync on reconnect
- ⬜ Conflict resolution

---

## 🧪 Quality
- ⬜ Unit tests (Vitest — hooks and DB layer)
- ⬜ E2E tests (Playwright)
- ⬜ CI pipeline (GitHub Actions)
- ⬜ Error boundary (catch React crashes gracefully)
- ⬜ Loading skeletons instead of "Loading..." text

---

## 📦 Distribution
- ✅ Windows: dev build running
- ⬜ Windows: production .exe installer tested
- ⬜ macOS: build tested
- ⬜ GitHub Releases with auto-update (Tauri updater plugin)
- ⬜ Android build (Tauri mobile)

---

## Summary

| Area | Done | Partial | Pending |
|---|---|---|---|
| Authentication | 0 | 0 | 6 |
| Habit creation | 5 | 0 | 5 |
| Categories | 4 | 0 | 3 |
| Frequency | 3 | 0 | 5 |
| Daily check-in | 5 | 0 | 5 |
| Streaks | 2 | 0 | 3 |
| Statistics | 4 | 0 | 5 |
| Reminders | 0 | 3 | 3 |
| Import | 0 | 0 | 4 |
| Export | 0 | 0 | 5 |
| Gamification | 0 | 0 | 5 |
| i18n & a11y | 3 | 0 | 3 |
| Appearance | 3 | 0 | 3 |
| Data management | 3 | 0 | 5 |
| Sync | 0 | 0 | 4 |
| Quality | 0 | 0 | 5 |
| Distribution | 1 | 0 | 4 |
| **Total** | **33** | **3** | **78** |
