# Zyrco — Feature Checklist

Legend: ✅ Done · 🔧 Partial · ⬜ Pending · 🔒 Premium (future)

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

> **Design rule:** anonymous users get the full core experience. Account is only required for cloud sync and multi-device — never forced on first launch.

---

## 👤 User Roles & Plans

> **Estado actual:** `MONETIZATION_ACTIVE = false` → todos los usuarios tienen acceso completo (`isPremium = true` global). Sin bloqueos.

### Arquitectura implementada ✅
- ✅ Tabla `subscriptions` en SQLite (user_id, plan_type, status, expires_at, streak_shields, etc.)
- ✅ `usePremium` hook — `checkIsPremium()`, `checkIsLifetime()`, `getShieldsRemaining()`
- ✅ `PremiumContext` + `PremiumProvider` wrapping la app
- ✅ `PremiumGate` component (actualmente transparente — siempre renderiza children)
- ✅ Flag `MONETIZATION_ACTIVE = false` — un solo cambio activa toda la lógica
- ✅ Auto-expire subscriptions al abrir la app
- ✅ Streak shields con reset mensual automático
- ✅ Comentarios `[FUTURO - PREMIUM X]` en todas las funciones afectadas

### Plan Free (activo para todos ahora — límites no activos)
- ⬜ Máximo 10 hábitos activos `[FUTURO]`
- ⬜ Estadísticas 30 días máximo `[FUTURO]`
- ⬜ 1 recordatorio por hábito `[FUTURO]`
- ⬜ Sin anuncios (por ahora)
- ⬜ Ads no intrusivos cuando se active monetización `[FUTURO]`

### Premium Mensual (futuro — no activo)
- ⬜ Hábitos ilimitados `[FUTURO]`
- ⬜ Estadísticas completas + historial completo `[FUTURO]`
- ⬜ Recordatorios inteligentes `[FUTURO]`
- ⬜ 1 racha protegida / mes `[FUTURO]`
- ⬜ Sync en la nube `[FUTURO]`
- ⬜ Export CSV/PDF `[FUTURO]`
- ⬜ Sin anuncios `[FUTURO]`
- ⬜ Soporte prioritario `[FUTURO]`

### Premium Anual (futuro — no activo)
- ⬜ Todo lo del mensual `[FUTURO]`
- ⬜ 3 rachas protegidas / mes `[FUTURO]`
- ⬜ Temas visuales exclusivos `[FUTURO]`
- ⬜ Acceso anticipado a novedades `[FUTURO]`
- ⬜ 2 meses gratis incluidos `[FUTURO]`

### Premium Lifetime (futuro — no activo)
- ⬜ Todo lo del anual `[FUTURO]`
- ⬜ Racha protegida ilimitada `[FUTURO]`
- ⬜ Badge exclusivo de fundador `[FUTURO]`
- ⬜ Voto en nuevas funciones `[FUTURO]`
- ⬜ Todas las futuras funciones incluidas `[FUTURO]`
- ⬜ Sin pagos futuros nunca `[FUTURO]`

### Activación futura
- ⬜ Cambiar `MONETIZATION_ACTIVE = true` en `usePremium.ts`
- ⬜ Integrar RevenueCat (mobile) o Stripe (web/desktop)
- ⬜ `activateSubscription()` desde webhook de pago
- ⬜ `cancelSubscription()` desde settings
- ⬜ Pantalla de planes / upgrade (upsell CTA)
- ⬜ Restore purchase (RevenueCat)
- ⬜ Premium badge en perfil

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
- ✅ Optional start time + end time per habit (e.g. 07:00–07:30) — shown on habit row
- ✅ Edit habit (name, description, color, icon, category, type, schedule, time)
- ✅ Archive habit (hide without deleting)
- ✅ Unarchive habit
- ✅ Delete habit (with confirmation)
- ✅ CRUD accessible from Today view (day panel + daily view)
- ⬜ Habit difficulty level (Easy / Medium / Hard)
- ⬜ Habit goal (e.g. "30 consecutive days")
- ⬜ Preset habit templates (e.g. "Drink water", "Exercise", "No sugar")
- ⬜ Duplicate habit
- ⬜ Reorder habits manually (drag and drop)
- ⬜ Pin habit to top of list
- ⬜ Timeless mode (no schedule, just track whenever)

---

## 🗂️ Categories
- ✅ Create category with name, color, icon
- ✅ Edit category
- ✅ Delete category
- ✅ Assign category to habit
- ✅ Category badge visible on habit rows and cards
- ⬜ Filter habits by category on Today page
- ⬜ Category stats (completion rate per category)
- ⬜ Category type: Good habits / Bad habits / Neutral

---

