import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  format,
  addMonths, subMonths,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  eachDayOfInterval,
  isSameMonth, isToday, isFuture,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X, CheckCircle2, Circle } from "lucide-react";
import { useHabits } from "../hooks/useHabits";
import { useCalendarLogs } from "../hooks/useLogs";
import { useDateLogs } from "../hooks/useLogs";
import { isHabitDueOnDay } from "../utils/schedule";
import type { Habit } from "../types";

// ── Day drawer ────────────────────────────────────────────────────────────────

interface DayDrawerProps {
  day: Date;
  dueHabits: Habit[];
  onClose: () => void;
}

function DayDrawer({ day, dueHabits, onClose }: DayDrawerProps) {
  const { t, i18n } = useTranslation();
  const dateStr = format(day, "yyyy-MM-dd");
  const { logs, toggle } = useDateLogs(dateStr);

  const future = !isToday(day) && isFuture(day);
  const locale = i18n.language === "es" ? es : undefined;
  const getLog = (habitId: string) => logs.find((l) => l.habit_id === habitId);

  // Pending first, done after
  const sorted = useMemo(
    () =>
      [...dueHabits].sort((a, b) => {
        const aDone = getLog(a.id)?.completed ?? false;
        const bDone = getLog(b.id)?.completed ?? false;
        return aDone === bDone ? 0 : aDone ? 1 : -1;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dueHabits, logs]
  );

  const completedCount = dueHabits.filter((h) => getLog(h.id)?.completed).length;
  const totalCount = dueHabits.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  return (
    <>
      <div className="cal-backdrop" onClick={onClose} />
      <div className="cal-drawer" role="dialog" aria-modal="true">
        <div className="cal-drawer-handle" />

        <div className="cal-drawer-header">
          <div className="cal-drawer-title-group">
            <span className="cal-drawer-date" style={{ textTransform: "capitalize" }}>
              {format(day, "EEEE, d MMMM", { locale })}
            </span>
            {totalCount > 0 && (
              <span className={`cal-drawer-chip ${allDone ? "cal-drawer-chip--done" : ""}`}>
                {allDone ? "✓ " : ""}{completedCount}/{totalCount}
              </span>
            )}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>

        {totalCount === 0 ? (
          <p className="cal-drawer-empty">{t("calendar.noHabitsDay")}</p>
        ) : (
          <div className="cal-drawer-list">
            {sorted.map((habit) => {
              const log = getLog(habit.id);
              const done = log?.completed ?? false;
              return (
                <button
                  key={habit.id}
                  className={`cal-drawer-row ${done ? "cal-drawer-row--done" : ""}`}
                  onClick={() => !future && toggle(habit.id, done)}
                  disabled={future}
                >
                  <span
                    className="cal-drawer-icon"
                    style={{ background: habit.color + "22" }}
                  >
                    {habit.icon}
                  </span>
                  <span className="cal-drawer-name">{habit.name}</span>
                  <span
                    className="cal-drawer-check"
                    style={{ color: done ? habit.color : "var(--color-border)" }}
                  >
                    {done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {future && (
          <p className="cal-drawer-future-note">{t("calendar.futureNote")}</p>
        )}
      </div>
    </>
  );
}

// ── Calendar page ─────────────────────────────────────────────────────────────

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

export function Calendar() {
  const { t } = useTranslation();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { habits, loading: habitsLoading } = useHabits();

  const monthStart = useMemo(() => startOfMonth(viewDate), [viewDate]);
  const monthEnd = useMemo(() => endOfMonth(viewDate), [viewDate]);
  const startStr = useMemo(() => format(monthStart, "yyyy-MM-dd"), [monthStart]);
  const endStr = useMemo(() => format(monthEnd, "yyyy-MM-dd"), [monthEnd]);

  const { logs } = useCalendarLogs(startStr, endStr);

  // Build log map for O(1) lookups: dateStr → log[]
  const logMap = useMemo(() => {
    const map = new Map<string, typeof logs>();
    logs.forEach((log) => {
      const arr = map.get(log.date) ?? [];
      arr.push(log);
      map.set(log.date, arr);
    });
    return map;
  }, [logs]);

  // Grid: full weeks around the month (Monday-first)
  const gridDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(monthStart, { weekStartsOn: 1 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
      }),
    [monthStart, monthEnd]
  );

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archived),
    [habits]
  );

  /** Habits due on `day` (respects paused_until, start_date, end_date). */
  const getDueHabits = useCallback(
    (day: Date) => {
      const dateStr = format(day, "yyyy-MM-dd");
      return activeHabits.filter((h) => {
        if (h.paused_until && h.paused_until > dateStr) return false;
        return isHabitDueOnDay(h, day);
      });
    },
    [activeHabits]
  );

  // Month-level summary (up to today)
  const monthSummary = useMemo(() => {
    const today = new Date();
    let due = 0;
    let done = 0;
    eachDayOfInterval({ start: monthStart, end: today > monthEnd ? monthEnd : today }).forEach(
      (day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayHabits = getDueHabits(day);
        const dayLogs = logMap.get(dateStr) ?? [];
        due += dayHabits.length;
        done += dayHabits.filter((h) =>
          dayLogs.some((l) => l.habit_id === h.id && l.completed)
        ).length;
      }
    );
    const rate = due > 0 ? Math.round((done / due) * 100) : 0;
    return { due, done, rate };
  }, [monthStart, monthEnd, getDueHabits, logMap]);

  const prevMonth = useCallback(() => {
    setViewDate((v) => subMonths(v, 1));
    setSelectedDay(null);
  }, []);

  const nextMonth = useCallback(() => {
    setViewDate((v) => addMonths(v, 1));
    setSelectedDay(null);
  }, []);

  const jumpToday = useCallback(() => {
    setViewDate(new Date());
    setSelectedDay(null);
  }, []);

  if (habitsLoading) return null;

  return (
    <div className="page cal-page">
      {/* Month navigation */}
      <div className="cal-header">
        <div className="cal-nav">
          <button className="icon-btn" onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft size={20} />
          </button>
          <h1 className="cal-month-title">
            {format(viewDate, "MMMM yyyy")}
          </h1>
          <button className="icon-btn" onClick={nextMonth} aria-label="Next month">
            <ChevronRight size={20} />
          </button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={jumpToday}>
          {t("calendar.today")}
        </button>
      </div>

      {/* Month completion bar */}
      {monthSummary.due > 0 && (
        <div className="cal-summary">
          <div className="cal-summary-bar-wrap">
            <div className="cal-summary-bar">
              <div
                className="cal-summary-bar-fill"
                style={{ width: `${monthSummary.rate}%` }}
              />
            </div>
          </div>
          <span className="cal-summary-stat">
            {monthSummary.done}/{monthSummary.due}
            <span className="cal-summary-rate"> — {monthSummary.rate}%</span>
          </span>
        </div>
      )}

      {/* Weekday header */}
      <div className="cal-weekdays">
        {WEEKDAYS.map((d) => (
          <span key={d} className="cal-weekday">
            {t(`calendar.weekday_${d.toLowerCase()}`)}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="cal-grid">
        {gridDays.map((day) => {
          const inMonth = isSameMonth(day, viewDate);
          const dateStr = format(day, "yyyy-MM-dd");
          const today = isToday(day);
          const selected =
            selectedDay ? format(selectedDay, "yyyy-MM-dd") === dateStr : false;

          if (!inMonth) {
            return (
              <div key={dateStr} className="cal-cell cal-cell--out">
                <span className="cal-day-num">{format(day, "d")}</span>
              </div>
            );
          }

          const dueHabits = getDueHabits(day);
          const dayLogs = logMap.get(dateStr) ?? [];
          const completedCount = dueHabits.filter((h) =>
            dayLogs.some((l) => l.habit_id === h.id && l.completed)
          ).length;
          const rate =
            dueHabits.length > 0 ? (completedCount / dueHabits.length) * 100 : -1;

          // Green tint — intensity scales with completion rate
          const bgStyle: React.CSSProperties =
            rate > 0
              ? { background: `rgba(34,197,94,${((rate / 100) * 0.18).toFixed(2)})` }
              : {};

          return (
            <div
              key={dateStr}
              className={`cal-cell ${selected ? "cal-cell--selected" : ""} ${today ? "cal-cell--today-wrap" : ""}`}
              style={bgStyle}
              onClick={() => setSelectedDay(day)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSelectedDay(day)}
              aria-label={dateStr}
            >
              <span className={`cal-day-num ${today ? "cal-day-num--today" : ""}`}>
                {format(day, "d")}
              </span>

              {dueHabits.length > 0 && (
                <div className="cal-dots">
                  {dueHabits.slice(0, 7).map((h) => {
                    const done = dayLogs.some(
                      (l) => l.habit_id === h.id && l.completed
                    );
                    return (
                      <span
                        key={h.id}
                        className="cal-dot"
                        style={{ background: done ? h.color : "var(--color-border)" }}
                      />
                    );
                  })}
                </div>
              )}

              {/* All-done indicator */}
              {rate === 100 && (
                <span className="cal-all-done" aria-hidden="true">✓</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="cal-legend">
        <span className="cal-legend-item">
          <span className="cal-dot" style={{ background: "var(--color-primary)" }} />
          {t("calendar.legendDone")}
        </span>
        <span className="cal-legend-item">
          <span className="cal-dot" style={{ background: "var(--color-border)" }} />
          {t("calendar.legendPending")}
        </span>
        <span className="cal-legend-item">
          <span className="cal-legend-green-swatch" />
          {t("calendar.legendRate")}
        </span>
      </div>

      {/* Day drawer */}
      {selectedDay && (
        <DayDrawer
          day={selectedDay}
          dueHabits={getDueHabits(selectedDay)}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
