import { format, subDays, addDays, parseISO } from "date-fns";
import { isHabitDueOnDay } from "./schedule";
import type { Habit, Log } from "../types";

/** EMA strength score (0–100). Decays slowly — a 3-day break after 60 days drops ~100→65. */
export function calculateStrengthScore(logs: Log[], habitId: string): number {
  const ALPHA = 0.15;
  const DAYS = 90;
  const completedDates = new Set(
    logs.filter((l) => l.habit_id === habitId && l.completed).map((l) => l.date)
  );
  let score = 0;
  for (let i = 0; i < DAYS; i++) {
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    if (completedDates.has(date)) {
      score += ALPHA * Math.pow(1 - ALPHA, i);
    }
  }
  const maxScore = 1 - Math.pow(1 - ALPHA, DAYS);
  return Math.round((score / maxScore) * 100);
}

export function getGraceDays(): number {
  return Math.max(0, Math.min(2, parseInt(localStorage.getItem("zyrco-grace-days") ?? "1", 10)));
}

/**
 * Current and best streak for a habit, fully schedule-aware.
 * Non-due days are skipped entirely — a weekend won't break a Mon–Fri habit's streak.
 * Grace days apply only to missed DUE days, not all calendar days.
 */
export function calculateStreak(
  logs: Log[],
  habit: Habit
): { current: number; best: number; graceDayActive: boolean } {
  const graceDays = getGraceDays();
  const createdAt = habit.created_at.slice(0, 10);
  const completedDates = new Set(
    logs.filter((l) => l.habit_id === habit.id && l.completed).map((l) => l.date)
  );

  if (completedDates.size === 0) return { current: 0, best: 0, graceDayActive: false };

  // ── current streak: walk backward from today, skip non-due days ──
  let current = 0;
  let missRun = 0;
  // Track whether the most recent due day was completed — used for graceDayActive.
  let firstDueDayCompleted: boolean | null = null;

  for (let i = 0; i < 3650; i++) {
    const date = subDays(new Date(), i);
    const ds = format(date, "yyyy-MM-dd");
    if (ds < createdAt) break;
    if (!isHabitDueOnDay(habit, date)) continue;

    const done = completedDates.has(ds);
    if (firstDueDayCompleted === null) firstDueDayCompleted = done;

    if (done) {
      current++;
      missRun = 0;
    } else {
      missRun++;
      if (missRun > graceDays) break;
    }
  }

  // graceDayActive: streak is alive but the most recent due day was not yet completed
  const graceDayActive = current > 0 && firstDueDayCompleted === false;

  // ── best streak: longest consecutive run of DUE days all completed ──
  // Walk forward from creation date, counting only due days.
  const todayStr = format(new Date(), "yyyy-MM-dd");
  let best = 0;
  let run = 0;
  let cur = parseISO(createdAt + "T00:00:00");

  while (format(cur, "yyyy-MM-dd") <= todayStr) {
    if (isHabitDueOnDay(habit, cur)) {
      const ds = format(cur, "yyyy-MM-dd");
      if (completedDates.has(ds)) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    cur = addDays(cur, 1);
  }

  return { current, best, graceDayActive };
}
