import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import {
  format, startOfMonth, eachDayOfInterval, getDaysInMonth, subDays, parseISO,
} from "date-fns";
import { es as dateEs } from "date-fns/locale";
import { Flame, CheckCircle2, Award, TrendingUp, Percent, Star, CalendarDays, XCircle, X } from "lucide-react";
import { useStats } from "../hooks/useStats";
import { fetchMissesForRange, fetchSkipsForRange } from "../db/database";
import { useCategories } from "../hooks/useCategories";
import { isHabitDueOnDay } from "../utils/schedule";
import { StreakBadge } from "../components/StreakBadge";
import { AnnualHeatmap } from "../components/AnnualHeatmap";
import { useNavigate } from "react-router-dom";
import type { Habit, Log } from "../types";

type MissRow  = { habit_id: string; date: string };
type SkipRow  = { habit_id: string; date: string; type: string };

// ── Per-habit drill-down drawer ───────────────────────────────────────────────

interface HabitDrillDownProps {
  habit: Habit;
  periodDates: string[];
  logs: Log[];
  missRows: MissRow[];
  skipRows: SkipRow[];
  onClose: () => void;
}

function HabitDrillDown({ habit, periodDates, logs, missRows, skipRows, onClose }: HabitDrillDownProps) {
  const { i18n } = useTranslation();

  type DayStatus = "done" | "missed" | "skipped" | "excluded" | "pending" | "not-due";

  const days = useMemo(() => {
    return periodDates.map((dateStr) => {
      const day = parseISO(dateStr + "T00:00:00");
      const due = isHabitDueOnDay(habit, day);
      if (!due) return { dateStr, status: "not-due" as DayStatus };

      const log      = logs.find((l) => l.habit_id === habit.id && l.date === dateStr);
      const isMissed = missRows.some((r) => r.habit_id === habit.id && r.date === dateStr);
      const skipRow  = skipRows.find((r) => r.habit_id === habit.id && r.date === dateStr);

      let status: DayStatus;
      if (log?.completed)          status = "done";
      else if (skipRow?.type === "exclude") status = "excluded";
      else if (skipRow?.type === "skip")    status = "skipped";
      else if (isMissed)           status = "missed";
      else                         status = "pending";

      return { dateStr, status };
    }).filter((d) => d.status !== "not-due");
  }, [periodDates, logs, missRows, skipRows, habit]);

  const STATUS_CFG: Record<DayStatus, { label: string; cls: string; icon: string }> = {
    done:     { label: "Hecho",    cls: "state-pill--done",    icon: "✓" },
    missed:   { label: "No hecho", cls: "state-pill--missed",  icon: "✗" },
    skipped:  { label: "Saltado",  cls: "state-pill--skipped", icon: "↷" },
    excluded: { label: "Excluido", cls: "state-pill--skipped", icon: "—" },
    pending:  { label: "Pendiente",cls: "state-pill--pending", icon: "·" },
    "not-due":{ label: "",         cls: "",                    icon: "" },
  };

  const locale = i18n.language.startsWith("es") ? dateEs : undefined;

  return (
    <>
      <div className="cal-backdrop" onClick={onClose} />
      <div className="cal-drawer habit-drilldown-drawer" role="dialog" aria-modal="true">
        <div className="cal-drawer-handle" />
        <div className="cal-drawer-header">
          <div className="cal-drawer-title-group">
            <span className="cal-drawer-icon-lg">{habit.icon}</span>
            <span className="cal-drawer-date">{habit.name}</span>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="habit-drilldown-list">
          {days.length === 0 ? (
            <p className="text-muted" style={{ padding: "16px 0" }}>Sin datos en este período.</p>
          ) : (
            days.map(({ dateStr, status }) => {
              const cfg = STATUS_CFG[status];
              const dateObj = parseISO(dateStr + "T00:00:00");
              return (
                <div key={dateStr} className="habit-drilldown-row">
                  <span className="habit-drilldown-date">
                    {format(dateObj, "EEE d MMM yyyy", { locale })}
                  </span>
                  <span className={`state-pill ${cfg.cls}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

type Period = 7 | 30 | 90 | 365;

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 2) return null;
  const up = delta > 0;
  return (
    <span
      className={`stat-delta ${up ? "stat-delta--up" : "stat-delta--down"}`}
      title="vs. previous period"
    >
      {up ? "↑" : "↓"} {Math.abs(delta)}%
    </span>
  );
}

export function Stats() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>(30);
  const { habits, logs, loading, getHabitStats, getOverallStats } = useStats();
  // useStats fetches including archived (for streak history); filter them out for UI lists
  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const { categories } = useCategories();

  // ALL hooks must be above any conditional return (React rules)
  const periodDates = useMemo(() => {
    const now = new Date();
    return Array.from({ length: period }, (_, i) =>
      format(subDays(now, period - 1 - i), "yyyy-MM-dd")
    );
  }, [period]);

  const [missCountByHabit,  setMissCountByHabit]  = useState<Map<string, number>>(new Map());
  const [skipCountByHabit,  setSkipCountByHabit]  = useState<Map<string, number>>(new Map());
  const [doneCountByHabit,  setDoneCountByHabit]  = useState<Map<string, number>>(new Map());
  const [allMissRows, setAllMissRows] = useState<MissRow[]>([]);
  const [allSkipRows, setAllSkipRows] = useState<SkipRow[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  useEffect(() => {
    if (periodDates.length === 0) return;
    const start = periodDates[0];
    const end   = periodDates[periodDates.length - 1];

    Promise.all([
      fetchMissesForRange(start, end),
      fetchSkipsForRange(start, end),
    ]).then(([missRows, skipRows]) => {
      setAllMissRows(missRows);
      setAllSkipRows(skipRows);

      const misses = new Map<string, number>();
      missRows.forEach((r) => misses.set(r.habit_id, (misses.get(r.habit_id) ?? 0) + 1));
      setMissCountByHabit(misses);

      // Only type='skip' counts as saltado (type='exclude' means the day doesn't exist for the habit)
      const skips = new Map<string, number>();
      skipRows
        .filter((r) => r.type === "skip")
        .forEach((r) => skips.set(r.habit_id, (skips.get(r.habit_id) ?? 0) + 1));
      setSkipCountByHabit(skips);
    }).catch((err) => console.error("Stats range fetch failed:", err));
  }, [periodDates]);

  // Recompute done counts whenever logs or period changes
  useEffect(() => {
    if (periodDates.length === 0) return;
    const start = periodDates[0];
    const end   = periodDates[periodDates.length - 1];
    const done = new Map<string, number>();
    logs
      .filter((l) => l.completed && l.date >= start && l.date <= end)
      .forEach((l) => done.set(l.habit_id, (done.get(l.habit_id) ?? 0) + 1));
    setDoneCountByHabit(done);
  }, [logs, periodDates]);

  const rateChartData = useMemo(() => {
    if (activeHabits.length === 0) return [];
    const interval = period <= 30 ? 1 : period === 90 ? 7 : 30;
    const buckets: { date: string; rate: number | null; completions: number }[] = [];
    for (let i = 0; i < periodDates.length; i += interval) {
      const slice = periodDates.slice(i, i + interval);
      let due = 0, done = 0;
      slice.forEach((date) => {
        const day = parseISO(date + "T00:00:00");
        due += activeHabits.filter((h) => isHabitDueOnDay(h, day)).length;
        done += logs.filter((l) => l.date === date && l.completed).length;
      });
      buckets.push({
        date: format(parseISO(slice[0] + "T00:00:00"), period <= 30 ? "dd MMM" : "MMM yy"),
        rate: due > 0 ? Math.round((done / due) * 100) : null,
        completions: done,
      });
    }
    return buckets;
  }, [activeHabits, logs, period, periodDates]);

  const dowData = useMemo(() => {
    const dowNames: string[] = [0, 1, 2, 3, 4, 5, 6].map((d) => t(`common.days.${d}`));
    return [1, 2, 3, 4, 5, 6, 0].map((dow) => {
      const dowDates = periodDates.filter((d) => parseISO(d + "T00:00:00").getDay() === dow);
      let due = 0, done = 0;
      dowDates.forEach((date) => {
        const day = parseISO(date + "T00:00:00");
        due += activeHabits.filter((h) => isHabitDueOnDay(h, day)).length;
        done += logs.filter((l) => l.date === date && l.completed).length;
      });
      return { day: dowNames[dow], rate: due > 0 ? Math.round((done / due) * 100) : 0 };
    });
  }, [activeHabits, logs, periodDates, t]);

  const { perfectDays, activeDays } = useMemo(() => {
    let perfect = 0, active = 0;
    periodDates.forEach((date) => {
      const day = parseISO(date + "T00:00:00");
      const due = activeHabits.filter((h) => isHabitDueOnDay(h, day));
      if (logs.some((l) => l.date === date && l.completed)) active++;
      if (due.length > 0 && due.every((h) => logs.some((l) => l.habit_id === h.id && l.date === date && l.completed))) {
        perfect++;
      }
    });
    return { perfectDays: perfect, activeDays: active };
  }, [activeHabits, logs, periodDates]);

  if (loading) return <div className="page-loading">{t("common.loading")}</div>;

  const overall = getOverallStats(period);
  const hasDataInPeriod = overall.byDate.some((d) => d.completed > 0);

  const today      = new Date();
  const todayStr   = format(today, "yyyy-MM-dd");

  const chartData = overall.byDate.map((d) => ({
    date: format(parseISO(d.date + "T00:00:00"), "MM/dd"),
    completions: d.completed,
  }));

  const periodOptions: { value: Period; label: string }[] = [
    { value: 7,   label: t("stats.last7days") },
    { value: 30,  label: t("stats.last30days") },
    { value: 90,  label: t("stats.last90days") },
    { value: 365, label: t("stats.allTime") },
  ];

  // ── Monthly summary ──────────────────────────────────────
  const monthStart    = startOfMonth(today);
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const daysElapsed   = today.getDate();
  const daysRemaining = getDaysInMonth(today) - daysElapsed;
  const monthCompletions = logs.filter(
    (l) => l.date >= monthStartStr && l.date <= todayStr && l.completed
  ).length;
  let totalDueThisMonth = 0;
  eachDayOfInterval({ start: monthStart, end: today }).forEach((day) => {
    activeHabits.forEach((h) => { if (isHabitDueOnDay(h, day)) totalDueThisMonth++; });
  });
  const monthRate = totalDueThisMonth > 0
    ? Math.round((monthCompletions / totalDueThisMonth) * 100)
    : 0;

  // ── Avg completion rate + delta ──────────────────────────
  const avgCompletionRate = activeHabits.length > 0
    ? Math.round(
        activeHabits.reduce((sum, h) => sum + getHabitStats(h.id, period).completionRate, 0) /
        activeHabits.length
      )
    : 0;
  const prevEnd   = subDays(today, period);
  const prevStart = subDays(prevEnd, period - 1);
  const prevRange = eachDayOfInterval({ start: prevStart, end: prevEnd }).map((d) =>
    format(d, "yyyy-MM-dd")
  );
  const prevAvgCompletionRate = activeHabits.length > 0
    ? Math.round(
        activeHabits.reduce((sum, h) => {
          const completed = prevRange.filter((date) =>
            logs.some((l) => l.habit_id === h.id && l.date === date && l.completed)
          ).length;
          return sum + Math.round((completed / prevRange.length) * 100);
        }, 0) / activeHabits.length
      )
    : 0;
  const rateDelta = period < 365 ? avgCompletionRate - prevAvgCompletionRate : 0;

  // ── Category breakdown ───────────────────────────────────
  const categoryStats = categories
    .map((cat) => {
      const catHabits = activeHabits.filter((h) => h.category_id === cat.id);
      if (catHabits.length === 0) return null;
      const avgRate = Math.round(
        catHabits.reduce((sum, h) => sum + getHabitStats(h.id, period).completionRate, 0) /
        catHabits.length
      );
      return { cat, avgRate, habitCount: catHabits.length };
    })
    .filter(Boolean) as { cat: (typeof categories)[0]; avgRate: number; habitCount: number }[];
  const uncategorized = activeHabits.filter((h) => !h.category_id);
  const uncategorizedRate = uncategorized.length > 0
    ? Math.round(
        uncategorized.reduce((sum, h) => sum + getHabitStats(h.id, period).completionRate, 0) /
        uncategorized.length
      )
    : 0;

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
        <p className="period-date-range">
          {periodDates.length > 0
            ? `${format(parseISO(periodDates[0] + "T00:00:00"), "d MMM yyyy")} – ${format(parseISO(periodDates[periodDates.length - 1] + "T00:00:00"), "d MMM yyyy")}`
            : ""}
        </p>
      </div>

      {/* Monthly summary card */}
      <div className="monthly-summary-card">
        <div className="monthly-summary-title">
          {t("stats.thisMonth")} — {format(today, "MMMM yyyy")}
        </div>
        <div className="monthly-summary-stats">
          <div className="monthly-summary-stat">
            <span className="monthly-summary-value">{monthCompletions}</span>
            <span className="monthly-summary-label">{t("stats.completionsThisMonth")}</span>
          </div>
          <div className="monthly-summary-divider" />
          <div className="monthly-summary-stat">
            <span className="monthly-summary-value">{monthRate}%</span>
            <span className="monthly-summary-label">{t("stats.rateThisMonth")}</span>
          </div>
          <div className="monthly-summary-divider" />
          <div className="monthly-summary-stat">
            <span className="monthly-summary-value">{daysRemaining}</span>
            <span className="monthly-summary-label">{t("stats.daysLeft")}</span>
          </div>
        </div>
      </div>

      {/* Annual heatmap */}
      <AnnualHeatmap habits={activeHabits} logs={logs} />

      {/* No data banner — shown only when there are no logs at all */}
      {!hasDataInPeriod && logs.length === 0 && activeHabits.length > 0 && (
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

      {/* 6 summary cards */}
      <div className="stats-cards stats-cards--6">
        <div className="stat-card">
          <div className="stat-icon stat-icon-orange"><Flame size={20} /></div>
          <div>
            <p className="stat-label">{t("stats.streak")}</p>
            <p className="stat-value">
              {overall.currentStreak} <span className="stat-unit">{t("stats.days")}</span>
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-gold"><Award size={20} /></div>
          <div>
            <p className="stat-label">{t("stats.bestStreak")}</p>
            <p className="stat-value">
              {overall.bestStreak} <span className="stat-unit">{t("stats.days")}</span>
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><CheckCircle2 size={20} /></div>
          <div>
            <p className="stat-label">{t("stats.totalCompleted")}</p>
            <p className="stat-value">{overall.totalCompleted}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><Percent size={20} /></div>
          <div>
            <p className="stat-label">{t("stats.completionRate")}</p>
            <p className="stat-value">
              {avgCompletionRate}<span className="stat-unit">%</span>
              <DeltaBadge delta={rateDelta} />
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple"><Star size={20} /></div>
          <div>
            <p className="stat-label">{t("stats.perfectDays")}</p>
            <p className="stat-value">
              {perfectDays} <span className="stat-unit">{t("stats.days")}</span>
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-teal"><CalendarDays size={20} /></div>
          <div>
            <p className="stat-label">{t("stats.activeDays")}</p>
            <p className="stat-value">
              {activeDays} <span className="stat-unit">{t("stats.days")}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Charts — 2-col grid on wide screens via .stats-charts-grid */}
      <div className="stats-charts-grid">
        {/* Completion rate trend */}
        <div className="chart-section">
          <h2 className="section-title">{t("stats.rateOverTime")}</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={rateChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted)" }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v ?? 0}%`, t("stats.completionRate")]}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#rateGrad)"
                  dot={false}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily completions */}
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
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="completions" name={t("stats.completions")} fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Day-of-week distribution */}
        <div className="chart-section">
          <h2 className="section-title">{t("stats.byDayOfWeek")}</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dowData} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--color-muted)" }} tickFormatter={(v) => `${v}%`} tickLine={false} />
                <YAxis type="category" dataKey="day" tick={{ fontSize: 12, fill: "var(--color-text)" }} tickLine={false} width={32} />
                <Tooltip
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v ?? 0}%`, t("stats.completionRate")]}
                />
                <Bar dataKey="rate" name={t("stats.completionRate")} fill="var(--color-accent, var(--color-primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Per-habit breakdown */}
      <div className="per-habit-section">
        <h2 className="section-title">{t("stats.perHabit")}</h2>
        {activeHabits.length === 0 ? (
          <p className="text-muted text-sm">{t("stats.noHabitsYet")}</p>
        ) : (
          <div className="per-habit-list">
            {/* Totals row */}
            {(() => {
              const totalDone    = Array.from(doneCountByHabit.values()).reduce((s, n) => s + n, 0);
              const totalMissed  = Array.from(missCountByHabit.values()).reduce((s, n) => s + n, 0);
              const totalSkipped = Array.from(skipCountByHabit.values()).reduce((s, n) => s + n, 0);
              return (
                <div className="per-habit-row per-habit-row--totals">
                  <div className="per-habit-info">
                    <span className="habit-name" style={{ fontWeight: 700 }}>{t("stats.total")}</span>
                  </div>
                  <div className="habit-state-pills">
                    <span className="state-pill state-pill--done">✓ {totalDone}</span>
                    <span className="state-pill state-pill--missed">✗ {totalMissed}</span>
                    <span className="state-pill state-pill--skipped">↷ {totalSkipped}</span>
                  </div>
                </div>
              );
            })()}

            {activeHabits.map((habit) => {
              const stats   = getHabitStats(habit.id, period);
              const done    = doneCountByHabit.get(habit.id)  ?? 0;
              const missed  = missCountByHabit.get(habit.id)  ?? 0;
              const skipped = skipCountByHabit.get(habit.id)  ?? 0;
              return (
                <div
                  key={habit.id}
                  className="per-habit-row per-habit-row--clickable"
                  onClick={() => setSelectedHabit(habit)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedHabit(habit)}
                >
                  <div className="habit-card-icon" style={{ background: habit.color + "22" }}>
                    <span style={{ fontSize: 18 }}>{habit.icon}</span>
                  </div>
                  <div className="per-habit-info">
                    <span className="habit-name">{habit.name}</span>
                    <div className="per-habit-bar-wrap">
                      <div className="per-habit-bar-bg">
                        <div
                          className="per-habit-bar-fill"
                          style={{ width: `${stats.completionRate}%`, background: habit.color }}
                        />
                      </div>
                      <span className="per-habit-rate">{stats.completionRate}%</span>
                    </div>
                  </div>
                  <div className="habit-state-pills">
                    <span className="state-pill state-pill--done"  title={t("stats.stateDone")}>✓ {done}</span>
                    <span className="state-pill state-pill--missed" title={t("stats.stateMissed")}>✗ {missed}</span>
                    <span className="state-pill state-pill--skipped" title={t("stats.stateSkipped")}>↷ {skipped}</span>
                  </div>
                  <StreakBadge streak={stats.streak} graceDayActive={stats.graceDayActive} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category breakdown */}
      {(categoryStats.length > 0 || uncategorized.length > 0) && (
        <div className="per-habit-section">
          <h2 className="section-title">
            <TrendingUp size={16} style={{ display: "inline", marginRight: 6 }} />
            {t("stats.byCategory")}
          </h2>
          <div className="per-habit-list">
            {categoryStats.map(({ cat, avgRate, habitCount }) => (
              <div key={cat.id} className="per-habit-row">
                <div className="habit-card-icon" style={{ background: cat.color + "22" }}>
                  <span style={{ fontSize: 18 }}>{cat.icon}</span>
                </div>
                <div className="per-habit-info">
                  <div className="category-row-header">
                    <span className="habit-name">{cat.name}</span>
                    <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                      {t("stats.habitCount", { count: habitCount })}
                    </span>
                  </div>
                  <div className="per-habit-bar-wrap">
                    <div className="per-habit-bar-bg">
                      <div className="per-habit-bar-fill" style={{ width: `${avgRate}%`, background: cat.color }} />
                    </div>
                    <span className="per-habit-rate">{avgRate}%</span>
                  </div>
                </div>
              </div>
            ))}
            {uncategorized.length > 0 && (
              <div className="per-habit-row">
                <div className="habit-card-icon" style={{ background: "var(--color-border)" }}>
                  <span style={{ fontSize: 18 }}>📁</span>
                </div>
                <div className="per-habit-info">
                  <div className="category-row-header">
                    <span className="habit-name">{t("habits.noCategory")}</span>
                    <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                      {t("stats.habitCount", { count: uncategorized.length })}
                    </span>
                  </div>
                  <div className="per-habit-bar-wrap">
                    <div className="per-habit-bar-bg">
                      <div className="per-habit-bar-fill" style={{ width: `${uncategorizedRate}%`, background: "var(--color-muted)" }} />
                    </div>
                    <span className="per-habit-rate">{uncategorizedRate}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Missed habits section */}
      {missCountByHabit.size > 0 && (
        <div className="per-habit-section">
          <h2 className="section-title">
            <XCircle size={16} style={{ display: "inline", marginRight: 6, color: "var(--color-danger, #ef4444)" }} />
            {t("stats.missedHabits")}
          </h2>
          <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: 10 }}>
            {t("stats.missedHabitsDesc")}
          </p>
          <div className="per-habit-list">
            {activeHabits
              .filter((h) => (missCountByHabit.get(h.id) ?? 0) > 0)
              .sort((a, b) => (missCountByHabit.get(b.id) ?? 0) - (missCountByHabit.get(a.id) ?? 0))
              .map((h) => {
                const count = missCountByHabit.get(h.id) ?? 0;
                return (
                  <div key={h.id} className="per-habit-row">
                    <div className="habit-card-icon" style={{ background: h.color + "22" }}>
                      <span style={{ fontSize: 18 }}>{h.icon}</span>
                    </div>
                    <div className="per-habit-info">
                      <span className="habit-name">{h.name}</span>
                      <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                        {t("stats.missedTimes", { count })}
                      </span>
                    </div>
                    <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-danger, #ef4444)" }}>
                      {count}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Navigate to habits if none created yet */}
      {activeHabits.length === 0 && (
        <div className="stats-no-data-banner" style={{ marginTop: 16 }}>
          <span className="stats-no-data-icon">✨</span>
          <div>
            <p className="stats-no-data-title">{t("stats.noHabits")}</p>
            <p className="text-muted text-sm">{t("stats.noHabitsDesc")}</p>
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => navigate("/habits")}>
              {t("stats.goToHabits")}
            </button>
          </div>
        </div>
      )}

      {/* Habit drill-down drawer */}
      {selectedHabit && (
        <HabitDrillDown
          habit={selectedHabit}
          periodDates={periodDates}
          logs={logs}
          missRows={allMissRows}
          skipRows={allSkipRows}
          onClose={() => setSelectedHabit(null)}
        />
      )}
    </div>
  );
}
