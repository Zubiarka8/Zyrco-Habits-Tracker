import { useMemo } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  parseISO,
} from "date-fns";
import type { Habit, Log } from "../types";

export type CalendarView = "monthly" | "weekly" | "daily";

export interface HabitCalendarProps {
  view: CalendarView;
  viewDate: Date;
  selectedDate: string; // yyyy-MM-dd
  today: string;        // yyyy-MM-dd
  habits: Habit[];
  rangeLogs: Log[];
  onViewChange: (v: CalendarView) => void;
  onDateSelect: (date: string) => void;
  onNavigate: (dir: "prev" | "next") => void;
  /** Optional — wired up for the weekly grid so you can toggle habits inline */
  onToggle?: (habitId: string, date: string, currentCompleted: boolean) => void;
}

// ── Shared helpers ────────────────────────────────────────

/**
 * Returns whether a habit should appear on a given calendar day.
 * Mirrors the same logic in Today.tsx so dots and rows stay in sync.
 */
function isHabitDueOnDay(habit: Habit, date: Date): boolean {
  if (habit.archived) return false;
  const dow = date.getDay();
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekly") return dow === 1; // every Monday
  if (habit.frequency === "custom" && habit.target_days) {
    return habit.target_days.includes(dow);
  }
  return false;
}

interface Dot {
  color: string;
  completed: boolean;
}

/**
 * Produces one dot descriptor per habit that is due on `date`.
 * Completed habits carry their color; pending ones are styled by CSS.
 */
function getDots(date: Date, habits: Habit[], logs: Log[]): Dot[] {
  const dateStr = format(date, "yyyy-MM-dd");
  return habits
    .filter((h) => isHabitDueOnDay(h, date))
    .map((h) => ({
      color: h.color,
      completed: logs.some(
        (l) => l.habit_id === h.id && l.date === dateStr && l.completed
      ),
    }));
}

// ── DayDots ───────────────────────────────────────────────

/**
 * Compact completion summary for a single calendar cell.
 * Switches to "X/Y" text when habits outnumber available dot slots —
 * avoids the visual chaos of 10+ tiny circles crammed into one cell.
 */
function DayDots({ dots }: { dots: Dot[] }) {
  const MAX = 6;
  const completed = dots.filter((d) => d.completed).length;
  const total = dots.length;
  if (total === 0) return null;

  if (total > MAX) {
    return (
      <div className="cal-dots">
        <span
          className="cal-ratio"
          style={
            completed === total ? { color: "var(--color-success)" } : undefined
          }
        >
          {completed}/{total}
        </span>
      </div>
    );
  }

  return (
    <div className="cal-dots">
      {dots.map((d, i) => (
        <span
          key={i}
          className={`cal-dot ${d.completed ? "cal-dot--done" : "cal-dot--pending"}`}
          style={d.completed ? { background: d.color } : undefined}
        />
      ))}
    </div>
  );
}

// ── Monthly grid ──────────────────────────────────────────

/**
 * Full month grid — 7 columns, cells grow to fill whatever height the parent
 * gives them (used in the split layout where the parent constrains to 100vh).
 * Clicking any cell calls onDateSelect which the parent uses to populate the
 * day-detail panel on the right.
 */
