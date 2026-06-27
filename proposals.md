# Zyrco — Competitive Research & Feature Proposals

> Research conducted June 2026. Based on analysis of 12 habit tracker apps.

---

## Project Requirements

- **Android compatibility** — The app must be fully adaptable to Android. UI layout, navigation patterns, and interactions should work correctly on mobile screen sizes. Touch targets, gestures, and performance must meet Android standards. Any desktop-specific features (e.g. floating timer panel, keyboard shortcuts) should degrade gracefully or have a mobile equivalent on Android.
- **Emoji-based navigation icons** — Use emojis instead of SVG icons for all navigation and UI controls. Examples: ⚙️ Settings, 🏠 Today/Home, 📊 Stats, ➕ Add habit, 📁 Archive, 💡 Insights. Each nav item and action button should use a clearly recognizable emoji that communicates its function without needing a label.

---

## Competitors Analyzed

| App | Platform | Key Angle |
|---|---|---|
| **Streaks** | iOS/macOS | Minimal, Apple Design Award quality, 12-habit limit |
| **Loop Habit Tracker** | Android (OSS) | Habit strength score, privacy-first, beautiful analytics |
| **Habitica** | iOS/Android/Web | Full RPG: levels, gold, boss fights, social parties |
| **Finch** | iOS/Android | Virtual pet that grows as you complete habits |
| **Habitify** | iOS/Android/macOS/Web | Session-based (morning/afternoon/evening), Zapier |
| **HabitNow** | Android | Binary + numeric + timer tracking, sub-task checklists |
| **Strides** | iOS | 4 tracker types: Habit, Target, Average, Project |
| **Structured** | iOS/Android/macOS | Time-blocking visual timeline + focus timer |
| **Productive** | iOS | Guided challenge programs, session organization |
| **Way of Life** | iOS/Android | Red chains (failure streaks), skip-without-breaking |
| **Fabulous** | iOS/Android | Journey-based habit stacking, behavioral science |
| **Coach.me** | Web/iOS | Props social system, coaching marketplace |

---

## Key Patterns Found

1. **Habit strength score over binary streaks** — Loop uses an algorithm where consistency builds/decays strength gradually. A missed day doesn't destroy a 60-day habit, making it more realistic.
2. **Time-of-day organization** — Productive and Habitify group habits into Morning / Afternoon / Evening sessions. Users report this reduces decision fatigue: you open the app at 8am and only see morning habits.
3. **Multiple completion modes** — HabitNow allows binary (done/not), numeric (drank 2L water), and timer (meditated for 10 min). Binary-only forces workarounds.
4. **GitHub-style heatmap** — Full-year view where each day is a colored square. Color intensity = completion rate. Instantly communicates long-term consistency better than a streak number.
5. **Skip-without-penalty mechanic** — Way of Life's skip option distinguishes intentional rest from failure. Zyrco already has this; competitors treat it as a premium feature.
6. **Mood/energy check-in tied to habits** — Finch and Habitify ask how you feel before/after habits. Over time this surfaces correlations (e.g., "you complete 80% of habits on days you rate energy 4+").
7. **Template library for quick start** — Strides offers 150+ pre-built habit templates. Onboarding friction is the #1 drop-off point in habit apps.
8. **Habit strength decay** — Multiple apps use decay mechanics: if you were 95% consistent for 60 days and miss 3 days, you drop to 80%, not 0%. Psychologically much safer.
9. **"Perfect day" metric** — The ratio of habits completed / habits scheduled that day. Cleaner than per-habit streaks for a daily summary.
10. **Sub-tasks / checklists per habit** — HabitNow Premium and Habitify allow checklists inside a habit (e.g., "Morning workout" → pushups, situps, stretch). Bridges habits and todos.
11. **Focus timer integrated with habits** — Structured's Pomodoro integration lets a habit like "Deep work" launch a timer directly, logging time instead of just done/not.
12. **Journey / habit stacking programs** — Fabulous groups habits into multi-day programs. Instead of building habits in isolation, you layer them. Behaviorally more sound.

---

## Feature Proposals

### P-01: Habit Strength Score
- **Source**: Loop Habit Tracker
- **Priority**: High
- **Effort**: Medium
- **Description**: Replace the binary streak counter with a 0–100 "strength score" calculated from weighted consistency. Each completion increases strength; each miss decays it, but slowly — a 3-day miss after 60 days of consistency drops strength by ~8%, not to zero. Formula: exponential moving average over the last 30 days, weighted heavier toward recent days.
- **UX notes**: Display as a colored progress arc next to the habit name. Green = 80-100, yellow = 50-79, red = below 50. Keep the streak counter as a secondary number for users who want it.
- **Why for Zyrco**: Biggest UX failure in habit apps is the "all-or-nothing" streak reset. This removes the main reason people quit apps after one missed day. Especially important for a desktop app used in irregular work schedules.

