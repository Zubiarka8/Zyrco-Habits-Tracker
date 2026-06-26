import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { CheckCircle2, Circle, MessageSquare, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHabits } from "../hooks/useHabits";
import { useTodayLogs } from "../hooks/useLogs";
import { useCategories } from "../hooks/useCategories";
import { useStats } from "../hooks/useStats";
import { NoteModal } from "../components/NoteModal";
import { StreakBadge } from "../components/StreakBadge";
import type { Habit } from "../types";

export function Today() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { habits, loading: habitsLoading } = useHabits();
  const { logs, loading: logsLoading, toggle, saveNote } = useTodayLogs();
  const { categories } = useCategories();
  const { getHabitStats } = useStats();

  const [noteHabit, setNoteHabit] = useState<Habit | null>(null);

  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay();

  const dueHabits = habits.filter((h) => {
    if (h.frequency === "daily") return true;
    if (h.frequency === "weekly") return dayOfWeek === 1;
    if (h.frequency === "custom" && h.target_days) {
      return h.target_days.includes(dayOfWeek);
    }
    return false;
  });

  const getLog = useCallback(
    (habitId: string) => logs.find((l) => l.habit_id === habitId),
    [logs]
  );

  const done = dueHabits.filter((h) => getLog(h.id)?.completed).length;
  const total = dueHabits.length;

  const dateLabel = format(todayDate, "EEEE, MMMM d");

  if (habitsLoading || logsLoading) {
    return <div className="page-loading">{t("common.loading")}</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="page-date">{dateLabel}</p>
          <h1 className="page-title">{t("today.title")}</h1>
        </div>
        {total > 0 && (
          <div className="progress-pill">
            <div
              className="progress-fill"
              style={{ width: `${(done / total) * 100}%` }}
            />
            <span className="progress-label">
              {t("today.progress", { done, total })}
            </span>
          </div>
        )}
      </div>

      {dueHabits.length === 0 ? (
        <div className="empty-state">
          <p>{t("today.noHabits")}</p>
          <button className="btn btn-primary" onClick={() => navigate("/habits")}>
            <Plus size={16} />
            {t("today.addFirst")}
          </button>
        </div>
      ) : done === total && total > 0 ? (
        <div className="all-done">
          <span className="all-done-icon">🎉</span>
          <p>{t("today.allDone")}</p>
        </div>
      ) : null}

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
              style={{ "--habit-color": habit.color } as React.CSSProperties}
            >
              <div className="habit-color-bar" />

              <button
                className={`check-btn ${completed ? "check-btn-done" : ""}`}
                onClick={() => toggle(habit.id, completed)}
                aria-label={completed ? "Uncheck" : "Check"}
              >
                {completed ? <CheckCircle2 size={26} /> : <Circle size={26} />}
              </button>

              <div className="habit-info">
                <div className="habit-name-row">
                  <span className="habit-icon">{habit.icon}</span>
                  <span className="habit-name">{habit.name}</span>
                  {stats.streak > 0 && <StreakBadge streak={stats.streak} />}
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
                {log?.note && (
                  <p className="habit-note">"{log.note}"</p>
                )}
              </div>

              <button
                className={`icon-btn note-btn ${log?.note ? "note-btn-filled" : ""}`}
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
    </div>
  );
}
