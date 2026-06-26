import { useMemo, useState, useRef, useEffect } from "react";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";
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
  setMonth,
  setYear,
  getYear,
  getMonth,
} from "date-fns";
import type { Habit, Log } from "../types";
import { isHabitDueOnDay } from "../utils/schedule";

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
  /** Jump directly to a date (month/year picker) */
  onJumpTo?: (date: Date) => void;
  /** Optional — wired up for the weekly grid so you can toggle habits inline */
  onToggle?: (habitId: string, date: string, currentCompleted: boolean) => void;
}

// ── Dot helpers ───────────────────────────────────────────

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

// ── Month/Year picker ─────────────────────────────────────

/** 12-month grid that closes when a month is clicked */
function MonthPicker({
  viewDate,
  onSelect,
  onClose,
}: {
  viewDate: Date;
  onSelect: (month: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const currentMonth = getMonth(viewDate);

  return (
    <div className="cal-picker" ref={ref} role="dialog" aria-label="Month picker">
      <div className="cal-picker-grid cal-picker-grid--months">
        {Array.from({ length: 12 }, (_, i) => (
          <button
            key={i}
            className={`cal-picker-btn ${i === currentMonth ? "cal-picker-btn--active" : ""}`}
            onClick={() => { onSelect(i); onClose(); }}
          >
            {t(`common.months.${i}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Year grid showing 12 years at a time, with prev/next range navigation */
function YearPicker({
  viewDate,
  onSelect,
  onClose,
}: {
  viewDate: Date;
  onSelect: (year: number) => void;
  onClose: () => void;
}) {
  const currentYear = getYear(viewDate);
  const [rangeStart, setRangeStart] = useState(() => Math.floor(currentYear / 12) * 12);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="cal-picker" role="dialog" aria-label="Year picker">
      <div className="cal-picker-header">
        <button className="cal-picker-nav" onClick={() => setRangeStart((s) => s - 12)}>
          <ChevronLeft size={14} />
        </button>
        <span className="cal-picker-range">{rangeStart} – {rangeStart + 11}</span>
        <button className="cal-picker-nav" onClick={() => setRangeStart((s) => s + 12)}>
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="cal-picker-grid cal-picker-grid--years">
        {Array.from({ length: 12 }, (_, i) => {
          const y = rangeStart + i;
          return (
            <button
              key={y}
              className={`cal-picker-btn ${y === currentYear ? "cal-picker-btn--active" : ""}`}
              onClick={() => { onSelect(y); onClose(); }}
            >
              {y}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Monthly grid ──────────────────────────────────────────

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

      {activeHabits.map((habit) => (
        <div key={habit.id} className="hwg-row">
          <div
            className="hwg-habit-label"
            style={{ borderLeftColor: habit.color }}
          >
            <span className="hwg-habit-icon">{habit.icon}</span>
            <span className="hwg-habit-name">{habit.name}</span>
          </div>

          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const due = isHabitDueOnDay(habit, day);
            const isFuture = dateStr > today;
            const log = rangeLogs.find(
              (l) => l.habit_id === habit.id && l.date === dateStr
            );
            const completed = log?.completed ?? false;

            if (!due) {
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
                  if (isFuture) return;
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

      {activeHabits.length === 0 && (
        <div className="hwg-empty">
          <p>{t("today.noHabits")}</p>
        </div>
      )}
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
  onJumpTo,
  onToggle,
}: HabitCalendarProps) {
  const { t } = useTranslation();
  const [picker, setPicker] = useState<"none" | "month" | "year">("none");

  // Close picker if view changes (e.g. switch monthly → weekly)
  useEffect(() => { setPicker("none"); }, [view]);

  const headerLabel = useMemo(() => {
    if (view === "monthly") return null; // rendered as separate clickable parts
    if (view === "weekly") {
      const ws = startOfWeek(viewDate, { weekStartsOn: 1 });
      const we = endOfWeek(viewDate, { weekStartsOn: 1 });
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
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
    // In monthly view, day clicks only update the right panel — no view switch.
    // Weekly view does switch to daily for focused day editing.
    if (view === "weekly") onViewChange("daily");
  };

  const handleJumpToMonth = (month: number) => {
    onJumpTo?.(setMonth(viewDate, month));
  };

  const handleJumpToYear = (year: number) => {
    onJumpTo?.(setYear(viewDate, year));
  };

  return (
    <div className="cal-container">
      {/* ── Nav bar ── */}
      <div className="cal-nav">
        <div className="cal-nav-label">
          <button
            className="cal-nav-btn"
            onClick={() => { setPicker("none"); onNavigate("prev"); }}
            aria-label="Previous"
          >
            ‹
          </button>

          {view === "monthly" ? (
            /* Clickable month + year for the picker */
            <div className="cal-nav-title-split">
              <div className="cal-picker-anchor">
                <button
                  className={`cal-nav-month-btn ${picker === "month" ? "cal-nav-month-btn--active" : ""}`}
                  onClick={() => setPicker((p) => (p === "month" ? "none" : "month"))}
                >
                  {format(viewDate, "MMMM")}
                </button>
                {picker === "month" && (
                  <MonthPicker
                    viewDate={viewDate}
                    onSelect={handleJumpToMonth}
                    onClose={() => setPicker("none")}
                  />
                )}
              </div>

              <div className="cal-picker-anchor">
                <button
                  className={`cal-nav-year-btn ${picker === "year" ? "cal-nav-year-btn--active" : ""}`}
                  onClick={() => setPicker((p) => (p === "year" ? "none" : "year"))}
                >
                  {format(viewDate, "yyyy")}
                </button>
                {picker === "year" && (
                  <YearPicker
                    viewDate={viewDate}
                    onSelect={handleJumpToYear}
                    onClose={() => setPicker("none")}
                  />
                )}
              </div>
            </div>
          ) : (
            <span className="cal-nav-title">{headerLabel}</span>
          )}

          <button
            className="cal-nav-btn"
            onClick={() => { setPicker("none"); onNavigate("next"); }}
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

      {/* Backdrop to close any open picker */}
      {picker !== "none" && (
        <div className="cal-picker-backdrop" onClick={() => setPicker("none")} />
      )}

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