---

### P-02: Annual Heatmap View
- **Source**: Loop Habit Tracker, GitHub contribution graph pattern
- **Priority**: High
- **Effort**: Medium
- **Description**: Add a full-year heatmap to the Stats page. Each day = one small square. Color intensity maps to completion rate: 0% is neutral gray, 25%/50%/75%/100% use progressively deeper shades of the habit's category color. Clicking a day shows which habits were done that day.
- **UX notes**: Render a 52×7 grid. Current month highlighted with a subtle border. Hovering shows date + "X/Y habits completed". This is the single most motivating visualization in all of habit tracking — users cannot resist filling in the grid.
- **Why for Zyrco**: Zyrco's Stats page currently shows monthly calendar. The annual view gives a completely different perspective and makes a great "year in review" moment. Pure local data — no privacy concerns.

---

### P-03: Time-of-Day Sessions
- **Source**: Habitify, Productive
- **Priority**: High
- **Effort**: Small
- **Description**: Add an optional `session` field to habits with values: Morning / Afternoon / Evening / Anytime. On the Today page, group habits by session with collapsible sections and a header showing time ranges (Morning: 6–12, Afternoon: 12–18, Evening: 18–24). "Anytime" habits stay in a flat list at the bottom.
- **UX notes**: Default all existing habits to "Anytime" on migration. Session headers should auto-collapse for time periods that have already passed by more than 2 hours, reducing visual noise.
- **Why for Zyrco**: A desktop habit tracker opened at different times of day benefits enormously from this filter. Opening Zyrco at 9pm shouldn't force you to scroll past 10 morning habits you missed.

---

### P-04: Completion Mode — Numeric & Timer
- **Source**: HabitNow
- **Priority**: High
- **Effort**: Medium
- **Description**: Add `completion_type` to habits: `binary` (current behavior), `numeric` (enter a number + unit, e.g., "8 glasses of water"), or `timer` (start a countdown, logs elapsed minutes). Store the value in the `logs` table as a `value` column (already binary = 1/0; extend to float). For numeric habits, show target vs. actual in stats.
- **UX notes**: On the Today page, binary habits get a checkbox; numeric habits get a tap-to-open input showing the unit and a +/- stepper; timer habits get a "Start" button that launches an in-app countdown and auto-logs on completion. No modal needed — expand the row inline.
- **Why for Zyrco**: Binary tracking is useless for habits like "drink water", "read X pages", or "practice guitar". This unlocks an entirely different class of habits.

---

### P-05: Template Library for Onboarding
- **Source**: Strides (150+ templates), HabitNow suggestions
- **Priority**: High
- **Effort**: Small
- **Description**: Add a "Browse templates" button on the habit creation screen. Ship ~40 pre-built habit templates organized by category: Health (drink water, sleep 8h, walk 10k steps), Fitness (pushups, run), Mind (meditate, read, journal), Work (deep work block, inbox zero), Social (call family). Each template pre-fills name, icon, category color, session, and schedule.
- **UX notes**: Show templates as a scrollable grid of cards with icon + name. Selecting one pre-populates the habit form — user still reviews and confirms. Include a search bar in the template picker.
- **Why for Zyrco**: The #1 onboarding failure point in habit apps. A new user opening Zyrco stares at an empty screen. Templates remove the blank-canvas anxiety and teach users what good habit definitions look like.

---

### P-06: Daily Mood / Energy Check-In
- **Source**: Finch, Habitify
- **Priority**: Medium
- **Effort**: Small
- **Description**: Add an optional daily check-in prompt shown once per day when the user opens the Today page (dismissible, never shown again that day). Ask: "How's your energy today?" with 5 emoji options (exhausted / tired / neutral / good / great). Store in a new `daily_check_ins` table with date + energy score (1-5).
- **UX notes**: Appear as a soft banner at the top of Today, not a modal. Dismiss with a swipe or X. In Stats, overlay the energy score on the heatmap/calendar as a secondary indicator. Surface the correlation: "You complete 82% of habits on high-energy days."
- **Why for Zyrco**: Turns raw completion data into insight. A user who sees "I only complete 30% on low-energy days" can plan recovery habits instead of feeling like a failure. Local data only.

