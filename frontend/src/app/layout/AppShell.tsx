import type { ReactNode } from "react";
import { ChevronDown, LayoutGrid, List, Search, Settings } from "lucide-react";
import { Link } from "react-router-dom";
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
  crumbs,
  status,
  cog,
  stats,
  pager,
  onNew,
  children,
  search,
  onSearch,
  onCreate,
  onSettings,
  view,
  onView,
  count,
}: {
  title?: string;
  crumbs?: { label: string; to?: string }[];
  status?: ReactNode;
  cog?: ReactNode;
  stats?: ReactNode;
  pager?: ReactNode;
  onNew?: () => void;
  children?: ReactNode;
  search?: string;
  onSearch?: (v: string) => void;
  onCreate?: () => void;
  onSettings?: () => void;
  createLabel?: string;
  view?: "kanban" | "list";
  onView?: (v: "kanban" | "list") => void;
  count?: number;
}) {
  return (
    <div className="sticky top-10 z-30 shrink-0 border-b border-odoo-border-light bg-white">
      <div className="relative flex min-h-[50px] flex-wrap items-center gap-2 px-3 py-1 md:flex-nowrap md:py-0">
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
        {onNew && (
          <button
            type="button"
            onClick={onNew}
            className="inline-flex h-7 shrink-0 items-center rounded-[4px] border border-odoo-border bg-white px-3 text-[13px] text-odoo-text transition-colors hover:bg-odoo-bg"
          >
            Новый
          </button>
        )}
        {crumbs && crumbs.length > 0 ? (
          <nav aria-label="Хлебные крошки" className="flex min-w-0 flex-col justify-center">
            {crumbs.length > 1 && (
              <span className="flex items-center gap-1 text-[11px] leading-[14px]">
                {crumbs.slice(0, -1).map((crumb, i) => (
                  <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                    {i > 0 && <span className="text-odoo-text-light">/</span>}
                    {crumb.to ? (
                      <Link to={crumb.to} className="text-odoo-primary hover:underline">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-odoo-text-muted">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </span>
            )}
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate text-[14px] font-medium leading-[18px] text-odoo-text">
                {crumbs[crumbs.length - 1].label}
              </span>
              {cog}
            </span>
          </nav>
        ) : (
          <span className="text-[14px] font-medium leading-none text-odoo-text">{title}</span>
        )}
        {status}
        {stats && (
          <div className="pointer-events-none absolute inset-x-0 hidden justify-center lg:flex">
            <div className="pointer-events-auto flex items-center gap-2">{stats}</div>
          </div>
        )}
        {onSettings && (
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-odoo-text-muted hover:bg-odoo-bg hover:text-odoo-text"
            onClick={onSettings}
            title="Настройки"
            aria-label="Настройки"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
        {onSearch && (
          <div className="pointer-events-none order-last flex w-full justify-center md:absolute md:inset-x-0 md:order-none md:w-auto">
            <div className="pointer-events-auto flex h-9 w-full items-stretch overflow-hidden rounded-[3px] border border-[#8FB9B8] bg-white shadow-sm focus-within:ring-1 focus-within:ring-[#8FB9B8] md:w-[min(100%,600px)]">
              <span className="flex items-center pl-3 pr-2">
                <Search className="h-4 w-4 shrink-0 text-[#5f6b70]" />
              </span>
              <input
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Поиск..."
                aria-label="Поиск лидов"
                className="min-w-0 flex-1 bg-transparent pr-2 text-[14px] outline-none placeholder:text-[#8b9397]"
              />
              <button
                type="button"
                className="flex w-9 shrink-0 items-center justify-center border-l border-[#c8d8d8] text-[#4e5c61] hover:bg-[#f4f7f7]"
                onClick={onSettings}
                title="Параметры поиска"
                aria-label="Параметры поиска"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <div className="relative z-10 ml-auto flex items-center gap-1">
          {pager}
          {typeof count === "number" && count > 0 && (
            <span
              className="mr-1 whitespace-nowrap text-[13px] leading-none text-odoo-text-muted [font-variant-numeric:tabular-nums]"
              aria-label={`Записей: ${count}`}
            >
              1-{count} / {count}
            </span>
          )}
          {onView && (
            <span className="mr-1 inline-flex h-8 overflow-hidden rounded-[3px] border border-odoo-border bg-white">
              <button
                type="button"
                className={`inline-flex w-8 items-center justify-center border-r border-odoo-border transition-colors ${view !== "list" ? "bg-[#e9f2f2] text-odoo-primary" : "text-odoo-text-muted hover:bg-odoo-bg"}`}
                onClick={() => onView("kanban")}
                title="Канбан"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`inline-flex w-8 items-center justify-center transition-colors ${view === "list" ? "bg-[#e9f2f2] text-odoo-primary" : "text-odoo-text-muted hover:bg-odoo-bg"}`}
                onClick={() => onView("list")}
                title="Список"
              >
                <List className="h-4 w-4" />
              </button>
            </span>
          )}
        </div>
        {children}
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
