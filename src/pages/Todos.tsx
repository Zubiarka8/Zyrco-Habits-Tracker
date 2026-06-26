import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Edit2, CheckSquare, Square } from "lucide-react";
import { useTodos } from "../hooks/useTodos";
import { Modal } from "../components/Modal";
import type { Todo } from "../types";

type Filter = "pending" | "completed" | "all";

const PRIORITY_COLORS: Record<Todo["priority"], string> = {
  high:   "#ef4444",
  medium: "#f97316",
  low:    "#3b82f6",
  none:   "var(--color-border)",
};

const PRIORITY_BG: Record<Todo["priority"], string> = {
  high:   "#ef444418",
  medium: "#f9731618",
  low:    "#3b82f618",
  none:   "var(--color-surface-alt)",
};

function PriorityBadge({ priority }: { priority: Todo["priority"] }) {
  const { t } = useTranslation();
  if (priority === "none") return null;
  return (
    <span
      className="todo-priority"
      style={{
        background: PRIORITY_BG[priority],
        color: PRIORITY_COLORS[priority],
      }}
    >
      {t(`todos.priority_${priority}`)}
    </span>
  );
}

// ── Todo form (used in both create and edit modals) ────────

interface TodoFormState {
  title: string;
  priority: Todo["priority"];
  due_date: string;
}

