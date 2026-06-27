import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Search } from "lucide-react";
import { HABIT_TEMPLATES, TEMPLATE_CATEGORIES, type HabitTemplate } from "../data/habitTemplates";

function useTemplateLang() {
  const { i18n } = useTranslation();
  const isEs = i18n.language.startsWith("es");
  const tName = (tmpl: HabitTemplate) => isEs ? tmpl.name_es : tmpl.name;
  const tDesc = (tmpl: HabitTemplate) => isEs ? (tmpl.description_es ?? null) : (tmpl.description ?? null);
  return { tName, tDesc };
}

interface TemplateLibraryProps {
  onSelect: (template: HabitTemplate) => void;
  /** When true, renders inline (no fullscreen overlay). Omit onClose or pass a no-op. */
  inline?: boolean;
  onClose?: () => void;
}

function TemplateContent({
  onSelect,
  onClose,
  inline,
}: {
  onSelect: (tmpl: HabitTemplate) => void;
  onClose?: () => void;
  inline?: boolean;
}) {
  const { t } = useTranslation();
  const { tName, tDesc } = useTemplateLang();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = HABIT_TEMPLATES.filter((tmpl) => {
    const matchesCat = activeCategory === "all" || tmpl.templateCategory === activeCategory;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      tName(tmpl).toLowerCase().includes(q) ||
      tmpl.name.toLowerCase().includes(q) ||
      (tDesc(tmpl) ?? "").toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className={inline ? "template-inline" : "template-panel"}>
      <div className="template-header">
        <span className="template-title">{t("habits.templates")}</span>
        {!inline && onClose && (
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className="template-search-row">
        <Search size={14} className="template-search-icon" />
        <input
          className="template-search-input"
          type="text"
          placeholder={t("habits.templatesSearch")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus={!inline}
        />
      </div>

      <div className="template-cats">
        <button
          className={`type-chip ${activeCategory === "all" ? "type-chip--active" : ""}`}
          onClick={() => setActiveCategory("all")}
        >
          {t("habits.filterAll")}
        </button>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`type-chip ${activeCategory === cat ? "type-chip--active" : ""}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="template-grid">
        {filtered.length === 0 && (
          <p className="template-empty">{t("habits.templatesEmpty")}</p>
        )}
        {filtered.map((tmpl, i) => {
          const displayName = tName(tmpl);
          const displayDesc = tDesc(tmpl);
          return (
            <button
              key={i}
              className="template-card"
              style={{ "--habit-color": tmpl.color } as React.CSSProperties}
              onClick={() => { onSelect(tmpl); onClose?.(); }}
            >
              <div className="template-card-icon" style={{ background: tmpl.color }}>
                {tmpl.icon}
              </div>
              <div className="template-card-body">
                <span className="template-card-name">{displayName}</span>
                {displayDesc && (
                  <span className="template-card-desc">{displayDesc}</span>
                )}
                <span className="template-card-meta">
                  {tmpl.templateCategory}
                  {tmpl.completion_type !== "binary" && (
                    <> · {tmpl.completion_type === "numeric" ? `${tmpl.completion_target} ${tmpl.completion_unit}` : `${tmpl.completion_target} min`}</>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TemplateLibrary({ onSelect, inline, onClose }: TemplateLibraryProps) {
  if (inline) {
    return <TemplateContent onSelect={onSelect} inline />;
  }
  return (
    <div className="template-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <TemplateContent onSelect={onSelect} onClose={onClose} />
      </div>
    </div>
  );
}
