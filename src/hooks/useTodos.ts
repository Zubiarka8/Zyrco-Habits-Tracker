import { useState, useEffect, useCallback } from "react";
import type { Todo } from "../types";
import { fetchTodos, insertTodo, updateTodo, deleteTodo } from "../db/database";

const PRIORITY_ORDER: Record<Todo["priority"], number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

/** Pending todos first (high priority → low), then completed (newest first) */
function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.completed && !b.completed) {
      const pd = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (pd !== 0) return pd;
      // sort pending by due_date ascending (overdue first), no due_date last
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTodos();
      setTodos(sortTodos(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error("useTodos load failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (data: Omit<Todo, "id" | "created_at">) => {
      try {
        const todo = await insertTodo(data);
        setTodos((prev) => sortTodos([...prev, todo]));
        return todo;
      } catch (err) {
        console.error("useTodos create failed:", err);
        throw err;
      }
    },
    []
  );

  const update = useCallback(
    async (id: string, data: Partial<Omit<Todo, "id" | "created_at">>) => {
      try {
        await updateTodo(id, data);
        setTodos((prev) =>
          sortTodos(prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
        );
      } catch (err) {
        console.error(`useTodos update failed for todo ${id}:`, err);
        throw err;
      }
    },
    []
  );

  const toggle = useCallback(async (id: string, currentCompleted: boolean) => {
    try {
      await updateTodo(id, { completed: !currentCompleted });
      setTodos((prev) =>
        sortTodos(
          prev.map((t) =>
            t.id === id ? { ...t, completed: !currentCompleted } : t
          )
        )
      );
    } catch (err) {
      console.error(`useTodos toggle failed for todo ${id}:`, err);
      throw err;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(`useTodos remove failed for todo ${id}:`, err);
      throw err;
    }
  }, []);

  return { todos, loading, error, reload: load, create, update, toggle, remove };
}
