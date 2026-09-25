import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/shared/api/client";

interface Notification {
  id: number;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

function results<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "results" in data) return (data as { results: T[] }).results;
  return [];
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => results<Notification>((await api.get("/notifications/")).data),
    refetchInterval: 30_000,
  });
  const unread = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => (await api.get<{ count: number }>("/notifications/unread-count/")).data.count,
    refetchInterval: 30_000,
  });
  const read = useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  return (
    <div className="relative">
      <button type="button" className="relative" onClick={() => setOpen((v) => !v)}>
        <Bell className="h-4 w-4 opacity-70 hover:opacity-100" />
        {(unread.data ?? 0) > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-odoo-danger px-0.5 text-[9px] text-white">
            {unread.data}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-md border border-odoo-border bg-white py-1 text-odoo-text shadow-lg">
          <div className="px-3 py-1.5 text-xs font-semibold uppercase text-odoo-text-muted">Уведомления</div>
          {(list.data ?? []).slice(0, 15).map((n) => (
            <button
              key={n.id}
              type="button"
              className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg ${n.is_read ? "opacity-60" : ""}`}
              onClick={() => {
                if (!n.is_read) read.mutate(n.id);
                setOpen(false);
                if (n.link) navigate(n.link);
              }}
            >
              <div className="font-medium">{n.title}</div>
              <div className="text-xs text-odoo-text-muted">{n.body}</div>
            </button>
          ))}
          {(list.data ?? []).length === 0 && (
            <div className="px-3 py-3 text-sm text-odoo-text-muted">Нет уведомлений</div>
          )}
        </div>
      )}
    </div>
  );
}
