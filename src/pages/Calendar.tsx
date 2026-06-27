import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  format,
  addMonths, subMonths,
  startOfMonth, endOfMonth,
  eachDayOfInterval,
  isSameMonth, isToday, isFuture,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X, CheckCircle2, Circle } from "lucide-react";
import { useHabits } from "../hooks/useHabits";
import { useCalendarLogs, useDateLogs } from "../hooks/useLogs";
import { isHabitDueOnDay } from "../utils/schedule";
import type { Habit } from "../types";

// ── Day drawer (bottom sheet) ─────────────────────────────────────────────────

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
  const allDone = dueHabits.length > 0 && completedCount === dueHabits.length;

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
            {dueHabits.length > 0 && (
              <span className={`cal-drawer-chip ${allDone ? "cal-drawer-chip--done" : ""}`}>
                {allDone ? "✓ " : ""}{completedCount}/{dueHabits.length}
              </span>
            )}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>

        {dueHabits.length === 0 ? (
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

export function Calendar() {
  const { t } = useTranslation();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const todayRowRef = useRef<HTMLDivElement>(null);

  const { habits, loading: habitsLoading } = useHabits();

  const monthStart = useMemo(() => startOfMonth(viewDate), [viewDate]);
  const monthEnd = useMemo(() => endOfMonth(viewDate), [viewDate]);
  const startStr = useMemo(() => format(monthStart, "yyyy-MM-dd"), [monthStart]);
  const endStr = useMemo(() => format(monthEnd, "yyyy-MM-dd"), [monthEnd]);

  const { logs } = useCalendarLogs(startStr, endStr);

  // dateStr → Log[] map for O(1) lookups
  const logMap = useMemo(() => {
    const map = new Map<string, typeof logs>();
    logs.forEach((log) => {
      const arr = map.get(log.date) ?? [];
      arr.push(log);
      map.set(log.date, arr);
    });
    return map;
  }, [logs]);

  // All days in the month (no padding rows)
  const monthDays = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archived),
    [habits]
  );

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

  // Auto-scroll to today's row when viewing the current month
  useEffect(() => {
    if (!isSameMonth(new Date(), viewDate)) return;
    const timer = setTimeout(() => {
      todayRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => clearTimeout(timer);
  }, [viewDate]);

  // Month-level completion summary
  const monthSummary = useMemo(() => {
    const today = new Date();
    let due = 0;
    let done = 0;
    eachDayOfInterval({ start: monthStart, end: today < monthEnd ? today : monthEnd }).forEach(
      (day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dueHabits = getDueHabits(day);
        const dayLogs = logMap.get(dateStr) ?? [];
        due += dueHabits.length;
        done += dueHabits.filter((h) =>
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

      {/* Day list */}
      <div className="cal-day-list">
        {monthDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const today = isToday(day);
          const future = !today && isFuture(day);
          const dueHabits = getDueHabits(day);
          const dayLogs = logMap.get(dateStr) ?? [];
          const completedCount = dueHabits.filter((h) =>
            dayLogs.some((l) => l.habit_id === h.id && l.completed)
          ).length;
          const allDone = dueHabits.length > 0 && completedCount === dueHabits.length;
          const hasHabits = dueHabits.length > 0;
          const wdKey = format(day, "EEE").toLowerCase().slice(0, 2);

          return (
            <div
              key={dateStr}
              ref={today ? todayRowRef : undefined}
              className={[
                "cal-day-row",
                today ? "cal-day-row--today" : "",
                future ? "cal-day-row--future" : "",
                !hasHabits ? "cal-day-row--empty" : "",
                allDone ? "cal-day-row--alldone" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => hasHabits && setSelectedDay(day)}
              role={hasHabits ? "button" : undefined}
              tabIndex={hasHabits ? 0 : undefined}
              onKeyDown={
                hasHabits
                  ? (e) => e.key === "Enter" && setSelectedDay(day)
                  : undefined
              }
            >
              {/* Day circle */}
              <span className={`cal-day-circle ${today ? "cal-day-circle--today" : ""}`}>
                {format(day, "d")}
              </span>

              {/* Weekday abbreviation */}
              <span className="cal-day-wd">
                {t(`calendar.weekday_${wdKey}`)}
              </span>

              {/* Habit emoji chips */}
              <div className="cal-day-chips">
                {!hasHabits ? (
                  <span className="cal-day-rest">—</span>
                ) : (
                  dueHabits.slice(0, 10).map((h) => {
                    const done = dayLogs.some(
                      (l) => l.habit_id === h.id && l.completed
                    );
                    return (
                      <span
                        key={h.id}
                        className={`cal-chip ${done ? "cal-chip--done" : "cal-chip--pending"}`}
                        style={done ? { background: h.color + "22" } : undefined}
                        title={h.name}
                      >
                        {h.icon}
                      </span>
                    );
                  })
                )}
              </div>

              {/* Completion fraction */}
              {hasHabits && (
                <span
                  className={`cal-day-frac ${allDone ? "cal-day-frac--done" : future ? "cal-day-frac--future" : completedCount === 0 ? "cal-day-frac--zero" : ""}`}
                >
                  {allDone ? "✓" : `${completedCount}/${dueHabits.length}`}
                </span>
              )}
            </div>
          );
        })}
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
