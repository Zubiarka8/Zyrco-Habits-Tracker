import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, MoreVertical, Edit2, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useHabits } from "../hooks/useHabits";
import { useCategories } from "../hooks/useCategories";
import { useStats } from "../hooks/useStats";
import { Modal } from "../components/Modal";
import { HabitForm } from "../components/HabitForm";
import { StreakBadge } from "../components/StreakBadge";
import type { Habit } from "../types";

type MenuState = { habitId: string; x: number; y: number } | null;

export function Habits() {
  const { t } = useTranslation();
  const [includeArchived, setIncludeArchived] = useState(false);
  const { habits, loading, create, update, archive, remove } = useHabits(includeArchived);
  const { categories } = useCategories();
  const { getHabitStats } = useStats();

  const [formOpen, setFormOpen] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);

  const openCreate = () => {
    setEditHabit(null);
    setFormOpen(true);
  };

  const openEdit = (habit: Habit) => {
    setEditHabit(habit);
    setFormOpen(true);
    setMenu(null);
  };

  const handleSave = async (data: Omit<Habit, "id" | "created_at" | "archived">) => {
    if (editHabit) {
      await update(editHabit.id, data);
    } else {
      await create(data);
    }
    setFormOpen(false);
    setEditHabit(null);
  };

  const handleArchive = async (habit: Habit) => {
    await archive(habit.id, !habit.archived);
    setMenu(null);
  };

  const confirmDelete = (habit: Habit) => {
    setDeleteTarget(habit);
    setMenu(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (loading) return <div className="page-loading">{t("common.loading")}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t("habits.title")}</h1>
        <div className="header-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setIncludeArchived((v) => !v)}
          >
            {includeArchived ? t("habits.hideArchived") : t("habits.showArchived")}
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {t("habits.new")}
          </button>
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="empty-state">
          <p>{t("habits.noHabits")}</p>
          <p className="text-muted">{t("habits.createFirst")}</p>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {t("habits.new")}
          </button>
        </div>
      ) : (
        <div className="habits-grid">
          {habits.map((habit) => {
            const stats = getHabitStats(habit.id);
            const category = categories.find((c) => c.id === habit.category_id);

            return (
              <div
                key={habit.id}
                className={`habit-card ${habit.archived ? "habit-card-archived" : ""}`}
                style={{ "--habit-color": habit.color } as React.CSSProperties}
              >
                <div className="habit-card-accent" />
                <div className="habit-card-body">
                  <div className="habit-card-icon" style={{ background: habit.color + "22" }}>
                    <span style={{ fontSize: 22 }}>{habit.icon}</span>
                  </div>
                  <div className="habit-card-info">
                    <div className="habit-name-row">
                      <span className="habit-name">{habit.name}</span>
                      {habit.archived && (
                        <span className="archived-badge">{t("habits.archived")}</span>
                      )}
                    </div>
                    {habit.description && (
                      <p className="habit-desc">{habit.description}</p>
                    )}
                    <div className="habit-card-meta">
                      {category && (
                        <span
                          className="category-badge"
                          style={{
                            background: category.color + "22",
                            color: category.color,
                          }}
                        >
                          {category.icon} {category.name}
                        </span>
                      )}
                      <span className="freq-badge">
                        {t(`habits.${habit.frequency}`)}
                      </span>
                    </div>
                  </div>
                  <div className="habit-card-stats">
                    <StreakBadge streak={stats.streak} />
                    <span className="completion-rate">{stats.completionRate}%</span>
                  </div>
                  <button
                    className="icon-btn menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenu(
                        menu?.habitId === habit.id
                          ? null
                          : { habitId: habit.id, x: rect.left, y: rect.bottom }
                      );
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>

                {menu?.habitId === habit.id && (
                  <div className="dropdown-menu">
                    <button
                      className="dropdown-item"
                      onClick={() => openEdit(habit)}
                    >
                      <Edit2 size={14} />
                      {t("habits.edit")}
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => handleArchive(habit)}
                    >
                      {habit.archived ? (
                        <>
                          <ArchiveRestore size={14} />
                          {t("habits.unarchive")}
                        </>
                      ) : (
                        <>
                          <Archive size={14} />
                          {t("habits.archive")}
                        </>
                      )}
                    </button>
                    <button
                      className="dropdown-item dropdown-item-danger"
                      onClick={() => confirmDelete(habit)}
                    >
                      <Trash2 size={14} />
                      {t("habits.delete")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {menu && (
        <div
          className="menu-backdrop"
          onClick={() => setMenu(null)}
        />
      )}

      <Modal
        open={formOpen}
        title={editHabit ? t("habits.edit") : t("habits.new")}
        onClose={() => setFormOpen(false)}
        size="lg"
      >
        <HabitForm
          initial={editHabit ?? undefined}
          categories={categories}
          onSave={handleSave}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <Modal
        open={!!deleteTarget}
        title={t("habits.delete")}
        onClose={() => setDeleteTarget(null)}
        size="sm"
      >
        <p className="confirm-text">{t("habits.deleteConfirm")}</p>
        <p className="confirm-name">{deleteTarget?.name}</p>
        <div className="modal-actions">
          <button
            className="btn btn-ghost"
            onClick={() => setDeleteTarget(null)}
          >
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
