import { useState, useCallback, useEffect, useMemo } from "react";
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
  CalendarOff, RotateCcw, ArrowUpDown,
} from "lucide-react";
import { useHabits } from "../hooks/useHabits";
import { useDateLogs, useCalendarLogs } from "../hooks/useLogs";
import { useCategories } from "../hooks/useCategories";
import { useStats } from "../hooks/useStats";
import { useReminders } from "../hooks/useReminders";
import { useSkips, useRangeSkips } from "../hooks/useSkips";
import { useToast } from "../context/ToastContext";
import { upsertLog } from "../db/database";
import { NoteModal } from "../components/NoteModal";
import { StreakBadge } from "../components/StreakBadge";
import { Modal } from "../components/Modal";
import { HabitForm } from "../components/HabitForm";
import { HabitCalendar, type CalendarView } from "../components/HabitCalendar";
import { isHabitDueOnDay } from "../utils/schedule";
import type { Habit, Log, Category } from "../types";

type MenuState = { habitId: string; x: number; y: number } | null;
type HabitSort = "default" | "streak-desc" | "name-asc";

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
  isToday,
}: {
  habits: Habit[];
  logs: Log[];
  categories: Category[];
  getHabitStats: ReturnType<typeof import("../hooks/useStats").useStats>["getHabitStats"];
  toggle: (habitId: string, completed: boolean) => void;
  onNoteClick: (habit: Habit) => void;
  onHabitMenu: (habit: Habit, e: React.MouseEvent<HTMLButtonElement>) => void;
  isToday?: boolean;
}) {
  const { t } = useTranslation();
  const getLog = useCallback(
    (habitId: string) => logs.find((l) => l.habit_id === habitId),
    [logs]
  );

  return (
    <div className="habit-list">
      {habits.map((habit) => {
        const log       = getLog(habit.id);
        const completed = log?.completed ?? false;
        const stats     = getHabitStats(habit.id);
        const category  = categories.find((c) => c.id === habit.category_id);
        const atRisk    = isToday && !completed && stats.streak > 0;

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
                {stats.streak > 0 && <StreakBadge streak={stats.streak} atRisk={atRisk} />}
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

// ── TypeFilterChips ───────────────────────────────────────

type HabitTypeFilter = "all" | "good" | "bad" | "normal";

function TypeFilterChips({
  active,
  hasGood,
  hasBad,
  hasNormal,
  onChange,
}: {
  active: HabitTypeFilter;
  hasGood: boolean;
  hasBad: boolean;
  hasNormal: boolean;
  onChange: (f: HabitTypeFilter) => void;
}) {
  const { t } = useTranslation();

  const chips: { key: HabitTypeFilter; label: string; show: boolean }[] = [
    { key: "all",    label: t("habits.filterAll"),    show: true },
    { key: "good",   label: t("habits.typeGood"),     show: hasGood },
    { key: "bad",    label: t("habits.typeBad"),      show: hasBad },
    { key: "normal", label: t("habits.typeNormal"),   show: hasNormal },
  ];

  return (
    <div className="type-filter-chips">
      {chips.filter((c) => c.show).map((c) => (
        <button
          key={c.key}
          className={`type-chip type-chip--${c.key} ${active === c.key ? "type-chip--active" : ""}`}
          onClick={() => onChange(c.key)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

// ── CategoryFilterChips ───────────────────────────────────

function CategoryFilterChips({
  active,
  categories: cats,
  onChange,
}: {
  active: string | null;
  categories: Category[];
  onChange: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="type-filter-chips category-filter-chips">
      <button
        className={`type-chip ${!active ? "type-chip--active" : ""}`}
        onClick={() => onChange(null)}
      >
        {t("habits.filterAll")}
      </button>
      {cats.map((c) => (
        <button
          key={c.id}
          className={`type-chip category-chip ${active === c.id ? "category-chip--active" : ""}`}
          style={{ "--chip-color": c.color } as React.CSSProperties}
          onClick={() => onChange(active === c.id ? null : c.id)}
        >
          {c.icon} {c.name}
        </button>
      ))}
    </div>
  );
}

// ── SortControl ───────────────────────────────────────────

function SortControl({
  value,
  onChange,
}: {
  value: HabitSort;
  onChange: (v: HabitSort) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="habit-sort-control">
      <ArrowUpDown size={13} className="habit-sort-icon" />
      <select
        className="habit-sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value as HabitSort)}
      >
        <option value="default">{t("today.sortDefault")}</option>
        <option value="streak-desc">{t("today.sortStreak")}</option>
        <option value="name-asc">{t("today.sortName")}</option>
      </select>
    </div>
  );
}

// ── DoneSection ───────────────────────────────────────────

/** Collapsible section showing habits already completed for the day. */
function DoneSection({
  habits,
  ...listProps
}: { habits: Habit[] } & Omit<Parameters<typeof HabitList>[0], "habits">) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  return (
    <div className="done-section">
      <button
        className="done-section-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="done-section-label">
          {t("today.done")} ({habits.length})
        </span>
        <span className="done-section-chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && <HabitList habits={habits} {...listProps} />}
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

  const { showToast } = useToast();

  // ── Note modal ────────────────────────────────────────────
  const [noteHabit, setNoteHabit] = useState<Habit | null>(null);

  // ── Type / category / sort filters ───────────────────────
  const [typeFilter, setTypeFilter]         = useState<"all" | "good" | "bad" | "normal">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [habitSort, setHabitSort]           = useState<HabitSort>("default");

  // Clear type + category filters on date change (sort preference is kept)
  useEffect(() => {
    setTypeFilter("all");
    setCategoryFilter(null);
  }, [selectedDate]);

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
          showToast(t("today.toastUpdated"), "success");
        } else {
          await create(data);
          showToast(t("today.toastCreated"), "success");
        }
        setFormOpen(false);
        setEditHabit(null);
      } catch (err) {
        console.error("Today handleSave failed:", err);
        showToast(t("common.error"), "error");
      }
    },
    [editHabit, create, update, showToast, t]
  );

  const handleArchive = useCallback(async (habit: Habit) => {
    try {
      await archive(habit.id, !habit.archived);
      showToast(
        habit.archived ? t("today.toastUnarchived") : t("today.toastArchived"),
        "info"
      );
    } catch (err) {
      console.error("Today handleArchive failed:", err);
      showToast(t("common.error"), "error");
    }
    setMenu(null);
  }, [archive, showToast, t]);

  const confirmDelete = useCallback((habit: Habit) => {
    setDeleteTarget(habit);
    setMenu(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      showToast(t("today.toastDeleted"), "info");
    } catch (err) {
      console.error("Today handleDelete failed:", err);
      showToast(t("common.error"), "error");
    }
    setDeleteTarget(null);
  }, [deleteTarget, remove, showToast, t]);

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

  const handleGoToToday = useCallback(() => {
    const now = new Date();
    setSelectedDate(todayStr);
    setViewDate(now);
  }, [todayStr]);

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

  const isToday       = selectedDate === todayStr;
  const selectedLabel = format(selectedDateObj, "EEEE, MMMM d");
  const menuHabit     = menu ? habits.find((h) => h.id === menu.habitId) ?? null : null;

  // ── Filter chip types + categories present in dueHabits ──
  const hasGood       = dueHabits.some((h) => h.type === "good");
  const hasBad        = dueHabits.some((h) => h.type === "bad");
  const hasNormal     = dueHabits.some((h) => h.type === "normal");
  const dueCategories = categories.filter((c) => dueHabits.some((h) => h.category_id === c.id));

  // Apply type + category filters, then sort
  const filteredDue = dueHabits
    .filter((h) => typeFilter === "all" || h.type === typeFilter)
    .filter((h) => !categoryFilter || h.category_id === categoryFilter);

  const sortedDue = (() => {
    const arr = [...filteredDue];
    if (habitSort === "streak-desc") {
      arr.sort((a, b) => getHabitStats(b.id).streak - getHabitStats(a.id).streak);
    } else if (habitSort === "name-asc") {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return arr;
  })();

  // Split into pending and done for separate sections
  const pendingHabits = sortedDue.filter((h) => !getLog(h.id)?.completed);
  const doneHabits    = sortedDue.filter((h) =>  getLog(h.id)?.completed);

  // ── Shared habit-list props ────────────────────────────────
  const habitListProps = {
    logs,
    categories,
    getHabitStats,
    toggle,
    onNoteClick: setNoteHabit,
    onHabitMenu: openMenu,
    isToday,
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
                onGoToToday={handleGoToToday}
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

                {dueHabits.length > 0 && (
                  <div className="filter-bar">
                    {(hasGood || hasBad || hasNormal) && (
                      <TypeFilterChips
                        active={typeFilter}
                        hasGood={hasGood}
                        hasBad={hasBad}
                        hasNormal={hasNormal}
                        onChange={setTypeFilter}
                      />
                    )}
                    {dueCategories.length >= 2 && (
                      <CategoryFilterChips
                        active={categoryFilter}
                        categories={dueCategories}
                        onChange={setCategoryFilter}
                      />
                    )}
                    {dueHabits.length > 1 && (
                      <SortControl value={habitSort} onChange={setHabitSort} />
                    )}
                  </div>
                )}

                {done === total && total > 0 && (
                  <div className="all-done all-done--compact">
                    <span className="all-done-icon">🎉</span>
                    <p>{t("today.allDone")}</p>
                  </div>
                )}

                {pendingHabits.length > 0 && (
                  <HabitList habits={pendingHabits} {...habitListProps} />
                )}

                {doneHabits.length > 0 && (
                  <DoneSection habits={doneHabits} {...habitListProps} />
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
            onGoToToday={handleGoToToday}
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
            onGoToToday={handleGoToToday}
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

          {dueHabits.length === 0 && skippedHabits.length === 0 && !logsLoading && (
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

          {dueHabits.length > 0 && (
            <div className="filter-bar">
              {(hasGood || hasBad || hasNormal) && (
                <TypeFilterChips
                  active={typeFilter}
                  hasGood={hasGood}
                  hasBad={hasBad}
                  hasNormal={hasNormal}
                  onChange={setTypeFilter}
                />
              )}
              {dueCategories.length >= 2 && (
                <CategoryFilterChips
                  active={categoryFilter}
                  categories={dueCategories}
                  onChange={setCategoryFilter}
                />
              )}
              {dueHabits.length > 1 && (
                <SortControl value={habitSort} onChange={setHabitSort} />
              )}
            </div>
          )}

          {pendingHabits.length > 0 && (
            <HabitList habits={pendingHabits} {...habitListProps} />
          )}

          {doneHabits.length > 0 && (
            <DoneSection habits={doneHabits} {...habitListProps} />
          )}

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