## 📅 Frequency & Scheduling
- ✅ Daily frequency
- ✅ Weekly frequency (specific day of the week)
- ✅ Custom weekdays (pick one or more specific weekdays)
- ✅ Custom month-days (pick specific calendar days 1–31)
- ✅ Interval schedule (every N days, configurable with +/− stepper)
- ✅ Start date for habit (first day it becomes active)
- ✅ End date for habit (optional — habit auto-expires)
- ✅ Schedule preview (shows next 14 days with active days highlighted)
- ⬜ X times per week (any N days, not fixed weekdays — e.g. "3 times this week")
- ⬜ X times per month (any N days)
- ⬜ Timeless mode (mark habit without a recurring schedule)

---

## 📆 Calendar Views
### Views implemented
- ✅ **Monthly view** — month grid with completion dots, all-done ✓, bad-done ✗
- ✅ **Weekly view** — 7-column habit grid with inline toggle per cell
- ✅ **Daily view** — habit list for the selected day with full check-in
- ✅ Switch between views (Monthly / Weekly / Daily toggle)
- ✅ Navigate prev/next period (arrow buttons)
- ✅ Month/year picker (click month or year in header → picker dropdown)
- ✅ Right-panel day preview in Monthly view (click day → preview without switching to Daily)
- ✅ Month strip in Monthly right panel (full month scroll bar to select day)
- ✅ All-done green checkmark on calendar days (all good habits completed)
- ✅ Bad-habit red X on calendar days (bad habit was clicked = user did the bad thing)
- ✅ Completion ratio dots (up to 6 dots; shows X/Y ratio if overflow)
- ✅ Skipped habits excluded from calendar status calculation

### Pending
- ⬜ "Today" shortcut button to jump back to current date
- ⬜ Hour-by-hour timeline (day view like Google Calendar)
- ⬜ Time-block events on weekly/daily calendar for habits with start+end time
- ⬜ Drag event to reschedule (time block for that day only)
- ⬜ Overflow indicator when too many habits overlap ("+2 more")

---

## ✅ Daily Check-in (Today page)
- ✅ List habits due on selected date
- ✅ Mark habit as done / undone (toggle)
- ✅ Good habit: checkmark button; Bad habit: "avoided" button (distinct style)
- ✅ Progress counter (X of Y completed)
- ✅ Add/edit note per check-in (note preview on habit row)
- ✅ "All done" celebration state with emoji
- ✅ Skip habit for a specific day (habit disappears for that day only, restorable)
- ✅ Skipped section shown below list with one-click restore
- ✅ View any past or future day (calendar navigation)
- ✅ Edit / archive / delete habit directly from day panel or daily view
- ✅ Create new habit from Today page (+ button in panel header / daily view header)
- ✅ Streak badge per habit row
- ✅ Type badge (Good / Bad) per habit row
- ✅ Time display on habit row (e.g. 08:00 or 08:00 – 09:00)
- ✅ Category badge on habit row
- ⬜ Skip with reason (sick, travel, etc.)
- ⬜ Partial completion (e.g. "did 15 min instead of 30")
- ⬜ Mood rating per check-in (1–5)
- ⬜ Habit reordering on Today list
- ⬜ Filter habits on Today page (by category, type, status)

---

## 🔥 Streaks
- ✅ Current streak per habit (calculated live)
- ✅ Streak badge visible on habit rows (color changes at 7 and 30 days)
- ✅ Best streak per habit (tracked in DB, shown in Stats)
- ⬜ Streak milestone notifications (7, 30, 60, 100 days)
- ⬜ Streak freeze — skip one day without breaking streak 🔒 Premium
- ⬜ Visual streak calendar per habit (heatmap) 🔒 Premium

---

## 📊 Statistics
- ✅ Bar chart: daily completions over 7 / 30 / 90 days (selectable)
- ✅ Per-habit completion rate with progress bar
- ✅ Per-habit best streak
- ✅ Overall current streak and best streak
- ✅ Total completions count
- ⬜ Calendar heatmap (GitHub-style, full history) 🔒 Premium
- ⬜ Best day of the week analysis
- ⬜ Habit correlation analysis 🔒 Premium
- ⬜ Monthly summary card
- ⬜ "Good vs Bad" habit balance chart
- ⬜ Stats for a specific date range (custom picker)
- ⬜ Skip days reflected in completion rate (skipped days not counted as missed)

---

## 🔔 Reminders & Notifications
- 🔧 Reminder time per habit (UI toggle + time picker done, stored in DB)
- 🔧 OS notification permission request (Settings page — request + status display done)
- ⬜ Actually schedule OS notifications at the set time (background polling / Tauri cron)
- ⬜ "Daily summary" push notification (e.g. 9 PM: "You have 3 habits pending")
- ⬜ Streak at-risk alert 🔒 Premium
- ⬜ Weekly report notification 🔒 Premium

