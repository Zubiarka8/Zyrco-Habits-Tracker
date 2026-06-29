import { useState, useEffect, useCallback } from "react";
import { markHabitMissed, unmarkHabitMissed, fetchMissesForDate } from "../db/database";

const MISS_EVENT = "zyrco:miss-changed";

/** Tracks habits explicitly marked as "not done today" for a given date. */
export function useMisses(date: string) {
  const [missedIds, setMissedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const rows = await fetchMissesForDate(date);
      setMissedIds(new Set(rows.map((r) => r.habit_id)));
    } catch (err) {
      console.error("useMisses load failed:", err);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener(MISS_EVENT, handler);
    return () => window.removeEventListener(MISS_EVENT, handler);
  }, [load]);

  const markMissed = useCallback(
    async (habitId: string) => {
      try {
        await markHabitMissed(habitId, date);
        window.dispatchEvent(new CustomEvent(MISS_EVENT));
      } catch (err) {
        console.error(`useMisses.markMissed failed — habit ${habitId} date ${date}:`, err);
      }
    },
    [date]
  );

  const unmarkMissed = useCallback(
    async (habitId: string) => {
      try {
        await unmarkHabitMissed(habitId, date);
        window.dispatchEvent(new CustomEvent(MISS_EVENT));
      } catch (err) {
        console.error(`useMisses.unmarkMissed failed — habit ${habitId} date ${date}:`, err);
      }
    },
    [date]
  );

  return {
    isMissed:    (id: string) => missedIds.has(id),
    markMissed,
    unmarkMissed,
  };
}
