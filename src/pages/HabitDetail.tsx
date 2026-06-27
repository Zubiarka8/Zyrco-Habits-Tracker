import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format, eachDayOfInterval, subDays } from "date-fns";
import { ArrowLeft, Edit2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useStats } from "../hooks/useStats";
import { AnnualHeatmap } from "../components/AnnualHeatmap";
import { StreakBadge } from "../components/StreakBadge";
import { isHabitDueOnDay } from "../utils/schedule";

export function HabitDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { habits, logs, loading, getHabitStats } = useStats();

  const habit = useMemo(() => habits.find((h) => h.id === id) ?? null, [habits, id]);

  const stats = useMemo(
    () => (habit ? getHabitStats(habit.id, 365) : null),
    [habit, getHabitStats]
  );

  // Day-of-week breakdown (0 = Sun, 1 = Mon … 6 = Sat)
  const dowData = useMemo(() => {
    if (!habit) return [];
    const days = eachDayOfInterval({ start: subDays(new Date(), 364), end: new Date() });
    const counts: { due: number; done: number }[] = Array.from({ length: 7 }, () => ({ due: 0, done: 0 }));
    const habitLogs = logs.filter((l) => l.habit_id === habit.id);

    days.forEach((day) => {
      if (!isHabitDueOnDay(habit, day)) return;
      const dow = day.getDay();
      counts[dow].due++;
      const dateStr = format(day, "yyyy-MM-dd");
      if (habitLogs.some((l) => l.date === dateStr && l.completed)) {
        counts[dow].done++;
      }
    });

    const dayNames = [t("common.days.0"), t("common.days.1"), t("common.days.2"), t("common.days.3"), t("common.days.4"), t("common.days.5"), t("common.days.6")];
    return counts.map((c, i) => ({
      day: dayNames[i],
      rate: c.due > 0 ? Math.round((c.done / c.due) * 100) : 0,
      due: c.due,
    })).filter((d) => d.due > 0);
  }, [habit, logs, t]);

  // Recent notes (last 5 logs with notes)
  const recentNotes = useMemo(() => {
    if (!habit) return [];
    return logs
      .filter((l) => l.habit_id === habit.id && l.note)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [habit, logs]);

  if (loading) return <div className="page-loading">{t("common.loading")}</div>;

  if (!habit || !stats) {
    return (
      <div className="page">
        <button className="btn btn-ghost" onClick={() => navigate("/habits")}>
          <ArrowLeft size={16} /> {t("habitDetail.back")}
        </button>
        <div className="empty-state">
          <span className="empty-state-emoji">🔍</span>
          <p>Habit not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/habits")}>
          <ArrowLeft size={16} /> {t("habitDetail.back")}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate("/habits", { state: { editHabitId: habit.id } })}
        >
          <Edit2 size={14} /> {t("habitDetail.edit")}
        </button>
      </div>

      {/* Habit identity */}
      <div className="habit-detail-hero" style={{ "--habit-color": habit.color } as React.CSSProperties}>
        <div className="habit-detail-icon" style={{ background: habit.color + "22" }}>
          <span>{habit.icon}</span>
        </div>
        <div className="habit-detail-meta">
          <h1 className="habit-detail-name">{habit.name}</h1>
          {habit.description && <p className="habit-desc">{habit.description}</p>}
        </div>
        <StreakBadge streak={stats.streak} graceDayActive={stats.graceDayActive} />
      </div>

      {/* Key metrics */}
      <div className="stats-cards">
        <div className="stat-card">
          <div>
            <p className="stat-label">{t("habitDetail.currentStreak")}</p>
            <p className="stat-value">
              {stats.streak} <span className="stat-unit">{t("stats.days")}</span>
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">{t("habitDetail.bestStreak")}</p>
            <p className="stat-value">
              {stats.bestStreak} <span className="stat-unit">{t("stats.days")}</span>
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">{t("habitDetail.totalCompleted")}</p>
            <p className="stat-value">{stats.totalCompleted}</p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">{t("stats.completionRate")}</p>
            <p className="stat-value">
              {stats.completionRate}<span className="stat-unit">%</span>
            </p>
          </div>
        </div>
      </div>

      {/* Annual heatmap filtered to this habit */}
      <AnnualHeatmap habits={habits} logs={logs} habitId={habit.id} />

      {/* Day-of-week chart */}
      {dowData.length > 0 && (
        <div className="chart-section">
          <h2 className="section-title">{t("habitDetail.byDayOfWeek")}</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dowData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(val) => [`${Number(val) || 0}%`, "Rate"]}
                />
                <Bar dataKey="rate" fill={habit.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent notes */}
      <div className="per-habit-section">
        <h2 className="section-title">{t("habitDetail.recentNotes")}</h2>
        {recentNotes.length === 0 ? (
          <p className="text-muted">{t("habitDetail.noNotes")}</p>
        ) : (
          <div className="detail-notes-list">
            {recentNotes.map((log) => (
              <div key={log.id} className="detail-note-row">
                <span className="detail-note-date">{log.date}</span>
                <span className="detail-note-text">"{log.note}"</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
