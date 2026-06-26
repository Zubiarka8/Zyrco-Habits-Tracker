import { useMemo } from "react";
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

interface HabitCalendarProps {
  view: CalendarView;
  viewDate: Date;
  selectedDate: string; // yyyy-MM-dd
  today: string;        // yyyy-MM-dd
  habits: Habit[];
  rangeLogs: Log[];     // logs for the visible month/week
  onViewChange: (v: CalendarView) => void;
  onDateSelect: (date: string) => void;
  onNavigate: (dir: "prev" | "next") => void;
}

// ── Helpers ───────────────────────────────────────────────

function isHabitDueOnDay(habit: Habit, date: Date): boolean {
  if (habit.archived) return false;
  const dow = date.getDay(); // 0 = Sun
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekly") return dow === 1;
  if (habit.frequency === "custom" && habit.target_days) {
    return habit.target_days.includes(dow);
  }
  return false;
}

interface Dot {
  color: string;
  completed: boolean;
}

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
 * Renders up to MAX colored circles for habits on a given day.
 * Filled = completed, gray ring = pending.
 * When a day has more habits than MAX we swap dots for a "X/Y" ratio
 * because squeezing 10+ dots into a calendar cell is unreadable.
 */
function DayDots({ dots }: { dots: Dot[] }) {
  const MAX = 6;
  const completed = dots.filter((d) => d.completed).length;
  const total = dots.length;

  if (total === 0) return null;

  // Too many habits to show dots clearly — show a readable ratio instead
  if (total > MAX) {
    return (
      <div className="cal-dots">
        <span
          className="cal-ratio"
          style={completed === total ? { color: "var(--color-success)" } : undefined}
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

// ── Monthly view ──────────────────────────────────────────

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

  // Fill the grid from the Monday before the 1st to the Sunday after the last day.
  // This always gives us complete weeks with no partial rows.
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
            inMonth &&
            dots.length > 0 &&
            dots.every((d) => d.completed);

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
              {/* Day number sits top-left so dots have the full bottom area */}
              <span className="cal-cell-num">{format(day, "d")}</span>
              <DayDots dots={dots} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Weekly view ───────────────────────────────────────────

function WeekView({
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

  const days = useMemo(() => {
    const ws = startOfWeek(viewDate, { weekStartsOn: 1 });
    const we = endOfWeek(viewDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: ws, end: we });
  }, [viewDate]);

  return (
    <div className="cal-week-strip">
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const isToday = dateStr === today;
        const isSelected = dateStr === selectedDate;
        const dots = getDots(day, habits, rangeLogs);

        return (
          <button
            key={dateStr}
            className={[
              "cal-week-col",
              isToday ? "cal-cell--today" : "",
              isSelected ? "cal-cell--selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onDateSelect(dateStr)}
          >
            <span className="cal-week-day-name">
              {t(`common.days.${day.getDay()}`)}
            </span>
            <span className="cal-cell-num">{format(day, "d")}</span>
            <DayDots dots={dots} />
          </button>
        );
      })}
    </div>
  );
}

// ── HabitCalendar ─────────────────────────────────────────

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
}: HabitCalendarProps) {
  const { t } = useTranslation();

  const headerLabel = useMemo(() => {
    if (view === "monthly") return format(viewDate, "MMMM yyyy");
    if (view === "weekly") {
      const ws = startOfWeek(viewDate, { weekStartsOn: 1 });
      const we = endOfWeek(viewDate, { weekStartsOn: 1 });
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    const sel = parseISO(selectedDate + "T00:00:00");
    return format(sel, "EEEE, MMMM d, yyyy");
  }, [view, viewDate, selectedDate]);

  const handleDateSelect = (dateStr: string) => {
    onDateSelect(dateStr);
    if (view !== "daily") onViewChange("daily");
  };

  const VIEW_LABELS: Record<CalendarView, string> = {
    monthly: t("today.viewMonthly"),
    weekly: t("today.viewWeekly"),
    daily: t("today.viewDaily"),
  };

  return (
    <div className="cal-container">
      {/* Navigation header */}
      <div className="cal-nav">
        <div className="cal-nav-label">
          <button className="cal-nav-btn" onClick={() => onNavigate("prev")}>
            ‹
          </button>
          <span className="cal-nav-title">{headerLabel}</span>
          <button className="cal-nav-btn" onClick={() => onNavigate("next")}>
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
        <WeekView
          viewDate={viewDate}
          selectedDate={selectedDate}
          today={today}
          habits={habits}
          rangeLogs={rangeLogs}
          onDateSelect={handleDateSelect}
        />
      )}
    </div>
  );
}
