import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { TimelineEntry } from "@/shared/types";

type Mode = "note" | "message" | "activity";

const MODES: { id: Mode; label: string; placeholder: string; action: string }[] = [
  {
    id: "note",
    label: "Лог примечания",
    placeholder: "Записать внутреннее примечание…",
    action: "Записать",
  },
  {
    id: "message",
    label: "Отправить сообщение",
    placeholder: "Написать сообщение…",
    action: "Отправить",
  },
  { id: "activity", label: "Активность", placeholder: "Описать задачу…", action: "Запланировать" },
];

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true, locale: ru });
}

function absoluteTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "d MMMM yyyy, HH:mm", { locale: ru });
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "d MMMM yyyy 'г.'", { locale: ru });
}

interface ChatterProps {
  timeline: TimelineEntry[];
  onSubmit?: (body: string, type: Mode) => void;
}

export function Chatter({ timeline, onSubmit }: ChatterProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("note");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const current = MODES.find((m) => m.id === mode) ?? MODES[0];

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? timeline.filter((e) =>
          `${e.author_name} ${e.body} ${e.field_label ?? ""} ${e.old_value ?? ""} ${e.new_value ?? ""}`
            .toLowerCase()
            .includes(q),
        )
      : timeline;
    const byDay = new Map<string, TimelineEntry[]>();
    for (const entry of rows) {
      const key = dayLabel(entry.created_at);
      const list = byDay.get(key);
      if (list) list.push(entry);
      else byDay.set(key, [entry]);
    }
    return [...byDay.entries()];
  }, [timeline, query]);

  return (
    <div className="flex h-full min-h-[420px] flex-col border-l border-odoo-border bg-white">
      <div className="flex flex-wrap items-center gap-1 px-3 py-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`h-7 rounded-[4px] px-3 text-[13px] transition-colors ${
              mode === m.id
                ? "bg-odoo-primary font-medium text-white"
                : "border border-odoo-border bg-white text-odoo-text hover:bg-odoo-bg"
            }`}
          >
            {m.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Поиск по ленте"
            title="Поиск по ленте"
            onClick={() => {
              setSearchOpen((v) => !v);
              if (searchOpen) setQuery("");
            }}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors hover:bg-odoo-bg ${
              searchOpen ? "text-odoo-primary" : "text-odoo-text-muted hover:text-odoo-text"
            }`}
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="flex items-center gap-1 px-3 pb-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Искать в ленте…"
            className="h-7 w-full rounded-[4px] border border-odoo-border px-2 text-[13px] text-odoo-text outline-none placeholder:text-odoo-text-light focus:border-odoo-primary"
          />
          {query && (
            <button
              type="button"
              aria-label="Очистить поиск"
              onClick={() => setQuery("")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-odoo-text-muted hover:bg-odoo-bg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <form
        className="border-b border-odoo-border-light px-3 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onSubmit?.(text.trim(), mode);
          setText("");
        }}
      >
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={current.placeholder}
          className="w-full resize-y rounded-[4px] border border-odoo-border px-2 py-1.5 text-[13px] text-odoo-text outline-none placeholder:text-odoo-text-light focus:border-odoo-primary"
        />
        <div className="mt-1 flex justify-end">
          <button
            type="submit"
            disabled={!text.trim()}
            className="h-7 rounded-[4px] bg-odoo-primary px-3 text-[13px] font-medium text-white transition-colors hover:bg-odoo-primary-hover disabled:opacity-50"
          >
            {current.action}
          </button>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {groups.length === 0 && (
          <p className="py-6 text-center text-[12px] text-odoo-text-light">
            {query ? "Ничего не найдено" : "Пока нет записей"}
          </p>
        )}
        {groups.map(([day, entries]) => (
          <div key={day}>
            <div className="my-2 flex items-center gap-2">
              <span className="h-px flex-1 bg-odoo-border-light" />
              <span className="text-[11px] text-odoo-text-muted">{day}</span>
              <span className="h-px flex-1 bg-odoo-border-light" />
            </div>
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 py-1.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#4b4b55] text-[11px] font-semibold text-white">
                  {entry.author_initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-[13px] font-bold text-odoo-text">{entry.author_name}</span>
                    <span className="text-[12px] text-odoo-text-muted" title={absoluteTime(entry.created_at)}>
                      - {relativeTime(entry.created_at)}
                    </span>
                  </div>
                  {entry.field_label ? (
                    <div className="flex flex-wrap items-baseline gap-1 text-[13px]">
                      <span className="text-odoo-text-light">•</span>
                      <span className="text-odoo-text">{entry.old_value || "—"}</span>
                      <span className="text-odoo-text-light">→</span>
                      <span className="font-medium text-odoo-secondary">{entry.new_value || "—"}</span>
                      <span className="italic text-odoo-text-muted">({entry.field_label})</span>
                    </div>
                  ) : (
                    <p
                      className={`text-[13px] leading-[19px] ${
                        entry.type === "history" ? "text-odoo-text-muted" : "text-odoo-text"
                      }`}
                    >
                      {entry.body}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
