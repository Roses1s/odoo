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
import type { Lead, Stage, Tag } from "@/shared/types";
import { KanbanCardSkeleton } from "@/shared/ui/skeleton";

function results<T>(data: unknown): T[] {
  return unwrapList<T>(data);
}

function formatMoney(v: string | number | undefined) {
  const n = Number(v || 0);
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);
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

function initials(email?: string) {
  const s = (email || "?").split("@")[0];
  return s.slice(0, 2).toUpperCase();
}

function StarRating({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <span className="text-[12px] tracking-tight text-odoo-warning" aria-label={`Приоритет: ${value} из 3`}>
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
  const revenue = Number(lead.expected_revenue || 0);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className={menuSpace ? "pr-7" : ""}>
        <h3
          className="line-clamp-2 text-[13px] font-semibold leading-4 text-odoo-text"
          title={title}
        >
          {title}
        </h3>
        {lead.logist_contact && (
          <p className="mt-0.5 truncate text-[12px] text-odoo-text-muted" title={lead.logist_contact}>
            {lead.logist_contact}
          </p>
        )}
        {revenue > 0 && (
          <p className="mt-1 text-[12px] font-medium text-odoo-text">{formatMoney(revenue)}</p>
        )}
      </div>

      {lead.tags?.length > 0 && (
        <div className="mt-1.5 flex min-h-4 flex-nowrap gap-1 overflow-hidden">
          {lead.tags.map((tag) => (
            <span
              key={tag.id}
              title={tag.name}
              className="inline-flex max-w-full items-center rounded-full bg-[#eeeaea] px-2 py-0.5 text-[10px] font-normal leading-none text-[#6f666a]"
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
            <Clock3 className="h-3.5 w-3.5" />
          </span>
        </div>
        <span
          title={lead.assigned_to_email || "Не назначен"}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-odoo-primary text-[8px] font-semibold text-white"
        >
          {initials(lead.assigned_to_email)}
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
      className={`overflow-hidden border-b border-odoo-border-light bg-white px-2 py-1.5 ${
        isOverlay
          ? "w-[250px] cursor-grabbing rounded border border-odoo-primary shadow-lg"
          : isDragging
            ? "cursor-grabbing opacity-25"
            : "cursor-grab hover:bg-[#faf8f9]"
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
              className="absolute right-0 top-7 min-w-[110px] rounded border border-odoo-border bg-white py-1 shadow-lg"
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
      return api.post("/crm/leads/", { name, inn: n, stage: stageId, expected_revenue: 0 });
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
      className="m-1 rounded border border-odoo-primary bg-white p-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && inn.trim()) create.mutate();
      }}
    >
      <input
        autoFocus
        className="mb-1 w-full border-b border-odoo-border-light px-1 py-1 text-sm outline-none"
        placeholder="Название"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="mb-2 w-full border-b border-odoo-border-light px-1 py-1 text-sm outline-none"
        placeholder="ИНН"
        value={inn}
        onChange={(e) => setInn(e.target.value)}
      />
      <div className="flex gap-1">
        <button type="submit" className="rounded bg-odoo-primary px-2 py-1 text-xs text-white" disabled={create.isPending}>
          Добавить
        </button>
        <button type="button" className="px-2 py-1 text-xs text-odoo-text-muted" onClick={onDone}>
          Отмена
        </button>
      </div>
      {create.isError && <p className="mt-1 text-[11px] text-odoo-danger">Проверьте ИНН</p>}
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
        className="flex h-[min(70vh,520px)] w-10 shrink-0 flex-col items-center rounded border border-odoo-border-light bg-white py-3"
        style={{ borderTop: `3px solid ${color}` }}
      >
        <span className="mt-8 origin-center rotate-180 text-[12px] font-semibold tracking-wide text-odoo-text [writing-mode:vertical-rl]">
          {stage.name} ({leads.length})
        </span>
      </button>
    );
  }

  return (
    <div className="flex w-[min(100vw-1rem,250px)] shrink-0 snap-center flex-col md:w-[250px]">
      <div className="border-x border-t border-odoo-border-light bg-[#f8f7f8] px-2 pb-1.5 pt-1.5">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            {editing && canManage ? (
              <input
                autoFocus
                className="w-full rounded border border-odoo-primary px-1 text-[13px] font-semibold"
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
              <button type="button" className="truncate text-[13px] font-semibold text-odoo-text" onDoubleClick={() => canManage && setEditing(true)}>
                {stage.name}
                <span className="ml-1 font-normal text-odoo-text-muted">{leads.length}</span>
              </button>
            )}
            <div className="text-[11px] text-odoo-text-muted">{formatMoney(leads.reduce((s, l) => s + Number(l.expected_revenue || 0), 0))}</div>
          </div>
          <div className="relative flex items-center gap-0.5">
            <button
              type="button"
              className="p-0.5 text-odoo-text-muted hover:text-odoo-text"
              onClick={() => setQuick(true)}
              title="Добавить лид"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="p-0.5 text-odoo-text-muted hover:text-odoo-text" onClick={onFold} title="Свернуть">
              ‹
            </button>
            {canManage && (
              <>
                <button type="button" onClick={() => setMenu((v) => !v)}>
                  <MoreHorizontal className="h-4 w-4 text-odoo-text-muted" />
                </button>
                {menu && (
                  <div className="absolute right-0 top-6 z-20 min-w-[200px] rounded border border-odoo-border bg-white py-1 shadow-lg">
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
        <div className="mt-1 h-2 overflow-hidden bg-[#dedcdf]">
          <div
            className="h-full min-w-1"
            style={{
              width: `${Math.min(100, Math.max(4, leads.length * 12))}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[240px] flex-1 flex-col overflow-y-auto border border-t-0 border-odoo-border-light ${isOver ? "bg-[#eef4fb]" : "bg-white"}`}
      >
        <SortableContext items={leads.map((l) => `lead-${l.id}`)} strategy={verticalListSortingStrategy}>
          {loading ? Array.from({ length: 3 }).map((_, i) => <KanbanCardSkeleton key={i} />) : leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
        </SortableContext>
        {quick ? (
          <QuickCreate stageId={stage.id} onDone={() => setQuick(false)} />
        ) : (
          <button type="button" className="flex items-center gap-1 px-2 py-1.5 text-[12px] text-odoo-text-muted hover:text-odoo-text" onClick={() => setQuick(true)}>
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

function Dropdown({ label, children, active }: { label: string; children: React.ReactNode; active?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className={`flex items-center gap-0.5 rounded px-2 py-1 text-sm ${active ? "bg-odoo-primary/10 font-medium text-odoo-primary" : "text-odoo-text-muted hover:bg-odoo-bg"}`}
        onClick={() => setOpen((v) => !v)}
      >
        {label} <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-label="Закрыть" />
          <div className="absolute left-0 z-20 mt-1 min-w-[200px] rounded border border-odoo-border bg-white py-1 shadow-lg" onClick={() => setOpen(false)}>
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
      >
        {settingsOpen && (
          <div className="absolute right-3 top-11 z-40 flex min-w-[220px] flex-col rounded border border-odoo-border bg-white py-1 shadow-lg">
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
              className="block w-full px-3 py-1.5 text-left text-sm text-odoo-primary hover:bg-odoo-bg"
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

      {leads.length === 0 && !leadsQ.isLoading && (
        <div className="px-4 pt-10 text-center text-sm text-odoo-text-muted">
          Нет лидов. Нажмите <span className="font-medium text-odoo-text">Новый</span> или «+ Добавить» в колонке.
        </div>
      )}

      {view === "list" && (
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[640px] border-collapse bg-white text-sm">
            <thead className="bg-odoo-bg text-[11px] font-semibold uppercase text-odoo-text-muted">
              <tr>
                <th className="p-2 text-left">Название</th>
                <th className="p-2 text-left">ИНН</th>
                <th className="p-2 text-left">Этап</th>
                <th className="p-2 text-left">Сумма</th>
                <th className="p-2 text-left">Ответственный</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr
                  key={l.id}
                  className="cursor-pointer border-b border-odoo-border-light hover:bg-odoo-bg"
                  onClick={() => navigate(`/crm/leads/${l.id}`)}
                >
                  <td className="p-2 font-medium">{l.name}</td>
                  <td className="p-2">{l.inn}</td>
                  <td className="p-2">{l.stage_name}</td>
                  <td className="p-2">{formatMoney(l.expected_revenue)}</td>
                  <td className="p-2">{l.assigned_to_email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view !== "list" && (
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto bg-[#f3f2f3] p-2 md:snap-none">
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
                <div key={col.key} className="w-[250px] shrink-0">
                  <div className="mb-2 text-[13px] font-semibold">
                    {col.title} <span className="font-normal text-odoo-text-muted">{col.items.length}</span>
                  </div>
                  <div className="flex min-h-[200px] flex-col border border-odoo-border-light bg-white">
                    {col.items.map((lead) => (
                      <Link key={lead.id} to={`/crm/leads/${lead.id}`} className="overflow-hidden border-b border-odoo-border-light bg-white px-2 py-1.5 hover:bg-[#faf8f9]">
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
