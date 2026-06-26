import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Habit, Category } from "../types";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4",
];

const ICONS = [
  "⭐", "🏃", "💪", "🧘", "📚", "✍️", "🎯", "💧",
  "🥗", "😴", "🎵", "🎨", "💻", "🌿", "❤️", "🔥",
  "🧠", "📝", "🏋️", "🚴", "🤸", "🧹", "💊", "🌅",
];

interface HabitFormProps {
  initial?: Partial<Habit>;
  categories: Category[];
  onSave: (data: Omit<Habit, "id" | "created_at" | "archived">) => void;
  onCancel: () => void;
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export function HabitForm({ initial, categories, onSave, onCancel }: HabitFormProps) {
  const { t } = useTranslation();

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [habitType, setHabitType] = useState<Habit["type"]>(initial?.type ?? "normal");
  const [frequency, setFrequency] = useState<Habit["frequency"]>(
    initial?.frequency ?? "daily"
  );
  const [targetDays, setTargetDays] = useState<number[]>(
    initial?.target_days ?? [1, 2, 3, 4, 5]
  );
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [icon, setIcon] = useState(initial?.icon ?? "⭐");
  const [reminderEnabled, setReminderEnabled] = useState(
    initial?.reminder_enabled ?? false
  );
  const [reminderTime, setReminderTime] = useState(initial?.reminder_time ?? "08:00");

  const toggleDay = (day: number) => {
    setTargetDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      category_id: categoryId || null,
      frequency,
      target_days: frequency === "custom" ? targetDays : null,
      color,
      icon,
      type: habitType,
      reminder_enabled: reminderEnabled,
      reminder_time: reminderEnabled ? reminderTime : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="habit-form">
      <div className="form-field">
        <label className="field-label">{t("habits.type")}</label>
        <div className="type-toggle">
          <button
            type="button"
            className={`type-btn type-btn-good ${habitType === "good" ? "type-btn-active-good" : ""}`}
            onClick={() => setHabitType("good")}
          >
            <span>💚</span>
            <div>
              <div className="type-btn-title">{t("habits.typeGood")}</div>
              <div className="type-btn-desc">{t("habits.typeGoodDesc")}</div>
            </div>
          </button>
          <button
            type="button"
            className={`type-btn type-btn-normal ${habitType === "normal" ? "type-btn-active-normal" : ""}`}
            onClick={() => setHabitType("normal")}
          >
            <span>⚪</span>
            <div>
              <div className="type-btn-title">{t("habits.typeNormal")}</div>
              <div className="type-btn-desc">{t("habits.typeNormalDesc")}</div>
            </div>
          </button>
          <button
            type="button"
            className={`type-btn type-btn-bad ${habitType === "bad" ? "type-btn-active-bad" : ""}`}
            onClick={() => setHabitType("bad")}
          >
            <span>🚫</span>
            <div>
              <div className="type-btn-title">{t("habits.typeBad")}</div>
              <div className="type-btn-desc">{t("habits.typeBadDesc")}</div>
            </div>
          </button>
        </div>
      </div>

      <div className="form-row">
        <div className="icon-picker-preview" style={{ background: color }}>
          {icon}
        </div>
        <div className="form-field flex-1">
          <label className="field-label">{t("habits.name")}</label>
          <input
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("habits.namePlaceholder")}
            required
            autoFocus
          />
        </div>
      </div>

      <div className="form-field">
        <label className="field-label">{t("habits.description")}</label>
        <input
          className="input"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("habits.descriptionPlaceholder")}
        />
      </div>

      <div className="form-row">
        <div className="form-field flex-1">
          <label className="field-label">{t("habits.category")}</label>
          <select
            className="select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">{t("habits.noCategory")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field flex-1">
          <label className="field-label">{t("habits.frequency")}</label>
          <select
            className="select"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Habit["frequency"])}
          >
            <option value="daily">{t("habits.daily")}</option>
            <option value="weekly">{t("habits.weekly")}</option>
            <option value="custom">{t("habits.custom")}</option>
          </select>
        </div>
      </div>

      {frequency === "custom" && (
        <div className="form-field">
          <label className="field-label">{t("habits.targetDays")}</label>
          <div className="day-picker">
            {WEEKDAYS.map((d) => (
              <button
                key={d}
                type="button"
                className={`day-btn ${targetDays.includes(d) ? "day-btn-active" : ""}`}
                onClick={() => toggleDay(d)}
              >
                {t(`common.days.${d}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="form-field">
        <label className="field-label">{t("habits.color")}</label>
        <div className="color-picker">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-btn ${color === c ? "color-btn-active" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="form-field">
        <label className="field-label">{t("habits.icon")}</label>
        <div className="icon-picker">
          {ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              className={`icon-option ${icon === ic ? "icon-option-active" : ""}`}
              style={icon === ic ? { background: color } : undefined}
              onClick={() => setIcon(ic)}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      <div className="form-field">
        <label className="field-label field-row">
          <span>{t("habits.reminder")}</span>
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="checkbox"
          />
        </label>
        {reminderEnabled && (
          <input
            type="time"
            className="input"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
          />
        )}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="btn btn-primary">
          {t("common.save")}
        </button>
      </div>
    </form>
  );
}
