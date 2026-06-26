import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { useCategories } from "../hooks/useCategories";
import { Modal } from "../components/Modal";
import { ImportExport } from "../components/ImportExport";
import { Plus, Trash2, Edit2 } from "lucide-react";
import type { Category } from "../types";

// [FUTURO - PREMIUM ANUAL + LIFETIME] Temas visuales exclusivos (accent colors, dark variants especiales).
// Cuando MONETIZATION_ACTIVE = true: mostrar selector de temas premium con PremiumGate.
const CATEGORY_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4",
];

const CATEGORY_ICONS = ["📁", "💪", "🧘", "📚", "🎯", "💧", "🥗", "🎵", "🌿", "❤️"];

type Theme = "light" | "dark" | "system";

export function Settings() {
  const { t, i18n } = useTranslation();
  const { categories, create, update, remove } = useCategories();

  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("zyrco-theme") as Theme) ?? "system"
  );
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);

  const [catFormOpen, setCatFormOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState(CATEGORY_COLORS[0]);
  const [catIcon, setCatIcon] = useState(CATEGORY_ICONS[0]);

  const handleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("zyrco-language", lang);
  };

  const handleTheme = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("zyrco-theme", t);
    const root = document.documentElement;
    if (t === "dark") root.setAttribute("data-theme", "dark");
    else if (t === "light") root.setAttribute("data-theme", "light");
    else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
  };

  const handleRequestNotif = async () => {
    const granted = await isPermissionGranted();
    if (!granted) {
      const perm = await requestPermission();
      setNotifGranted(perm === "granted");
    } else {
      setNotifGranted(true);
    }
  };

  const openCreateCat = () => {
    setEditCat(null);
    setCatName("");
    setCatColor(CATEGORY_COLORS[0]);
    setCatIcon(CATEGORY_ICONS[0]);
    setCatFormOpen(true);
  };

  const openEditCat = (cat: Category) => {
    setEditCat(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatIcon(cat.icon);
    setCatFormOpen(true);
  };

  const handleSaveCat = async () => {
    if (!catName.trim()) return;
    if (editCat) {
      await update(editCat.id, { name: catName.trim(), color: catColor, icon: catIcon });
    } else {
      await create({ name: catName.trim(), color: catColor, icon: catIcon });
    }
    setCatFormOpen(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t("settings.title")}</h1>
      </div>

      <div className="settings-sections">
        <section className="settings-section">
          <h2 className="section-title">{t("settings.appearance")}</h2>

          <div className="setting-row">
            <label className="setting-label">{t("settings.language")}</label>
            <div className="btn-group">
              {["en", "es"].map((lang) => (
                <button
                  key={lang}
                  className={`btn btn-sm ${i18n.language === lang ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => handleLanguage(lang)}
                >
                  {lang === "en" ? "English" : "Español"}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-label">{t("settings.theme")}</label>
            <div className="btn-group">
              {(["light", "dark", "system"] as Theme[]).map((th) => (
                <button
                  key={th}
                  className={`btn btn-sm ${theme === th ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => handleTheme(th)}
                >
                  {t(`settings.theme${th.charAt(0).toUpperCase() + th.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="section-title">{t("settings.notifications")}</h2>
          <div className="setting-row">
            <div>
              <p className="setting-label">{t("settings.notifications")}</p>
              <p className="text-muted text-sm">{t("settings.notificationsDesc")}</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleRequestNotif}>
              {notifGranted === true
                ? "✓ Enabled"
                : t("common.add")}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-header">
            <h2 className="section-title">{t("settings.categories")}</h2>
            <button className="btn btn-ghost btn-sm" onClick={openCreateCat}>
              <Plus size={14} />
              {t("categories.new")}
            </button>
          </div>

          {categories.length === 0 ? (
            <p className="text-muted">{t("categories.noCategory")}</p>
          ) : (
            <div className="category-list">
              {categories.map((cat) => (
                <div key={cat.id} className="category-row">
                  <span
                    className="cat-dot"
                    style={{ background: cat.color }}
                  />
                  <span className="cat-icon">{cat.icon}</span>
                  <span className="cat-name">{cat.name}</span>
                  <div className="cat-actions">
                    <button
                      className="icon-btn"
                      onClick={() => openEditCat(cat)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="icon-btn icon-btn-danger"
                      onClick={() => setDeleteCat(cat)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="settings-section">
          <h2 className="section-title">{t("settings.dataTitle")}</h2>
          <ImportExport />
        </section>

        <section className="settings-section">
          <h2 className="section-title">{t("settings.about")}</h2>
          <div className="setting-row">
            <span className="setting-label">{t("settings.version")}</span>
            <span className="text-muted">0.1.0</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Zyrco</span>
            <span className="text-muted">Habit Tracker</span>
          </div>
        </section>
      </div>

      <Modal
        open={catFormOpen}
        title={editCat ? t("common.edit") : t("categories.new")}
        onClose={() => setCatFormOpen(false)}
        size="sm"
      >
        <div className="habit-form">
          <div className="form-field">
            <label className="field-label">{t("categories.name")}</label>
            <input
              className="input"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder={t("categories.namePlaceholder")}
              autoFocus
            />
          </div>
          <div className="form-field">
            <label className="field-label">{t("categories.color")}</label>
            <div className="color-picker">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-btn ${catColor === c ? "color-btn-active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setCatColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="form-field">
            <label className="field-label">{t("categories.icon")}</label>
            <div className="icon-picker">
              {CATEGORY_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  className={`icon-option ${catIcon === ic ? "icon-option-active" : ""}`}
                  style={catIcon === ic ? { background: catColor } : undefined}
                  onClick={() => setCatIcon(ic)}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setCatFormOpen(false)}>
              {t("common.cancel")}
            </button>
            <button className="btn btn-primary" onClick={handleSaveCat}>
              {t("common.save")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteCat}
        title={t("common.delete")}
        onClose={() => setDeleteCat(null)}
        size="sm"
      >
        <p className="confirm-text">{t("categories.deleteConfirm")}</p>
        <p className="confirm-name">{deleteCat?.name}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setDeleteCat(null)}>
            {t("common.cancel")}
          </button>
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (deleteCat) {
                await remove(deleteCat.id);
                setDeleteCat(null);
              }
            }}
          >
            {t("common.delete")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
