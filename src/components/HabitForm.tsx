import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X, Check } from "lucide-react";
import { insertCategory } from "../db/database";
import type { Habit, Category } from "../types";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4",
];

const ICONS = [
  // Sports & Exercise
  "🏃", "💪", "🏋️", "🚴", "🤸", "🏊", "🧗", "⚽", "🏀", "🎾", "🥊", "🏄",
  // Wellness & Body
  "🧘", "😴", "💧", "💊", "🩺", "🫁", "🧴", "🪥",
  // Food & Drink
  "🥗", "🍎", "🥦", "☕", "🍵", "🥤", "🍳",
  // Mind & Learning
  "📚", "📝", "✍️", "🎯", "💻", "🔬", "🎓", "🗣️", "🌍", "🧠",
  // Creative & Hobbies
  "🎵", "🎸", "🎤", "🎨", "📷", "✏️", "🎭", "🪴",
  // Daily & Home
  "🌅", "🧹", "🛁", "🛏️", "🌿", "❤️", "🔥", "⭐", "🏆",
  // Social & Mindset
  "🙏", "🤝", "😊", "📱", "👥",
  // Bad habits — to break
  "🚬", "🍺", "🍷", "🥃", "🍸", "🍰", "🍕", "🍟", "🍫", "🎮", "🛋️", "💸", "😡",
];

const CATEGORY_ICONS = ["📁", "💪", "🧘", "📚", "🎯", "💧", "🥗", "🎵", "🌿", "❤️",
  "🏠", "💼", "🎮", "✈️", "🌍", "💰", "🏋️", "🧠", "🎨", "⭐"];

interface HabitFormProps {
  initial?: Partial<Habit>;
  categories: Category[];
  onSave: (data: Omit<Habit, "id" | "created_at" | "archived">) => void;
  onCancel: () => void;
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// ── Inline category creator ───────────────────────────────

interface QuickCatFormProps {
  onCreated: (cat: Category) => void;
  onCancel: () => void;
}

function QuickCategoryForm({ onCreated, onCancel }: QuickCatFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const cat = await insertCategory({ name: name.trim(), color, icon });
      onCreated(cat);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error("QuickCategoryForm failed to create category:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quick-cat-form">
      <div className="quick-cat-header">
        <span className="quick-cat-title">{t("categories.new")}</span>
        <button type="button" className="icon-btn" onClick={onCancel}>
          <X size={14} />
        </button>
      </div>

      <div className="quick-cat-row">
        <div
          className="quick-cat-preview"
          style={{ background: color }}
        >
          {icon}
        </div>
        <input
          className="input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("categories.namePlaceholder")}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleSave(); }
            if (e.key === "Escape") onCancel();
          }}
        />
      </div>

      <div className="quick-cat-colors">
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