---

### P-07: "Perfect Day" Score on Today Page
- **Source**: Productive, Habitify
- **Priority**: Medium
- **Effort**: Small
- **Description**: Show a daily completion percentage prominently on the Today page header: "Today: 6/8 habits — 75%". When it hits 100%, show a brief celebration animation (confetti or a glowing ring) and log it as a "perfect day" in the stats.
- **UX notes**: The percentage updates in real time as habits are checked off. The celebration animation plays once, then replaces the score with "Perfect day! 🎯" for the rest of the day. Track perfect-day count in the Stats page: "12 perfect days this month."
- **Why for Zyrco**: Gives users a clear daily win condition. Currently Zyrco shows per-habit streaks but no aggregate "how am I doing today?" signal. This is the single most-requested feature pattern across all reviewed apps.

---

### P-08: Habit Sub-Tasks (Checklists)
- **Source**: HabitNow, Habitify
- **Priority**: Medium
- **Effort**: Medium
- **Description**: Allow users to add a list of sub-steps to a habit. For example, "Morning workout" → [warmup, 3×10 pushups, 3×10 squats, cool down]. Sub-tasks are optional and don't affect completion — checking the habit is still binary. But the sub-task list serves as a guided checklist while doing the habit.
- **UX notes**: Sub-tasks appear in a collapsible section when a habit row is expanded on the Today page. Each sub-task has its own checkbox, but checking all of them does NOT auto-complete the parent habit (avoids accidental completions). Store in a new `habit_subtasks` table.
- **Why for Zyrco**: Bridges the gap between habits and todos. Complex habits (workout routines, deep work sessions) benefit from a checklist. This removes the need to create separate todos that mirror a habit.

---

### P-09: Habit Stacking / Routine Builder
- **Source**: Fabulous, Productive
- **Priority**: Medium
- **Effort**: Large
- **Description**: Allow grouping habits into a named "routine" that plays sequentially. For example, "Morning Routine" = [Meditate 5min → Journal 10min → Exercise 20min]. Opening a routine launches a guided flow: one habit at a time, with a timer if the habit has one, and a "Next" button to advance. Completion of the routine logs all habits at once.
- **UX notes**: Routines appear as cards on the Today page, separate from individual habits. Tapping a routine card expands it to show the habit list; tapping "Start routine" enters guided mode (full-screen). Users can also skip individual steps within a routine.
- **Why for Zyrco**: The biggest behavioral insight from Fabulous is that habits done in sequence are far stickier than habits tracked in isolation. This is a differentiating feature for a desktop app used during focused morning/evening blocks.

---

### P-10: Failure Streak ("Red Chain") Tracking
- **Source**: Way of Life
- **Priority**: Medium
- **Effort**: Small
- **Description**: Track not just the current success streak, but also how many consecutive days a habit was NOT completed when it was due (excluding skips). Display this as a "missed streak" warning when it exceeds 3 days: "You've missed this habit 4 days in a row."
- **UX notes**: Show a subtle red indicator (pill badge) on habits with a failure streak ≥ 3 days on the Habits list page. In the habit detail view, show both stats: "Current streak: 2 days | Missed streak: 0 days." This is a gentle nudge, not a punishment UI.
- **Why for Zyrco**: Failure pattern recognition is more actionable than failure itself. "I missed this 6 times in a row" is a signal that the habit schedule or difficulty needs adjusting. Surface the insight, not just the data.

---

### P-11: Focus Timer Integrated with Habits
- **Source**: Structured (Pomodoro integration)
- **Priority**: Medium
- **Effort**: Medium
- **Description**: For habits of type `timer`, add a full-featured timer panel: countdown (user sets duration), elapsed time display, pause/resume, and a visual ring that depletes. On timer completion, the habit is auto-logged with the actual time elapsed. Support Pomodoro mode: 25min work + 5min break cycles.
- **UX notes**: Timer launches in a floating panel that stays on top while the user works in other parts of the app. Show the habit name + current session (Pomodoro: "Work 1 of 4"). Clicking the tray/taskbar icon shows timer status while Zyrco is minimized.
- **Why for Zyrco**: Desktop-specific advantage — a browser or mobile app can't reliably float a timer overlay. Zyrco as a Tauri app can. This makes Zyrco genuinely useful during deep work sessions, not just a tracking log.

---

