import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";
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
  CalendarOff, RotateCcw, ArrowUpDown, Minus, Timer, Play, Square, X, XCircle,
} from "lucide-react";
import { useHabits } from "../hooks/useHabits";
import { useDateLocale } from "../hooks/useDateLocale";
import { useDateLogs, useCalendarLogs } from "../hooks/useLogs";
import { useCategories } from "../hooks/useCategories";
import { useStats } from "../hooks/useStats";
import { useReminders } from "../hooks/useReminders";
import { useSkips, useRangeSkips } from "../hooks/useSkips";
import { useMisses } from "../hooks/useMisses";
import { useToast } from "../context/ToastContext";
import { upsertLog, deleteLogForDate } from "../db/database";
import { NoteModal } from "../components/NoteModal";
import { StreakBadge } from "../components/StreakBadge";
import { Modal } from "../components/Modal";
import { HabitForm } from "../components/HabitForm";
import { HabitCalendar, type CalendarView } from "../components/HabitCalendar";
import { isHabitDueOnDay } from "../utils/schedule";
import { SkeletonHabitRow } from "../components/Skeleton";
import type { Habit, Log, Category } from "../types";

type MenuState = { habitId: string; x: number; y: number; flipped?: boolean } | null;
type HabitSort = "default" | "streak-desc" | "name-asc";

// ── NumericInput ──────────────────────────────────────────

function NumericInput({
  habit,
  currentValue,
  onConfirm,
  onClose,
}: {
  habit: Habit;
  currentValue: number | null;
  onConfirm: (value: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [val, setVal] = useState(currentValue ?? 0);
  const target = habit.completion_target ?? 1;

  return (
    <div className="numeric-input-row">
      <button className="numeric-step" onClick={() => setVal((v) => Math.max(0, v - 1))}>
        <Minus size={14} />
      </button>
      <input
        className="numeric-val-input"
        type="number"
        min={0}
        value={val}
        onChange={(e) => setVal(Math.max(0, Number(e.target.value)))}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm(val);
          if (e.key === "Escape") onClose();
        }}
      />
      <span className="numeric-unit">{habit.completion_unit ?? ""} / {target}</span>
      <button className="numeric-step" onClick={() => setVal((v) => v + 1)}>+</button>
      <button className="btn btn-primary btn-sm" onClick={() => onConfirm(val)}>
        {t("common.save")}
      </button>
      <button className="btn btn-ghost btn-sm" onClick={onClose}>
        {t("common.cancel")}
      </button>
    </div>
  );
}

// ── TimerButton ───────────────────────────────────────────

type TimerMode = "stopwatch" | "countdown";

