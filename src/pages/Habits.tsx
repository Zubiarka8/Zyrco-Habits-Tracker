import { useState, useMemo, useCallback } from "react";
import { format, addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus, MoreVertical, Edit2, Archive, ArchiveRestore, Trash2, History, PauseCircle, PlayCircle, TrendingUp, Search } from "lucide-react";
import { useHabits } from "../hooks/useHabits";
import { useCategories } from "../hooks/useCategories";
import { useStats } from "../hooks/useStats";
import { Modal } from "../components/Modal";
import { HabitForm } from "../components/HabitForm";
import { StreakBadge } from "../components/StreakBadge";
import { RetroLogModal } from "../components/RetroLogModal";
import { SkeletonHabitCard } from "../components/Skeleton";
import type { Habit } from "../types";

type MenuState = { habitId: string; x: number; y: number } | null;

export function Habits() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [includeArchived, setIncludeArchived] = useState(false);
  const { habits, loading, create, update, archive, remove } = useHabits(includeArchived);
  const { categories } = useCategories();
  const { getHabitStats } = useStats();

  const [formOpen, setFormOpen] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);
  const [retroHabit, setRetroHabit] = useState<Habit | null>(null);
  const [pauseHabit, setPauseHabit] = useState<Habit | null>(null);
  const [pendingCreate, setPendingCreate] = useState<Omit<Habit, "id" | "created_at" | "archived"> | null>(null);
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");
  const activeCount = habits.filter((h) => !h.archived && !(h.paused_until && h.paused_until > today)).length;

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
      setFormOpen(false);
      setEditHabit(null);
    } else {
      // R-10: soft warning at habit #8 — pause here, confirm in modal
      if (activeCount >= 7) {
        setPendingCreate(data);
        setFormOpen(false);
        return;
      }
      await create(data);
      setFormOpen(false);
    }
  };

  const handlePause = async (days: number) => {
    if (!pauseHabit) return;
    const until = days === 0 ? null : format(addDays(new Date(), days), "yyyy-MM-dd");
    await update(pauseHabit.id, { paused_until: until });
    setPauseHabit(null);
    setMenu(null);
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

  const filteredHabits = useMemo(() => {
    if (!searchQuery.trim()) return habits;
    const q = searchQuery.toLowerCase();
    return habits.filter((h) => h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q));
  }, [habits, searchQuery]);

  // Group habits by category when groupByCategory is on and categories exist
  const grouped = useMemo(() => {
    if (!groupByCategory || categories.length === 0) return null;
    const groups: { category: typeof categories[0] | null; habits: Habit[] }[] = [];
    categories.forEach((cat) => {
      const catHabits = filteredHabits.filter((h) => h.category_id === cat.id);
      if (catHabits.length > 0) groups.push({ category: cat, habits: catHabits });
    });
    const uncategorized = filteredHabits.filter((h) => !h.category_id);
    if (uncategorized.length > 0) groups.push({ category: null, habits: uncategorized });
    return groups;
  }, [filteredHabits, categories, groupByCategory]);

  const renderHabitCard = useCallback((habit: Habit) => {
    const stats = getHabitStats(habit.id);
    const category = categories.find((c) => c.id === habit.category_id);
    return (
      <div
        key={habit.id}
        className={`habit-card ${habit.archived ? "habit-card-archived" : ""}`}
        style={{ "--habit-color": habit.color } as React.CSSProperties}
      >
        <div className="habit-card-accent" />
        <div
          className="habit-card-body habit-card-body--clickable"
          onClick={() => navigate(`/habits/${habit.id}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate(`/habits/${habit.id}`)}
        >
          <div className="habit-card-icon" style={{ background: habit.color + "22" }}>
            <span style={{ fontSize: 22 }}>{habit.icon}</span>
          </div>
          <div className="habit-card-info">
            <div className="habit-name-row">
              <span className="habit-name">{habit.name}</span>
              {habit.archived && (
                <span className="archived-badge">{t("habits.archived")}</span>
              )}
              {!habit.archived && habit.paused_until && habit.paused_until > today && (
                <span className="paused-badge">⏸ {t("habits.paused")}</span>
              )}
            </div>
            {habit.description && (
              <p className="habit-desc">{habit.description}</p>
            )}
            <div className="habit-card-meta">
              {category && !groupByCategory && (
                <span
                  className="category-badge"
                  style={{ background: category.color + "22", color: category.color }}
                >
                  {category.icon} {category.name}
                </span>
              )}
              <span className="freq-badge">{t(`habits.${habit.frequency}`)}</span>
              {habit.type !== "normal" && (
                <span className={`type-pill type-pill-${habit.type}`}>
                  {habit.type === "bad" ? `🚫 ${t("habits.typeBad")}` : `💚 ${t("habits.typeGood")}`}
                </span>
              )}
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
                  : { habitId: habit.id, x: rect.right, y: rect.bottom }
              );
            }}
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
    );
  }, [categories, getHabitStats, groupByCategory, menu, navigate, t, today]);

  if (loading) {
    return (
      <div className="page">
        <div className="habits-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonHabitCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t("habits.title")}</h1>
        <div className="habits-search-wrap">
          <Search size={14} className="habits-search-icon" />
          <input
            className="habits-search-input"
            type="search"
            placeholder={t("habits.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="header-actions">
          {categories.length > 0 && (
            <button
              className="btn btn-ghost btn-sm habits-group-toggle"
              onClick={() => setGroupByCategory((v) => !v)}
              title={groupByCategory ? t("habits.flatList") : t("habits.groupByCategory")}
            >
              {groupByCategory ? t("habits.flatList") : t("habits.groupByCategory")}
            </button>
          )}
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
          <span className="empty-state-emoji">✨</span>
          <p>{t("habits.noHabits")}</p>
          <p className="text-muted">{t("habits.createFirst")}</p>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {t("habits.new")}
          </button>
        </div>
      ) : grouped ? (
        <div className="habits-grid">
          {grouped.map(({ category, habits: groupHabits }) => (
            <div key={category?.id ?? "__none"} className="cat-group">
              <div className="cat-group-header">
                {category ? (
                  <>
                    <span className="cat-group-dot" style={{ background: category.color }} />
                    <span className="cat-group-name">{category.icon} {category.name}</span>
                  </>
                ) : (
                  <span className="cat-group-name">📁 {t("habits.noCategory")}</span>
                )}
                <span className="cat-group-count">{groupHabits.length}</span>
              </div>
              {groupHabits.map(renderHabitCard)}
            </div>
          ))}
        </div>
      ) : (
        <div className="habits-grid">
          {filteredHabits.map(renderHabitCard)}
        </div>
      )}

      {menu && (() => {
        const menuHabit = habits.find((h) => h.id === menu.habitId) ?? null;
        if (!menuHabit) return null;
        return (
          <div
            className="dropdown-menu dropdown-menu--fixed"
            style={{ top: menu.y, left: menu.x }}
          >
            <button className="dropdown-item" onClick={() => { navigate(`/habits/${menuHabit.id}`); setMenu(null); }}>
              <TrendingUp size={14} />
              {t("habitDetail.view")}
            </button>
            <button className="dropdown-item" onClick={() => openEdit(menuHabit)}>
              <Edit2 size={14} />
              {t("habits.edit")}
            </button>
            <button className="dropdown-item" onClick={() => { setRetroHabit(menuHabit); setMenu(null); }}>
              <History size={14} />
              {t("habits.logHistory")}
            </button>
            {!menuHabit.archived && (
              <button className="dropdown-item" onClick={() => { setPauseHabit(menuHabit); setMenu(null); }}>
                {menuHabit.paused_until && menuHabit.paused_until > today
                  ? <><PlayCircle size={14} />{t("habits.resume")}</>
                  : <><PauseCircle size={14} />{t("habits.pause")}</>}
              </button>
            )}
            <button className="dropdown-item" onClick={() => handleArchive(menuHabit)}>
              {menuHabit.archived ? (
                <><ArchiveRestore size={14} />{t("habits.unarchive")}</>
              ) : (
                <><Archive size={14} />{t("habits.archive")}</>
              )}
            </button>
            <button
              className="dropdown-item dropdown-item-danger"
              onClick={() => confirmDelete(menuHabit)}
            >
              <Trash2 size={14} />
              {t("habits.delete")}
            </button>
          </div>
        );
      })()}

      {menu && (
        <div className="menu-backdrop" onClick={() => setMenu(null)} />
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

      {retroHabit && (
        <RetroLogModal habit={retroHabit} onClose={() => setRetroHabit(null)} />
      )}

      <Modal
        open={!!pauseHabit}
        title={pauseHabit?.paused_until && pauseHabit.paused_until > today ? t("habits.resume") : t("habits.pause")}
        onClose={() => setPauseHabit(null)}
        size="sm"
      >
        {pauseHabit?.paused_until && pauseHabit.paused_until > today ? (
          <div className="habit-form">
            <p className="confirm-text">{t("habits.resumeConfirm")}</p>
            <p className="confirm-name">{pauseHabit?.name}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPauseHabit(null)}>{t("common.cancel")}</button>
              <button className="btn btn-primary" onClick={() => handlePause(0)}>{t("habits.resume")}</button>
            </div>
          </div>
        ) : (
          <div className="habit-form">
            <p className="confirm-text">{t("habits.pauseDesc")}</p>
            <p className="confirm-name">{pauseHabit?.name}</p>
            <div className="pause-options">
              {[3, 7, 14, 30].map((d) => (
                <button key={d} className="btn btn-ghost pause-day-btn" onClick={() => handlePause(d)}>
                  {d} {t("habits.pauseDays")}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPauseHabit(null)}>{t("common.cancel")}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!pendingCreate}
        title={t("habits.overLimitTitle")}
        onClose={() => setPendingCreate(null)}
        size="sm"
      >
        <div className="habit-form">
          <p className="confirm-text">{t("habits.overLimitDesc")}</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setPendingCreate(null)}>{t("common.cancel")}</button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                if (pendingCreate) await create(pendingCreate);
                setPendingCreate(null);
              }}
            >
              {t("habits.overLimitProceed")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        title={t("habits.delete")}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        danger
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