function TodoFormFields({
  state,
  onChange,
}: {
  state: TodoFormState;
  onChange: (s: TodoFormState) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="habit-form">
      <div className="form-field">
        <label className="field-label">{t("todos.title")}</label>
        <input
          className="input"
          type="text"
          value={state.title}
          onChange={(e) => onChange({ ...state, title: e.target.value })}
          placeholder={t("todos.titlePlaceholder")}
          autoFocus
          required
        />
      </div>

      <div className="form-row">
        <div className="form-field flex-1">
          <label className="field-label">{t("todos.priority")}</label>
          <select
            className="select"
            value={state.priority}
            onChange={(e) =>
              onChange({ ...state, priority: e.target.value as Todo["priority"] })
            }
          >
            <option value="none">{t("todos.priority_none")}</option>
            <option value="low">{t("todos.priority_low")}</option>
            <option value="medium">{t("todos.priority_medium")}</option>
            <option value="high">{t("todos.priority_high")}</option>
          </select>
        </div>

        <div className="form-field flex-1">
          <label className="field-label">{t("todos.dueDate")}</label>
          <input
            className="input"
            type="date"
            value={state.due_date}
            onChange={(e) => onChange({ ...state, due_date: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ── Todos page ─────────────────────────────────────────────

export function Todos() {
  const { t } = useTranslation();
  const { todos, loading, toggle, create, update, remove } = useTodos();

  const [filter, setFilter] = useState<Filter>("pending");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [deleteTodo, setDeleteTodo] = useState<Todo | null>(null);

  const emptyForm: TodoFormState = { title: "", priority: "none", due_date: "" };
  const [createForm, setCreateForm] = useState<TodoFormState>(emptyForm);
  const [editForm, setEditForm] = useState<TodoFormState>(emptyForm);

  const openCreate = () => {
    setCreateForm(emptyForm);
    setCreateOpen(true);
  };

  const openEdit = (todo: Todo) => {
    setEditTodo(todo);
    setEditForm({
      title: todo.title,
      priority: todo.priority,
      due_date: todo.due_date ?? "",
    });
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    try {
      await create({
        title: createForm.title.trim(),
        completed: false,
        priority: createForm.priority,
        due_date: createForm.due_date || null,
      });
      setCreateOpen(false);
      setCreateForm(emptyForm);
    } catch {
      // error logged in hook
    }
  };

  const handleEdit = async () => {
    if (!editTodo || !editForm.title.trim()) return;
    try {
      await update(editTodo.id, {
        title: editForm.title.trim(),
        priority: editForm.priority,
        due_date: editForm.due_date || null,
      });
      setEditTodo(null);
    } catch {
      // error logged in hook
    }
  };

  const handleDelete = async () => {
    if (!deleteTodo) return;
    try {
      await remove(deleteTodo.id);
      setDeleteTodo(null);
    } catch {
      // error logged in hook
    }
  };

  const filtered = todos.filter((todo) => {
    if (filter === "pending") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const pending = todos.filter((t) => !t.completed).length;
  const completed = todos.filter((t) => t.completed).length;

  if (loading) return <div className="page-loading">{t("common.loading")}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("todos.title")}</h1>
          {todos.length > 0 && (
            <p className="text-muted text-sm">
              {pending} {t("todos.pending")} · {completed} {t("todos.completed")}
            </p>
          )}
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          {t("todos.new")}
        </button>
      </div>

      {/* Filter tabs */}
      {todos.length > 0 && (
        <div className="todo-filters">
          {(["pending", "all", "completed"] as Filter[]).map((f) => (
            <button
              key={f}
              className={`todo-filter-btn ${filter === f ? "todo-filter-btn--active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {t(`todos.filter_${f}`)}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {todos.length === 0 && (
        <div className="empty-state">
          <p>{t("todos.noTodos")}</p>
          <p className="text-muted">{t("todos.noTodosDesc")}</p>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {t("todos.new")}
          </button>
        </div>
      )}

      {todos.length > 0 && filtered.length === 0 && (
        <div className="empty-state" style={{ padding: "40px 24px" }}>
          <p className="text-muted">
            {filter === "pending" ? t("todos.allDone") : t("todos.noneCompleted")}
          </p>
        </div>
      )}

      {/* Todo list */}
      <div className="todo-list">
        {filtered.map((todo) => {
          const isOverdue =
            !todo.completed &&
            todo.due_date &&
            todo.due_date < new Date().toISOString().slice(0, 10);

          return (
            <div
              key={todo.id}
              className={`todo-item ${todo.completed ? "todo-item--done" : ""}`}
            >
              <button
                className="todo-check"
                onClick={() => toggle(todo.id, todo.completed)}
                aria-label={todo.completed ? t("todos.uncheck") : t("todos.check")}
              >
                {todo.completed ? (
                  <CheckSquare size={22} className="todo-check-icon--done" />
                ) : (
                  <Square size={22} className="todo-check-icon" />
                )}
              </button>

              <div className="todo-body">
                <span className="todo-title">{todo.title}</span>
                <div className="todo-meta">
                  <PriorityBadge priority={todo.priority} />
                  {todo.due_date && (
                    <span
                      className={`todo-due ${isOverdue ? "todo-due--overdue" : ""}`}
                    >
                      {todo.due_date}
                    </span>
                  )}
                </div>
              </div>

              <div className="todo-actions">
                <button
                  className="icon-btn"
                  onClick={() => openEdit(todo)}
                  aria-label={t("common.edit")}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  className="icon-btn icon-btn-danger"
                  onClick={() => setDeleteTodo(todo)}
                  aria-label={t("common.delete")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        title={t("todos.new")}
        onClose={() => setCreateOpen(false)}
        size="md"
      >
        <TodoFormFields state={createForm} onChange={setCreateForm} />
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>
            {t("common.cancel")}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={!createForm.title.trim()}
          >
            {t("common.save")}
          </button>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editTodo}
        title={t("todos.edit")}
        onClose={() => setEditTodo(null)}
        size="md"
      >
        <TodoFormFields state={editForm} onChange={setEditForm} />
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setEditTodo(null)}>
            {t("common.cancel")}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleEdit}
            disabled={!editForm.title.trim()}
          >
            {t("common.save")}
          </button>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteTodo}
        title={t("common.delete")}
        onClose={() => setDeleteTodo(null)}
        size="sm"
      >
        <p className="confirm-text">{t("todos.deleteConfirm")}</p>
        <p className="confirm-name">{deleteTodo?.title}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setDeleteTodo(null)}>
            {t("common.cancel")}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            {t("common.delete")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
