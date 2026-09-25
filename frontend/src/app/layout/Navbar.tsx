import { LayoutGrid, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store";

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  const navigate = useNavigate();
  const letter = (user?.first_name || user?.email || "U").slice(0, 1).toUpperCase();

  const links = (
    <NavLink
      to="/crm"
      onClick={() => setSheet(false)}
      className={({ isActive }) =>
        `inline-flex h-12 items-center px-1 text-[14px] leading-none ${isActive ? "font-medium text-odoo-text" : "text-odoo-text-muted hover:text-odoo-text"}`
      }
    >
      Лиды
    </NavLink>
  );

  return (
    <nav className="sticky top-0 z-50 flex h-12 items-center bg-white px-3 text-odoo-text">
      <button type="button" className="inline-flex h-12 items-center md:hidden" onClick={() => setSheet(true)} aria-label="Меню">
        <Menu className="h-5 w-5" />
      </button>
      <Link to="/" className="inline-flex h-12 items-center text-odoo-text-muted hover:text-odoo-text" title="Приложения">
        <LayoutGrid className="h-4 w-4" />
      </Link>
      <Link to="/crm" className="ml-2 inline-flex h-12 items-center text-[14px] font-semibold leading-none text-odoo-text">
        CRM
      </Link>
      <div className="ml-4 hidden h-12 items-center md:flex">{links}</div>
      <div className="ml-auto flex items-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-odoo-secondary text-[12px] font-semibold text-white"
            title={user?.email}
          >
            {letter}
          </button>
          {menu && (
            <div className="absolute right-0 mt-2 min-w-[180px] rounded-md border border-odoo-border bg-white py-1 text-odoo-text shadow-lg">
              <div className="px-3 py-1.5 text-xs text-odoo-text-muted">{user?.email}</div>
              {(user?.role === "admin" || user?.role === "manager") && (
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg"
                  onClick={() => {
                    setMenu(false);
                    navigate("/admin");
                  }}
                >
                  Reports
                </button>
              )}
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg"
                onClick={() => document.documentElement.classList.toggle("dark")}
              >
                Тёмная тема
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg"
                onClick={() => {
                  setMenu(false);
                  void logout().then(() => navigate("/login"));
                }}
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-[60] bg-black/20 md:hidden" onClick={() => setSheet(false)}>
          <div className="h-full w-64 bg-white p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">CRM</span>
              <button type="button" onClick={() => setSheet(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col">{links}</div>
          </div>
        </div>
      )}
    </nav>
  );
}
