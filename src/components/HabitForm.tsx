import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, addDays } from "date-fns";
import { Plus, X, Check, Sparkles } from "lucide-react";
import { insertCategory } from "../db/database";
import { isHabitDueOnDay } from "../utils/schedule";
import type { Habit, Category } from "../types";
import { TemplateLibrary } from "./TemplateLibrary";
import type { HabitTemplate } from "../data/habitTemplates";

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

// ── SchedulePreview ───────────────────────────────────────

/**
 * Shows the next 14 days, highlighting which ones the habit would fire on,
 * based on the current form values. Uses isHabitDueOnDay so the preview
 * matches exactly what will appear in Today.
 */
function SchedulePreview({
  frequency,
  customType,
  targetDays,
  intervalDays,
  startDate,
  color,
}: {
  frequency: Habit["frequency"];
  customType: Habit["custom_type"];
  targetDays: number[];
  intervalDays: number;
  startDate: string;
  color: string;
}) {
  const { t } = useTranslation();
  const today = new Date();
  const refDate = startDate || format(today, "yyyy-MM-dd");

  const fakeHabit = {
    id: "__preview__",
    name: "",
    description: null,
    category_id: null,
    frequency,
    custom_type: customType,
    target_days: targetDays.length > 0 ? targetDays : null,
    interval_days: intervalDays,
    start_date: refDate,
    end_date: null,
    color,
    icon: "⭐",
    type: "normal" as const,
    session: "anytime" as const,
    sessions: ["anytime"],
    completion_type: "binary" as const,
    completion_target: null,
    completion_unit: null,
    reminder_enabled: false,
    reminder_time: null,
    created_at: refDate + "T00:00:00",
    archived: false,
  } as Habit;

  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const hasSomeDue = days.some((d) => isHabitDueOnDay(fakeHabit, d));
  if (!hasSomeDue) return null;

  return (
    <div className="schedule-preview">
      <span className="schedule-preview-label">{t("habits.upcomingPreview")}</span>
      <div className="schedule-preview-strip">
        {days.map((d, i) => {
          const active  = isHabitDueOnDay(fakeHabit, d);
          const isToday = i === 0;
          return (
            <div
              key={i}
              className={[
                "schedule-preview-day",
                active  ? "schedule-preview-day--active" : "",
                isToday ? "schedule-preview-day--today"  : "",
              ].filter(Boolean).join(" ")}
              style={active ? { background: color, borderColor: color } : undefined}
            >
              <span className="schedule-preview-name">
                {t(`common.days.${d.getDay()}`)}
              </span>
              <span className="schedule-preview-num">{format(d, "d")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── HabitForm ─────────────────────────────────────────────

export function HabitForm({ initial, categories, onSave, onCancel }: HabitFormProps) {
  const { t, i18n } = useTranslation();

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
  type FrequencyUI = Habit["frequency"] | "today";
  const [uiFreq, setUiFreq] = useState<FrequencyUI>(initial?.frequency ?? "daily");
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
  // Reminders UI is hidden (coming soon) — preserve existing values on edit
  const reminderEnabled = initial?.reminder_enabled ?? false;
  const reminderTime = initial?.reminder_time ?? null;

  const [timeEnabled, setTimeEnabled] = useState(!!initial?.time_start);
  const [timeStart, setTimeStart]     = useState(initial?.time_start ?? "08:00");
  const [timeEndEnabled, setTimeEndEnabled] = useState(!!initial?.time_end);
  const [timeEnd, setTimeEnd]         = useState(initial?.time_end ?? "09:00");

  const [sessions, setSessions] = useState<string[]>(
    initial?.sessions?.length ? initial.sessions : [initial?.session ?? "anytime"]
  );
  const [completionType, setCompletionType] = useState<Habit["completion_type"]>(
    initial?.completion_type ?? "binary"
  );
  const [completionTarget, setCompletionTarget] = useState<number>(
    initial?.completion_target ?? 1
  );
  const [completionUnit, setCompletionUnit] = useState(initial?.completion_unit ?? "");

  const [showTemplates, setShowTemplates] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const applyTemplate = (tmpl: HabitTemplate) => {
    const isEs = i18n.language.startsWith("es");
    setName(isEs ? tmpl.name_es : tmpl.name);
    setDescription(isEs ? (tmpl.description_es ?? "") : (tmpl.description ?? ""));
    setHabitType(tmpl.type);
    setFrequency(tmpl.frequency);
    setCustomType(tmpl.custom_type ?? "weekdays");
    setTargetDays(tmpl.target_days ?? [1, 2, 3, 4, 5]);
    setIntervalDays(tmpl.interval_days ?? 2);
    setColor(tmpl.color);
    setIcon(tmpl.icon);
    setSessions(tmpl.sessions?.length ? tmpl.sessions : [tmpl.session]);
    setCompletionType(tmpl.completion_type);
    setCompletionTarget(tmpl.completion_target ?? 1);
    setCompletionUnit(tmpl.completion_unit ?? "");
  };

  const toggleDay = (day: number) => {
    setTargetDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
    setScheduleError(null);
  };

  const handleFrequencyChange = (f: FrequencyUI) => {
    setUiFreq(f);
    setScheduleError(null);
    if (f === "today") {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      setFrequency("daily");
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else {
      setFrequency(f);
      // Clear auto-set dates if switching away from "today"
      if (uiFreq === "today") {
        setStartDate("");
        setEndDate("");
      }
      if (f === "weekly") {
        setTargetDays((prev) => (prev.length > 0 ? [prev[0]] : [1]));
      }
    }
  };

  const handleCategoryCreated = (cat: Category) => {
    setLocalCats((prev) => [...prev, cat]);
    setCategoryId(cat.id);
    setShowCatForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Validate day selections
    if (frequency === "weekly" && targetDays.length === 0) {
      setScheduleError(t("habits.errorSelectWeekday"));
      return;
    }
    if (
      frequency === "custom" &&
      (customType === "weekdays" || customType === "month_days") &&
      targetDays.length === 0
    ) {
      setScheduleError(t("habits.errorSelectDay"));
      return;
    }

    let resolvedCustomType: Habit["custom_type"] = null;
    let resolvedTargetDays: number[] | null = null;
    let resolvedIntervalDays: number | null = null;

    if (frequency === "weekly") {
      resolvedTargetDays = targetDays.length > 0 ? [targetDays[0]] : [1];
    }

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
      sessions,
      session: (sessions[0] ?? "anytime") as Habit["session"],
      completion_type: completionType,
      completion_target: completionType !== "binary" ? completionTarget : null,
      completion_unit: completionType !== "binary" && completionUnit.trim() ? completionUnit.trim() : null,
      reminder_enabled: reminderEnabled,
      reminder_time: reminderEnabled ? reminderTime : null,
      time_start: timeEnabled ? timeStart : null,
      time_end: timeEnabled && timeEndEnabled ? timeEnd : null,
      paused_until: null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="habit-form">
      {showTemplates && (
        <TemplateLibrary onSelect={applyTemplate} onClose={() => setShowTemplates(false)} />
      )}

      {/* Templates shortcut */}
      {!initial && (
        <button
          type="button"
          className="template-trigger-btn"
          onClick={() => setShowTemplates(true)}
        >
          <Sparkles size={14} />
          {t("habits.browseTemplates")}
        </button>
      )}

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
            value={uiFreq}
            onChange={(e) => handleFrequencyChange(e.target.value as FrequencyUI)}
          >
            <option value="today">{t("habits.today")}</option>
            <option value="daily">{t("habits.daily")}</option>
            <option value="weekly">{t("habits.weekly")}</option>
            <option value="custom">{t("habits.custom")}</option>
          </select>
        </div>
      </div>

      {/* Weekly — pick which day of the week */}
      {frequency === "weekly" && (
        <div className="form-field">
          <label className="field-label">{t("habits.targetDays")}</label>
          <div className="day-picker">
            {WEEKDAYS.map((d) => (
              <button
                key={d}
                type="button"
                className={`day-btn ${targetDays[0] === d ? "day-btn-active" : ""}`}
                onClick={() => { setTargetDays([d]); setScheduleError(null); }}
              >
                {t(`common.days.${d}`)}
              </button>
            ))}
          </div>
          <SchedulePreview
            frequency="weekly"
            customType={null}
            targetDays={targetDays}
            intervalDays={intervalDays}
            startDate={startDate}
            color={color}
          />
          {scheduleError && <p className="field-error">{scheduleError}</p>}
        </div>
      )}

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
              {scheduleError && <p className="field-error">{scheduleError}</p>}
              <SchedulePreview
                frequency="custom"
                customType="weekdays"
                targetDays={targetDays}
                intervalDays={intervalDays}
                startDate={startDate}
                color={color}
              />
            </div>
          )}

          {customType === "month_days" && (
            <div className="form-field">
              <label className="field-label">{t("habits.targetMonthDays")}</label>
              <div className="month-day-grid">
                {MONTH_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`month-day-btn ${targetDays.includes(d) ? "month-day-btn--active" : ""}`}
                    style={targetDays.includes(d) ? { background: color, borderColor: color } : undefined}
                    onClick={() => toggleDay(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {scheduleError && <p className="field-error">{scheduleError}</p>}
              <SchedulePreview
                frequency="custom"
                customType="month_days"
                targetDays={targetDays}
                intervalDays={intervalDays}
                startDate={startDate}
                color={color}
              />
            </div>
          )}

          {customType === "interval" && (
            <div className="form-field">
              <label className="field-label">{t("habits.intervalDays")}</label>
              <div className="interval-stepper">
                <button
                  type="button"
                  className="interval-btn"
                  onClick={() => setIntervalDays((v) => Math.max(1, v - 1))}
                >
                  −
                </button>
                <span className="interval-value">{intervalDays}</span>
                <button
                  type="button"
                  className="interval-btn"
                  onClick={() => setIntervalDays((v) => Math.min(365, v + 1))}
                >
                  +
                </button>
                <span className="interval-unit">{t("habits.intervalDaysLabel")}</span>
              </div>
              <SchedulePreview
                frequency="custom"
                customType="interval"
                targetDays={[]}
                intervalDays={intervalDays}
                startDate={startDate}
                color={color}
              />
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

      {/* Sessions — multi-select time-of-day grouping */}
      <div className="form-field">
        <label className="field-label">{t("habits.session")}</label>
        <div className="session-toggle">
          {(["morning", "afternoon", "evening", "anytime"] as const).map((s) => {
            const active = sessions.includes(s);
            return (
              <button
                key={s}
                type="button"
                className={`session-btn ${active ? "session-btn--active" : ""}`}
                style={active ? { borderColor: color, color } : undefined}
                onClick={() => {
                  if (s === "anytime") {
                    setSessions(["anytime"]);
                  } else {
                    setSessions((prev) => {
                      const without = prev.filter((x) => x !== "anytime" && x !== s);
                      return active ? (without.length ? without : ["anytime"]) : [...without, s];
                    });
                  }
                }}
              >
                {t(`habits.session_${s}`)}
              </button>
            );
          })}
        </div>
        {sessions.length > 1 && (
          <p className="field-hint">{t("habits.sessionsMultiHint")}</p>
        )}
      </div>

      {/* Completion type */}
      <div className="form-field">
        <label className="field-label">{t("habits.completionType")}</label>
        <div className="custom-type-toggle">
          {(["binary", "numeric", "timer"] as const).map((ct) => (
            <button
              key={ct}
              type="button"
              className={`custom-type-btn ${completionType === ct ? "custom-type-btn--active" : ""}`}
              onClick={() => setCompletionType(ct)}
            >
              {t(`habits.completionType_${ct}`)}
            </button>
          ))}
        </div>

        {completionType !== "binary" && (
          <div className="form-row" style={{ marginTop: 8 }}>
            <div className="form-field flex-1">
              <label className="field-label">{t("habits.completionTarget")}</label>
              <input
                className="input"
                type="number"
                min={1}
                value={completionTarget}
                onChange={(e) => setCompletionTarget(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="form-field flex-1">
              <label className="field-label">{t("habits.completionUnit")}</label>
              <input
                className="input"
                type="text"
                placeholder={completionType === "numeric" ? "glasses, pages…" : "minutes"}
                value={completionUnit}
                onChange={(e) => setCompletionUnit(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Schedule (start / end time) */}
      <div className="form-field">
        <label className="field-label field-row">
          <span>{t("habits.scheduleLabel")}</span>
          <input
            type="checkbox"
            checked={timeEnabled}
            onChange={(e) => {
              setTimeEnabled(e.target.checked);
              if (!e.target.checked) setTimeEndEnabled(false);
            }}
            className="checkbox"
          />
        </label>
        {timeEnabled && (
          <div className="schedule-time-row">
            <div className="form-field flex-1">
              <label className="field-label">{t("habits.scheduleStart")}</label>
              <input
                type="time"
                className="input"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
              />
            </div>
            <div className="form-field flex-1">
              <label className="field-label field-row">
                <span>{t("habits.scheduleEnd")}</span>
                <input
                  type="checkbox"
                  checked={timeEndEnabled}
                  onChange={(e) => setTimeEndEnabled(e.target.checked)}
                  className="checkbox"
                />
              </label>
              {timeEndEnabled && (
                <input
                  type="time"
                  className="input"
                  value={timeEnd}
                  min={timeStart}
                  onChange={(e) => setTimeEnd(e.target.value)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reminder — OS scheduling not yet wired; shown when backend is ready */}
      <div className="form-field coming-soon-field">
        <span className="field-label">{t("habits.reminder")}</span>
        <span className="coming-soon-badge">{t("habits.reminderComingSoon")}</span>
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
