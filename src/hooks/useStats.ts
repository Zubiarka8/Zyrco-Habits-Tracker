import { useState, useEffect, useCallback } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import type { Habit, Log, HabitStats } from "../types";
import { fetchAllLogs, fetchHabits } from "../db/database";
import { calculateStreak, calculateStrengthScore } from "../utils/stats";

export function useStats() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch ALL habits (including archived) so streak lookups work for archive pages.
      const [h, l] = await Promise.all([fetchHabits(true), fetchAllLogs()]);
      setHabits(h);
      setLogs(l);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error("useStats load failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reload whenever a habit is toggled anywhere in the app so streak badges
  // and completion rates stay fresh without requiring a page navigation.
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("zyrco:log-changed", handler);
    return () => window.removeEventListener("zyrco:log-changed", handler);
  }, [load]);

  const getHabitStats = useCallback(
    (habitId: string, days = 30): HabitStats => {
      const endDate = new Date();
      const startDate = subDays(endDate, days - 1);

      const range = eachDayOfInterval({ start: startDate, end: endDate }).map(
        (d) => format(d, "yyyy-MM-dd")
      );

      const completedSet = new Set(
        logs
          .filter((l) => l.habit_id === habitId && l.completed)
          .map((l) => l.date)
      );

      const last30Days = range.map((date) => ({
        date,
        completed: completedSet.has(date),
      }));

      const totalCompleted = logs.filter(
        (l) => l.habit_id === habitId && l.completed
      ).length;

      const completionRate =
        range.length > 0
          ? Math.round((last30Days.filter((d) => d.completed).length / range.length) * 100)
          : 0;

      const habit = habits.find((h) => h.id === habitId);
      const { current: streak, best: bestStreak, graceDayActive } = habit
        ? calculateStreak(logs, habit)
        : { current: 0, best: 0, graceDayActive: false };
      const strengthScore = calculateStrengthScore(logs, habitId);

      return {
        habitId,
        streak,
        bestStreak,
        totalCompleted,
        completionRate,
        strengthScore,
        last30Days,
        graceDayActive,
      };
    },
    [logs, habits]
  );

  const getOverallStats = useCallback(
    (days = 30) => {
      const endDate = new Date();
      const startDate = subDays(endDate, days - 1);
      const range = eachDayOfInterval({ start: startDate, end: endDate }).map(
        (d) => format(d, "yyyy-MM-dd")
      );

      const byDate = range.map((date) => {
        const dayLogs = logs.filter((l) => l.date === date);
        const completed = dayLogs.filter((l) => l.completed).length;
        return { date, completed };
      });

      const totalCompleted = logs.filter((l) => l.completed).length;
      const bestStreak = habits.length
        ? Math.max(...habits.map((h) => calculateStreak(logs, h).best), 0)
        : 0;
      const currentStreak = habits.length
        ? Math.max(...habits.map((h) => calculateStreak(logs, h).current), 0)
        : 0;

      return { byDate, totalCompleted, bestStreak, currentStreak };
    },
    [habits, logs]
  );

  return { habits, logs, loading, error, reload: load, getHabitStats, getOverallStats };
}