### P-12: Habit Insights / Pattern Detection
- **Source**: Habitify, Loop Habit Tracker
- **Priority**: Medium
- **Effort**: Large
- **Description**: Add an "Insights" section to the Stats page that surfaces automatically computed patterns from habit log data: best completion day of the week, best completion time of day (if sessions are tracked), longest ever streak vs. current, month-over-month trend (improving / declining / stable), and which habits are most/least consistent.
- **UX notes**: Show as a scrollable card list, one insight per card. Each card has an icon, a one-sentence finding, and a small sparkline or bar. Compute weekly. Example cards: "Tuesday is your strongest day — 94% average", "Your morning habits are 2× more consistent than evening ones", "Reading has improved 22% this month."
- **Why for Zyrco**: Raw data is already in the SQLite DB. Insights transform it into actionable knowledge without the user having to analyze charts themselves. This is entirely local computation — no cloud needed.

---

### P-13: Keyboard-First Power User Mode
- **Source**: No direct competitor — gap in the market for desktop
- **Priority**: Medium
- **Effort**: Small
- **Description**: Add comprehensive keyboard shortcuts for the most common actions: `Space` to toggle today's completion for the focused habit, `N` to add a new habit, `J`/`K` to navigate between habits (vim-style), `E` to edit, `S` to skip today, `?` to show a shortcuts cheat sheet overlay. The Today page should be fully navigable without a mouse.
- **UX notes**: Show focus ring clearly when keyboard-navigating. The `?` overlay is a dark modal with a two-column list of all shortcuts. Store the last focused habit index so returning to Today restores cursor position.
- **Why for Zyrco**: Every competitor app is mobile-first. A desktop habit tracker where power users can check off their entire morning routine in 10 keystrokes is a genuine differentiator. No competitor does this well.

---

### P-14: Export & Data Portability
- **Source**: Loop Habit Tracker (CSV export), Habitify (export to CSV)
- **Priority**: Medium
- **Effort**: Small
- **Description**: Add an Export button in Settings that generates a ZIP containing: all habits as CSV, all logs as CSV, and a JSON file of the full schema. Also support importing from the same format for backup/restore. The export should work even if the user switches OS.
- **UX notes**: Export button opens a native file-picker to choose save location. Show a summary after export: "Exported 8 habits and 1,247 log entries." Import warns if it will overwrite existing data and requires confirmation.
- **Why for Zyrco**: Local-first apps live and die by data portability. Users who trust the app with their data for years need confidence they can get it out. This is also a strong selling point vs. cloud apps that lock you in.

---

### P-15: Customizable Widgets / Dashboard Panels
- **Source**: Streaks (best widgets of any habit tracker), HabitNow
- **Priority**: Low
- **Effort**: Large
- **Description**: Add a customizable dashboard as the default landing page (replacing Today as the first tab). Users arrange "panels" from a library: Today's habits (compact), Streak leaderboard for all habits, Heatmap mini (3-month), Category completion ring chart, Perfect days counter, and a motivational quote. Panels are draggable and resizable.
- **UX notes**: Dashboard is optional — Today remains accessible as its own tab. Use a simple grid layout (2 or 3 columns). Panels persist layout in `localStorage` / user preferences table. Mobile collapses to single-column automatically.
- **Why for Zyrco**: Zyrco is a desktop app that users leave open. A glanceable dashboard that shows overall health at a glance is far more valuable than having to click through Today → Stats → Categories to get the full picture.

---

### P-16: Habit Archiving with Recovery Stats
- **Source**: HabitNow, Habitify
- **Priority**: Low
- **Effort**: Small
- **Description**: Zyrco already has habit archiving. Extend it: when viewing an archived habit, show its historical stats (total completions, best streak, last completion date, completion rate). Add a "Restore" confirmation that warns if the habit's schedule would add it to today's pending list.
- **UX notes**: Archived habits page shows a summary card per habit with ghost/muted styling. Selecting one expands its stats. The restore flow is: confirm dialog → habit re-appears in active list with its historical data preserved.
- **Why for Zyrco**: Users archive habits they took a break from, not habits they want to delete forever. Showing the stats when restoring helps them decide if the habit was actually working. Already 80% built — just needs the stats display.

---

### P-17: Batch "Quick Log" for Past Days
- **Source**: Loop Habit Tracker
- **Priority**: Low
- **Effort**: Small
- **Description**: On the Habits page, allow tapping any day in the habit's calendar row to toggle its completion for that past day (up to 7 days back). Currently editing past logs requires going to the habit detail. This should be a single tap on the calendar dots.
- **UX notes**: Each habit row in the list view shows the last 7 days as small dots (already exists). Make those dots tappable with a toggle — completed turns filled, not completed turns empty. Show a brief undo toast: "Marked Tuesday as done. Undo?" with a 3-second window.
- **Why for Zyrco**: The most common user workflow is opening the app the morning after forgetting to log. One-tap retroactive logging removes significant friction. Undo prevents accidental edits.

