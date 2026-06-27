import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarCheck, ListChecks, BarChart2, CalendarDays, Settings } from "lucide-react";
import { useTodayProgress } from "../hooks/useTodayProgress";

export function Sidebar() {
  const { t } = useTranslation();
  const { done, total } = useTodayProgress();

  const progressBadge = total === 0 ? null : done === total ? "✓" : `${done}/${total}`;
  const badgeColor = done === total ? "var(--color-success)" : "var(--color-warning)";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">Z</span>
        <span className="brand-name">Zyrco</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          title={t("nav.today")}
          className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
        >
          <span className="nav-icon-wrap">
            <CalendarCheck size={18} />
            {progressBadge && (
              <span className="nav-dot" style={{ background: badgeColor }} aria-hidden="true" />
            )}
          </span>
          <span className="nav-label-wrap">
            {t("nav.today")}
            {progressBadge && (
              <span className="nav-progress" style={{ color: badgeColor }}>
                {progressBadge}
              </span>
            )}
          </span>
        </NavLink>

        <NavLink
          to="/habits"
          title={t("nav.habits")}
          className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
        >
          <ListChecks size={18} />
          <span>{t("nav.habits")}</span>
        </NavLink>

        <NavLink
          to="/stats"
          title={t("nav.stats")}
          className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
        >
          <BarChart2 size={18} />
          <span>{t("nav.stats")}</span>
        </NavLink>

        <NavLink
          to="/calendar"
          title={t("nav.calendar")}
          className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
        >
          <CalendarDays size={18} />
          <span>{t("nav.calendar")}</span>
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        <NavLink
          to="/settings"
          title={t("nav.settings")}
          className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
        >
          <Settings size={18} />
          <span>{t("nav.settings")}</span>
        </NavLink>
      </div>
    </aside>
  );
}
