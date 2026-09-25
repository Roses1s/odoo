import { useQuery } from "@tanstack/react-query";
import { Kanban, Package, Settings, LayoutGrid } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/shared/api/client";
import type { LauncherApp } from "@/shared/types";
import { Skeleton } from "@/shared/ui/skeleton";

const ICONS: Record<string, typeof LayoutGrid> = {
  Kanban,
  Package,
  Settings,
  LayoutGrid,
};

function paginated<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "results" in data) {
    return (data as { results: T[] }).results;
  }
  return [];
}

export function LauncherPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["launcher"],
    queryFn: async () => {
      const res = await api.get("/launcher/apps/");
      return paginated<LauncherApp>(res.data);
    },
  });

  return (
    <div className="min-h-[calc(100vh-56px)] bg-odoo-bg px-6 py-10">
      <h1 className="mb-6 text-center text-odoo-text">Приложения</h1>
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border border-odoo-border-light bg-white p-5 shadow-sm">
              <Skeleton className="mb-3 h-10 w-10" />
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        {data?.map((app) => {
          const Icon = ICONS[app.icon] ?? LayoutGrid;
          return (
            <Link
              key={app.slug}
              to={app.route}
              className="rounded-md border border-odoo-border-light bg-white p-5 shadow-sm transition-all duration-150 hover:border-odoo-border hover:shadow-md"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-odoo-primary/10 text-odoo-primary">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="font-semibold text-odoo-text">{app.name}</div>
              <p className="mt-1 text-xs text-odoo-text-muted">{app.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
