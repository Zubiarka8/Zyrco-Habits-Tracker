import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, endOfWeek, subWeeks, eachDayOfInterval } from "date-fns";
import { X } from "lucide-react";
import type { Habit, Log } from "../types";
import { isHabitDueOnDay } from "../utils/schedule";

interface WeeklyDigestProps {
  habits: Habit[];
  logs: Log[];
  onClose: () => void;
}

function getWeekRate(habits: Habit[], logs: Log[], weekStart: Date, weekEnd: Date): number {
  if (habits.length === 0) return 0;
  let totalDue = 0;
  let totalDone = 0;
  eachDayOfInterval({ start: weekStart, end: weekEnd }).forEach((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    habits.forEach((h) => {
      if (!isHabitDueOnDay(h, day)) return;
      totalDue++;
      if (logs.some((l) => l.habit_id === h.id && l.date === dateStr && l.completed)) {
        totalDone++;
      }
    });
  });
  return totalDue > 0 ? Math.round((totalDone / totalDue) * 100) : 0;
}

function getHabitWeekRate(habit: Habit, logs: Log[], weekStart: Date, weekEnd: Date): number {
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const due = days.filter((d) => isHabitDueOnDay(habit, d));
  if (due.length === 0) return -1;
  const done = due.filter((d) =>
    logs.some((l) => l.habit_id === habit.id && l.date === format(d, "yyyy-MM-dd") && l.completed)
  ).length;
  return Math.round((done / due.length) * 100);
}

export function WeeklyDigest({ habits, logs, onClose }: WeeklyDigestProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { thisWeekStart, thisWeekEnd, prevWeekStart, prevWeekEnd, dateRange } = useMemo(() => {
    const now = new Date();
    const opts = { weekStartsOn: 1 as const };
    const thisWeekStart = startOfWeek(subWeeks(now, 1), opts);
    const thisWeekEnd = endOfWeek(subWeeks(now, 1), opts);
    const prevWeekStart = startOfWeek(subWeeks(now, 2), opts);
    const prevWeekEnd = endOfWeek(subWeeks(now, 2), opts);
    const dateRange = `${format(thisWeekStart, "MMM d")} – ${format(thisWeekEnd, "MMM d")}`;
    return { thisWeekStart, thisWeekEnd, prevWeekStart, prevWeekEnd, dateRange };
  }, []);

  const thisRate = useMemo(
    () => getWeekRate(habits, logs, thisWeekStart, thisWeekEnd),
    [habits, logs, thisWeekStart, thisWeekEnd]
  );

  const prevRate = useMemo(
    () => getWeekRate(habits, logs, prevWeekStart, prevWeekEnd),
    [habits, logs, prevWeekStart, prevWeekEnd]
  );

  const delta = thisRate - prevRate;

  const habitRates = useMemo(
    () =>
      habits
        .map((h) => ({ habit: h, rate: getHabitWeekRate(h, logs, thisWeekStart, thisWeekEnd) }))
        .filter((x) => x.rate >= 0)
        .sort((a, b) => b.rate - a.rate),
    [habits, logs, thisWeekStart, thisWeekEnd]
  );

  const bestHabit = habitRates[0] ?? null;
  const worstHabit = habitRates[habitRates.length - 1] ?? null;

  const message =
    thisRate >= 80
      ? t("digest.msgExcellent")
      : thisRate >= 60
      ? t("digest.msgGood")
      : thisRate >= 40
      ? t("digest.msgOk")
      : t("digest.msgPoor");

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm weekly-digest">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{t("digest.title")}</h2>
            <span className="digest-date-range">{dateRange}</span>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body digest-body">
          {/* Completion rate */}
          <div className="digest-rate-row">
            <span className="digest-rate-value">{thisRate}%</span>
            <span className="digest-rate-label">{t("digest.completionRate", { rate: thisRate })}</span>
            {Math.abs(delta) >= 2 && (
              <span className={`digest-delta ${delta > 0 ? "digest-delta--up" : "digest-delta--down"}`}>
                {delta > 0 ? "↑" : "↓"} {Math.abs(delta)}% {t("digest.vsLastWeek")}
              </span>
            )}
          </div>

          {/* Best habit */}
          {bestHabit && bestHabit.rate > 0 && (
            <div className="digest-habit-row">
              <span className="digest-habit-label">{t("digest.bestHabit")}</span>
              <span className="digest-habit-name">
                {bestHabit.habit.icon} {bestHabit.habit.name}
              </span>
              <span className="digest-habit-rate digest-habit-rate--good">{bestHabit.rate}%</span>
            </div>
          )}

          {/* Worst habit — only show if different from best and rate is low enough to warrant attention */}
          {worstHabit && worstHabit !== bestHabit && worstHabit.rate < 80 && (
            <div className="digest-habit-row">
              <span className="digest-habit-label">{t("digest.needsAttention")}</span>
              <span className="digest-habit-name">
                {worstHabit.habit.icon} {worstHabit.habit.name}
              </span>
              <span className="digest-habit-rate digest-habit-rate--warn">{worstHabit.rate}%</span>
            </div>
          )}

          {/* Motivational message */}
          <p className="digest-message">{message}</p>

          <div className="digest-actions">
            <button
              className="btn btn-primary"
              onClick={() => { navigate("/stats"); onClose(); }}
            >
              {t("digest.viewStats")}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              {t("digest.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
