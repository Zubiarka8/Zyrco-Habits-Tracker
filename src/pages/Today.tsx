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
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { CheckCircle2, Circle, MessageSquare, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHabits } from "../hooks/useHabits";
import { useDateLogs, useCalendarLogs } from "../hooks/useLogs";
import { useCategories } from "../hooks/useCategories";
import { useStats } from "../hooks/useStats";
import { useReminders } from "../hooks/useReminders";
import { NoteModal } from "../components/NoteModal";
import { StreakBadge } from "../components/StreakBadge";
import { HabitCalendar, type CalendarView } from "../components/HabitCalendar";
import type { Habit } from "../types";

export function Today() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // ── Calendar state ───────────────────────────────────────
  const [calView, setCalView] = useState<CalendarView>("daily");
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // ── Data ─────────────────────────────────────────────────
  const { habits, loading: habitsLoading } = useHabits();
  const { logs, loading: logsLoading, toggle, saveNote } = useDateLogs(selectedDate);
  const { categories } = useCategories();
  const { getHabitStats } = useStats();

  // Range logs for month/week calendar grid
  const calRange = useMemo(() => {
    if (calView === "monthly") {
      return {
        start: format(startOfMonth(viewDate), "yyyy-MM-dd"),
        end: format(endOfMonth(viewDate), "yyyy-MM-dd"),
      };
    }
    return {
      start: format(startOfWeek(viewDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      end: format(endOfWeek(viewDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }, [calView, viewDate]);

  const { logs: rangeLogs } = useCalendarLogs(calRange.start, calRange.end);

  // Reminders always use today's logs — pass [] when viewing another date
  useReminders(habits, selectedDate === todayStr ? logs : []);

  // ── Note modal ───────────────────────────────────────────
  const [noteHabit, setNoteHabit] = useState<Habit | null>(null);

  // ── Due habits for selected date ─────────────────────────
  const selectedDateObj = parseISO(selectedDate + "T00:00:00");
  const dow = selectedDateObj.getDay();

  const dueHabits = habits.filter((h) => {
    if (h.archived) return false;
    if (h.frequency === "daily") return true;
    if (h.frequency === "weekly") return dow === 1;
    if (h.frequency === "custom" && h.target_days) {
      return h.target_days.includes(dow);
    }
    return false;
  });

  const getLog = useCallback(
    (habitId: string) => logs.find((l) => l.habit_id === habitId),
    [logs]
  );

  const done = dueHabits.filter((h) => getLog(h.id)?.completed).length;
  const total = dueHabits.length;

  // ── Calendar navigation ───────────────────────────────────
  const handleNavigate = useCallback(
    (dir: "prev" | "next") => {
      const sign = dir === "next" ? 1 : -1;
      if (calView === "monthly") {
        setViewDate((d) => addMonths(d, sign));
      } else if (calView === "weekly") {
        setViewDate((d) => addWeeks(d, sign));
      } else {
        // daily: move day by day
        const next = addDays(selectedDateObj, sign);
        const nextStr = format(next, "yyyy-MM-dd");
        setSelectedDate(nextStr);
        setViewDate(next);
      }
    },
    [calView, selectedDateObj]
  );

  const handleViewChange = useCallback(
    (v: CalendarView) => {
      setCalView(v);
      // Anchor viewDate to the selected date when switching views
      setViewDate(parseISO(selectedDate + "T00:00:00"));
    },
    [selectedDate]
  );

  const handleDateSelect = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    setViewDate(parseISO(dateStr + "T00:00:00"));
    setCalView("daily");
  }, []);

  // ── Loading guard ────────────────────────────────────────
  if (habitsLoading) {
    return <div className="page-loading">{t("common.loading")}</div>;
  }

  const isToday = selectedDate === todayStr;

  return (
    <div className="page">
      {/* Calendar: always visible regardless of view */}
      <HabitCalendar
        view={calView}
        viewDate={viewDate}
        selectedDate={selectedDate}
        today={todayStr}
        habits={habits}
        rangeLogs={rangeLogs}
        onViewChange={handleViewChange}
        onDateSelect={handleDateSelect}
        onNavigate={handleNavigate}
      />

      {/* Daily detail — only shown in daily view */}
      {calView === "daily" && (
        <>
          {/* Progress header */}
          {total > 0 && (
            <div className="cal-day-header">
              <div className="progress-pill">
                <div
                  className="progress-fill"
                  style={{ width: `${(done / total) * 100}%` }}
                />
                <span className="progress-label">
                  {t("today.progress", { done, total })}
                </span>
              </div>
            </div>
          )}

          {/* Empty / all-done states */}
          {dueHabits.length === 0 && !logsLoading && (
            <div className="empty-state">
              <p>{isToday ? t("today.noHabits") : t("today.noHabitsDate")}</p>
              {isToday && (
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/habits")}
                >
                  <Plus size={16} />
                  {t("today.addFirst")}
                </button>
              )}
            </div>
          )}

          {done === total && total > 0 && (
            <div className="all-done">
              <span className="all-done-icon">🎉</span>
              <p>{t("today.allDone")}</p>
            </div>
          )}

          {/* Habit list */}
          <div className="habit-list">
            {dueHabits.map((habit) => {
              const log = getLog(habit.id);
              const completed = log?.completed ?? false;
              const stats = getHabitStats(habit.id);
              const category = categories.find((c) => c.id === habit.category_id);

              return (
                <div
                  key={habit.id}
                  className={`habit-row ${completed ? "habit-row-done" : ""}`}
                  style={
                    { "--habit-color": habit.color } as React.CSSProperties
                  }
                >
                  <div className="habit-color-bar" />

                  <button
                    className={`check-btn ${
                      completed
                        ? habit.type === "bad"
                          ? "check-btn-avoided"
                          : "check-btn-done"
                        : ""
                    }`}
                    onClick={() => toggle(habit.id, completed)}
                    aria-label={
                      completed
                        ? "Uncheck"
                        : habit.type === "bad"
                        ? t("today.checkBad")
                        : t("today.checkGood")
                    }
                    title={
                      habit.type === "bad"
                        ? t("today.checkBad")
                        : t("today.checkGood")
                    }
                  >
                    {completed ? (
                      <CheckCircle2 size={26} />
                    ) : (
                      <Circle size={26} />
                    )}
                  </button>

                  <div className="habit-info">
                    <div className="habit-name-row">
                      <span className="habit-icon">{habit.icon}</span>
                      <span className="habit-name">{habit.name}</span>
                      {stats.streak > 0 && (
                        <StreakBadge streak={stats.streak} />
                      )}
                      {habit.type !== "normal" && (
                        <span className={`type-pill type-pill-${habit.type}`}>
                          {habit.type === "bad"
                            ? t("today.doneBad")
                            : t("today.doneGood")}
                        </span>
                      )}
                    </div>

                    {(habit.description || category) && (
                      <div className="habit-meta">
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
                        {habit.description && (
                          <span className="habit-desc">
                            {habit.description}
                          </span>
                        )}
                      </div>
                    )}

                    {log?.note && (
                      <p className="habit-note">"{log.note}"</p>
                    )}
                  </div>

                  <button
                    className={`icon-btn note-btn ${
                      log?.note ? "note-btn-filled" : ""
                    }`}
                    onClick={() => setNoteHabit(habit)}
                    aria-label={t("today.addNote")}
                  >
                    <MessageSquare size={16} />
                  </button>
                </div>
              );
            })}
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
        </>
      )}
    </div>
  );
}
