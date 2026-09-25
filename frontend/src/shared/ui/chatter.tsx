import { differenceInHours, format, formatDistanceToNow, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar, FileText, Mail, Paperclip } from "lucide-react";
import { useState } from "react";
import type { TimelineEntry } from "@/shared/types";

function formatTime(iso: string): string {
  const date = new Date(iso);
  const hours = differenceInHours(new Date(), date);
  if (Number.isNaN(date.getTime())) return "";
  if (hours < 1) return formatDistanceToNow(date, { addSuffix: true, locale: ru });
  if (hours < 24) {
    if (isYesterday(date)) return `вчера в ${format(date, "HH:mm")}`;
    return formatDistanceToNow(date, { addSuffix: true, locale: ru });
  }
  return format(date, "d MMMM yyyy, HH:mm", { locale: ru });
}

const BADGE: Record<string, { label: string; className: string } | undefined> = {
  history: { label: "Изменение", className: "border-odoo-border text-odoo-text-muted" },
  message: { label: "Email", className: "border-odoo-info text-odoo-info" },
  activity: { label: "Задача", className: "border-odoo-success text-odoo-success" },
};

interface ChatterProps {
  timeline: TimelineEntry[];
  onSubmit?: (body: string, type: TimelineEntry["type"]) => void;
}

export function Chatter({ timeline, onSubmit }: ChatterProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<TimelineEntry["type"]>("note");

  const modes = [
    { id: "note" as const, label: "Заметка", Icon: FileText },
    { id: "message" as const, label: "Сообщение", Icon: Mail },
    { id: "activity" as const, label: "Задача", Icon: Calendar },
  ];

  return (
    <div className="flex h-full min-h-[420px] flex-col border-l border-odoo-border bg-white">
      <div className="flex gap-1 border-b border-odoo-border-light p-3">
        {modes.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === id ? "bg-odoo-bg text-odoo-primary" : "text-odoo-primary hover:bg-odoo-bg"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {timeline.length === 0 && (
          <p className="py-6 text-center text-xs text-odoo-text-light">Пока нет записей</p>
        )}
        {timeline.map((entry, i) => {
          const badge = BADGE[entry.type];
          return (
            <div key={entry.id}>
              <div className="flex items-start gap-2.5 py-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-odoo-primary text-[10px] text-white">
                  {entry.author_initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-odoo-text">{entry.author_name}</span>
                    <span className="text-[11px] text-odoo-text-light">·</span>
                    <span className="text-[11px] text-odoo-text-light">{formatTime(entry.created_at)}</span>
                    {badge && (
                      <span className={`h-4 rounded border px-1 text-[10px] ${badge.className}`}>{badge.label}</span>
                    )}
                  </div>
                  <p
                    className={`mt-0.5 text-sm leading-relaxed ${
                      entry.type === "history" ? "text-odoo-text-muted" : "text-odoo-text"
                    }`}
                  >
                    {entry.body}
                  </p>
                </div>
              </div>
              {i < timeline.length - 1 && <div className="ml-8 border-b border-odoo-border-light" />}
            </div>
          );
        })}
      </div>

      <div className="border-t border-odoo-border p-3">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onSubmit?.(text.trim(), mode);
            setText("");
          }}
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              mode === "activity" ? "Описать задачу..." : mode === "message" ? "Текст сообщения..." : "Написать комментарий..."
            }
            className="flex-1 rounded border border-odoo-border px-2.5 py-1.5 text-sm placeholder:text-odoo-text-light focus:border-odoo-primary focus:outline-none focus:ring-1 focus:ring-odoo-primary"
          />
          <button type="button" className="p-1.5 text-odoo-text-muted hover:text-odoo-text">
            <Paperclip className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
