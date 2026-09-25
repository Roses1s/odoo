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
      <div className="relative flex min-h-[64px] flex-wrap items-center gap-2 px-3 py-1 md:flex-nowrap md:py-0">
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
          <div className="pointer-events-none order-last flex w-full justify-center md:absolute md:inset-x-0 md:order-none md:w-auto">
            <label className="pointer-events-auto flex h-9 w-full items-stretch overflow-hidden rounded-[3px] border border-[#8FB9B8] bg-white shadow-sm focus-within:ring-1 focus-within:ring-[#8FB9B8] md:w-[min(100%,600px)]">
              <span className="flex items-center pl-3 pr-2">
                <Search className="h-4 w-4 shrink-0 text-[#5f6b70]" />
              </span>
              <input
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Поиск..."
                className="min-w-0 flex-1 bg-transparent pr-2 text-[14px] outline-none placeholder:text-[#8b9397]"
              />
              <span className="flex w-9 shrink-0 items-center justify-center border-l border-[#c8d8d8] text-[#4e5c61]">
                <ChevronDown className="h-4 w-4" />
              </span>
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
