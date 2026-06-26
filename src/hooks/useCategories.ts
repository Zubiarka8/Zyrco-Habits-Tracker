import { useState, useEffect, useCallback } from "react";
import type { Category } from "../types";
import {
  fetchCategories,
  insertCategory,
  updateCategory,
  deleteCategory,
} from "../db/database";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCategories();
      setCategories(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (data: Omit<Category, "id" | "created_at">) => {
      const cat = await insertCategory(data);
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      return cat;
    },
    []
  );

  const update = useCallback(
    async (id: string, data: Partial<Omit<Category, "id" | "created_at">>) => {
      await updateCategory(id, data);
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...data } : c))
      );
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { categories, loading, error, reload: load, create, update, remove };
}
