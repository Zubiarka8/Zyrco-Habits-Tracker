import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarCheck, ListChecks, BarChart2, Settings, CheckSquare } from "lucide-react";

const links = [
  { to: "/", icon: CalendarCheck, key: "nav.today" },
  { to: "/habits", icon: ListChecks, key: "nav.habits" },
  { to: "/todos", icon: CheckSquare, key: "nav.todos" },
  { to: "/stats", icon: BarChart2, key: "nav.stats" },
];

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">Z</span>
        <span className="brand-name">Zyrco</span>
      </div>

      <nav className="sidebar-nav">
        {links.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `nav-link ${isActive ? "nav-link-active" : ""}`
            }
          >
            <Icon size={18} />
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `nav-link ${isActive ? "nav-link-active" : ""}`
          }
        >
          <Settings size={18} />
          <span>{t("nav.settings")}</span>
        </NavLink>
      </div>
    </aside>
  );
}