      <div className="quick-cat-icons">
        {CATEGORY_ICONS.map((ic) => (
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

      {error && <p className="quick-cat-error">{error}</p>}

      <div className="quick-cat-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          {t("common.cancel")}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={!name.trim() || saving}
        >
          <Check size={14} />
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}

// ── HabitForm ─────────────────────────────────────────────

export function HabitForm({ initial, categories, onSave, onCancel }: HabitFormProps) {
  const { t } = useTranslation();

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");

  // Locally created categories (inserted to DB in QuickCategoryForm but not yet
  // reflected in the parent's prop until it reloads — we merge them here so the
  // dropdown shows them immediately after inline creation).
  const [localCats, setLocalCats] = useState<Category[]>([]);
  const allCategories = [...categories, ...localCats];

  const [showCatForm, setShowCatForm] = useState(false);

  const [habitType, setHabitType] = useState<Habit["type"]>(initial?.type ?? "normal");
  const [frequency, setFrequency] = useState<Habit["frequency"]>(
    initial?.frequency ?? "daily"
  );
  const [customType, setCustomType] = useState<NonNullable<Habit["custom_type"]>>(
    initial?.custom_type ?? "weekdays"
  );
  const [targetDays, setTargetDays] = useState<number[]>(
    initial?.target_days ?? [1, 2, 3, 4, 5]
  );
  const [intervalDays, setIntervalDays] = useState<number>(
    initial?.interval_days ?? 2
  );
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
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

  const handleCategoryCreated = (cat: Category) => {
    setLocalCats((prev) => [...prev, cat]);
    setCategoryId(cat.id);
    setShowCatForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let resolvedCustomType: Habit["custom_type"] = null;
    let resolvedTargetDays: number[] | null = null;
    let resolvedIntervalDays: number | null = null;

    if (frequency === "custom") {
      resolvedCustomType = customType;
      if (customType === "weekdays" || customType === "month_days") {
        resolvedTargetDays = targetDays;
      } else if (customType === "interval") {
        resolvedIntervalDays = Math.max(1, intervalDays);
      }
    }

    onSave({
      name: name.trim(),
      description: description.trim() || null,
      category_id: categoryId || null,
      frequency,
      custom_type: resolvedCustomType,
      target_days: resolvedTargetDays,
      interval_days: resolvedIntervalDays,
      start_date: startDate || null,
      end_date: endDate || null,
      color,
      icon,
      type: habitType,
      reminder_enabled: reminderEnabled,
      reminder_time: reminderEnabled ? reminderTime : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="habit-form">
      {/* Habit type */}
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

      {/* Name + icon preview */}
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

      {/* Description */}
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

      {/* Category + frequency */}
      <div className="form-row">
        <div className="form-field flex-1">
          <div className="field-label-row">
            <label className="field-label">{t("habits.category")}</label>
            {!showCatForm && (
              <button
                type="button"
                className="btn-inline-add"
                onClick={() => setShowCatForm(true)}
                title={t("categories.new")}
              >
                <Plus size={12} />
                {t("categories.new")}
              </button>
            )}
          </div>

          {showCatForm ? (
            <QuickCategoryForm
              onCreated={handleCategoryCreated}
              onCancel={() => setShowCatForm(false)}
            />
          ) : (
            <select
              className="select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{t("habits.noCategory")}</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          )}
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

      {/* Custom schedule sub-options */}
      {frequency === "custom" && (
        <>
          <div className="form-field">
            <label className="field-label">{t("habits.customType")}</label>
            <div className="custom-type-toggle">
              {(["weekdays", "month_days", "interval"] as const).map((ct) => (
                <button
                  key={ct}
                  type="button"
                  className={`custom-type-btn ${customType === ct ? "custom-type-btn--active" : ""}`}
                  onClick={() => setCustomType(ct)}
                >
                  {t(`habits.customType_${ct}`)}
                </button>
              ))}
            </div>
          </div>

          {customType === "weekdays" && (
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

          {customType === "month_days" && (
            <div className="form-field">
              <label className="field-label">{t("habits.targetMonthDays")}</label>
              <div className="month-day-picker">
                {MONTH_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`month-day-btn ${targetDays.includes(d) ? "month-day-btn--active" : ""}`}
                    style={targetDays.includes(d) ? { background: color } : undefined}
                    onClick={() => toggleDay(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Preview: today + 7 days */}
              {targetDays.length > 0 && (() => {
                const today = new Date();
                const days = Array.from({ length: 8 }, (_, i) => {
                  const d = new Date(today);
                  d.setDate(today.getDate() + i);
                  return d;
                });
                const WEEKDAY = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
                return (
                  <div className="month-days-preview">
                    <span className="month-days-preview-label">{t("habits.upcomingPreview")}</span>
                    <div className="month-days-preview-row">
                      {days.map((d, i) => {
                        const dom = d.getDate();
                        const active = targetDays.includes(dom);
                        return (
                          <div
                            key={i}
                            className={`month-days-preview-day ${active ? "month-days-preview-day--active" : ""} ${i === 0 ? "month-days-preview-day--today" : ""}`}
                            style={active ? { background: color, borderColor: color } : undefined}
                          >
                            <span className="month-days-preview-weekday">{WEEKDAY[d.getDay()]}</span>
                            <span className="month-days-preview-dom">{dom}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {customType === "interval" && (
            <div className="form-field">
              <label className="field-label">{t("habits.intervalDays")}</label>
              <div className="interval-row">
                <span className="interval-label">{t("habits.intervalEvery")}</span>
                <input
                  className="input interval-input"
                  type="number"
                  min={1}
                  max={365}
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <span className="interval-label">{t("habits.intervalDaysLabel")}</span>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-field flex-1">
              <label className="field-label">{t("habits.startDate")}</label>
              <input
                className="input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-field flex-1">
              <label className="field-label">{t("habits.endDate")}</label>
              <input
                className="input"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {/* Color */}
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

      {/* Icon */}
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

      {/* Reminder */}
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
