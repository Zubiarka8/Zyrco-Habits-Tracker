import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import type { Log } from "../types";
import {
  fetchLogsForDate,
  fetchLogsForHabit,
  upsertLog,
} from "../db/database";

export function useTodayLogs() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchLogsForDate(today);
    setLogs(data);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    async (habitId: string, currentCompleted: boolean) => {
      const next = !currentCompleted;
      await upsertLog(habitId, today, next);
      setLogs((prev) => {
        const existing = prev.find((l) => l.habit_id === habitId);
        if (existing) {
          return prev.map((l) =>
            l.habit_id === habitId ? { ...l, completed: next } : l
          );
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            habit_id: habitId,
            date: today,
            completed: next,
            note: null,
            created_at: new Date().toISOString(),
          },
        ];
      });
    },
    [today]
  );

  const saveNote = useCallback(
    async (habitId: string, note: string) => {
      await upsertLog(habitId, today, true, note);
      setLogs((prev) => {
        const existing = prev.find((l) => l.habit_id === habitId);
        if (existing) {
          return prev.map((l) =>
            l.habit_id === habitId ? { ...l, note } : l
          );
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            habit_id: habitId,
            date: today,
            completed: true,
            note,
            created_at: new Date().toISOString(),
          },
        ];
      });
    },
    [today]
  );

  return { logs, loading, reload: load, toggle, saveNote, today };
}

export function useHabitLogs(habitId: string, startDate: string, endDate: string) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLogsForHabit(habitId, startDate, endDate).then((data) => {
      if (!cancelled) {
        setLogs(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [habitId, startDate, endDate]);

  return { logs, loading };
}
