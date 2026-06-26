import { format, parseISO, differenceInCalendarDays } from "date-fns";
import type { Habit } from "../types";

/**
 * Returns true if a habit is scheduled to appear on the given calendar day.
 * Single authoritative source — imported by both Today.tsx and HabitCalendar.tsx
 * so that dots, rows, and stats always agree.
 */
export function isHabitDueOnDay(habit: Habit, date: Date): boolean {
  if (habit.archived) return false;

  const dateStr = format(date, "yyyy-MM-dd");
  if (habit.start_date && dateStr < habit.start_date) return false;
  if (habit.end_date && dateStr > habit.end_date) return false;

  const dow = date.getDay();

  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekly") return dow === 1; // every Monday — existing behaviour

  if (habit.frequency === "custom") {
    // existing habits created before custom_type existed default to weekdays
    const customType = habit.custom_type ?? "weekdays";

    if (customType === "weekdays") {
      return (habit.target_days ?? []).includes(dow);
    }

    if (customType === "month_days") {
      return (habit.target_days ?? []).includes(date.getDate());
    }

    if (customType === "interval" && habit.interval_days && habit.interval_days > 0) {
      // use start_date as day-0 reference, fall back to created_at date
      const refStr = habit.start_date ?? habit.created_at.slice(0, 10);
      const ref = parseISO(refStr + "T00:00:00");
      const diff = differenceInCalendarDays(date, ref);
      return diff >= 0 && diff % habit.interval_days === 0;
    }
  }

  return false;
}
