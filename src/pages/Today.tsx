import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  format,
  parseISO,
  addDays,
  addWeeks,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  CheckCircle2, Circle, MessageSquare, Plus,
  MoreVertical, Edit2, Archive, ArchiveRestore, Trash2, Clock,
  CalendarOff, RotateCcw,
} from "lucide-react";
import { useHabits } from "../hooks/useHabits";
import { useDateLogs, useCalendarLogs } from "../hooks/useLogs";
import { useCategories } from "../hooks/useCategories";
import { useStats } from "../hooks/useStats";
import { useReminders } from "../hooks/useReminders";
import { useSkips, useRangeSkips } from "../hooks/useSkips";
import { upsertLog } from "../db/database";
import { NoteModal } from "../components/NoteModal";
import { StreakBadge } from "../components/StreakBadge";
import { Modal } from "../components/Modal";
import { HabitForm } from "../components/HabitForm";
import { HabitCalendar, type CalendarView } from "../components/HabitCalendar";
import { isHabitDueOnDay } from "../utils/schedule";
import type { Habit, Log } from "../types";

type MenuState = { habitId: string; x: number; y: number } | null;

// ── HabitList ─────────────────────────────────────────────

/**
 * Scrollable habit list for a single date — reused in daily view and the
 * day-panel beside the monthly calendar. Passes habit menu events up so the
 * parent can own the dropdown and modals.
 */
