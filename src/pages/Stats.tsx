import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { Flame, CheckCircle2, Award, BarChart2 } from "lucide-react";
import { useStats } from "../hooks/useStats";
import { StreakBadge } from "../components/StreakBadge";
import { useNavigate } from "react-router-dom";

type Period = 7 | 30 | 90;

export function Stats() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>(30);
  const { habits, logs, loading, getHabitStats, getOverallStats } = useStats();

  if (loading) return <div className="page-loading">{t("common.loading")}</div>;

  // No habits at all
  if (habits.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">{t("stats.title")}</h1>
        </div>
        <div className="empty-state">
          <BarChart2 size={48} className="empty-state-icon" />
          <p>{t("stats.noHabits")}</p>
          <p className="text-muted">{t("stats.noHabitsDesc")}</p>
          <button className="btn btn-primary" onClick={() => navigate("/habits")}>
            {t("stats.goToHabits")}
          </button>
        </div>
      </div>
    );
  }

  const overall = getOverallStats(period);
  const hasDataInPeriod = overall.byDate.some((d) => d.completed > 0);

  const chartData = overall.byDate.map((d) => ({
    date: format(new Date(d.date + "T00:00:00"), "MM/dd"),
    completions: d.completed,
  }));

  const periodOptions: { value: Period; label: string }[] = [
    { value: 7, label: t("stats.last7days") },
    { value: 30, label: t("stats.last30days") },
    { value: 90, label: t("stats.last90days") },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t("stats.title")}</h1>
        <div className="period-selector">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`period-btn ${period === opt.value ? "period-btn-active" : ""}`}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* No data in selected period — gentle prompt, not an error */}
      {!hasDataInPeriod && logs.length === 0 && (
        <div className="stats-no-data-banner">
          <span className="stats-no-data-icon">📊</span>
          <div>
            <p className="stats-no-data-title">{t("stats.noData")}</p>
            <p className="text-muted text-sm">{t("stats.noDataDesc")}</p>
          </div>
        </div>
      )}

      {!hasDataInPeriod && logs.length > 0 && (
        <div className="stats-no-data-banner">
          <span className="stats-no-data-icon">📅</span>
          <div>
            <p className="stats-no-data-title">{t("stats.noDataPeriod")}</p>
            <p className="text-muted text-sm">{t("stats.noDataPeriodDesc")}</p>
          </div>
        </div>
      )}

      {/* Summary cards — always show when habits exist */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">
            <Flame size={20} />
          </div>
          <div>
            <p className="stat-label">{t("stats.streak")}</p>
            <p className="stat-value">
              {overall.currentStreak}{" "}
              <span className="stat-unit">{t("stats.days")}</span>
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-gold">
            <Award size={20} />
          </div>
          <div>
            <p className="stat-label">{t("stats.bestStreak")}</p>
            <p className="stat-value">
              {overall.bestStreak}{" "}
              <span className="stat-unit">{t("stats.days")}</span>
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="stat-label">{t("stats.totalCompleted")}</p>
            <p className="stat-value">{overall.totalCompleted}</p>
          </div>
        </div>
      </div>

      {/* Activity chart — only render when there's data to show */}
      {hasDataInPeriod && (
        <div className="chart-section">
          <h2 className="section-title">{t("stats.activity")}</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                  tickLine={false}
                  interval={period === 7 ? 0 : period === 30 ? 4 : 14}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="completions"
                  name={t("stats.completions")}
                  fill="var(--color-primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-habit breakdown */}
      <div className="per-habit-section">
        <h2 className="section-title">{t("stats.perHabit")}</h2>
        <div className="per-habit-list">
          {habits.map((habit) => {
            const stats = getHabitStats(habit.id, period);
            return (
              <div key={habit.id} className="per-habit-row">
                <div
                  className="habit-card-icon"
                  style={{ background: habit.color + "22" }}
                >
                  <span style={{ fontSize: 18 }}>{habit.icon}</span>
                </div>
                <div className="per-habit-info">
                  <span className="habit-name">{habit.name}</span>
                  <div className="per-habit-bar-wrap">
                    <div className="per-habit-bar-bg">
                      <div
                        className="per-habit-bar-fill"
                        style={{
                          width: `${stats.completionRate}%`,
                          background: habit.color,
                        }}
                      />
                    </div>
                    <span className="per-habit-rate">{stats.completionRate}%</span>
                  </div>
                </div>
                <StreakBadge streak={stats.streak} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
