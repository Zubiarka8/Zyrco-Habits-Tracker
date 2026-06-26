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

  // [FUTURO - PREMIUM MENSUAL + ANUAL + LIFETIME] Límite de hábitos activos.
  // Free tendrá máximo 10 hábitos no archivados.
  // Cuando MONETIZATION_ACTIVE = true: verificar habits.filter(h => !h.archived).length < PLAN_LIMITS[plan].maxHabits
  // antes de llamar a insertHabit(); si supera el límite, lanzar error y mostrar upsell.
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