function HabitList({
  habits,
  logs,
  categories,
  getHabitStats,
  toggle,
  onNoteClick,
  onHabitMenu,
}: {
  habits: Habit[];
  logs: Log[];
  categories: ReturnType<typeof import("../hooks/useCategories").useCategories>["categories"];
  getHabitStats: ReturnType<typeof import("../hooks/useStats").useStats>["getHabitStats"];
  toggle: (habitId: string, completed: boolean) => void;
  onNoteClick: (habit: Habit) => void;
  onHabitMenu: (habit: Habit, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { t } = useTranslation();
  const getLog = useCallback(
    (habitId: string) => logs.find((l) => l.habit_id === habitId),
    [logs]
  );

  return (
    <div className="habit-list">
      {habits.map((habit) => {
        const log      = getLog(habit.id);
        const completed = log?.completed ?? false;
        const stats    = getHabitStats(habit.id);
        const category = categories.find((c) => c.id === habit.category_id);

        return (
          <div
            key={habit.id}
            className={`habit-row ${completed ? "habit-row-done" : ""}`}
            style={{ "--habit-color": habit.color } as React.CSSProperties}
          >
            <div className="habit-color-bar" />

            <button
              className={`check-btn ${
                completed
                  ? habit.type === "bad" ? "check-btn-avoided" : "check-btn-done"
                  : ""
              }`}
              onClick={() => toggle(habit.id, completed)}
              aria-label={completed ? "Uncheck" : habit.type === "bad" ? t("today.checkBad") : t("today.checkGood")}
              title={habit.type === "bad" ? t("today.checkBad") : t("today.checkGood")}
            >
              {completed ? <CheckCircle2 size={26} /> : <Circle size={26} />}
            </button>

            <div className="habit-info">
              <div className="habit-name-row">
                <span className="habit-icon">{habit.icon}</span>
                <span className="habit-name">{habit.name}</span>
                {stats.streak > 0 && <StreakBadge streak={stats.streak} />}
                {habit.type !== "normal" && (
                  <span className={`type-pill type-pill-${habit.type}`}>
                    {habit.type === "bad" ? t("today.doneBad") : t("today.doneGood")}
                  </span>
                )}
              </div>

              {(habit.description || category) && (
                <div className="habit-meta">
                  {category && (
                    <span
                      className="category-badge"
                      style={{ background: category.color + "22", color: category.color }}
                    >
                      {category.icon} {category.name}
                    </span>
                  )}
                  {habit.description && (
                    <span className="habit-desc">{habit.description}</span>
                  )}
                </div>
              )}

              {habit.time_start && (
                <div className="habit-time">
                  <Clock size={11} />
                  <span>
                    {habit.time_start}
                    {habit.time_end ? ` – ${habit.time_end}` : ""}
                  </span>
                </div>
              )}

              {log?.note && <p className="habit-note">"{log.note}"</p>}
            </div>

            <button
              className={`icon-btn note-btn ${log?.note ? "note-btn-filled" : ""}`}
              onClick={() => onNoteClick(habit)}
              aria-label={t("today.addNote")}
            >
              <MessageSquare size={16} />
            </button>

            <button
              className="icon-btn menu-btn"
              onClick={(e) => onHabitMenu(habit, e)}
              aria-label={t("habits.edit")}
            >
              <MoreVertical size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── MonthStrip ────────────────────────────────────────────

/**
 * Horizontal strip showing every day of the current calendar month.
 * Clicking a day updates the right-panel preview without changing the view.
 */
function MonthStrip({
  habits,
  rangeLogs,
  viewDate,
  today,
  selectedDate,
  onSelectDate,
}: {
  habits: Habit[];
  rangeLogs: Log[];
  viewDate: Date;
  today: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfMonth(viewDate),
    end:   endOfMonth(viewDate),
  });

  return (
    <div className="month-strip">
      {days.map((dayObj) => {
        const date      = format(dayObj, "yyyy-MM-dd");
        const due       = habits.filter((h) => isHabitDueOnDay(h, dayObj));
        const dueCount  = due.length;
        const doneCount = due.filter((h) =>
          rangeLogs.some((l) => l.habit_id === h.id && l.date === date && l.completed)
        ).length;
        const isToday = date === today;
        const isSel   = date === selectedDate;
        const allDone = dueCount > 0 && doneCount === dueCount;

        return (
          <button
            key={date}
            type="button"
            className={[
              "month-strip-day",
              isToday           ? "month-strip-day--today"    : "",
              isSel             ? "month-strip-day--selected" : "",
              allDone && !isSel ? "month-strip-day--done"     : "",
            ].filter(Boolean).join(" ")}
            onClick={() => onSelectDate(date)}
          >
            <span className="month-strip-name">{format(dayObj, "EEE")}</span>
            <span className="month-strip-num">{format(dayObj, "d")}</span>
            <span className="month-strip-ratio">
              {dueCount > 0 ? `${doneCount}/${dueCount}` : "·"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── SkippedSection ────────────────────────────────────────

/** Shows habits that were skipped on this day with a one-click restore. */
function SkippedSection({
  habits,
  onUnskip,
}: {
  habits: Habit[];
  onUnskip: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="skipped-section">
      <span className="skipped-label">{t("today.skippedSection")}</span>
      {habits.map((h) => (
        <div key={h.id} className="skipped-row">
          <span className="skipped-name">
            <span className="skipped-icon">{h.icon}</span>
            {h.name}
          </span>
          <button
            className="icon-btn skipped-restore-btn"
            onClick={() => onUnskip(h.id)}
            title={t("today.restoreDay")}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Today ─────────────────────────────────────────────────

export function Today() {
  const { t } = useTranslation();

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // ── Calendar state ────────────────────────────────────────
  const [calView, setCalView]       = useState<CalendarView>("monthly");
  const [viewDate, setViewDate]     = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // ── Data ──────────────────────────────────────────────────
  const { habits, loading: habitsLoading, create, update, archive, remove } = useHabits();
  const { logs, loading: logsLoading, toggle, saveNote, reload: reloadDayLogs } =
    useDateLogs(selectedDate);
  const { categories } = useCategories();
  const { getHabitStats } = useStats();

  const calRange = useMemo(() => {
    if (calView === "monthly") {
      return {
        start: format(startOfMonth(viewDate), "yyyy-MM-dd"),
        end:   format(endOfMonth(viewDate), "yyyy-MM-dd"),
      };
    }
    return {
      start: format(startOfWeek(viewDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      end:   format(endOfWeek(viewDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }, [calView, viewDate]);

  const { logs: rangeLogs, reload: reloadRangeLogs } = useCalendarLogs(
    calRange.start,
    calRange.end
  );
  const { isSkipped, skip, unskip } = useSkips(selectedDate);
  const { rangeSkips } = useRangeSkips(calRange.start, calRange.end);

  useReminders(habits, selectedDate === todayStr ? logs : []);

  // ── Note modal ────────────────────────────────────────────
  const [noteHabit, setNoteHabit] = useState<Habit | null>(null);

  // ── CRUD state ────────────────────────────────────────────
  const [formOpen, setFormOpen]       = useState(false);
  const [editHabit, setEditHabit]     = useState<Habit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);
  const [menu, setMenu]               = useState<MenuState>(null);

  const openCreate = useCallback(() => {
    setEditHabit(null);
    setFormOpen(true);
    setMenu(null);
  }, []);

  const openEdit = useCallback((habit: Habit) => {
    setEditHabit(habit);
    setFormOpen(true);
    setMenu(null);
  }, []);

  const handleSave = useCallback(
    async (data: Omit<Habit, "id" | "created_at" | "archived">) => {
      try {
        if (editHabit) {
          await update(editHabit.id, data);
        } else {
          await create(data);
        }
        setFormOpen(false);
        setEditHabit(null);
      } catch (err) {
        console.error("Today handleSave failed:", err);
      }
    },
    [editHabit, create, update]
  );

  const handleArchive = useCallback(async (habit: Habit) => {
    try {
      await archive(habit.id, !habit.archived);
    } catch (err) {
      console.error("Today handleArchive failed:", err);
    }
    setMenu(null);
  }, [archive]);

  const confirmDelete = useCallback((habit: Habit) => {
    setDeleteTarget(habit);
    setMenu(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
    } catch (err) {
      console.error("Today handleDelete failed:", err);
    }
    setDeleteTarget(null);
  }, [deleteTarget, remove]);

  const openMenu = useCallback(
    (habit: Habit, e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      setMenu((prev) =>
        prev?.habitId === habit.id
          ? null
          : { habitId: habit.id, x: rect.right, y: rect.bottom }
      );
    },
    []
  );

  // ── Due habits for the selected date ─────────────────────
  const selectedDateObj = parseISO(selectedDate + "T00:00:00");
  const allDueHabits = habits.filter((h) => isHabitDueOnDay(h, selectedDateObj));
  const dueHabits     = allDueHabits.filter((h) => !isSkipped(h.id));
  const skippedHabits = allDueHabits.filter((h) => isSkipped(h.id));

  const getLog = useCallback(
    (habitId: string) => logs.find((l) => l.habit_id === habitId),
    [logs]
  );

  const done  = dueHabits.filter((h) => getLog(h.id)?.completed).length;
  const total = dueHabits.length;

  const toggleForRange = useCallback(
    async (habitId: string, date: string, currentCompleted: boolean) => {
      try {
        await upsertLog(habitId, date, !currentCompleted);
        window.dispatchEvent(new CustomEvent("zyrco:log-changed"));
        reloadRangeLogs();
        if (date === selectedDate) reloadDayLogs();
      } catch (err) {
        console.error(`toggleForRange failed — habit ${habitId}, date ${date}:`, err);
      }
    },
    [selectedDate, reloadRangeLogs, reloadDayLogs]
  );

  // ── Calendar navigation ───────────────────────────────────
  const handleNavigate = useCallback(
    (dir: "prev" | "next") => {
      const sign = dir === "next" ? 1 : -1;
      if (calView === "monthly") {
        setViewDate((d) => addMonths(d, sign));
      } else if (calView === "weekly") {
        setViewDate((d) => addWeeks(d, sign));
      } else {
        const next    = addDays(selectedDateObj, sign);
        const nextStr = format(next, "yyyy-MM-dd");
        setSelectedDate(nextStr);
        setViewDate(next);
      }
    },
    [calView, selectedDateObj]
  );

  const handleJumpTo = useCallback((date: Date) => { setViewDate(date); }, []);

  const handleViewChange = useCallback(
    (v: CalendarView) => {
      setCalView(v);
      setViewDate(parseISO(selectedDate + "T00:00:00"));
    },
    [selectedDate]
  );

  const handleDateSelectFromCal = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      setViewDate(parseISO(dateStr + "T00:00:00"));
      if (calView === "monthly") return;
      setCalView("daily");
    },
    [calView]
  );

  // ── Loading guard ──────────────────────────────────────────
  if (habitsLoading) {
    return <div className="page-loading">{t("common.loading")}</div>;
  }

  const isToday      = selectedDate === todayStr;
  const selectedLabel = format(selectedDateObj, "EEEE, MMMM d");
  const menuHabit    = menu ? habits.find((h) => h.id === menu.habitId) ?? null : null;

  // ── Shared habit-list props ────────────────────────────────
  const habitListProps = {
    logs,
    categories,
    getHabitStats,
    toggle,
    onNoteClick: setNoteHabit,
    onHabitMenu: openMenu,
  };

  return (
    <>
      {/* ── Monthly layout ──────────────────────────────────── */}
      {calView === "monthly" && (
        <div className="page today-page--monthly">
          <div className="today-split">
            <div className="today-split-cal">
              <HabitCalendar
                view="monthly"
                viewDate={viewDate}
                selectedDate={selectedDate}
                today={todayStr}
                habits={habits}
                rangeLogs={rangeLogs}
                rangeSkips={rangeSkips}
                onViewChange={handleViewChange}
                onDateSelect={handleDateSelectFromCal}
                onNavigate={handleNavigate}
                onJumpTo={handleJumpTo}
              />
            </div>

            <aside className="cal-day-panel">
              <MonthStrip
                habits={habits}
                rangeLogs={rangeLogs}
                viewDate={viewDate}
                today={todayStr}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />

              <div className="cal-day-panel-header">
                <span className="cal-day-panel-date">{selectedLabel}</span>
                <div className="cal-day-panel-actions">
                  {total > 0 && (
                    <span className={`cal-day-panel-ratio ${done === total ? "cal-day-panel-ratio--done" : ""}`}>
                      {done}/{total}
                    </span>
                  )}
                  <button
                    className="icon-btn"
                    onClick={openCreate}
                    title={t("habits.new")}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="cal-day-panel-body">
                {dueHabits.length === 0 && skippedHabits.length === 0 && !logsLoading && (
                  <div className="empty-state">
                    <p>{isToday ? t("today.noHabits") : t("today.noHabitsDate")}</p>
                    {isToday && (
                      <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} />
                        {t("today.addFirst")}
                      </button>
                    )}
                  </div>
                )}

                {done === total && total > 0 && (
                  <div className="all-done all-done--compact">
                    <span className="all-done-icon">🎉</span>
                    <p>{t("today.allDone")}</p>
                  </div>
                )}

                {dueHabits.length > 0 && (
                  <HabitList habits={dueHabits} {...habitListProps} />
                )}

                {skippedHabits.length > 0 && (
                  <SkippedSection
                    habits={skippedHabits}
                    onUnskip={(id) => unskip(id)}
                  />
                )}
              </div>

              {noteHabit && (
                <NoteModal
                  open={true}
                  habitName={noteHabit.name}
                  initialNote={getLog(noteHabit.id)?.note ?? null}
                  onSave={(note) => saveNote(noteHabit.id, note)}
                  onClose={() => setNoteHabit(null)}
                />
              )}
            </aside>
          </div>
        </div>
      )}

      {/* ── Weekly layout ───────────────────────────────────── */}
      {calView === "weekly" && (
        <div className="page">
          <HabitCalendar
            view="weekly"
            viewDate={viewDate}
            selectedDate={selectedDate}
            today={todayStr}
            habits={habits}
            rangeLogs={rangeLogs}
            onViewChange={handleViewChange}
            onDateSelect={(dateStr) => {
              setSelectedDate(dateStr);
              setViewDate(parseISO(dateStr + "T00:00:00"));
              setCalView("daily");
            }}
            onNavigate={handleNavigate}
            onJumpTo={handleJumpTo}
            onToggle={toggleForRange}
          />
        </div>
      )}

      {/* ── Daily layout ────────────────────────────────────── */}
      {calView === "daily" && (
        <div className="page">
          <HabitCalendar
            view="daily"
            viewDate={viewDate}
            selectedDate={selectedDate}
            today={todayStr}
            habits={habits}
            rangeLogs={rangeLogs}
            onViewChange={handleViewChange}
            onDateSelect={handleDateSelectFromCal}
            onNavigate={handleNavigate}
            onJumpTo={handleJumpTo}
          />

          <div className="cal-day-header">
            {total > 0 && (
              <div className="progress-pill">
                <div className="progress-fill" style={{ width: `${(done / total) * 100}%` }} />
                <span className="progress-label">{t("today.progress", { done, total })}</span>
              </div>
            )}
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={14} />
              {t("habits.new")}
            </button>
          </div>

          {dueHabits.length === 0 && !logsLoading && (
            <div className="empty-state">
              <p>{isToday ? t("today.noHabits") : t("today.noHabitsDate")}</p>
            </div>
          )}

          {done === total && total > 0 && (
            <div className="all-done">
              <span className="all-done-icon">🎉</span>
              <p>{t("today.allDone")}</p>
            </div>
          )}

          <HabitList habits={dueHabits} {...habitListProps} />

          {skippedHabits.length > 0 && (
            <SkippedSection
              habits={skippedHabits}
              onUnskip={(id) => unskip(id)}
            />
          )}

          {noteHabit && (
            <NoteModal
              open={true}
              habitName={noteHabit.name}
              initialNote={getLog(noteHabit.id)?.note ?? null}
              onSave={(note) => saveNote(noteHabit.id, note)}
              onClose={() => setNoteHabit(null)}
            />
          )}
        </div>
      )}

      {/* ── Habit context menu (shared across all views) ─────── */}
      {menu && menuHabit && (
        <div
          className="dropdown-menu dropdown-menu--fixed"
          style={{ top: menu.y, left: menu.x }}
        >
          {isSkipped(menuHabit.id) ? (
            <button
              className="dropdown-item"
              onClick={() => { unskip(menuHabit.id); setMenu(null); }}
            >
              <RotateCcw size={14} />
              {t("today.restoreDay")}
            </button>
          ) : (
            <button
              className="dropdown-item"
              onClick={() => { skip(menuHabit.id); setMenu(null); }}
            >
              <CalendarOff size={14} />
              {t("today.skipDay")}
            </button>
          )}
          <div className="dropdown-divider" />
          <button className="dropdown-item" onClick={() => openEdit(menuHabit)}>
            <Edit2 size={14} />
            {t("habits.edit")}
          </button>
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
      )}
      {menu && <div className="menu-backdrop" onClick={() => setMenu(null)} />}

      {/* ── Create / Edit modal ──────────────────────────────── */}
      <Modal
        open={formOpen}
        title={editHabit ? t("habits.edit") : t("habits.new")}
        onClose={() => { setFormOpen(false); setEditHabit(null); }}
        size="lg"
      >
        <HabitForm
          initial={editHabit ?? undefined}
          categories={categories}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditHabit(null); }}
        />
      </Modal>

      {/* ── Delete confirmation modal ────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        title={t("habits.delete")}
        onClose={() => setDeleteTarget(null)}
        size="sm"
      >
        <p className="confirm-text">{t("habits.deleteConfirm")}</p>
        <p className="confirm-name">{deleteTarget?.name}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
            {t("common.cancel")}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            {t("common.delete")}
          </button>
        </div>
      </Modal>
    </>
  );
}
