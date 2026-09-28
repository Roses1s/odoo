// Extracted from KanbanPage: the board screen had grown past nine hundred
// lines with data fetching, widgets and markup in one file.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ownerInitials, ownerLabel } from "@/shared/lib/owner";
import type { Lead } from "@/shared/types";
import { ListRowSkeleton } from "@/shared/ui/skeleton";
import { StarRating } from "../board/StarRating";

const LIST_COLUMNS = 7;

// Odoo renders a column page at a time. Drawing every card and every row at
// once costs thousands of DOM nodes on a real database and makes dragging
// sluggish, so the rest appears on demand.
const ROWS_PER_PAGE = 80;

function ListTh({
  children,
  className = "",
  numeric = false,
}: {
  children: React.ReactNode;
  className?: string;
  numeric?: boolean;
}) {
  return (
    <th
      scope="col"
      className={`sticky top-0 z-10 truncate bg-odoo-bg px-2 py-1.5 align-middle text-[13px] font-medium text-odoo-text shadow-[inset_0_-1px_0_rgb(var(--odoo-border))] ${
        numeric ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function LeadListView({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(ROWS_PER_PAGE);
  const shown = leads.slice(0, visible);
  const hidden = leads.length - shown.length;
  return (
    <div className="h-[calc(100dvh-90px)] min-h-0 overflow-auto overscroll-contain border-t border-odoo-border-light bg-odoo-surface [scrollbar-gutter:stable]">
      <table className="w-full min-w-[1180px] table-fixed border-collapse bg-odoo-surface text-[13px] leading-[18px] text-odoo-text [font-variant-numeric:tabular-nums]">
        <colgroup>
          <col />
          <col className="w-[120px]" />
          <col className="w-[190px]" />
          <col className="w-[190px]" />
          <col className="w-[190px]" />
          <col className="w-[150px]" />
          <col className="w-[80px]" />
        </colgroup>
        <thead>
          <tr>
            <ListTh className="pl-4">Название</ListTh>
            <ListTh>ИНН</ListTh>
            <ListTh>Контакт</ListTh>
            <ListTh>Теги</ListTh>
            <ListTh>Ответственный</ListTh>
            <ListTh>Этап</ListTh>
            <ListTh className="pr-4">Приоритет</ListTh>
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 10 }).map((_, i) => (
              <ListRowSkeleton key={i} cols={LIST_COLUMNS} />
            ))}

          {!loading && leads.length === 0 && (
            <tr>
              <td
                colSpan={LIST_COLUMNS}
                className="px-4 py-12 text-center text-[13px] text-odoo-text-muted"
              >
                Нет лидов. Нажмите <span className="font-medium text-odoo-text">Новый</span>, чтобы
                создать первый.
              </td>
            </tr>
          )}

          {shown.map((lead) => (
            <tr
              key={lead.id}
              className="cursor-pointer border-b border-odoo-border-light bg-odoo-surface hover:bg-odoo-surface-hover"
              onClick={() => navigate(`/crm/leads/${lead.id}`)}
            >
              <td className="truncate px-2 py-1 pl-4" title={lead.name}>
                {lead.name}
              </td>
              <td className="truncate px-2 py-1">{lead.inn}</td>
              <td
                className="truncate px-2 py-1 text-odoo-text-muted"
                title={lead.logist_contact || undefined}
              >
                {lead.logist_contact || "—"}
              </td>
              <td className="overflow-hidden px-2 py-1">
                {lead.tags?.length > 0 ? (
                  <span className="flex flex-nowrap items-center gap-1 overflow-hidden">
                    {lead.tags.map((tag) => (
                      <span
                        key={tag.id}
                        title={tag.name}
                        className="inline-block max-w-[110px] shrink-0 truncate rounded-full bg-odoo-chip px-2 py-0.5 text-[11px] font-normal leading-[14px] text-odoo-chip-text"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-odoo-text-light">—</span>
                )}
              </td>
              <td className="px-2 py-1">
                <span className="flex items-center gap-1.5 overflow-hidden">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-odoo-primary text-[9px] font-semibold text-white">
                    {ownerInitials(lead)}
                  </span>
                  <span className="truncate" title={lead.assigned_to_email || "Не назначен"}>
                    {ownerLabel(lead) || "Не назначен"}
                  </span>
                </span>
              </td>
              <td className="truncate px-2 py-1" title={lead.stage_name}>
                {lead.stage_name}
              </td>
              <td className="px-2 py-1 pr-4">
                <StarRating value={lead.priority} />
              </td>
            </tr>
          ))}
          {hidden > 0 && (
            <tr>
              <td colSpan={LIST_COLUMNS} className="px-4 py-2">
                <button
                  type="button"
                  onClick={() => setVisible((n) => n + ROWS_PER_PAGE)}
                  className="text-[13px] text-odoo-action hover:underline"
                >
                  Показать ещё {Math.min(ROWS_PER_PAGE, hidden)} из {leads.length}
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