---

## 📥 Import
- ✅ Import habits from JSON file (Zyrco export format)
- ✅ Import past check-in history from JSON (logs included in export)
- ✅ Import categories from JSON
- ⬜ Import from CSV file
- ⬜ Import from preset library (curated list of popular habits)

---

## 📤 Export
- ✅ Export all data to JSON (habits + categories + logs, timestamped filename)
- ⬜ Export habits to CSV 🔒 Premium
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
- ✅ Spanish (ES) UI — full translation
- ✅ English (EN) UI — full translation
- ✅ Language switch at runtime (persisted in localStorage)
- ⬜ Basque (EU) UI
- ⬜ Keyboard navigation (Tab / Enter / Escape on all interactive elements)
- ⬜ Screen reader support (ARIA labels, roles, live regions)
- ⬜ High-contrast mode

---

## 🎨 Appearance
- ✅ Light mode
- ✅ Dark mode
- ✅ System theme (auto, follows OS preference)
- ✅ Responsive layout — sidebar on desktop, icon-only on tablet (≤900px), bottom nav on mobile (≤600px)
- ⬜ Custom accent color picker
- ⬜ Compact / comfortable density toggle
- ⬜ Custom app icon (currently using Tauri default)
- ⬜ Font size / scale setting

---

## 🗃️ Data Management
- ✅ Archive habit (hidden from Today, visible in Habits → "show archived")
- ✅ Unarchive habit
- ✅ Delete habit (with confirmation dialog)
- ✅ Edit habit (all fields editable)
- ✅ Skip habit on a specific day (exceptions stored in `skips` table, restorable)
- ✅ Fixed-position context menu (⋮) on habit rows and cards — works even on archived cards
- ⬜ Bulk delete / bulk archive (select multiple)
- ⬜ Reorder habits (drag and drop)
- ⬜ Manual database backup (save .db file to disk)
- ⬜ Restore database from backup file
- ⬜ Clear all data (reset app to factory state)

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
- ⬜ Windows — production .exe installer (build untested)
- ⬜ macOS — build tested (.dmg)
- ⬜ Linux — build tested (.AppImage / .deb)
- ⬜ Android — APK via Tauri Mobile (bottom nav ready, untested on real device)
- ⬜ iOS — IPA via Tauri Mobile (requires macOS + Apple Developer account)
- ⬜ Web app (PWA) — browser build with localStorage / IndexedDB fallback
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
- ⬜ Empty states with illustrations (not just text)
- ⬜ Toast notifications for save / error feedback

---

## Summary

| Area | Done | Partial | Pending |
|---|---|---|---|
| Authentication | 0 | 0 | 9 |
| User roles / plans | 7 (arch) | 0 | 20 |
| Monetization | 0 | 0 | 7 |
| Habit creation | 12 | 0 | 8 |
| Categories | 5 | 0 | 3 |
| Frequency & scheduling | 8 | 0 | 3 |
| Calendar views | 12 | 0 | 5 |
| Daily check-in | 15 | 0 | 5 |
| Streaks | 3 | 0 | 3 |
| Statistics | 5 | 0 | 6 |
| Reminders | 0 | 2 | 4 |
| Import | 3 | 0 | 2 |
| Export | 1 | 0 | 4 |
| Gamification | 0 | 0 | 5 |
| i18n & a11y | 3 | 0 | 4 |
| Appearance | 4 | 0 | 4 |
| Data management | 6 | 0 | 5 |
| Sync | 0 | 0 | 4 |
| Platform support | 1 | 0 | 10 |
| Quality | 0 | 0 | 7 |
| **Total** | **85** | **2** | **118** |

---

## 🗺️ Build order (suggested)

| Phase | Focus | Prerequisite |
|---|---|---|
| **1 — Core** ✅ | Habit CRUD, categories, scheduling, check-in, stats, import/export | — |
| **2 — UX polish** | Today button in cal nav, skip with reason, filter by category, habit reorder, empty state illustrations, toasts | Core |
| **3 — Notifications** | Background OS notification scheduling (Tauri cron), daily summary push | Core |
| **4 — Auth** | Anonymous login, email login, account upgrade | — |
| **5 — Roles** | Free/Premium flag, feature gates, ad integration | Auth |
| **6 — Platform** | Production Windows build, macOS build, Linux build, PWA | Core |
| **7 — Mobile** | Android APK + iOS via Tauri Mobile, test bottom nav on device | Platform |
| **8 — Cloud** | Supabase sync, multi-device, conflict resolution | Auth + Mobile |
| **9 — Premium features** | Heatmap, streak freeze, gamification, CSV/PDF export, leaderboard | Cloud |