function MonthView({
  viewDate,
  selectedDate,
  today,
  habits,
  rangeLogs,
  onDateSelect,
}: {
  viewDate: Date;
  selectedDate: string;
  today: string;
  habits: Habit[];
  rangeLogs: Log[];
  onDateSelect: (d: string) => void;
}) {
  const { t } = useTranslation();

  // Pad the grid so it always starts on Monday and ends on Sunday.
  // This keeps the column count constant across all months.
  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewDate]);

  const weekDays = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun

  return (
    <div className="cal-month">
      <div className="cal-grid-head">
        {weekDays.map((d) => (
          <div key={d} className="cal-head-cell">
            {t(`common.days.${d}`)}
          </div>
        ))}
      </div>
      <div className="cal-month-grid">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, viewDate);
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const dots = inMonth ? getDots(day, habits, rangeLogs) : [];
          const allDone =
            inMonth && dots.length > 0 && dots.every((d) => d.completed);

          return (
            <button
              key={dateStr}
              className={[
                "cal-cell",
                !inMonth ? "cal-cell--other" : "",
                isToday ? "cal-cell--today" : "",
                isSelected ? "cal-cell--selected" : "",
                allDone ? "cal-cell--all-done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onDateSelect(dateStr)}
            >
              <span className="cal-cell-num">{format(day, "d")}</span>
              <DayDots dots={dots} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Weekly habit grid ─────────────────────────────────────

/**
 * Transposed week view: habits as rows, days as columns.
 * Each cell shows the completion state and — if onToggle is wired — lets you
 * check or uncheck the habit directly without leaving this view.
 * This is the "big-screen" view: you see the whole week at a glance.
 */
function WeekHabitGrid({
  viewDate,
  selectedDate,
  today,
  habits,
  rangeLogs,
  onDateSelect,
  onToggle,
}: {
  viewDate: Date;
  selectedDate: string;
  today: string;
  habits: Habit[];
  rangeLogs: Log[];
  onDateSelect: (d: string) => void;
  onToggle?: (habitId: string, date: string, completed: boolean) => void;
}) {
  const { t } = useTranslation();

  const weekDays = useMemo(() => {
    const ws = startOfWeek(viewDate, { weekStartsOn: 1 });
    const we = endOfWeek(viewDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: ws, end: we });
  }, [viewDate]);

  const activeHabits = habits.filter((h) => !h.archived);

  return (
    <div className="hwg">
      {/* ── Header: day columns ── */}
      <div className="hwg-row hwg-header">
        <div className="hwg-habit-col" />
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          return (
            <button
              key={dateStr}
              className={[
                "hwg-day-head",
                isToday ? "hwg-day-head--today" : "",
                isSelected ? "hwg-day-head--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onDateSelect(dateStr)}
            >
              <span className="hwg-day-name">
                {t(`common.days.${day.getDay()}`)}
              </span>
              <span className="hwg-day-num">{format(day, "d")}</span>
            </button>
          );
        })}
      </div>

      {/* ── One row per habit ── */}
      {activeHabits.map((habit) => (
        <div key={habit.id} className="hwg-row">
          {/* Habit label — colored left border matches the habit's chosen color */}
          <div
            className="hwg-habit-label"
            style={{ borderLeftColor: habit.color }}
          >
            <span className="hwg-habit-icon">{habit.icon}</span>
            <span className="hwg-habit-name">{habit.name}</span>
          </div>

          {/* One cell per day */}
          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const due = isHabitDueOnDay(habit, day);
            const isFuture = dateStr > today;
            const log = rangeLogs.find(
              (l) => l.habit_id === habit.id && l.date === dateStr
            );
            const completed = log?.completed ?? false;

            if (!due) {
              // Habit not scheduled for this weekday — render a visual gap
              return <div key={dateStr} className="hwg-cell hwg-cell--skip" />;
            }

            return (
              <button
                key={dateStr}
                className={[
                  "hwg-cell",
                  completed ? "hwg-cell--done" : "hwg-cell--pending",
                  dateStr === today ? "hwg-cell--today" : "",
                  isFuture ? "hwg-cell--future" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (isFuture) return; // can't log future dates
                  if (onToggle) {
                    onToggle(habit.id, dateStr, completed);
                  } else {
                    onDateSelect(dateStr);
                  }
                }}
                title={
                  isFuture
                    ? undefined
                    : completed
                    ? `Unmark ${habit.name}`
                    : `Mark ${habit.name} as done`
                }
              >
                {isFuture ? (
                  // Future day — show a faint dot as placeholder
                  <span
                    className="hwg-future-dot"
                    style={{ background: habit.color }}
                  />
                ) : completed ? (
                  <CheckCircle2 size={20} style={{ color: habit.color }} />
                ) : (
                  <Circle size={20} className="hwg-pending-icon" />
                )}
              </button>
            );
          })}
        </div>
      ))}

      {/* Empty state — no habits yet */}
      {activeHabits.length === 0 && (
        <div className="hwg-empty">
          <p>{t("today.noHabits")}</p>
        </div>
      )}
    </div>
  );
}

// ── HabitCalendar ─────────────────────────────────────────

/**
 * Top-level calendar shell. Renders the navigation header (prev/label/next +
 * view toggle) and delegates the grid to MonthView or WeekHabitGrid.
 * Daily mode only shows the nav so Today.tsx can render the habit list below.
 */
export function HabitCalendar({
  view,
  viewDate,
  selectedDate,
  today,
  habits,
  rangeLogs,
  onViewChange,
  onDateSelect,
  onNavigate,
  onToggle,
}: HabitCalendarProps) {
  const { t } = useTranslation();

  const headerLabel = useMemo(() => {
    if (view === "monthly") return format(viewDate, "MMMM yyyy");
    if (view === "weekly") {
      const ws = startOfWeek(viewDate, { weekStartsOn: 1 });
      const we = endOfWeek(viewDate, { weekStartsOn: 1 });
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    // Daily: show the selected date as the label
    const sel = parseISO(selectedDate + "T00:00:00");
    return format(sel, "EEEE, MMMM d, yyyy");
  }, [view, viewDate, selectedDate]);

  const VIEW_LABELS: Record<CalendarView, string> = {
    monthly: t("today.viewMonthly"),
    weekly: t("today.viewWeekly"),
    daily: t("today.viewDaily"),
  };

  const handleDateSelect = (dateStr: string) => {
    onDateSelect(dateStr);
    // Clicking a day in monthly/weekly jumps to daily view
    if (view !== "daily") onViewChange("daily");
  };

  return (
    <div className="cal-container">
      {/* ── Nav: prev | label | next + view toggle ── */}
      <div className="cal-nav">
        <div className="cal-nav-label">
          <button
            className="cal-nav-btn"
            onClick={() => onNavigate("prev")}
            aria-label="Previous"
          >
            ‹
          </button>
          <span className="cal-nav-title">{headerLabel}</span>
          <button
            className="cal-nav-btn"
            onClick={() => onNavigate("next")}
            aria-label="Next"
          >
            ›
          </button>
        </div>
        <div className="cal-view-toggle">
          {(["monthly", "weekly", "daily"] as CalendarView[]).map((v) => (
            <button
              key={v}
              className={`cal-view-btn ${view === v ? "cal-view-btn--active" : ""}`}
              onClick={() => onViewChange(v)}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {view === "monthly" && (
        <MonthView
          viewDate={viewDate}
          selectedDate={selectedDate}
          today={today}
          habits={habits}
          rangeLogs={rangeLogs}
          onDateSelect={handleDateSelect}
        />
      )}

      {view === "weekly" && (
        <WeekHabitGrid
          viewDate={viewDate}
          selectedDate={selectedDate}
          today={today}
          habits={habits}
          rangeLogs={rangeLogs}
          onDateSelect={handleDateSelect}
          onToggle={onToggle}
        />
      )}
    </div>
  );
}