---

## UI/UX Improvements

### Progress ring on Today page header
Replace the plain text header with a large circular progress ring showing today's completion percentage (0–100). Ring fills with the primary category color as habits are completed. Inspired by Apple Watch activity rings — instantly communicates progress at a glance.

### Smoother habit completion animation
When checking off a habit, add a satisfying micro-animation: the checkbox does a spring-bounce fill, the row briefly highlights, and if it's the last habit for the session, a small "Session complete" banner slides in from the bottom. Streaks app is the gold standard for this. Currently Zyrco's completion feedback is too flat.

### Keyboard shortcut for "Today" button
The existing "Today" button is good, but power users should be able to jump to today with `T` from anywhere in the app. Add this to the keyboard shortcut system proposed in P-13.

### Consistent empty state illustrations
Every page (Today with no habits due, Stats with no data, Todos with no items) should have a friendly empty state with a small illustration and a clear call-to-action button. Currently empty states are just blank space, which feels like a bug rather than an intentional state.

### "At-risk" badge styling refinement
The at-risk streak indicator already exists but is subtle. Make it more visually distinct: amber/orange background pill badge with a flame icon instead of the current text-only indicator. Users in testing on Finch and Streaks respond strongly to flame iconography for streak risk.

### Category color in habit row background
Instead of only a small color dot indicator, tint the entire habit row background with a very low-opacity (5-8%) version of the category color. This makes category membership immediately scannable without being visually loud. Habitify does this well.

### Confirmation before destructive actions with impact summary
Before deleting a habit, show: "Delete 'Reading'? You'll lose 47 log entries and a 12-day streak." Before clearing all logs: show exactly how many entries will be removed. This pattern is borrowed from Strides and reduces support requests.

---

## What NOT to Copy

- **Mandatory cloud sync** — Zyrco's local-first model is a feature, not a limitation. Don't add sync just because competitors have it.
- **Account registration walls** — Loop and Zyrco's privacy-first model is a selling point. Never require an account.
- **Full RPG mechanics** — Habitica's RPG is its identity. Copying XP/gold/classes/boss fights onto Zyrco would be derivative and jarring. Light gamification (P-07's perfect day celebration) is enough.
- **Social/community features** — Leaderboards, guilds, and public challenges are designed for mobile social apps. A desktop app is a solo tool.
- **AI habit coaching content** — Fabulous fills screens with behavioral science articles and motivational letters. Zyrco should surface data insights (P-12), not editorial content.
- **Subscription paywalls on basic features** — Habitify locks mood tracking and some analytics behind premium. Zyrco is a one-time purchase desktop app; feature gating would feel hostile.
- **iOS/Apple Watch-specific integrations** — Siri shortcuts, HealthKit auto-completion, complications. Tauri on Windows/Android has different integration targets.
- **Onboarding "journeys" that delay the app** — Fabulous makes you complete a 5-minute interactive intro before you can track anything. Zyrco's onboarding should take 30 seconds max: add first habit → done.

---

## Priority Summary

| # | Feature | Priority | Effort |
|---|---|---|---|
| P-01 | Habit Strength Score | High | Medium |
| P-02 | Annual Heatmap View | High | Medium |
| P-03 | Time-of-Day Sessions | High | Small |
| P-04 | Numeric & Timer Completion | High | Medium |
| P-05 | Template Library | High | Small |
| P-06 | Daily Mood Check-In | Medium | Small |
| P-07 | Perfect Day Score | Medium | Small |
| P-08 | Habit Sub-Tasks | Medium | Medium |
| P-09 | Routine Builder | Medium | Large |
| P-10 | Failure Streak Tracking | Medium | Small |
| P-11 | Focus Timer (Pomodoro) | Medium | Medium |
| P-12 | Habit Insights / Patterns | Medium | Large |
| P-13 | Keyboard-First Mode | Medium | Small |
| P-14 | Export & Data Portability | Medium | Small |
| P-15 | Customizable Dashboard | Low | Large |
| P-16 | Archived Habit Stats | Low | Small |
| P-17 | Quick Log Past Days | Low | Small |

**Recommended first sprint (High priority, Small–Medium effort):** P-03 → P-05 → P-07 → P-04 → P-01 → P-02
