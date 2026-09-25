import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/shared/api/client";
import type { Lead } from "@/shared/types";

function results<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "results" in data) return (data as { results: T[] }).results;
  return [];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data } = useQuery({
    queryKey: ["search", debounced],
    enabled: open && debounced.length > 1,
    queryFn: async () => results<Lead>((await api.get(`/crm/leads/?search=${encodeURIComponent(debounced)}`)).data),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/30" onClick={() => setOpen(false)}>
      <div
        className="mx-auto mt-24 w-full max-w-lg rounded-lg border border-odoo-border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск лидов по названию, ИНН, контакту…"
          className="w-full border-b border-odoo-border px-4 py-3 text-sm outline-none"
        />
        <div className="max-h-72 overflow-y-auto py-1">
          {(data ?? []).map((lead) => (
            <button
              key={lead.id}
              type="button"
              className="block w-full px-4 py-1.5 text-left text-sm hover:bg-odoo-bg"
              onClick={() => {
                setOpen(false);
                navigate(`/crm/leads/${lead.id}`);
              }}
            >
              <span className="font-medium">{lead.name}</span>
              <span className="ml-2 text-odoo-text-muted">{lead.inn}</span>
            </button>
          ))}
          {debounced.length > 1 && (data ?? []).length === 0 && (
            <div className="px-4 py-3 text-sm text-odoo-text-muted">Ничего не найдено</div>
          )}
        </div>
      </div>
    </div>
  );
}
