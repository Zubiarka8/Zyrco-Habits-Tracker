import { useState, useEffect, useCallback } from "react";
import { format, subDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle, X } from "lucide-react";
import { fetchLogsForHabit, upsertLog } from "../db/database";
import type { Habit } from "../types";

interface RetroLogModalProps {
  habit: Habit;
  onClose: () => void;
}

/** Shows last 30 days as a toggleable grid for retroactive logging. */
export function RetroLogModal({ habit, onClose }: RetroLogModalProps) {
  const { t } = useTranslation();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const days = Array.from({ length: 30 }, (_, i) =>
    format(subDays(new Date(), 29 - i), "yyyy-MM-dd")
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const logs = await fetchLogsForHabit(habit.id, startDate, today);
      setCompleted(new Set(logs.filter((l) => l.completed).map((l) => l.date)));
    } catch (err) {
      console.error("RetroLogModal load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [habit.id, startDate, today]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (date: string) => {
    if (saving) return;
    setSaving(date);
    try {
      const wasCompleted = completed.has(date);
      await upsertLog(habit.id, date, !wasCompleted, null, null);
      setCompleted((prev) => {
        const next = new Set(prev);
        if (wasCompleted) next.delete(date);
        else next.add(date);
        return next;
      });
      window.dispatchEvent(new CustomEvent("zyrco:log-changed"));
    } catch (err) {
      console.error(`RetroLogModal toggle failed for ${date}:`, err);
    } finally {
      setSaving(null);
    }
  };

  const dayLabel = (date: string) => {
    const d = new Date(date + "T00:00:00");
    return { day: d.getDate(), dow: t(`common.days.${d.getDay()}`) };
  };

  return (
    <div className="retro-overlay" onClick={onClose}>
      <div className="retro-panel" onClick={(e) => e.stopPropagation()}>
        <div className="retro-header">
          <span className="retro-title">
            {habit.icon} {habit.name}
          </span>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <p className="retro-subtitle">{t("habits.retroDesc")}</p>

        {loading ? (
          <p className="text-muted" style={{ textAlign: "center", padding: "1rem" }}>
            {t("common.loading")}
          </p>
        ) : (
          <div className="retro-grid">
            {days.map((date) => {
              const { day, dow } = dayLabel(date);
              const done = completed.has(date);
              const isToday = date === today;
              const isSaving = saving === date;
              return (
                <button
                  key={date}
                  className={`retro-cell ${done ? "retro-cell--done" : ""} ${isToday ? "retro-cell--today" : ""}`}
                  onClick={() => toggle(date)}
                  disabled={isSaving}
                  title={date}
                >
                  <span className="retro-cell-dow">{dow}</span>
                  <span className="retro-cell-day">{day}</span>
                  {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                </button>
              );
            })}
          </div>
        )}

        <div className="retro-footer">
          <button className="btn btn-primary" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
