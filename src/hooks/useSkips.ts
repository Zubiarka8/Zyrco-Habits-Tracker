import { useState, useEffect, useCallback } from "react";
import {
  fetchSkipsForDate,
  fetchSkipsForRange,
  skipHabitOnDate,
  excludeHabitOnDate,
  unskipHabitOnDate,
} from "../db/database";

const SKIP_EVENT = "zyrco:skip-changed";

/** Manages skip/exclude exceptions for a single date. */
export function useSkips(date: string) {
  const [skippedIds,  setSkippedIds]  = useState<Set<string>>(new Set());
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const rows = await fetchSkipsForDate(date);
      setSkippedIds(new Set(rows.filter((r) => r.type === "skip").map((r) => r.habit_id)));
      setExcludedIds(new Set(rows.filter((r) => r.type === "exclude").map((r) => r.habit_id)));
    } catch (err) {
      console.error("useSkips load failed:", err);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener(SKIP_EVENT, handler);
    return () => window.removeEventListener(SKIP_EVENT, handler);
  }, [load]);

  const skip = useCallback(
    async (habitId: string) => {
      try {
        await skipHabitOnDate(habitId, date);
        window.dispatchEvent(new CustomEvent(SKIP_EVENT));
      } catch (err) {
        console.error(`useSkips.skip failed — habit ${habitId} date ${date}:`, err);
      }
    },
    [date]
  );

  const exclude = useCallback(
    async (habitId: string) => {
      try {
        await excludeHabitOnDate(habitId, date);
        window.dispatchEvent(new CustomEvent(SKIP_EVENT));
      } catch (err) {
        console.error(`useSkips.exclude failed — habit ${habitId} date ${date}:`, err);
      }
    },
    [date]
  );

  const unskip = useCallback(
    async (habitId: string) => {
      try {
        await unskipHabitOnDate(habitId, date);
        window.dispatchEvent(new CustomEvent(SKIP_EVENT));
      } catch (err) {
        console.error(`useSkips.unskip failed — habit ${habitId} date ${date}:`, err);
      }
    },
    [date]
  );

  return {
    skippedIds,
    excludedIds,
    isSkipped:  (id: string) => skippedIds.has(id),
    isExcluded: (id: string) => excludedIds.has(id),
    skip,
    exclude,
    unskip,
  };
}

/** Fetches skip rows for a calendar range (used to grey out days in the calendar).
 *  Returns both 'skip' and 'exclude' types so the calendar can filter all of them. */
export function useRangeSkips(startDate: string, endDate: string) {
  const [rangeSkips, setRangeSkips] = useState<{ habit_id: string; date: string; type: string }[]>([]);

  const load = useCallback(async () => {
    try {
      const rows = await fetchSkipsForRange(startDate, endDate);
      setRangeSkips(rows);
    } catch (err) {
      console.error("useRangeSkips load failed:", err);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener(SKIP_EVENT, handler);
    return () => window.removeEventListener(SKIP_EVENT, handler);
  }, [load]);

  return { rangeSkips };
}
