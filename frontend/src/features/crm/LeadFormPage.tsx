import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell, ControlPanel } from "@/app/layout/AppShell";
import { useAuthStore } from "@/features/auth/store";
import { api } from "@/shared/api/client";
import { apiErrorMessage } from "@/shared/lib/http";
import { innChecksumOk, normalizeInn } from "@/shared/lib/inn";
import type { Lead, Stage, Tag, Shipment, TimelineEntry } from "@/shared/types";
import { Chatter } from "@/shared/ui/chatter";
import {
  Field,
  FormAlert,
  FormGroup,
  FormSheet,
  FormSheetBg,
  FormStatusIndicator,
  FormStatusbar,
  InnerGroup,
  Notebook,
  OdooInput,
} from "@/shared/ui/odoo-form";
import { FormSkeleton } from "@/shared/ui/skeleton";

function results<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "results" in data) return (data as { results: T[] }).results;
  return [];
}

const empty = {
  name: "",
  inn: "",
  logist_email: "",
  logist_contact: "",
  expected_revenue: "0",
  priority: 0,
  stage: 0,
  tag_ids: [] as number[],
};

type FormState = typeof empty;

function toForm(lead: Lead): FormState {
  return {
    name: lead.name,
    inn: lead.inn,
    logist_email: lead.logist_email || "",
    logist_contact: lead.logist_contact || "",
    expected_revenue: String(lead.expected_revenue),
    priority: lead.priority,
    stage: lead.stage,
    tag_ids: lead.tags?.map((t) => t.id) ?? [],
  };
}

function normalized(state: FormState) {
  return JSON.stringify({ ...state, tag_ids: [...state.tag_ids].sort((a, b) => a - b) });
}

