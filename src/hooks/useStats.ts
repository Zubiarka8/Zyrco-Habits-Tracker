import { useState, useEffect, useCallback } from "react";
import { format, subDays, eachDayOfInterval, parseISO } from "date-fns";
import type { Habit, Log, HabitStats } from "../types";
import { fetchAllLogs, fetchHabits } from "../db/database";

/** EMA-based strength score (0–100). Recent completions weigh more than old ones.
 *  A 3-day miss after 60 days of consistency drops from ~100 to ~65, not to 0. */
function calculateStrengthScore(logs: Log[], habitId: string): number {
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


function calculateStreak(logs: Log[], habitId: string): { current: number; best: number } {
  const completed = logs
    .filter((l) => l.habit_id === habitId && l.completed)
    .map((l) => l.date)
    .sort()
    .reverse();

  if (completed.length === 0) return { current: 0, best: 0 };

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  let current = 0;
  let expected = completed[0] >= today ? today : yesterday;

  for (const date of completed) {
    if (date === expected) {
      current++;
      expected = format(subDays(parseISO(expected), 1), "yyyy-MM-dd");
    } else if (date < expected) {
      break;
    }
  }

  let best = 0;
  let run = 0;
  let prev: string | null = null;

  for (const date of [...completed].reverse()) {
    if (
      prev === null ||
      date === format(subDays(parseISO(prev), -1), "yyyy-MM-dd")
    ) {
      run++;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = date;
  }

  return { current, best };
}

export function useStats() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [h, l] = await Promise.all([fetchHabits(false), fetchAllLogs()]);
    setHabits(h);
    setLogs(l);
    setLoading(false);
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

      const { current: streak, best: bestStreak } = calculateStreak(logs, habitId);
      const strengthScore = calculateStrengthScore(logs, habitId);

      return {
        habitId,
        streak,
        bestStreak,
        totalCompleted,
        completionRate,
        strengthScore,
        last30Days,
      };
    },
    [logs]
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
        ? Math.max(...habits.map((h) => calculateStreak(logs, h.id).best), 0)
        : 0;
      const currentStreak = habits.length
        ? Math.max(...habits.map((h) => calculateStreak(logs, h.id).current), 0)
        : 0;

      return { byDate, totalCompleted, bestStreak, currentStreak };
    },
    [habits, logs]
  );

  return { habits, logs, loading, reload: load, getHabitStats, getOverallStats };
}