function TimerButton({
  completed,
  activeTimer,
  target,
  onStart,
  onStop,
}: {
  completed: boolean;
  activeTimer: { startedAt: Date; mode: TimerMode } | null;
  target?: number | null;
  onStart: (mode: TimerMode) => void;
  onStop: () => void;
}) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Prevent double-calling onStop when countdown auto-completes
  const autoFiredRef = useRef(false);

  const mode = activeTimer?.mode ?? "stopwatch";
  const targetSecs = (target ?? 0) * 60;

  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0);
      autoFiredRef.current = false;
      return;
    }
    const tick = () => setElapsed(Math.floor((Date.now() - activeTimer.startedAt.getTime()) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeTimer]);

  // Auto-complete when countdown finishes
  useEffect(() => {
    if (activeTimer && mode === "countdown" && targetSecs > 0 && elapsed >= targetSecs && !autoFiredRef.current) {
      autoFiredRef.current = true;
      if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
      onStop();
    }
  }, [elapsed, mode, targetSecs, activeTimer, onStop]);

  if (completed) {
    return (
      <button className="check-btn check-btn-done" onClick={onStop} title={t("today.checkGood")}>
        <CheckCircle2 size={26} />
      </button>
    );
  }

  if (activeTimer) {
    if (mode === "countdown" && targetSecs > 0) {
      const remaining = Math.max(0, targetSecs - elapsed);
      const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
      const ss = (remaining % 60).toString().padStart(2, "0");
      const pct = Math.min(100, (elapsed / targetSecs) * 100);
      const urgent = remaining <= 30;
      return (
        <button
          className={`timer-stop-btn timer-stop-btn--countdown ${urgent ? "timer-stop-btn--urgent" : ""}`}
          onClick={onStop}
          title={t("today.timerStop")}
          style={{ "--timer-pct": `${pct}%` } as React.CSSProperties}
        >
          <Square size={14} />
          <span className="timer-elapsed timer-elapsed--countdown">{mm}:{ss}</span>
        </button>
      );
    }
    // Stopwatch
    const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
    const ss = (elapsed % 60).toString().padStart(2, "0");
    return (
      <button className="timer-stop-btn" onClick={onStop} title={t("today.timerStop")}>
        <Square size={14} />
        <span className="timer-elapsed">
          {mm}:{ss}
          {target ? <span className="timer-target"> / {target}m</span> : null}
        </span>
      </button>
    );
  }

  // Idle — show mode selector when target is set, simple start otherwise
  if (target) {
    return (
      <div className="timer-mode-btns">
        <button
          className="timer-mode-btn"
          onClick={() => onStart("stopwatch")}
          title={t("today.timerStopwatch")}
        >
          <Play size={13} />
          <span>{t("today.timerStopwatch")}</span>
        </button>
        <button
          className="timer-mode-btn timer-mode-btn--countdown"
          onClick={() => onStart("countdown")}
          title={t("today.timerCountdown")}
        >
          <Timer size={13} />
          <span>{target}m</span>
        </button>
      </div>
    );
  }

  return (
    <button className="timer-start-btn" onClick={() => onStart("stopwatch")} title={t("today.timerStart")}>
      <Play size={16} />
    </button>
  );
}

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
  skip,
  unskip,
  isSkipped,
  onNoteClick,
  onHabitMenu,
  onLongPress,
  isToday,
  activeTimers,
  onTimerStart,
  onTimerStop,
  compact,
  highlightHabitId,
}: {
  habits: Habit[];
  logs: Log[];
  categories: Category[];
  getHabitStats: ReturnType<typeof import("../hooks/useStats").useStats>["getHabitStats"];
  toggle: (habitId: string, completed: boolean, value?: number | null) => void;
  skip?: (habitId: string) => void;
  unskip?: (habitId: string) => void;
  isSkipped?: (id: string) => boolean;
  onNoteClick: (habit: Habit) => void;
  onHabitMenu: (habit: Habit, e: React.MouseEvent<HTMLButtonElement>) => void;
  onLongPress?: (habit: Habit, pos: { x: number; y: number }) => void;
  isToday?: boolean;
  activeTimers?: Map<string, { startedAt: Date; mode: TimerMode }>;
  onTimerStart?: (habitId: string, mode: TimerMode) => void;
  onTimerStop?: (habitId: string, elapsedMinutes: number) => void;
  compact?: boolean;
  highlightHabitId?: string | null;
}) {
  const { t } = useTranslation();
  const [expandedNumeric, setExpandedNumeric] = useState<string | null>(null);
  const [justDoneIds, setJustDoneIds] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleToggle = useCallback((habitId: string, completed: boolean, value?: number | null) => {
    if (!completed) {
      // Haptic feedback on completion (mobile/tablet)
      if ("vibrate" in navigator) navigator.vibrate(50);
      setJustDoneIds((prev) => new Set([...prev, habitId]));
      setTimeout(() => {
        setJustDoneIds((prev) => {
          const next = new Set(prev);
          next.delete(habitId);
          return next;
        });
      }, 400);
    }
    toggle(habitId, completed, value);
  }, [toggle]);

  const getLog = useCallback(
    (habitId: string) => logs.find((l) => l.habit_id === habitId),
    [logs]
  );

  return (
    <div className={`habit-list ${compact ? "habit-list--compact" : ""}`}>
      {habits.map((habit) => {
        const log       = getLog(habit.id);
        const completed = log?.completed ?? false;
        const stats     = getHabitStats(habit.id);
        const category  = categories.find((c) => c.id === habit.category_id);
        const atRisk    = isToday && !completed && stats.streak > 0;
        const isNumeric = habit.completion_type === "numeric";
        const isTimer   = habit.completion_type === "timer";
        const isBinary  = !isNumeric && !isTimer;
        const activeTimer = activeTimers?.get(habit.id) ?? null;
        // Skipped state comes from the skips table (not logs), so isSkipped is the source of truth
        const skipped = isSkipped?.(habit.id) ?? false;

        return (
          <div
            key={habit.id}
            className={[
              "habit-row",
              completed ? "habit-row-done" : "",
              compact ? "habit-row--compact" : "",
              justDoneIds.has(habit.id) ? "habit-row--just-done" : "",
              highlightHabitId === habit.id ? "habit-row--highlight" : "",
            ].filter(Boolean).join(" ")}
            style={{ "--habit-color": habit.color } as React.CSSProperties}
          >
            <div className="habit-color-bar" />

            {isTimer ? (
              <TimerButton
                completed={completed}
                activeTimer={activeTimer}
                target={habit.completion_target}
                onStart={(mode) => onTimerStart?.(habit.id, mode)}
                onStop={() => {
                  if (activeTimer) {
                    if ("vibrate" in navigator) navigator.vibrate(50);
                    const elapsedMin = Math.max(1, Math.round((Date.now() - activeTimer.startedAt.getTime()) / 60000));
                    onTimerStop?.(habit.id, elapsedMin);
                  } else {
                    toggle(habit.id, completed);
                  }
                }}
              />
            ) : isBinary ? (
              // Binary habits: explicit Done / Skip pair
              <div className="habit-check-pair">
                <button
                  className={`habit-skip-btn ${skipped ? "habit-skip-btn--active" : ""}`}
                  onClick={() => {
                    if (skipped) {
                      unskip?.(habit.id);
                    } else {
                      skip?.(habit.id);
                    }
                  }}
                  title={t("today.markNotDone")}
                  aria-label={t("today.markNotDone")}
                >
                  <X size={18} />
                </button>
                <button
                  className={`check-btn ${completed ? (habit.type === "bad" ? "check-btn-avoided" : "check-btn-done") : ""}`}
                  onClick={() => { handleToggle(habit.id, completed); setExpandedNumeric(null); }}
                  aria-label={completed ? "Uncheck" : habit.type === "bad" ? t("today.checkBad") : t("today.checkGood")}
                  title={habit.type === "bad" ? t("today.checkBad") : t("today.checkGood")}
                >
                  {completed ? <CheckCircle2 size={26} /> : <Circle size={26} />}
                </button>
              </div>
            ) : (
              // Numeric habits: original single button
              <button
                className={`check-btn ${completed ? "check-btn-done" : ""}`}
                onClick={() => {
                  if (!completed) setExpandedNumeric(habit.id === expandedNumeric ? null : habit.id);
                  else { handleToggle(habit.id, completed); setExpandedNumeric(null); }
                }}
                title={`${log?.value ?? 0} / ${habit.completion_target ?? "?"} ${habit.completion_unit ?? ""}`}
              >
                {completed ? (
                  <CheckCircle2 size={26} />
                ) : (
                  <div className="numeric-check-badge">
                    <Timer size={14} />
                    <span>{log?.value ?? 0}/{habit.completion_target ?? "?"}</span>
                  </div>
                )}
              </button>
            )}

            <div
              className="habit-info"
              onPointerDown={(e) => {
                // Skip if pressing on an inner interactive element
                if ((e.target as HTMLElement).closest("button,input")) return;
                const { clientX: x, clientY: y } = e;
                longPressTimerRef.current = setTimeout(() => {
                  onLongPress?.(habit, { x, y });
                  longPressTimerRef.current = null;
                }, 450);
              }}
              onPointerUp={clearLongPress}
              onPointerLeave={clearLongPress}
              onPointerCancel={clearLongPress}
            >
              <div className="habit-name-row">
                <span className="habit-icon">{habit.icon}</span>
                <span className="habit-name">{habit.name}</span>
                {stats.streak > 0 && <StreakBadge streak={stats.streak} atRisk={atRisk} />}
                {stats.strengthScore > 0 && (
                  <span
                    className="strength-bar-inline"
                    title={`Strength: ${stats.strengthScore}%`}
                  >
                    <span
                      className="strength-bar-fill"
                      style={{
                        width: `${stats.strengthScore}%`,
                        background: stats.strengthScore >= 80
                          ? "var(--color-success)"
                          : stats.strengthScore >= 50
                          ? "var(--color-warning)"
                          : "var(--color-danger)",
                      }}
                    />
                  </span>
                )}
                {habit.type !== "normal" && (
                  <span className={`type-pill type-pill-${habit.type}`}>
                    {habit.type === "bad" ? t("today.doneBad") : t("today.doneGood")}
                  </span>
                )}
              </div>

              {expandedNumeric === habit.id && (
                <NumericInput
                  habit={habit}
                  currentValue={log?.value ?? null}
                  onConfirm={(value) => {
                    handleToggle(habit.id, true, value);
                    setExpandedNumeric(null);
                  }}
                  onClose={() => setExpandedNumeric(null)}
                />
              )}

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
  rangeSkips,
  viewDate,
  today,
  selectedDate,
  onSelectDate,
}: {
  habits: Habit[];
  rangeLogs: Log[];
  rangeSkips: { habit_id: string; date: string }[];
  viewDate: Date;
  today: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const dateFnsLocale = useDateLocale();
  const days = eachDayOfInterval({
    start: startOfMonth(viewDate),
    end:   endOfMonth(viewDate),
  });

  return (
    <div className="month-strip">
      {days.map((dayObj) => {
        const date      = format(dayObj, "yyyy-MM-dd");
        const due         = habits.filter((h) => isHabitDueOnDay(h, dayObj));
        // Subtract habits that are skipped or excluded on this day from the due count
        const rangeSkipsOnDay = rangeSkips.filter((s) => s.date === date);
        const effectiveDue    = due.filter((h) => !rangeSkipsOnDay.some((s) => s.habit_id === h.id));
        const dueCount        = effectiveDue.length;
        const doneCount = effectiveDue.filter((h) =>
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
            <span className="month-strip-name">{format(dayObj, "EEE", { locale: dateFnsLocale })}</span>
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

// ── FilterBar ─────────────────────────────────────────────

/** Type + category chips + sort selector — shared between monthly and daily views. */
function FilterBar({
  dueHabitsLength,
  hasGood,
  hasBad,
  hasNormal,
  typeFilter,
  dueCategories,
  categoryFilter,
  habitSort,
  onTypeFilter,
  onCategoryFilter,
  onHabitSort,
}: {
  dueHabitsLength: number;
  hasGood: boolean;
  hasBad: boolean;
  hasNormal: boolean;
  typeFilter: HabitTypeFilter;
  dueCategories: Category[];
  categoryFilter: string | null;
  habitSort: HabitSort;
  onTypeFilter: (f: HabitTypeFilter) => void;
  onCategoryFilter: (id: string | null) => void;
  onHabitSort: (v: HabitSort) => void;
}) {
  if (dueHabitsLength === 0) return null;
  return (
    <div className="filter-bar">
      {(hasGood || hasBad || hasNormal) && (
        <TypeFilterChips
          active={typeFilter}
          hasGood={hasGood}
          hasBad={hasBad}
          hasNormal={hasNormal}
          onChange={onTypeFilter}
        />
      )}
      {dueCategories.length >= 2 && (
        <CategoryFilterChips
          active={categoryFilter}
          categories={dueCategories}
          onChange={onCategoryFilter}
        />
      )}
      {dueHabitsLength > 1 && (
        <SortControl value={habitSort} onChange={onHabitSort} />
      )}
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

// ── MissedSection ─────────────────────────────────────────

/** Habits that were due but explicitly marked as not done. */
function MissedSection({
  habits,
  unmarkMissed,
}: {
  habits: Habit[];
  unmarkMissed: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  return (
    <div className="done-section missed-section">
      <button
        className="done-section-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="done-section-label missed-section-label">
          {t("today.missed")} ({habits.length})
        </span>
        <span className="done-section-chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="missed-list">
          {habits.map((h) => (
            <div key={h.id} className="missed-row">
              <span className="missed-row-icon">{h.icon}</span>
              <span className="missed-row-name">{h.name}</span>
              <button
                className="btn btn-ghost btn-sm missed-row-undo"
                onClick={() => unmarkMissed(h.id)}
                title={t("today.unmarkMissed")}
              >
                <RotateCcw size={13} />
                {t("today.unmarkMissed")}
              </button>
            </div>
          ))}
        </div>
      )}
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

// ── DaySchedule ──────────────────────────────────────────

const SESSION_ORDER: Habit["session"][] = ["morning", "afternoon", "evening", "anytime"];

const SESSION_EMOJI: Record<Habit["session"], string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌙",
  anytime: "📋",
};

/** Default display time used only for sorting when a habit has no time_start. */
const SESSION_SORT_TIME: Record<Habit["session"], string> = {
  morning: "06:00",
  afternoon: "12:00",
  evening: "18:00",
  anytime: "00:00",
};

function DaySchedule({
  habits,
  isToday,
  logs,
  toggle,
  skip,
  unskip,
  isSkipped,
}: {
  habits: Habit[];
  isToday: boolean;
  logs: Log[];
  toggle: (id: string, completed: boolean, value?: number | null) => void;
  skip: (id: string) => void;
  unskip: (id: string) => void;
  isSkipped: (id: string) => boolean;
}) {
  const { t } = useTranslation();

  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + (m ?? 0);
  };

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Flat list sorted by (session order index, then time_start within session)
  const flat = SESSION_ORDER.flatMap((session) =>
    habits
      .filter((h) => (h.session ?? "anytime") === session)
      .sort((a, b) =>
        (a.time_start ?? SESSION_SORT_TIME[session]).localeCompare(
          b.time_start ?? SESSION_SORT_TIME[session]
        )
      )
      .map((h) => ({ habit: h, session, minutes: toMinutes(h.time_start ?? SESSION_SORT_TIME[session]) }))
  );

  // Index of the first habit that is strictly after "now" — now-line appears before it
  const nowIdx = isToday ? flat.findIndex((item) => item.minutes > nowMinutes) : -1;

  return (
    <div className="day-schedule">
      {flat.map((item, idx) => {
        const { habit, session } = item;
        const isNewSession = idx === 0 || flat[idx - 1].session !== session;
        const isDone = !!logs.find((l) => l.habit_id === habit.id && l.completed);
        const skipped = isSkipped(habit.id);

        return (
          <div key={habit.id}>
            {/* Session header when group changes */}
            {isNewSession && (
              <div className="day-schedule-session-header">
                <span className="day-schedule-session-icon">{SESSION_EMOJI[session]}</span>
                <span className="day-schedule-session-label">{t(`habits.session_${session}`)}</span>
              </div>
            )}

            {/* Current-time indicator, inserted before the first habit after now */}
            {idx === nowIdx && (
              <div className="day-schedule-now-row">
                <span className="day-schedule-now-time">{nowLabel}</span>
                <div className="day-schedule-now-line" />
              </div>
            )}

            <div className={[
              "day-schedule-slot",
              isDone   ? "day-schedule-slot--done"    : "",
              skipped  ? "day-schedule-slot--skipped" : "",
            ].filter(Boolean).join(" ")}>
              <span className="day-schedule-time">
                {habit.time_start ?? <span className="day-schedule-no-time">—</span>}
              </span>
              <span className="day-schedule-icon">{habit.icon}</span>
              <span className="day-schedule-name">{habit.name}</span>
              <div className="day-schedule-btns">
                {skipped ? (
                  <button
                    className="sched-btn sched-btn--undo"
                    onClick={() => unskip(habit.id)}
                    title={t("today.unskipBtn")}
                  >
                    <RotateCcw size={13} />
                  </button>
                ) : (
                  <>
                    <button
                      className={`sched-btn ${isDone ? "sched-btn--done" : "sched-btn--check"}`}
                      onClick={() => toggle(habit.id, !isDone)}
                      title={isDone ? t("today.markNotDone") : t("today.doneBtn")}
                    >
                      {isDone ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                    </button>
                    {!isDone && (
                      <button
                        className="sched-btn sched-btn--skip"
                        onClick={() => skip(habit.id)}
                        title={t("today.skipBtn")}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Now-line at the very bottom when all habits are in the past */}
      {isToday && nowIdx === -1 && flat.length > 0 && (
        <div className="day-schedule-now-row">
          <span className="day-schedule-now-time">{nowLabel}</span>
          <div className="day-schedule-now-line" />
        </div>
      )}

      {flat.length === 0 && (
        <p className="day-schedule-empty">{t("today.noHabits")}</p>
      )}
    </div>
  );
}

// ── SessionGroup ─────────────────────────────────────────

function SessionGroup({
  session,
  habits,
  listProps,
}: {
  session: Habit["session"];
  habits: Habit[];
  listProps: Omit<Parameters<typeof HabitList>[0], "habits">;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const ICONS: Record<Habit["session"], string> = {
    morning: "🌅",
    afternoon: "☀️",
    evening: "🌙",
    anytime: "",
  };

  return (
    <div className="session-group">
      <button
        className="session-group-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="session-group-label">
          {ICONS[session] && <span className="session-icon">{ICONS[session]}</span>}
          {t(`habits.session_${session}`)}
          <span className="session-count">({habits.length})</span>
        </span>
        <span className="done-section-chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && <HabitList habits={habits} {...listProps} />}
    </div>
  );
}

// ── PerfectDayBanner ──────────────────────────────────────

function PerfectDayBanner({ done, total, isToday }: { done: number; total: number; isToday: boolean }) {
  const { t } = useTranslation();
  if (total === 0) return null;

  const pct = Math.round((done / total) * 100);
  const isPerfect = done === total && isToday;

  return (
    <div className={`perfect-day-banner ${isPerfect ? "perfect-day-banner--perfect" : ""}`}>
      <div className="perfect-day-ring" style={{ "--pct": pct } as React.CSSProperties}>
        <svg viewBox="0 0 36 36" className="perfect-day-svg">
          <circle cx="18" cy="18" r="15.9" className="perfect-day-track" />
          <circle
            cx="18" cy="18" r="15.9"
            className="perfect-day-progress"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeDashoffset="25"
          />
        </svg>
        <span className="perfect-day-pct">{pct}%</span>
      </div>
      <div className="perfect-day-text">
        {isPerfect ? (
          <strong>{t("today.perfectDay")} 🎯</strong>
        ) : (
          <>
            <strong>{done}/{total}</strong>
            <span>{t("today.habitsCompleted")}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Today ─────────────────────────────────────────────────

export function Today() {
  const { t } = useTranslation();
  const dateFnsLocale = useDateLocale();

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // ── Calendar state ────────────────────────────────────────
  const [calView, setCalView]       = useState<CalendarView>("monthly");
  const [viewDate, setViewDate]     = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dayPanelOpen, setDayPanelOpen] = useState(false);

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
  const { isSkipped, isExcluded, skip, exclude, unskip } = useSkips(selectedDate);
  const { rangeSkips } = useRangeSkips(calRange.start, calRange.end);
  const { isMissed, markMissed, unmarkMissed } = useMisses(selectedDate);

  useReminders(habits, selectedDate === todayStr ? logs : []);

  const { showToast } = useToast();

  // ── Note modal ────────────────────────────────────────────
  const [noteHabit, setNoteHabit] = useState<Habit | null>(null);

  // ── R-09: compact view ────────────────────────────────────
  const [compactView, setCompactView] = useState(
    () => localStorage.getItem("zyrco-compact-view") === "true"
  );
  const toggleCompact = useCallback(() => {
    setCompactView((v) => {
      localStorage.setItem("zyrco-compact-view", String(!v));
      return !v;
    });
  }, []);

  const [scheduleView, setScheduleView] = useState(false);

  // ── R-04: milestone toasts ────────────────────────────────
  const shownMilestones = useRef(new Set<string>());
  const MILESTONES = [7, 21, 30, 66, 100];

  // ── R-06: at-risk banner ──────────────────────────────────
  const [atRiskDismissed, setAtRiskDismissed] = useState(false);

  // ── Onboarding highlight: shows a pulse on the habit just created ──
  const [highlightHabitId, setHighlightHabitId] = useState<string | null>(() => {
    const id = localStorage.getItem("zyrco-highlight-habit");
    if (id) localStorage.removeItem("zyrco-highlight-habit");
    return id;
  });
  // Clear highlight after 2.5s so it doesn't persist across navigations
  useEffect(() => {
    if (!highlightHabitId) return;
    const t = setTimeout(() => setHighlightHabitId(null), 2500);
    return () => clearTimeout(t);
  }, [highlightHabitId]);

  // ── Active timers (P-04) ──────────────────────────────────
  const [activeTimers, setActiveTimers] = useState<Map<string, { startedAt: Date; mode: TimerMode }>>(new Map());

  // Restore any in-progress timers from localStorage on mount (survive navigation)
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("zyrco-timers") ?? "{}") as Record<
        string,
        { startedAt: string; date: string; mode?: TimerMode }
      >;
      const restored = new Map<string, { startedAt: Date; mode: TimerMode }>();
      for (const [id, data] of Object.entries(stored)) {
        if (data.date === format(new Date(), "yyyy-MM-dd")) {
          restored.set(id, { startedAt: new Date(data.startedAt), mode: data.mode ?? "stopwatch" });
        }
      }
      if (restored.size > 0) setActiveTimers(restored);
    } catch { /* corrupt entry — ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTimerStart = useCallback((habitId: string, mode: TimerMode) => {
    const startedAt = new Date();
    setActiveTimers((prev) => {
      const next = new Map(prev);
      next.set(habitId, { startedAt, mode });
      return next;
    });
    try {
      const stored = JSON.parse(localStorage.getItem("zyrco-timers") ?? "{}") as Record<string, unknown>;
      stored[habitId] = { startedAt: startedAt.toISOString(), date: format(startedAt, "yyyy-MM-dd"), mode };
      localStorage.setItem("zyrco-timers", JSON.stringify(stored));
    } catch { /* storage unavailable */ }
  }, []);

  const handleTimerStop = useCallback(async (habitId: string, elapsedMinutes: number) => {
    const timerEntry = activeTimers.get(habitId);
    setActiveTimers((prev) => {
      const next = new Map(prev);
      next.delete(habitId);
      return next;
    });
    try {
      const stored = JSON.parse(localStorage.getItem("zyrco-timers") ?? "{}") as Record<string, unknown>;
      delete stored[habitId];
      localStorage.setItem("zyrco-timers", JSON.stringify(stored));
    } catch { /* storage unavailable */ }
    // Show celebratory message when countdown target is met
    if (timerEntry?.mode === "countdown") {
      const habit = habits.find((h) => h.id === habitId);
      if (habit?.completion_target && elapsedMinutes >= habit.completion_target) {
        showToast(`🎯 ${habit.icon} ${habit.name} — ${t("today.timerDone")}`, "success");
        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
      }
    }
    await toggle(habitId, false, elapsedMinutes);
  }, [activeTimers, habits, toggle, showToast, t]);

  // Wraps toggle with haptic-free undo toast (haptic fires inside HabitList.handleToggle)
  const toggleWithUndo = useCallback(
    (habitId: string, completed: boolean, value?: number | null) => {
      toggle(habitId, completed, value);
      if (!completed) {
        const habit = habits.find((h) => h.id === habitId);
        if (habit) {
          showToast(
            `${habit.icon} ${habit.name}`,
            "success",
            { label: t("today.undo"), onClick: () => toggle(habitId, true, value) }
          );
        }
      }
    },
    [toggle, habits, showToast, t]
  );

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
  const [deleteAllLogsTarget, setDeleteAllLogsTarget] = useState<Habit | null>(null);

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

  const handleDeleteLogToday = useCallback(async (habit: Habit) => {
    setMenu(null);
    try {
      await deleteLogForDate(habit.id, selectedDate);
      exclude(habit.id);
      window.dispatchEvent(new CustomEvent("zyrco:log-changed"));
      reloadDayLogs();
      reloadRangeLogs();
    } catch (err) {
      console.error("Today handleDeleteLogToday failed:", err);
      showToast(t("common.error"), "error");
    }
  }, [selectedDate, exclude, reloadDayLogs, reloadRangeLogs, showToast, t]);

  const handleArchiveFromMenu = useCallback(async () => {
    if (!deleteAllLogsTarget) return;
    try {
      await archive(deleteAllLogsTarget.id, true);
      showToast(t("today.habitArchived"), "info");
    } catch (err) {
      console.error("Today handleArchiveFromMenu failed:", err);
      showToast(t("common.error"), "error");
    }
    setDeleteAllLogsTarget(null);
  }, [deleteAllLogsTarget, archive, showToast, t]);

  const openMenu = useCallback(
    (habit: Habit, e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      // Flip upward when there isn't enough room below (navbar ~56px + dropdown ~350px)
      const MENU_HEIGHT = 350;
      const flipped = rect.bottom + MENU_HEIGHT > window.innerHeight - 56;
      // When flipped, clamp so the menu doesn't overflow the top of the viewport
      const yUp = Math.max(rect.top, MENU_HEIGHT + 8);
      setMenu((prev) =>
        prev?.habitId === habit.id
          ? null
          : { habitId: habit.id, x: rect.right, y: flipped ? yUp : rect.bottom, flipped }
      );
    },
    []
  );

  // ── Due habits for the selected date ─────────────────────
  const selectedDateObj = parseISO(selectedDate + "T00:00:00");
  const activeDayHabits = habits.filter((h) => {
    // R-13: skip paused habits in Today view
    if (h.paused_until && h.paused_until >= selectedDate) return false;
    return true;
  });
  // Excluded habits (type='exclude') are completely invisible — not even in the skipped list
  const allDueHabits  = activeDayHabits.filter((h) => isHabitDueOnDay(h, selectedDateObj) && !isExcluded(h.id));
  const dueHabits     = allDueHabits.filter((h) => !isSkipped(h.id));
  const skippedHabits = allDueHabits.filter((h) => isSkipped(h.id));

  const getLog = useCallback(
    (habitId: string) => logs.find((l) => l.habit_id === habitId),
    [logs]
  );

  const done  = dueHabits.filter((h) => getLog(h.id)?.completed).length;
  const total = dueHabits.length;

  // R-04: check milestone streaks and fire a toast once per session per habit+milestone
  const completedHabits = dueHabits.filter((h) => getLog(h.id)?.completed);
  completedHabits.forEach((h) => {
    const streak = getHabitStats(h.id).streak;
    for (const m of MILESTONES) {
      if (streak === m) {
        const key = `${h.id}-${m}`;
        if (!shownMilestones.current.has(key)) {
          shownMilestones.current.add(key);
          showToast(`🏆 ${h.icon} ${h.name}: ${m}-day streak!`, "success");
        }
      }
    }
  });

  // R-06: show at-risk banner when it's past 20:00, habits with streak ≥ 3 are pending, and today
  const hour = new Date().getHours();
  const _isToday = selectedDate === todayStr;
  const atRiskHabits = _isToday
    ? dueHabits.filter((h) => !getLog(h.id)?.completed && getHabitStats(h.id).streak >= 3)
    : [];

  // Fire confetti once per "perfect day" event (done === total for today)
  const confettiFiredRef = useRef<string>("");
  useEffect(() => {
    const key = `${todayStr}-${total}`;
    if (_isToday && total > 0 && done === total && confettiFiredRef.current !== key) {
      confettiFiredRef.current = key;
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.65 } });
    }
  }, [done, total, _isToday, todayStr]);

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
    },
    [calView]
  );

  // ── Loading guard ──────────────────────────────────────────
  if (habitsLoading) {
    return (
      <div className="page">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonHabitRow key={i} />
        ))}
      </div>
    );
  }

  const isToday       = selectedDate === todayStr;
  const selectedLabel = format(selectedDateObj, "EEEE, MMMM d", { locale: dateFnsLocale });
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

  // Split into pending / done / missed for separate sections
  const missedHabits  = sortedDue.filter((h) => isMissed(h.id) && !getLog(h.id)?.completed);
  const pendingHabits = sortedDue.filter((h) => !getLog(h.id)?.completed && !isMissed(h.id));
  const doneHabits    = sortedDue.filter((h) =>  getLog(h.id)?.completed);

  // Long-press on habit-info area opens the context menu at pointer position
  const handleLongPress = (habit: Habit, pos: { x: number; y: number }) => {
    const flipped = pos.y + 180 > window.innerHeight - 56;
    setMenu((prev) =>
      prev?.habitId === habit.id ? null : { habitId: habit.id, x: pos.x, y: pos.y, flipped }
    );
  };

  // ── Shared habit-list props ────────────────────────────────
  const habitListProps = {
    logs,
    categories,
    getHabitStats,
    toggle: toggleWithUndo,
    skip,
    unskip,
    isSkipped,
    onNoteClick: setNoteHabit,
    onHabitMenu: openMenu,
    onLongPress: handleLongPress,
    isToday,
    activeTimers,
    onTimerStart: handleTimerStart,
    onTimerStop: handleTimerStop,
    compact: compactView,
    highlightHabitId,
  };

  return (
    <>
      {/* ── R-06: at-risk banner — visible in all views ─────── */}
      {hour >= 20 && !atRiskDismissed && atRiskHabits.length > 0 && (
        <div className="at-risk-banner at-risk-banner--global">
          <span>⚠️ {t("today.atRiskMsg", { count: atRiskHabits.length })}</span>
          <button className="icon-btn" onClick={() => setAtRiskDismissed(true)}>✕</button>
        </div>
      )}

      {/* ── Monthly layout ──────────────────────────────────── */}
      {calView === "monthly" && (
        <div className="page today-page--monthly">
          {dayPanelOpen && (
            <div className="day-panel-backdrop" onClick={() => setDayPanelOpen(false)} />
          )}

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
                onDateSelect={(d) => {
                  handleDateSelectFromCal(d);
                  if (window.innerWidth <= 600) setDayPanelOpen(true);
                }}
                onNavigate={handleNavigate}
                onJumpTo={handleJumpTo}
                onGoToToday={handleGoToToday}
              />
            </div>

            <aside className={`cal-day-panel${dayPanelOpen ? " cal-day-panel--open" : ""}`}>
              <div className="day-panel-handle" aria-hidden="true" />
              <MonthStrip
                habits={habits}
                rangeLogs={rangeLogs}
                rangeSkips={rangeSkips}
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
                  <button
                    className="icon-btn day-panel-close-btn"
                    onClick={() => setDayPanelOpen(false)}
                    aria-label={t("common.close")}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="cal-day-panel-body">
                {dueHabits.length === 0 && skippedHabits.length === 0 && !logsLoading && (
                  <div className="empty-state">
                    <p>{isToday ? t("today.noHabits") : t("today.noHabitsDate")}</p>
                    <button className="btn btn-primary" onClick={openCreate}>
                      <Plus size={16} />
                      {t("today.addFirst")}
                    </button>
                  </div>
                )}

                <FilterBar
                  dueHabitsLength={dueHabits.length}
                  hasGood={hasGood}
                  hasBad={hasBad}
                  hasNormal={hasNormal}
                  typeFilter={typeFilter}
                  dueCategories={dueCategories}
                  categoryFilter={categoryFilter}
                  habitSort={habitSort}
                  onTypeFilter={setTypeFilter}
                  onCategoryFilter={setCategoryFilter}
                  onHabitSort={setHabitSort}
                />

                <PerfectDayBanner done={done} total={total} isToday={isToday} />

                {done === total && total > 0 && (
                  <div className="all-done all-done--compact">
                    <span className="all-done-icon">🎉</span>
                    <p>{t("today.allDone")}</p>
                  </div>
                )}

                {pendingHabits.length > 0 && (() => {
                  const bySessions = SESSION_ORDER.map((s) => ({
                    session: s,
                    habits: pendingHabits.filter((h) => (h.session ?? "anytime") === s),
                  })).filter((g) => g.habits.length > 0);
                  const hasMultipleSessions = bySessions.length > 1;
                  return hasMultipleSessions ? (
                    bySessions.map((g) => (
                      <SessionGroup key={g.session} session={g.session} habits={g.habits} listProps={habitListProps} />
                    ))
                  ) : (
                    <HabitList habits={pendingHabits} {...habitListProps} />
                  );
                })()}

                {doneHabits.length > 0 && (
                  <DoneSection habits={doneHabits} {...habitListProps} />
                )}

                {missedHabits.length > 0 && (
                  <MissedSection habits={missedHabits} unmarkMissed={unmarkMissed} />
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
        <div className="page today-page--weekly">
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
            <div className="cal-day-header-actions">
              {dueHabits.length > 0 && (
                <>
                  {/* Schedule / agenda view toggle */}
                  <button
                    className={`btn btn-ghost btn-sm compact-toggle ${scheduleView ? "compact-toggle--active" : ""}`}
                    onClick={() => setScheduleView((v) => !v)}
                    title={t("today.scheduleView")}
                  >
                    <Clock size={14} />
                  </button>
                  {/* R-09: compact list view toggle (hidden while schedule view is active) */}
                  {!scheduleView && (
                    <button
                      className={`btn btn-ghost btn-sm compact-toggle ${compactView ? "compact-toggle--active" : ""}`}
                      onClick={toggleCompact}
                      title={t("today.compactView")}
                    >
                      ☰
                    </button>
                  )}
                </>
              )}
              <button className="btn btn-primary btn-sm" onClick={openCreate}>
                <Plus size={14} />
                {t("habits.new")}
              </button>
            </div>
          </div>

          {dueHabits.length === 0 && skippedHabits.length === 0 && !logsLoading && (
            <div className="empty-state">
              <p>{isToday ? t("today.noHabits") : t("today.noHabitsDate")}</p>
              <button className="btn btn-primary" onClick={openCreate}>
                <Plus size={16} />
                {t("today.addFirst")}
              </button>
            </div>
          )}

          <PerfectDayBanner done={done} total={total} isToday={isToday} />

          {done === total && total > 0 && (
            <div className="all-done">
              <span className="all-done-icon">🎉</span>
              <p>{t("today.allDone")}</p>
            </div>
          )}

          {scheduleView ? (
            /* ── Schedule / agenda view ─────────────────────────── */
            <DaySchedule
              habits={[...dueHabits, ...skippedHabits]}
              isToday={isToday}
              logs={logs}
              toggle={toggleWithUndo}
              skip={skip}
              unskip={unskip}
              isSkipped={isSkipped}
            />
          ) : (
            /* ── Default list view ──────────────────────────────── */
            <>
              <FilterBar
                dueHabitsLength={dueHabits.length}
                hasGood={hasGood}
                hasBad={hasBad}
                hasNormal={hasNormal}
                typeFilter={typeFilter}
                dueCategories={dueCategories}
                categoryFilter={categoryFilter}
                habitSort={habitSort}
                onTypeFilter={setTypeFilter}
                onCategoryFilter={setCategoryFilter}
                onHabitSort={setHabitSort}
              />

              {pendingHabits.length > 0 && (() => {
                const bySessions = SESSION_ORDER.map((s) => ({
                  session: s,
                  habits: pendingHabits.filter((h) => (h.session ?? "anytime") === s),
                })).filter((g) => g.habits.length > 0);
                const hasMultipleSessions = bySessions.length > 1;
                return hasMultipleSessions ? (
                  bySessions.map((g) => (
                    <SessionGroup key={g.session} session={g.session} habits={g.habits} listProps={habitListProps} />
                  ))
                ) : (
                  <HabitList habits={pendingHabits} {...habitListProps} />
                );
              })()}

              {doneHabits.length > 0 && (
                <DoneSection habits={doneHabits} {...habitListProps} />
              )}

              {missedHabits.length > 0 && (
                <MissedSection habits={missedHabits} unmarkMissed={unmarkMissed} />
              )}

              {skippedHabits.length > 0 && (
                <SkippedSection
                  habits={skippedHabits}
                  onUnskip={(id) => unskip(id)}
                />
              )}
            </>
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
          style={
            menu.flipped
              ? { bottom: window.innerHeight - menu.y, left: menu.x, top: "auto" }
              : { top: menu.y, left: menu.x }
          }
        >
          {/* Mark done / undo done */}
          {(() => {
            const done = !!getLog(menuHabit.id)?.completed;
            return (
              <button
                className={`dropdown-item${done ? "" : " dropdown-item--success"}`}
                onClick={() => { toggleWithUndo(menuHabit.id, !done); setMenu(null); }}
              >
                {done ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                {done ? t("today.markNotDone") : t("today.markDone")}
              </button>
            );
          })()}
          {/* Mark as missed (only when not done) */}
          {!getLog(menuHabit.id)?.completed && (
            isMissed(menuHabit.id) ? (
              <button
                className="dropdown-item"
                onClick={() => { unmarkMissed(menuHabit.id); setMenu(null); }}
              >
                <RotateCcw size={14} />
                {t("today.unmarkMissed")}
              </button>
            ) : (
              <button
                className="dropdown-item dropdown-item-danger"
                onClick={() => { markMissed(menuHabit.id); setMenu(null); }}
              >
                <XCircle size={14} />
                {t("today.markMissed")}
              </button>
            )
          )}
          <div className="dropdown-divider" />
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
          <div className="dropdown-divider" />
          <button
            className="dropdown-item dropdown-item-danger"
            onClick={() => handleDeleteLogToday(menuHabit)}
          >
            <Trash2 size={14} />
            {t("today.deleteLogToday")}
          </button>
          <button
            className="dropdown-item dropdown-item-danger"
            onClick={() => { setDeleteAllLogsTarget(menuHabit); setMenu(null); }}
          >
            <Trash2 size={14} />
            {t("today.deleteAllLogs")}
          </button>
          <div className="dropdown-divider" />
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

      {/* ── Delete habit confirmation modal ─────────────────── */}
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
          <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
            {t("common.cancel")}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            {t("common.delete")}
          </button>
        </div>
      </Modal>

      {/* ── Delete all logs confirmation modal ───────────────── */}
      <Modal
        open={!!deleteAllLogsTarget}
        title={t("today.deleteAllLogsTitle")}
        onClose={() => setDeleteAllLogsTarget(null)}
        size="sm"
        danger
      >
        <p className="confirm-text">{t("today.deleteAllLogsConfirm")}</p>
        <p className="confirm-name">{deleteAllLogsTarget?.name}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setDeleteAllLogsTarget(null)}>
            {t("common.cancel")}
          </button>
          <button className="btn btn-danger" onClick={handleArchiveFromMenu}>
            {t("today.stopHabit")}
          </button>
        </div>
      </Modal>
    </>
  );
}
