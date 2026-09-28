import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Clock3, MoreHorizontal, MoreVertical, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell, ControlPanel } from "@/app/layout/AppShell";
import { useAuthStore } from "@/features/auth/store";
import { api } from "@/shared/api/client";
import { unwrapList } from "@/shared/lib/http";
import { innChecksumOk, normalizeInn } from "@/shared/lib/inn";
import { ownerInitials, ownerLabel } from "@/shared/lib/owner";
import type { Lead, Stage, Tag } from "@/shared/types";
import { KanbanCardSkeleton, ListRowSkeleton } from "@/shared/ui/skeleton";

function results<T>(data: unknown): T[] {
  return unwrapList<T>(data);
}

const STAGE_COLORS: Record<string, string> = {
  slate: "#6C757D",
  purple: "#714B67",
  blue: "#17A2B8",
  green: "#28A745",
  red: "#DC3545",
  orange: "#FD7E14",
  yellow: "#FFC107",
};

function stageColor(c: string) {
  return STAGE_COLORS[c] || STAGE_COLORS.purple;
}

function StarRating({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <span className="text-[15px] leading-none tracking-tight text-odoo-warning" aria-label={`Приоритет: ${value} из 3`}>
      {[1, 2, 3].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            className="px-px"
            aria-label={`Приоритет ${n}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(value === n ? 0 : n);
            }}
          >
            {value >= n ? "★" : "☆"}
          </button>
        ) : (
          <span key={n} className="px-px" aria-hidden="true">
            {value >= n ? "★" : "☆"}
          </span>
        ),
      )}
    </span>
  );
}

function LeadCardBody({ lead, menuSpace = false }: { lead: Lead; menuSpace?: boolean }) {
  const title = `${lead.name} — ${lead.inn}`;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className={menuSpace ? "pr-7" : ""}>
        <h3
          className="line-clamp-3 text-[15px] font-medium leading-5 text-odoo-text"
          title={title}
        >
          {title}
        </h3>
        <p
          className="mt-0.5 truncate text-[13px] leading-[18px] text-odoo-text-muted"
          title={lead.logist_contact || lead.name}
        >
          {lead.logist_contact || lead.name}
        </p>
      </div>

      {lead.tags?.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1 overflow-hidden">
          {lead.tags.map((tag) => (
            <span
              key={tag.id}
              title={tag.name}
              className="inline-flex max-w-full items-center rounded-full bg-odoo-chip px-2 py-0.5 text-[11px] font-normal leading-[14px] text-odoo-chip-text"
            >
              <span className="max-w-[150px] truncate">{tag.name}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-1 flex shrink-0 items-end justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <StarRating value={lead.priority} />
          <span title="Активности пока не подключены" className="text-odoo-text-muted">
            <Clock3 className="h-4 w-4" />
          </span>
        </div>
        <span
          title={
            [ownerLabel(lead), lead.assigned_to_email].filter(Boolean).join(" · ") || "Не назначен"
          }
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-odoo-primary text-[9px] font-semibold text-white"
        >
          {ownerInitials(lead)}
        </span>
      </div>
    </div>
  );
}

function LeadCard({ lead, isOverlay }: { lead: Lead; isOverlay?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `lead-${lead.id}`,
    disabled: isOverlay,
  });
  const style = isOverlay
    ? undefined
    : { transform: CSS.Translate.toString(transform), transition: isDragging ? undefined : transition };

  const inner = (
    <div
      className={`overflow-hidden border-b border-odoo-border-light bg-odoo-surface px-2.5 py-2 ${
        isOverlay
          ? "w-[325px] cursor-grabbing rounded border border-odoo-primary shadow-lg"
          : isDragging
            ? "cursor-grabbing opacity-25"
            : "cursor-grab hover:bg-odoo-surface-hover"
      }`}
    >
      <LeadCardBody lead={lead} menuSpace={!isOverlay} />
    </div>
  );

  if (isOverlay) return inner;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative touch-none"
      aria-label={`Переместить ${lead.name}`}
    >
      {!isDragging && (
        <div className="absolute right-1 top-1 z-20">
          <button
            type="button"
            aria-label="Меню карточки"
            title="Меню"
            className="rounded p-1 text-odoo-text-light opacity-0 hover:bg-odoo-bg hover:text-odoo-text focus:opacity-100 group-hover:opacity-100"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((open) => !open);
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-7 min-w-[110px] rounded border border-odoo-border bg-odoo-surface py-1 shadow-lg"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                to={`/crm/leads/${lead.id}`}
                className="block px-3 py-1.5 text-left text-xs text-odoo-text hover:bg-odoo-bg"
              >
                Открыть
              </Link>
            </div>
          )}
        </div>
      )}
      {isDragging ? (
        inner
      ) : (
        <Link to={`/crm/leads/${lead.id}`} className="block">
          {inner}
        </Link>
      )}
    </div>
  );
}

function QuickCreate({ stageId, onDone }: { stageId: number; onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [inn, setInn] = useState("");
  const create = useMutation({
    mutationFn: () => {
      const n = normalizeInn(inn);
      if ((n.length !== 10 && n.length !== 12) || !innChecksumOk(n)) {
        throw new Error("inn");
      }
      return api.post("/crm/leads/", { name, inn: n, stage: stageId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["stages"] });
      setName("");
      setInn("");
      onDone();
    },
  });
  return (
    <form
      className="border-b border-odoo-border-light bg-odoo-surface px-2.5 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && inn.trim()) create.mutate();
      }}
    >
      <div className="border border-odoo-accent-line bg-odoo-surface shadow-sm focus-within:ring-1 focus-within:ring-odoo-accent-line">
        <input
          autoFocus
          className="block h-8 w-full border-b border-odoo-border-light px-2 text-[13px] outline-none placeholder:text-odoo-text-light"
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="block h-8 w-full px-2 text-[13px] outline-none placeholder:text-odoo-text-light"
          placeholder="ИНН"
          inputMode="numeric"
          value={inn}
          onChange={(e) => setInn(e.target.value)}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          className="rounded-[3px] bg-odoo-primary px-3 py-1 text-[12px] font-medium text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          disabled={create.isPending || !name.trim() || !inn.trim()}
        >
          {create.isPending ? "Добавление…" : "Добавить"}
        </button>
        <button type="button" className="px-1 py-1 text-[12px] text-odoo-text-muted hover:text-odoo-text" onClick={onDone}>
          Отмена
        </button>
      </div>
      {create.isError && <p className="mt-1.5 text-[11px] text-odoo-danger">Проверьте ИНН</p>}
    </form>
  );
}

function Column({
  stage,
  leads,
  loading,
  canManage,
  folded,
  onFold,
  allStages,
}: {
  stage: Stage;
  leads: Lead[];
  loading: boolean;
  canManage: boolean;
  folded: boolean;
  onFold: () => void;
  allStages: Stage[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.id}` });
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stage.name);
  const [menu, setMenu] = useState(false);
  const [quick, setQuick] = useState(false);
  const color = stageColor(stage.color);

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch(`/crm/stages/${stage.id}/`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stages"] }),
  });
  const remove = useMutation({
    mutationFn: (fallback?: number) =>
      api.delete(`/crm/stages/${stage.id}/${fallback ? `?fallback_stage_id=${fallback}` : ""}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stages"] }),
  });

  if (folded) {
    return (
      <button
        type="button"
        onClick={onFold}
        className="flex h-full w-10 shrink-0 flex-col items-center border-r border-odoo-border-light bg-odoo-surface py-3"
        style={{ borderTop: `3px solid ${color}` }}
      >
        <span className="mt-8 origin-center rotate-180 text-[12px] font-semibold tracking-wide text-odoo-text [writing-mode:vertical-rl]">
          {stage.name} ({leads.length})
        </span>
      </button>
    );
  }

  return (
    <div className="flex h-full w-[min(100vw-1rem,325px)] shrink-0 snap-center flex-col border-r border-odoo-border-light bg-odoo-surface md:w-[325px]">
      <div className="shrink-0 bg-odoo-column-head px-2.5 pb-2 pt-2">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            {editing && canManage ? (
              <input
                autoFocus
                className="w-full rounded border border-odoo-primary px-1 text-[15px] font-semibold"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  setEditing(false);
                  if (name.trim() && name !== stage.name) patch.mutate({ name: name.trim() });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            ) : (
              <button type="button" className="truncate text-[15px] font-semibold leading-5 text-odoo-text" onDoubleClick={() => canManage && setEditing(true)}>
                {stage.name}
                <span className="ml-1 font-normal text-odoo-text-muted">{leads.length}</span>
              </button>
            )}
          </div>
          <div className="relative flex items-center gap-px">
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-odoo-text-muted hover:bg-odoo-surface-sunken hover:text-odoo-text"
              onClick={() => setQuick(true)}
              title="Добавить лид"
              aria-label="Добавить лид"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="inline-flex h-6 w-5 items-center justify-center rounded-sm text-[17px] leading-none text-odoo-text-muted hover:bg-odoo-surface-sunken hover:text-odoo-text"
              onClick={onFold}
              title="Свернуть"
              aria-label="Свернуть этап"
            >
              ‹
            </button>
            {canManage && (
              <>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-odoo-text-muted hover:bg-odoo-surface-sunken hover:text-odoo-text"
                  onClick={() => setMenu((v) => !v)}
                  title="Меню этапа"
                  aria-label="Меню этапа"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menu && (
                  <div className="absolute right-0 top-6 z-20 min-w-[200px] rounded border border-odoo-border bg-odoo-surface py-1 shadow-lg">
                    <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg" onClick={() => { setMenu(false); setEditing(true); }}>
                      Переименовать
                    </button>
                    <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg" onClick={() => { setMenu(false); patch.mutate({ is_closed: !stage.is_closed }); }}>
                      {stage.is_closed ? "Открывающий этап" : "Закрывающий этап"}
                    </button>
                    <div className="flex flex-wrap gap-1 px-3 py-1.5">
                      {Object.keys(STAGE_COLORS).map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="h-4 w-4 rounded-full border border-white shadow"
                          style={{ background: STAGE_COLORS[c] }}
                          onClick={() => { setMenu(false); patch.mutate({ color: c }); }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-sm text-odoo-danger hover:bg-odoo-bg"
                      onClick={() => {
                        setMenu(false);
                        const other = allStages.find((s) => s.id !== stage.id);
                        if (leads.length && other) remove.mutate(other.id);
                        else remove.mutate(undefined);
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-2.5 w-[150px] overflow-hidden bg-odoo-track">
            <div
              className="h-full min-w-1"
              style={{
                width: `${Math.min(100, Math.max(4, leads.length * 12))}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable] ${isOver ? "bg-odoo-drop" : "bg-odoo-surface"}`}
      >
        <SortableContext items={leads.map((l) => `lead-${l.id}`)} strategy={verticalListSortingStrategy}>
          {loading ? Array.from({ length: 3 }).map((_, i) => <KanbanCardSkeleton key={i} />) : leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
        </SortableContext>
        {quick ? (
          <QuickCreate stageId={stage.id} onDone={() => setQuick(false)} />
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-1 px-2.5 py-2 text-left text-[13px] text-odoo-text-muted hover:bg-odoo-surface-hover hover:text-odoo-text"
            onClick={() => setQuick(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Добавить
          </button>
        )}
      </div>
    </div>
  );
}

const dropAnimation: DropAnimation = {
  duration: 160,
  easing: "ease-out",
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.3" } } }),
};

const LIST_COLUMNS = 7;

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

function LeadListView({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  const navigate = useNavigate();
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
          {loading && Array.from({ length: 10 }).map((_, i) => <ListRowSkeleton key={i} cols={LIST_COLUMNS} />)}

          {!loading && leads.length === 0 && (
            <tr>
              <td colSpan={LIST_COLUMNS} className="px-4 py-12 text-center text-[13px] text-odoo-text-muted">
                Нет лидов. Нажмите <span className="font-medium text-odoo-text">Новый</span>, чтобы создать первый.
              </td>
            </tr>
          )}

          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="cursor-pointer border-b border-odoo-border-light bg-odoo-surface hover:bg-odoo-surface-hover"
              onClick={() => navigate(`/crm/leads/${lead.id}`)}
            >
              <td className="truncate px-2 py-1 pl-4" title={lead.name}>
                {lead.name}
              </td>
              <td className="truncate px-2 py-1">{lead.inn}</td>
              <td className="truncate px-2 py-1 text-odoo-text-muted" title={lead.logist_contact || undefined}>
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
        </tbody>
      </table>
    </div>
  );
}

function Dropdown({ label, children, active }: { label: string; children: React.ReactNode; active?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative min-w-0 px-1">
      <button
        type="button"
        className={`flex w-full items-center justify-between gap-2 rounded-[3px] px-2 py-1.5 text-[13px] ${active ? "bg-odoo-primary/10 font-medium text-odoo-action" : "text-odoo-text-muted hover:bg-odoo-bg"}`}
        onClick={() => setOpen((v) => !v)}
      >
        {label} <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-label="Закрыть" />
          <div className="absolute left-0 z-50 mt-1 max-h-[360px] min-w-full overflow-y-auto rounded-[3px] border border-odoo-border bg-odoo-surface py-1 shadow-lg" onClick={() => setOpen(false)}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

export function KanbanPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === "admin" || user?.role === "manager";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [newStage, setNewStage] = useState(false);
  const [stageName, setStageName] = useState("");
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moveError, setMoveError] = useState("");
  const [folded, setFolded] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("crm-folded-stages") || "[]");
    } catch {
      return [];
    }
  });

  const priority = params.get("priority") || "";
  const search = params.get("search") || "";
  const stageF = params.get("stage") || "";
  const tagF = params.get("tags") || "";
  const archived = params.get("is_archived") || "";
  const group = params.get("group") || "stage";
  const view = params.get("view") === "list" ? "list" : "kanban";
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    localStorage.setItem("crm-folded-stages", JSON.stringify(folded));
  }, [folded]);

  useEffect(() => {
    const t = setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (searchInput) next.set("search", searchInput);
        else next.delete("search");
        return next;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, setParams]);

  const stagesQ = useQuery({
    queryKey: ["stages"],
    queryFn: async () => results<Stage>((await api.get("/crm/stages/")).data),
  });
  const tagsQ = useQuery({
    queryKey: ["tags"],
    queryFn: async () => results<Tag>((await api.get("/crm/tags/")).data),
  });
  const leadsQ = useQuery({
    queryKey: ["leads", priority, search, stageF, tagF, archived],
    queryFn: async () => {
      const q = new URLSearchParams({ page_size: "500" });
      if (priority) q.set("priority", priority);
      if (search) q.set("search", search);
      if (stageF) q.set("stage", stageF);
      if (tagF) q.set("tags", tagF);
      if (archived) q.set("is_archived", archived);

      const all: Lead[] = [];
      let url: string | null = `/crm/leads/?${q}`;
      while (url) {
        const response: { data: { results?: Lead[]; next?: string | null } | Lead[] } = await api.get(url);
        all.push(...results<Lead>(response.data));
        if (Array.isArray(response.data) || !response.data.next) break;
        const next = new URL(response.data.next, window.location.origin);
        url = `${next.pathname.replace(/^\/api/, "")}${next.search}`;
      }
      return all;
    },
  });

  const moveLead = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: number }) => api.patch(`/crm/leads/${id}/`, { stage }),
    onMutate: async ({ id, stage }) => {
      setMoveError("");
      await qc.cancelQueries({ queryKey: ["leads"] });
      const key = ["leads", priority, search, stageF, tagF, archived];
      const prev = qc.getQueryData<Lead[]>(key);
      qc.setQueryData<Lead[]>(key, (old) => (old ?? []).map((l) => (l.id === id ? { ...l, stage } : l)));
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
      setMoveError("Не удалось переместить лид. Изменение отменено.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
  const createStage = useMutation({
    mutationFn: (name: string) => api.post("/crm/stages/", { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stages"] });
      setNewStage(false);
      setStageName("");
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );
  const stages = stagesQ.data ?? [];
  const leads = useMemo(() => {
    const all = leadsQ.data ?? [];
    if (archived === "true") return all;
    return all.filter((l) => !l.is_archived);
  }, [leadsQ.data, archived]);

  const filterActive = Boolean(priority || stageF || tagF || archived);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  function onDragStart(event: DragStartEvent) {
    const id = Number(String(event.active.id).replace("lead-", ""));
    setActiveLead(leads.find((l) => l.id === id) ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;
    const leadId = Number(String(active.id).replace("lead-", ""));
    let stageId: number | null = null;
    if (String(over.id).startsWith("stage-")) stageId = Number(String(over.id).replace("stage-", ""));
    else if (String(over.id).startsWith("lead-")) {
      const other = leads.find((l) => l.id === Number(String(over.id).replace("lead-", "")));
      stageId = other?.stage ?? null;
    }
    const lead = leads.find((l) => l.id === leadId);
    if (lead && stageId && lead.stage !== stageId) moveLead.mutate({ id: leadId, stage: stageId });
  }

  const groupColumns =
    group === "assigned"
      ? Array.from(new Set(leads.map((l) => l.assigned_to_email || "Не назначен"))).map((email) => ({
          key: email,
          title: email,
          items: leads.filter((l) => (l.assigned_to_email || "Не назначен") === email),
        }))
      : stages.map((s) => ({ key: String(s.id), title: s.name, items: leads.filter((l) => l.stage === s.id) }));

  return (
    <AppShell>
      <ControlPanel
        title="Лиды"
        search={searchInput}
        onSearch={setSearchInput}
        onCreate={() => navigate("/crm/leads/new")}
        onSettings={() => setSettingsOpen((v) => !v)}
        view={view}
        onView={(v) => setFilter("view", v === "list" ? "list" : "")}
        count={view === "list" ? leads.length : undefined}
      >
        {settingsOpen && (
          <div className="absolute left-1/2 top-full z-40 grid w-[min(calc(100vw-1.5rem),600px)] -translate-x-1/2 grid-cols-2 divide-x divide-odoo-border-light rounded-b-[3px] border border-t-0 border-odoo-border bg-odoo-surface p-1 shadow-lg">
        <Dropdown label="Фильтры" active={filterActive}>
          <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg" onClick={() => setFilter("priority", "")}>
            Все приоритеты
          </button>
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg" onClick={() => setFilter("priority", String(n))}>
              {"★".repeat(n)}
            </button>
          ))}
          <div className="my-1 border-t border-odoo-border-light" />
          {stages.map((s) => (
            <button key={s.id} type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg" onClick={() => setFilter("stage", String(s.id))}>
              Этап: {s.name}
            </button>
          ))}
          <div className="my-1 border-t border-odoo-border-light" />
          {(tagsQ.data ?? []).map((t) => (
            <button key={t.id} type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg" onClick={() => setFilter("tags", String(t.id))}>
              Тег: {t.name}
            </button>
          ))}
          <div className="my-1 border-t border-odoo-border-light" />
          <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg" onClick={() => setFilter("is_archived", archived === "true" ? "" : "true")}>
            {archived === "true" ? "Скрыть архив" : "Архив"}
          </button>
          {filterActive && (
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-sm text-odoo-action hover:bg-odoo-bg"
              onClick={() => {
                const next = new URLSearchParams(params);
                ["priority", "stage", "tags", "is_archived"].forEach((k) => next.delete(k));
                setParams(next);
              }}
            >
              Сбросить
            </button>
          )}
        </Dropdown>
        <Dropdown label="Группировка" active={group !== "stage"}>
          <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg" onClick={() => setFilter("group", "")}>
            По этапам
          </button>
          <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg" onClick={() => setFilter("group", "assigned")}>
            По ответственному
          </button>
        </Dropdown>
          </div>
        )}
      </ControlPanel>

      {moveError && (
        <div role="alert" className="mx-4 mt-3 rounded border border-odoo-danger/30 bg-red-50 px-3 py-2 text-sm text-odoo-danger">
          {moveError}
        </div>
      )}

      {view !== "list" && leads.length === 0 && !leadsQ.isLoading && (
        <div className="px-4 pt-10 text-center text-sm text-odoo-text-muted">
          Нет лидов. Нажмите <span className="font-medium text-odoo-text">Новый</span> или «+ Добавить» в колонке.
        </div>
      )}

      {view === "list" && <LeadListView leads={leads} loading={leadsQ.isLoading} />}

      {view !== "list" && (
      <div className="flex h-[calc(100dvh-90px)] min-h-0 snap-x snap-mandatory gap-0 overflow-x-auto overflow-y-hidden overscroll-x-contain border-t border-odoo-border-light bg-odoo-surface md:snap-none">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragCancel={() => setActiveLead(null)} onDragEnd={onDragEnd}>
          {group === "stage"
            ? stages.map((stage) => (
                <Column
                  key={stage.id}
                  stage={stage}
                  leads={leads.filter((l) => l.stage === stage.id)}
                  loading={leadsQ.isLoading}
                  canManage={!!canManage}
                  folded={folded.includes(stage.id)}
                  onFold={() => setFolded((f) => (f.includes(stage.id) ? f.filter((x) => x !== stage.id) : [...f, stage.id]))}
                  allStages={stages}
                />
              ))
            : groupColumns.map((col) => (
                <div key={col.key} className="flex h-full w-[325px] shrink-0 flex-col border-r border-odoo-border-light">
                  <div className="mb-2 text-[13px] font-semibold">
                    {col.title} <span className="font-normal text-odoo-text-muted">{col.items.length}</span>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain bg-odoo-surface [scrollbar-gutter:stable]">
                    {col.items.map((lead) => (
                      <Link key={lead.id} to={`/crm/leads/${lead.id}`} className="overflow-hidden border-b border-odoo-border-light bg-odoo-surface px-2.5 py-2 hover:bg-odoo-surface-hover">
                        <LeadCardBody lead={lead} />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
          <DragOverlay dropAnimation={dropAnimation} zIndex={50}>
            {activeLead ? <LeadCard lead={activeLead} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
        {canManage && group === "stage" && (
          <div className="w-[200px] shrink-0 pt-1">
            {newStage ? (
              <input
                autoFocus
                className="w-full rounded border border-odoo-border px-2 py-1.5 text-sm"
                placeholder="Название этапа"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                onBlur={() => stageName.trim() && createStage.mutate(stageName.trim())}
                onKeyDown={(e) => e.key === "Enter" && stageName.trim() && createStage.mutate(stageName.trim())}
              />
            ) : (
              <button type="button" className="flex items-center gap-1 text-sm text-odoo-text-muted hover:text-odoo-text" onClick={() => setNewStage(true)}>
                <Plus className="h-4 w-4" /> Добавить этап
              </button>
            )}
          </div>
        )}
      </div>
      )}
    </AppShell>
  );
}