export function LeadFormPage() {
  const { id } = useParams();
  const isNew = id === "new" || !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === "admin" || user?.role === "manager";
  const [form, setForm] = useState<FormState>(empty);
  const [pristine, setPristine] = useState<FormState>(empty);
  const [error, setError] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [tab, setTab] = useState("shipments");
  const loadedId = useRef<number | null>(null);

  const stagesQ = useQuery({
    queryKey: ["stages"],
    queryFn: async () => results<Stage>((await api.get("/crm/stages/")).data),
  });
  const tagsQ = useQuery({
    queryKey: ["tags"],
    queryFn: async () => results<Tag>((await api.get("/crm/tags/")).data),
  });
  const leadQ = useQuery({
    queryKey: ["lead", id],
    enabled: !isNew,
    queryFn: async () => (await api.get<Lead>(`/crm/leads/${id}/`)).data,
  });
  const timelineQ = useQuery({
    queryKey: ["timeline", id],
    enabled: !isNew,
    queryFn: async () => (await api.get<TimelineEntry[]>(`/crm/leads/${id}/timeline/`)).data,
  });
  const shipsQ = useQuery({
    queryKey: ["lead-shipments", id],
    enabled: !isNew,
    queryFn: async () => results<Shipment>((await api.get(`/leads/${id}/shipments/`)).data),
  });

  // Load the record once: never overwrite unsaved edits on background refetches.
  useEffect(() => {
    const lead = leadQ.data;
    if (lead && loadedId.current !== lead.id) {
      loadedId.current = lead.id;
      const next = toForm(lead);
      setForm(next);
      setPristine(next);
    }
  }, [leadQ.data]);

  useEffect(() => {
    const first = stagesQ.data?.[0];
    if (isNew && first) setForm((f) => (f.stage ? f : { ...f, stage: first.id }));
  }, [isNew, stagesQ.data]);

  const dirty = isNew || normalized(form) !== normalized(pristine);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const save = useMutation({
    mutationFn: async () => {
      const inn = normalizeInn(form.inn);
      if (inn.length !== 10 && inn.length !== 12) {
        throw new Error("ИНН должен содержать 10 или 12 цифр");
      }
      if (!innChecksumOk(inn)) {
        throw new Error("Некорректный ИНН (проверьте контрольную сумму ФНС)");
      }
      const payload = { ...form, inn, expected_revenue: form.expected_revenue || 0 };
      if (isNew) return (await api.post("/crm/leads/", payload)).data as Lead;
      return (await api.patch(`/crm/leads/${id}/`, payload)).data as Lead;
    },
    onSuccess: (lead) => {
      setError("");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", String(lead.id)] });
      qc.invalidateQueries({ queryKey: ["timeline", String(lead.id)] });
      const next = toForm(lead);
      loadedId.current = lead.id;
      setForm(next);
      setPristine(next);
      if (isNew) navigate(`/crm/leads/${lead.id}`);
    },
    onError: (e: unknown) => setError(apiErrorMessage(e, "Ошибка сохранения")),
  });

  const stageMut = useMutation({
    mutationFn: ({ stage }: { stage: number; previous: number }) =>
      api.patch(`/crm/leads/${id}/`, { stage }),
    onSuccess: (_data, variables) => {
      setError("");
      setPristine((p) => ({ ...p, stage: variables.stage }));
      qc.invalidateQueries({ queryKey: ["lead", id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["timeline", id] });
    },
    onError: (e: unknown, variables) => {
      set("stage", variables.previous);
      setError(apiErrorMessage(e, "Не удалось изменить этап"));
    },
  });

  const noteMut = useMutation({
    mutationFn: (body: string) => api.post(`/crm/leads/${id}/notes/`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timeline", id] }),
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function discard() {
    if (isNew) {
      navigate("/crm");
      return;
    }
    setForm(pristine);
    setError("");
  }

  const archive = useMutation({
    mutationFn: () => api.delete(`/crm/leads/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      navigate("/crm");
    },
    onError: (e: unknown) => setError(apiErrorMessage(e, "Не удалось архивировать лид")),
  });

  const hasMaskedFields = [form.inn, form.logist_email, form.logist_contact].some((value) =>
    value.includes("*"),
  );

  const stages = stagesQ.data ?? [];
  const shipments = shipsQ.data ?? [];
  const loading = leadQ.isLoading && !isNew;

  const notebookTabs = useMemo(
    () => [
      {
        id: "shipments",
        label: `Заявки (${shipments.length})`,
        content: (
          <div className="-mx-4 lg:-mx-6">
            <table className="w-full border-collapse text-[13px] [font-variant-numeric:tabular-nums]">
              <thead>
                <tr>
                  <th className="w-[80px] bg-odoo-bg px-2 py-1.5 pl-4 text-left font-medium text-odoo-text shadow-[inset_0_-1px_0_#DEE2E6] lg:pl-6">
                    №
                  </th>
                  <th className="bg-odoo-bg px-2 py-1.5 text-left font-medium text-odoo-text shadow-[inset_0_-1px_0_#DEE2E6]">
                    Маршрут
                  </th>
                  <th className="w-[180px] bg-odoo-bg px-2 py-1.5 pr-4 text-left font-medium text-odoo-text shadow-[inset_0_-1px_0_#DEE2E6] lg:pr-6">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody>
                {shipments.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-odoo-text-muted lg:px-6">
                      Пока нет заявок по этому лиду.
                    </td>
                  </tr>
                )}
                {shipments.map((s) => (
                  <tr key={s.id} className="border-b border-odoo-border-light hover:bg-[#faf8f9]">
                    <td className="px-2 py-1 pl-4 lg:pl-6">
                      <Link className="text-odoo-primary hover:underline" to={`/shipments/${s.id}`}>
                        {s.id}
                      </Link>
                    </td>
                    <td className="truncate px-2 py-1" title={s.route}>
                      {s.route}
                    </td>
                    <td className="truncate px-2 py-1 pr-4 lg:pr-6">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 pt-2 lg:px-6">
              <button
                type="button"
                className="text-[13px] text-odoo-primary hover:underline"
                onClick={() => navigate(`/shipments/new?lead=${id}`)}
              >
                Добавить заявку
              </button>
            </div>
          </div>
        ),
      },
    ],
    [shipments, id, navigate],
  );

  return (
    <AppShell>
      <ControlPanel
        crumbs={[{ label: "Лиды", to: "/crm" }, { label: form.name || "Новый лид" }]}
        status={
          <FormStatusIndicator
            dirty={dirty}
            saving={save.isPending}
            onSave={() => save.mutate()}
            onDiscard={discard}
          />
        }
      >
        {!isNew && canManage && (
          <div className="relative z-10 ml-auto flex items-center">
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-[13px] text-odoo-text-muted hover:bg-odoo-bg hover:text-odoo-text"
              onClick={() => setActionsOpen((v) => !v)}
            >
              <Settings className="h-4 w-4" />
              Действия
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {actionsOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-label="Закрыть"
                  onClick={() => setActionsOpen(false)}
                />
                <div className="absolute right-0 top-8 z-50 min-w-[180px] rounded-[3px] border border-odoo-border bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    disabled={archive.isPending}
                    className="block w-full px-3 py-1.5 text-left text-[13px] text-odoo-text hover:bg-odoo-bg disabled:opacity-60"
                    onClick={() => {
                      setActionsOpen(false);
                      if (window.confirm(`Архивировать лид «${form.name}»?`)) archive.mutate();
                    }}
                  >
                    Архивировать
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </ControlPanel>

      <div className="flex min-h-0 flex-col lg:h-[calc(100dvh-90px)] lg:flex-row">
        <div className="min-w-0 flex-1 lg:overflow-y-auto">
          <FormSheetBg>
            {error && <FormAlert>{error}</FormAlert>}
            {hasMaskedFields && (
              <FormAlert tone="warning">
                Часть данных скрыта по вашей роли. Маскированные значения нельзя сохранять.
              </FormAlert>
            )}

            <FormSheet>
              <FormStatusbar
                items={stages}
                current={form.stage}
                disabled={stageMut.isPending}
                onSelect={(sid) => {
                  if (sid === form.stage) return;
                  const previous = form.stage;
                  set("stage", sid);
                  if (!isNew) stageMut.mutate({ stage: sid, previous });
                }}
              />

              {loading ? (
                <FormSkeleton />
              ) : (
                <>
                  <div className="mb-4 sm:max-w-[75%]">
                    <h1 className="min-h-[55px] text-[26px] font-medium leading-[34px] text-odoo-text">
                      <OdooInput
                        aria-label="Название компании"
                        placeholder="например, ООО «Ромашка»"
                        className="!px-1 !text-[26px] !leading-[34px]"
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                      />
                    </h1>
                  </div>

                  <FormGroup>
                    <InnerGroup title="Клиент">
                      <Field label="ИНН" htmlFor="lead-inn">
                        <OdooInput
                          id="lead-inn"
                          inputMode="numeric"
                          placeholder="10 или 12 цифр"
                          value={form.inn}
                          onChange={(e) => set("inn", e.target.value)}
                        />
                      </Field>
                      <Field label="Контакт логиста" htmlFor="lead-contact">
                        <OdooInput
                          id="lead-contact"
                          placeholder="Фамилия Имя"
                          value={form.logist_contact}
                          onChange={(e) => set("logist_contact", e.target.value)}
                        />
                      </Field>
                      <Field label="Email логиста" htmlFor="lead-email">
                        <OdooInput
                          id="lead-email"
                          type="email"
                          placeholder="name@example.ru"
                          value={form.logist_email}
                          onChange={(e) => set("logist_email", e.target.value)}
                        />
                      </Field>
                    </InnerGroup>

                    <InnerGroup title="Сделка">
                      <Field label="Ожидаемая выручка" htmlFor="lead-revenue">
                        <span className="flex items-baseline gap-1">
                          <OdooInput
                            id="lead-revenue"
                            type="number"
                            className="max-w-[13ch]"
                            value={form.expected_revenue}
                            onChange={(e) => set("expected_revenue", e.target.value)}
                          />
                          <span className="text-odoo-text-muted">₽</span>
                        </span>
                      </Field>
                      <Field label="Приоритет">
                        <span className="inline-flex items-center pt-[2px] text-[15px] leading-none text-odoo-warning">
                          {[1, 2, 3].map((n) => (
                            <button
                              key={n}
                              type="button"
                              className="px-px"
                              aria-label={`Приоритет ${n}`}
                              onClick={() => set("priority", form.priority === n ? 0 : n)}
                            >
                              {form.priority >= n ? "★" : "☆"}
                            </button>
                          ))}
                        </span>
                      </Field>
                      <Field label="Теги">
                        <div className="flex flex-wrap gap-1 pt-[2px]">
                          {(tagsQ.data ?? []).map((t) => {
                            const on = form.tag_ids.includes(t.id);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                aria-pressed={on}
                                onClick={() =>
                                  set(
                                    "tag_ids",
                                    on ? form.tag_ids.filter((x) => x !== t.id) : [...form.tag_ids, t.id],
                                  )
                                }
                                className={`rounded-full px-2 py-0.5 text-[11px] leading-[16px] transition-colors ${
                                  on
                                    ? "bg-[#e6dce4] text-odoo-primary"
                                    : "bg-[#eeeaea] text-[#6f666a] hover:bg-odoo-border"
                                }`}
                              >
                                {t.name}
                              </button>
                            );
                          })}
                          {(tagsQ.data ?? []).length === 0 && (
                            <span className="text-odoo-text-light">Теги не настроены</span>
                          )}
                        </div>
                      </Field>
                    </InnerGroup>
                  </FormGroup>

                  {!isNew && <Notebook tabs={notebookTabs} active={tab} onSelect={setTab} />}
                </>
              )}
            </FormSheet>
          </FormSheetBg>
        </div>

        {!isNew && (
          <div className="w-full shrink-0 bg-white lg:w-[33%] lg:max-w-[520px] lg:overflow-y-auto">
            <Chatter timeline={timelineQ.data ?? []} onSubmit={(b) => noteMut.mutate(b)} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
