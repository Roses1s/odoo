import type { ReactNode } from "react";
import { ChevronDown, LayoutGrid, List, Search, Settings } from "lucide-react";
import { Navbar } from "@/app/layout/Navbar";

export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <div className="text-sm text-odoo-text-muted">
      {items.map((item, i) => (
        <span key={`${item}-${i}`}>
          {i > 0 && <span className="mx-1.5 text-odoo-text-light">/</span>}
          <span className={i === items.length - 1 ? "font-medium text-odoo-text" : ""}>{item}</span>
        </span>
      ))}
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-odoo-border-light bg-white px-3 py-1.5">
      {children}
    </div>
  );
}

export function ControlPanel({
  title = "Лиды",
  children,
  search,
  onSearch,
  onCreate,
  onSettings,
  view,
  onView,
}: {
  title?: string;
  crumbs?: string[];
  children?: ReactNode;
  search?: string;
  onSearch?: (v: string) => void;
  onCreate?: () => void;
  onSettings?: () => void;
  createLabel?: string;
  view?: "kanban" | "list";
  onView?: (v: "kanban" | "list") => void;
}) {
  return (
    <div className="sticky top-12 z-30 border-b border-odoo-border-light bg-white">
      <div className="relative flex min-h-[46px] items-center gap-2 px-3">
        {onCreate && (
          <button
            type="button"
            className="rounded-md px-3 py-1 text-[13px] font-medium text-white hover:opacity-90"
            style={{ backgroundColor: "#714B67" }}
            onClick={onCreate}
          >
            Новый
          </button>
        )}
        <span className="text-[15px] font-medium text-odoo-text">{title}</span>
        {onSettings && (
          <button type="button" className="text-odoo-text-muted hover:text-odoo-text" onClick={onSettings} title="Настройки">
            <Settings className="h-4 w-4" />
          </button>
        )}
        {onSearch && (
          <div className="pointer-events-none absolute inset-x-0 flex justify-center">
            <label className="pointer-events-auto flex h-8 w-[min(100%,420px)] items-center gap-2 rounded-md border border-odoo-border bg-white px-2.5 shadow-sm">
              <Search className="h-3.5 w-3.5 shrink-0 text-odoo-text-light" />
              <input
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Поиск..."
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-odoo-text-light"
              />
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-odoo-text-light" />
            </label>
          </div>
        )}
        <div className="relative z-10 ml-auto flex items-center gap-1">
          {onView && (
            <span className="mr-1 inline-flex overflow-hidden rounded border border-odoo-border">
              <button
                type="button"
                className={`px-1.5 py-1 ${view !== "list" ? "bg-odoo-bg text-odoo-primary" : "text-odoo-text-muted"}`}
                onClick={() => onView("kanban")}
                title="Канбан"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`px-1.5 py-1 ${view === "list" ? "bg-odoo-bg text-odoo-primary" : "text-odoo-text-muted"}`}
                onClick={() => onView("list")}
                title="Список"
              >
                <List className="h-4 w-4" />
              </button>
            </span>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-odoo-bg">
      <Navbar />
      {children}
    </div>
  );
}
