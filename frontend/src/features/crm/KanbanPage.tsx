import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell, ControlPanel } from "@/app/layout/AppShell";
import { useAuthStore } from "@/features/auth/store";
import { api } from "@/shared/api/client";
import { unwrapList } from "@/shared/lib/http";
import type { Lead, Stage, Tag } from "@/shared/types";
import { Column } from "@/features/crm/board/Column";
import { LeadCard, LeadCardBody } from "@/features/crm/board/LeadCard";
import { LeadListView } from "@/features/crm/list/LeadListView";

const dropAnimation: DropAnimation = {
  duration: 160,
  easing: "ease-out",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.3" } },
  }),
};

function Dropdown({
  label,
  children,
  active,
}: {
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
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
          <button
            type="button"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-label="Закрыть"
          />
          <div
            className="absolute left-0 z-50 mt-1 max-h-[360px] min-w-full overflow-y-auto rounded-[3px] border border-odoo-border bg-odoo-surface py-1 shadow-lg"
            onClick={() => setOpen(false)}
          >
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
    queryFn: async () => unwrapList<Stage>((await api.get("/crm/stages/")).data),
  });
  const tagsQ = useQuery({
    queryKey: ["tags"],
    queryFn: async () => unwrapList<Tag>((await api.get("/crm/tags/")).data),
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
        const response: {
          data: { results?: Lead[]; next?: string | null } | Lead[];
        } = await api.get(url);
        all.push(...unwrapList<Lead>(response.data));
        if (Array.isArray(response.data) || !response.data.next) break;
        const next = new URL(response.data.next, window.location.origin);
        url = `${next.pathname.replace(/^\/api/, "")}${next.search}`;
      }
      return all;
    },
  });

  const moveLead = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: number }) =>
      api.patch(`/crm/leads/${id}/`, { stage }),
    onMutate: async ({ id, stage }) => {
      setMoveError("");
      await qc.cancelQueries({ queryKey: ["leads"] });
      const key = ["leads", priority, search, stageF, tagF, archived];
      const prev = qc.getQueryData<Lead[]>(key);
      qc.setQueryData<Lead[]>(key, (old) =>
        (old ?? []).map((l) => (l.id === id ? { ...l, stage } : l)),
      );
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
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
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
    if (String(over.id).startsWith("stage-"))
      stageId = Number(String(over.id).replace("stage-", ""));
    else if (String(over.id).startsWith("lead-")) {
      const other = leads.find((l) => l.id === Number(String(over.id).replace("lead-", "")));
      stageId = other?.stage ?? null;
    }
    const lead = leads.find((l) => l.id === leadId);
    if (lead && stageId && lead.stage !== stageId) moveLead.mutate({ id: leadId, stage: stageId });
  }

  const groupColumns =
    group === "assigned"
      ? Array.from(new Set(leads.map((l) => l.assigned_to_email || "Не назначен"))).map(
          (email) => ({
            key: email,
            title: email,
            items: leads.filter((l) => (l.assigned_to_email || "Не назначен") === email),
          }),
        )
      : stages.map((s) => ({
          key: String(s.id),
          title: s.name,
          items: leads.filter((l) => l.stage === s.id),
        }));

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
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg"
                onClick={() => setFilter("priority", "")}
              >
                Все приоритеты
              </button>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg"
                  onClick={() => setFilter("priority", String(n))}
                >
                  {"★".repeat(n)}
                </button>
              ))}
              <div className="my-1 border-t border-odoo-border-light" />
              {stages.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg"
                  onClick={() => setFilter("stage", String(s.id))}
                >
                  Этап: {s.name}
                </button>
              ))}
              <div className="my-1 border-t border-odoo-border-light" />
              {(tagsQ.data ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg"
                  onClick={() => setFilter("tags", String(t.id))}
                >
                  Тег: {t.name}
                </button>
              ))}
              <div className="my-1 border-t border-odoo-border-light" />
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg"
                onClick={() => setFilter("is_archived", archived === "true" ? "" : "true")}
              >
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
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg"
                onClick={() => setFilter("group", "")}
              >
                По этапам
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-odoo-bg"
                onClick={() => setFilter("group", "assigned")}
              >
                По ответственному
              </button>
            </Dropdown>
          </div>
        )}
      </ControlPanel>

      {moveError && (
        <div
          role="alert"
          className="mx-4 mt-3 rounded border border-odoo-danger/30 bg-red-50 px-3 py-2 text-sm text-odoo-danger"
        >
          {moveError}
        </div>
      )}

      {view !== "list" && leads.length === 0 && !leadsQ.isLoading && (
        <div className="px-4 pt-10 text-center text-sm text-odoo-text-muted">
          Нет лидов. Нажмите <span className="font-medium text-odoo-text">Новый</span> или «+
          Добавить» в колонке.
        </div>
      )}

      {view === "list" && (
        <LeadListView
          leads={leads}
          loading={leadsQ.isLoading}
          groupBy={group === "assigned" ? "assigned" : group === "stage" ? "stage" : ""}
        />
      )}

      {view !== "list" && (
        <div className="flex h-[calc(100dvh-90px)] min-h-0 snap-x snap-mandatory gap-0 overflow-x-auto overflow-y-hidden overscroll-x-contain border-t border-odoo-border-light bg-odoo-surface md:snap-none">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragCancel={() => setActiveLead(null)}
            onDragEnd={onDragEnd}
          >
            {group === "stage"
              ? stages.map((stage) => (
                  <Column
                    key={stage.id}
                    stage={stage}
                    leads={leads.filter((l) => l.stage === stage.id)}
                    loading={leadsQ.isLoading}
                    canManage={!!canManage}
                    folded={folded.includes(stage.id)}
                    onFold={() =>
                      setFolded((f) =>
                        f.includes(stage.id) ? f.filter((x) => x !== stage.id) : [...f, stage.id],
                      )
                    }
                    allStages={stages}
                  />
                ))
              : groupColumns.map((col) => (
                  <div
                    key={col.key}
                    className="flex h-full w-[325px] shrink-0 flex-col border-r border-odoo-border-light"
                  >
                    <div className="mb-2 text-[13px] font-semibold">
                      {col.title}{" "}
                      <span className="font-normal text-odoo-text-muted">{col.items.length}</span>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain bg-odoo-surface [scrollbar-gutter:stable]">
                      {col.items.map((lead) => (
                        <Link
                          key={lead.id}
                          to={`/crm/leads/${lead.id}`}
                          className="overflow-hidden border-b border-odoo-border-light bg-odoo-surface px-2.5 py-2 hover:bg-odoo-surface-hover"
                        >
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
                  onKeyDown={(e) =>
                    e.key === "Enter" && stageName.trim() && createStage.mutate(stageName.trim())
                  }
                />
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm text-odoo-text-muted hover:text-odoo-text"
                  onClick={() => setNewStage(true)}
                >
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
