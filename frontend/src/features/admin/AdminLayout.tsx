import { NavLink, Outlet } from "react-router-dom";
import { AppShell, Breadcrumb } from "@/app/layout/AppShell";

const LINKS = [
  { to: "/admin", label: "Дашборд", end: true },
  { to: "/admin/users", label: "Пользователи" },
  { to: "/admin/carriers", label: "Перевозчики" },
  { to: "/admin/security", label: "Безопасность" },
];

export function AdminLayout() {
  return (
    <AppShell>
      <Breadcrumb items={["Панель управления"]} />
      <div className="flex">
        <aside className="w-48 shrink-0 border-r border-odoo-border-light bg-white p-3">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `block rounded px-2 py-1.5 text-sm hover:bg-odoo-bg ${isActive ? "font-semibold text-odoo-primary" : "text-odoo-text"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </aside>
        <div className="min-w-0 flex-1 p-4">
          <Outlet />
        </div>
      </div>
    </AppShell>
  );
}
