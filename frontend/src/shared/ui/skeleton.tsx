import { cn } from "@/shared/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-odoo-border", className)} />;
}

export function KanbanCardSkeleton() {
  return (
    <div className="border-b border-odoo-border-light bg-white px-2 py-2">
      <div className="animate-pulse space-y-2.5">
        <div className="h-4 w-3/4 rounded bg-odoo-border" />
        <div className="h-3 w-1/2 rounded bg-odoo-border-light" />
        <div className="h-3 w-1/3 rounded bg-odoo-border-light" />
        <div className="mt-2 flex gap-1">
          <div className="h-5 w-12 rounded bg-odoo-border-light" />
          <div className="h-5 w-10 rounded bg-odoo-border-light" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr>
      <td className="p-2">
        <div className="h-4 w-4 animate-pulse rounded bg-odoo-border" />
      </td>
      <td className="p-2">
        <div className="h-4 w-24 animate-pulse rounded bg-odoo-border" />
      </td>
      <td className="p-2">
        <div className="h-4 w-32 animate-pulse rounded bg-odoo-border" />
      </td>
      <td className="p-2">
        <div className="h-4 w-16 animate-pulse rounded bg-odoo-border" />
      </td>
    </tr>
  );
}

export function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-5 w-1/3 rounded bg-odoo-border" />
      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-odoo-border-light" />
        <div className="h-8 w-full rounded bg-odoo-border" />
      </div>
    </div>
  );
}
