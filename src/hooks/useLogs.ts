import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import type { Log } from "../types";
import {
  fetchLogsForDate,
  fetchLogsForDateRange,
  fetchLogsForHabit,
  upsertLog,
} from "../db/database";

export function useTodayLogs() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLogsForDate(today);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
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

  return { logs, loading, error, reload: load, toggle, saveNote, today };
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

// ── useDateLogs: works for any date, not just today ──────

export function useDateLogs(date: string) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLogs([]);
    try {
      const data = await fetchLogsForDate(date);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error(`useDateLogs failed for date ${date}:`, err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (habitId: string, currentCompleted: boolean) => {
    const next = !currentCompleted;
    try {
      await upsertLog(habitId, date, next);
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
            date,
            completed: next,
            note: null,
            created_at: new Date().toISOString(),
          },
        ];
      });
    } catch (err) {
      console.error(
        `useDateLogs toggle failed — habit ${habitId}, date ${date}:`,
        err
      );
    }
  }, [date]);

  const saveNote = useCallback(async (habitId: string, note: string) => {
    try {
      await upsertLog(habitId, date, true, note);
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
            date,
            completed: true,
            note,
            created_at: new Date().toISOString(),
          },
        ];
      });
    } catch (err) {
      console.error(
        `useDateLogs saveNote failed — habit ${habitId}, date ${date}:`,
        err
      );
    }
  }, [date]);

  return { logs, loading, error, toggle, saveNote, reload: load };
}

// ── useCalendarLogs: fetches logs for a date range (month/week views) ──

export function useCalendarLogs(startDate: string, endDate: string) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLogsForDateRange(startDate, endDate);
      setLogs(data);
    } catch (err) {
      console.error(
        `useCalendarLogs failed (${startDate} → ${endDate}):`,
        err
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  return { logs, loading, reload: load };
}
