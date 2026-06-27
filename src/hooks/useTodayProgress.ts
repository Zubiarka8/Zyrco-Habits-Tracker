import { useMemo } from "react";
import { format } from "date-fns";
import { useHabits } from "./useHabits";
import { useDateLogs } from "./useLogs";
import { isHabitDueOnDay } from "../utils/schedule";

/**
 * Returns today's completion progress for use in the sidebar badge.
 * Refreshes automatically via the zyrco:log-changed event (inherited from useDateLogs).
 */
export function useTodayProgress(): { done: number; total: number } {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayObj = useMemo(() => new Date(), []);
  const { habits } = useHabits();
  const { logs } = useDateLogs(todayStr);

  return useMemo(() => {
    const due = habits.filter((h) => {
      if (h.archived) return false;
      if (h.paused_until && h.paused_until >= todayStr) return false;
      return isHabitDueOnDay(h, todayObj);
    });
    const done = due.filter((h) => logs.some((l) => l.habit_id === h.id && l.completed)).length;
    return { done, total: due.length };
  }, [habits, logs, todayStr, todayObj]);
}
