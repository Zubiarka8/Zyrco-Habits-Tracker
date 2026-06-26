import { useState, useEffect, useCallback } from "react";
import type { Habit } from "../types";
import {
  fetchHabits,
  insertHabit,
  updateHabit,
  deleteHabit,
} from "../db/database";

export function useHabits(includeArchived = false) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchHabits(includeArchived);
      setHabits(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (data: Omit<Habit, "id" | "created_at" | "archived">) => {
      const habit = await insertHabit(data);
      setHabits((prev) => [...prev, habit]);
      return habit;
    },
    []
  );

  const update = useCallback(
    async (id: string, data: Partial<Omit<Habit, "id" | "created_at">>) => {
      await updateHabit(id, data);
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? { ...h, ...data } : h))
      );
    },
    []
  );

  const archive = useCallback(async (id: string, archived: boolean) => {
    await updateHabit(id, { archived });
    if (!includeArchived) {
      setHabits((prev) => prev.filter((h) => h.id !== id));
    } else {
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? { ...h, archived } : h))
      );
    }
  }, [includeArchived]);

  const remove = useCallback(async (id: string) => {
    await deleteHabit(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return { habits, loading, error, reload: load, create, update, archive, remove };
}
