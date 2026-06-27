import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, subDays, parseISO } from "date-fns";
import type { Habit, Log } from "../types";
import { isHabitDueOnDay } from "../utils/schedule";

interface AnnualHeatmapProps {
  habits: Habit[];
  logs: Log[];
  /** When provided, shows data only for this single habit */
  habitId?: string;
}

type DayCell = {
  date: string;
  rate: number;
  completed: number;
  due: number;
};

function getRateColor(rate: number): string {
  if (rate < 0) return "var(--color-surface-alt)";
  if (rate === 0) return "var(--color-border)";
  if (rate < 0.25) return "#c7d2fe";
  if (rate < 0.5) return "#818cf8";
  if (rate < 0.75) return "#6366f1";
  return "#4338ca";
}

export function AnnualHeatmap({ habits, logs, habitId }: AnnualHeatmapProps) {
  const { t } = useTranslation();

  const cells = useMemo<DayCell[]>(() => {
    const targetHabits = habitId ? habits.filter((h) => h.id === habitId) : habits;

    const logIndex = new Map<string, Set<string>>();
    for (const l of logs) {
      if (!l.completed) continue;
      if (habitId && l.habit_id !== habitId) continue;
      if (!logIndex.has(l.date)) logIndex.set(l.date, new Set());
      logIndex.get(l.date)!.add(l.habit_id);
    }

    const today = new Date();
    const result: DayCell[] = [];
    for (let i = 364; i >= 0; i--) {
      const dayObj = subDays(today, i);
      const date = format(dayObj, "yyyy-MM-dd");
      const due = targetHabits.filter((h) => isHabitDueOnDay(h, dayObj)).length;
      const completedSet = logIndex.get(date);
      const completed =
        due > 0
          ? targetHabits.filter((h) => isHabitDueOnDay(h, dayObj) && completedSet?.has(h.id)).length
          : 0;
      const rate = due > 0 ? completed / due : -1;
      result.push({ date, rate, completed, due });
    }
    return result;
  }, [habits, logs, habitId]);

  // Group cells into week columns (Sunday = col start)
  const weeks = useMemo(() => {
    const firstCell = cells[0];
    const firstDow = parseISO(firstCell.date).getDay();
    const padded: (DayCell | null)[] = [
      ...Array(firstDow).fill(null),
      ...cells,
    ];
    const result: (DayCell | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      result.push(padded.slice(i, i + 7));
    }
    return result;
  }, [cells]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, colIdx) => {
      const firstReal = week.find((c) => c !== null);
      if (!firstReal) return;
      const m = parseISO(firstReal.date).getMonth();
      if (m !== lastMonth) {
        labels.push({ label: t(`common.months.${m}`), col: colIdx });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks, t]);

  const perfectDays = cells.filter((c) => c.rate === 1).length;
  const activeDays  = cells.filter((c) => c.rate > 0).length;

  return (
    <div className="annual-heatmap">
      <div className="annual-heatmap-header">
        <span className="section-title">{t("stats.yearOverview")}</span>
        <div className="annual-heatmap-summary">
          <span className="annual-stat">
            <strong>{activeDays}</strong> {t("stats.activeDays")}
          </span>
          <span className="annual-stat">
            <strong>{perfectDays}</strong> {t("stats.perfectDays")}
          </span>
        </div>
      </div>

      <div className="heatmap-scroll">
        <div
          className="heatmap-grid"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, 14px)` }}
        >
          {/* Month labels row */}
          {weeks.map((_, i) => {
            const label = monthLabels.find((l) => l.col === i);
            return (
              <div key={`mlabel-${i}`} className="heatmap-month-label">
                {label ? label.label : ""}
              </div>
            );
          })}

          {/* Day cells — 7 rows × N cols */}
          {[0, 1, 2, 3, 4, 5, 6].map((dow) =>
            weeks.map((week, colIdx) => {
              const cell = week[dow] ?? null;
              return (
                <div
                  key={`${dow}-${colIdx}`}
                  className="heatmap-cell"
                  style={{ background: cell ? getRateColor(cell.rate) : "transparent" }}
                  title={
                    cell
                      ? cell.due === 0
                        ? cell.date
                        : `${cell.date}: ${cell.completed}/${cell.due} habits`
                      : undefined
                  }
                />
              );
            })
          )}
        </div>
      </div>

      <div className="heatmap-legend">
        <span className="heatmap-legend-label">{t("stats.less")}</span>
        {[-1, 0, 0.24, 0.5, 0.75, 1].map((v, i) => (
          <div
            key={i}
            className="heatmap-cell heatmap-cell--legend"
            style={{ background: getRateColor(v) }}
          />
        ))}
        <span className="heatmap-legend-label">{t("stats.more")}</span>
      </div>
    </div>
  );
}
