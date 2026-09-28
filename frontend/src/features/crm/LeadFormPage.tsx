import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileText, Plus, Settings, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell, ControlPanel } from "@/app/layout/AppShell";
import { useAuthStore } from "@/features/auth/store";
import { api } from "@/shared/api/client";
import { apiErrorMessage } from "@/shared/lib/http";
import { innChecksumOk, normalizeInn } from "@/shared/lib/inn";
import { ownerInitials, ownerLabel } from "@/shared/lib/owner";
import type { Attachment, Lead, Stage, Tag, Shipment, TimelineEntry } from "@/shared/types";
import { Chatter } from "@/shared/ui/chatter";
import {
  Field,
  FormAlert,
  FormGroup,
  FormSheet,
  FormSheetBg,
  FormStatusIndicator,
  FormStatusbar,
  FormTitle,
  InnerGroup,
  Notebook,
  OdooCheckbox,
  OdooInput,
  OdooTextarea,
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
  kpp: "",
  company_name: "",
  okved: "",
  region: "",
  timezone: "",
  company_email: "",
  phone: "",
  mobile: "",
  logist_email: "",
  logist_contact: "",
  logist_phone: "",
  credit_limit: "0",
  extra_info: "",
  first_call_date: "",
  next_call_date: "",
  taken_by_logist: false,
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
    kpp: lead.kpp || "",
    company_name: lead.company_name || "",
    okved: lead.okved || "",
    region: lead.region || "",
    timezone: lead.timezone || "",
    company_email: lead.company_email || "",
    phone: lead.phone || "",
    mobile: lead.mobile || "",
    logist_email: lead.logist_email || "",
    logist_contact: lead.logist_contact || "",
    logist_phone: lead.logist_phone || "",
    credit_limit: String(lead.credit_limit ?? "0"),
    extra_info: lead.extra_info || "",
    first_call_date: lead.first_call_date || "",
    next_call_date: lead.next_call_date || "",
    taken_by_logist: Boolean(lead.taken_by_logist),
    expected_revenue: String(lead.expected_revenue),
    priority: lead.priority,
    stage: lead.stage,
    tag_ids: lead.tags?.map((t) => t.id) ?? [],
  };
}

function normalized(state: FormState) {
  return JSON.stringify({ ...state, tag_ids: [...state.tag_ids].sort((a, b) => a - b) });
}

const TAG_STYLES: Record<string, string> = {
  blue: "bg-odoo-tag-blue-bg text-odoo-tag-blue-text",
  green: "bg-odoo-tag-green-bg text-odoo-tag-green-text",
  red: "bg-odoo-tag-red-bg text-odoo-tag-red-text",
  yellow: "bg-odoo-tag-yellow-bg text-odoo-tag-yellow-text",
  purple: "bg-odoo-tag-purple-bg text-odoo-tag-purple-text",
  orange: "bg-odoo-tag-orange-bg text-odoo-tag-orange-text",
};

/** many2many_tags widget: selected tags as removable pills + an add dropdown. */
function TagsField({
  all,
  value,
  onChange,
}: {
  all: Tag[];
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = all.filter((t) => value.includes(t.id));
  const rest = all.filter((t) => !value.includes(t.id));

  if (all.length === 0) return <span className="text-odoo-text-light">Теги не настроены</span>;

  return (
    <div className="relative flex flex-wrap items-center gap-1">
      {selected.map((tag) => (
        <span
          key={tag.id}
          className={`inline-flex max-w-[220px] items-center gap-1 rounded-full px-2 py-0.5 text-[11px] leading-[16px] ${
            TAG_STYLES[tag.color] ?? "bg-[#eeeaea] text-[#6f666a]"
          }`}
        >
          <span className="truncate" title={tag.name}>
            {tag.name}
          </span>
          <button
            type="button"
            aria-label={`Убрать тег ${tag.name}`}
            className="opacity-60 transition-opacity hover:opacity-100"
            onClick={() => onChange(value.filter((x) => x !== tag.id))}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {rest.length > 0 && (
        <button
          type="button"
          aria-label="Добавить тег"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-odoo-text-light transition-colors hover:bg-odoo-bg hover:text-odoo-text"
          onClick={() => setOpen((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-10" aria-label="Закрыть" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-7 z-50 max-h-[220px] min-w-[200px] overflow-auto rounded-[3px] border border-odoo-border bg-white py-1 shadow-lg">
            {rest.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="block w-full px-3 py-1 text-left text-[13px] text-odoo-text hover:bg-odoo-bg"
                onClick={() => {
                  onChange([...value, tag.id]);
                  setOpen(false);
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
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
  const notebookRef = useRef<HTMLDivElement | null>(null);

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

  // Record pager ("N / M" with prev/next), like the Odoo control panel.
  const pagerQ = useQuery({
    queryKey: ["leads-pager"],
    enabled: !isNew,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await api.get("/crm/leads/?page_size=500");
      const rows = results<Lead>(data);
      const total =
        data && typeof data === "object" && "count" in data
          ? Number((data as { count: number }).count)
          : rows.length;
      return { ids: rows.map((l) => l.id), total };
    },
  });
  const pagerIds = pagerQ.data?.ids ?? [];
  const pagerTotal = pagerQ.data?.total ?? pagerIds.length;
  const pagerIndex = pagerIds.indexOf(Number(id));

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
      if (!form.name.trim()) {
        throw new Error("Укажите название лида");
      }
      const inn = normalizeInn(form.inn);
      if (inn.length !== 10 && inn.length !== 12) {
        throw new Error("ИНН должен содержать 10 или 12 цифр");
      }
      if (!innChecksumOk(inn)) {
        throw new Error("Некорректный ИНН (проверьте контрольную сумму ФНС)");
      }
      const payload = {
        ...form,
        inn,
        expected_revenue: form.expected_revenue || 0,
        credit_limit: form.credit_limit || 0,
        first_call_date: form.first_call_date || null,
        next_call_date: form.next_call_date || null,
      };
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

  const attachmentsQ = useQuery({
    queryKey: ["lead-attachments", id],
    enabled: !isNew,
    queryFn: async () =>
      results<Attachment>((await api.get(`/crm/leads/${id}/attachments/`)).data),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => {
      const data = new FormData();
      data.append("file", file);
      return api.post(`/crm/leads/${id}/attachments/`, data);
    },
    onSuccess: () => {
      setError("");
      qc.invalidateQueries({ queryKey: ["lead-attachments", id] });
    },
    onError: (e: unknown) => setError(apiErrorMessage(e, "Не удалось загрузить файл")),
  });

  const deleteAttachmentMut = useMutation({
    mutationFn: (attachmentId: number) =>
      api.delete(`/crm/leads/${id}/attachments/${attachmentId}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-attachments", id] }),
    onError: (e: unknown) => setError(apiErrorMessage(e, "Не удалось удалить вложение")),
  });

  async function downloadAttachment(attachment: Attachment) {
    try {
      const response = await api.get(`/crm/leads/${id}/attachments/${attachment.id}/download/`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(apiErrorMessage(e, "Не удалось скачать файл"));
    }
  }

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
  const owner = leadQ.data ? ownerLabel(leadQ.data) : "";
  const ownerAvatar = leadQ.data ? ownerInitials(leadQ.data) : "—";

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
        onNew={() => navigate("/crm/leads/new")}
        crumbs={[{ label: "Лиды", to: "/crm" }, { label: form.name || "Новый лид" }]}
        status={
          <FormStatusIndicator
            dirty={dirty}
            saving={save.isPending}
            onSave={() => save.mutate()}
            onDiscard={discard}
          />
        }
        cog={
          !isNew && canManage ? (
            <span className="relative inline-flex">
              <button
                type="button"
                aria-label="Действия"
                title="Действия"
                className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-odoo-text-muted transition-colors hover:bg-odoo-bg hover:text-odoo-text"
                onClick={() => setActionsOpen((v) => !v)}
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
              {actionsOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10"
                    aria-label="Закрыть"
                    onClick={() => setActionsOpen(false)}
                  />
                  <div className="absolute left-0 top-6 z-50 min-w-[180px] rounded-[3px] border border-odoo-border bg-white py-1 shadow-lg">
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
            </span>
          ) : null
        }
        stats={
          !isNew ? (
            <button
              type="button"
              onClick={() => notebookRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className="inline-flex h-[34px] items-center gap-2 rounded-[4px] border border-odoo-border bg-white px-2.5 transition-colors hover:bg-odoo-bg"
            >
              <FileText className="h-4 w-4 text-odoo-text-muted" />
              <span className="flex flex-col items-start leading-[13px]">
                <span className="text-[12px] text-odoo-text">Все заявки</span>
                <span className="text-[11px] text-odoo-text-muted">{shipments.length}</span>
              </span>
            </button>
          ) : null
        }
        pager={
          !isNew && pagerIndex >= 0 ? (
            <span className="mr-1 flex items-center gap-1">
              <span className="whitespace-nowrap text-[13px] text-odoo-text-muted [font-variant-numeric:tabular-nums]">
                {pagerIndex + 1} / {pagerTotal}
              </span>
              <span className="inline-flex h-7 overflow-hidden rounded-[4px] border border-odoo-border bg-white">
                <button
                  type="button"
                  aria-label="Предыдущий лид"
                  disabled={pagerIndex <= 0}
                  onClick={() => navigate(`/crm/leads/${pagerIds[pagerIndex - 1]}`)}
                  className="inline-flex w-7 items-center justify-center text-odoo-text-muted transition-colors hover:bg-odoo-bg disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Следующий лид"
                  disabled={pagerIndex >= pagerIds.length - 1}
                  onClick={() => navigate(`/crm/leads/${pagerIds[pagerIndex + 1]}`)}
                  className="inline-flex w-7 items-center justify-center border-l border-odoo-border text-odoo-text-muted transition-colors hover:bg-odoo-bg disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </span>
            </span>
          ) : null
        }
      />

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
                left={
                  !isNew ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(`/shipments/new?lead=${id}`)}
                        className="h-[30px] rounded-[4px] bg-odoo-primary px-3 text-[13px] font-medium text-white transition-colors hover:bg-odoo-primary-hover"
                      >
                        Создать заявку
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          disabled={archive.isPending}
                          onClick={() => {
                            const ok = window.confirm(
                              `Пометить лид «${form.name}» проигранным? Он уйдёт в архив.`,
                            );
                            if (ok) archive.mutate();
                          }}
                          className="h-[30px] rounded-[4px] border border-odoo-border bg-white px-3 text-[13px] text-odoo-text transition-colors hover:bg-odoo-bg disabled:opacity-60"
                        >
                          Проигрыш
                        </button>
                      )}
                    </>
                  ) : null
                }
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
                  <FormTitle>
                    <OdooInput
                      aria-label="Название лида"
                      placeholder="например, ООО «Ромашка» — 7451234567"
                      className="!px-1 !text-[24px] !leading-[34px]"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                    />
                  </FormTitle>

                  <FormGroup>
                    <div>
                      <InnerGroup title="Реквизиты">
                        <Field label="Название компании" htmlFor="lead-company">
                          <OdooInput
                            id="lead-company"
                            placeholder="Юридическое название"
                            value={form.company_name}
                            onChange={(e) => set("company_name", e.target.value)}
                          />
                        </Field>
                        <Field
                          label="ИНН"
                          htmlFor="lead-inn"
                          help="10 или 12 цифр, проверяется контрольная сумма ФНС"
                        >
                          <OdooInput
                            id="lead-inn"
                            inputMode="numeric"
                            placeholder="10 или 12 цифр"
                            value={form.inn}
                            onChange={(e) => set("inn", e.target.value)}
                          />
                        </Field>
                        <Field label="КПП" htmlFor="lead-kpp">
                          <OdooInput
                            id="lead-kpp"
                            inputMode="numeric"
                            maxLength={9}
                            placeholder="9 цифр"
                            className="max-w-[14ch]"
                            value={form.kpp}
                            onChange={(e) => set("kpp", e.target.value)}
                          />
                        </Field>
                        <Field label="ОКВЭД" htmlFor="lead-okved">
                          <OdooInput
                            id="lead-okved"
                            placeholder="27.12 Производство…"
                            value={form.okved}
                            onChange={(e) => set("okved", e.target.value)}
                          />
                        </Field>
                        <Field label="Область" htmlFor="lead-region">
                          <OdooInput
                            id="lead-region"
                            placeholder="Челябинская обл"
                            value={form.region}
                            onChange={(e) => set("region", e.target.value)}
                          />
                        </Field>
                        <Field label="Часовой пояс" htmlFor="lead-tz">
                          <OdooInput
                            id="lead-tz"
                            placeholder="МСК+2"
                            className="max-w-[14ch]"
                            value={form.timezone}
                            onChange={(e) => set("timezone", e.target.value)}
                          />
                        </Field>
                        <Field label="Продавец">
                          {owner ? (
                            <span className="flex items-center gap-1.5 pt-[2px]">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-odoo-primary text-[9px] font-semibold text-white">
                                {ownerAvatar}
                              </span>
                              <span className="truncate" title={leadQ.data?.assigned_to_email || owner}>
                                {owner}
                              </span>
                            </span>
                          ) : (
                            <span className="pt-[2px] text-odoo-text-light">Не назначен</span>
                          )}
                        </Field>
                      </InnerGroup>

                      <InnerGroup>
                        <Field label="Лимит" htmlFor="lead-limit">
                          <span className="flex items-baseline gap-1">
                            <OdooInput
                              id="lead-limit"
                              type="number"
                              className="max-w-[11ch] text-right"
                              value={form.credit_limit}
                              onChange={(e) => set("credit_limit", e.target.value)}
                            />
                            <span className="text-odoo-text-muted">₽</span>
                          </span>
                        </Field>
                        <Field label="Ожидаемая выручка" htmlFor="lead-revenue">
                          <span className="flex items-baseline gap-1">
                            <OdooInput
                              id="lead-revenue"
                              type="number"
                              className="max-w-[11ch] text-right"
                              value={form.expected_revenue}
                              onChange={(e) => set("expected_revenue", e.target.value)}
                            />
                            <span className="text-odoo-text-muted">₽</span>
                          </span>
                        </Field>
                        <Field label="Дата первого звонка" htmlFor="lead-first-call">
                          <OdooInput
                            id="lead-first-call"
                            type="date"
                            className="max-w-[18ch]"
                            value={form.first_call_date}
                            onChange={(e) => set("first_call_date", e.target.value)}
                          />
                        </Field>
                        <Field label="Дата следующего звонка" htmlFor="lead-next-call">
                          <OdooInput
                            id="lead-next-call"
                            type="date"
                            className="max-w-[18ch]"
                            value={form.next_call_date}
                            onChange={(e) => set("next_call_date", e.target.value)}
                          />
                        </Field>
                        <Field label="Взят в работу логистом" htmlFor="lead-taken">
                          <OdooCheckbox
                            id="lead-taken"
                            label="Взят в работу логистом"
                            checked={form.taken_by_logist}
                            onChange={(v) => set("taken_by_logist", v)}
                          />
                        </Field>
                        <Field label="Доп. информация" htmlFor="lead-extra">
                          <OdooTextarea
                            id="lead-extra"
                            rows={2}
                            placeholder="Заметки по клиенту"
                            value={form.extra_info}
                            onChange={(e) => set("extra_info", e.target.value)}
                          />
                        </Field>
                      </InnerGroup>
                    </div>

                    <div>
                      <InnerGroup>
                        <Field label="Email" htmlFor="lead-company-email">
                          <OdooInput
                            id="lead-company-email"
                            type="email"
                            placeholder="info@example.ru"
                            value={form.company_email}
                            onChange={(e) => set("company_email", e.target.value)}
                          />
                        </Field>
                        <Field label="Телефон" htmlFor="lead-phone">
                          <OdooInput
                            id="lead-phone"
                            placeholder="+7 351 000-00-00, +7 …"
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value)}
                          />
                        </Field>
                        <Field label="Мобильный" htmlFor="lead-mobile">
                          <OdooInput
                            id="lead-mobile"
                            placeholder="+7 900 000-00-00"
                            value={form.mobile}
                            onChange={(e) => set("mobile", e.target.value)}
                          />
                        </Field>
                        <Field label="Приоритет">
                          <span className="inline-flex items-center pt-[2px] text-[16px] leading-none text-odoo-warning">
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
                        <Field label="Теги" help="Метки для фильтрации лидов в списке и канбане">
                          <TagsField
                            all={tagsQ.data ?? []}
                            value={form.tag_ids}
                            onChange={(ids) => set("tag_ids", ids)}
                          />
                        </Field>
                      </InnerGroup>

                      <InnerGroup title="Информация о клиенте">
                        <Field label="Контакт логиста/ЛПР" htmlFor="lead-contact">
                          <OdooInput
                            id="lead-contact"
                            placeholder="Фамилия Имя"
                            value={form.logist_contact}
                            onChange={(e) => set("logist_contact", e.target.value)}
                          />
                        </Field>
                        <Field label="Телефон логиста" htmlFor="lead-logist-phone">
                          <OdooInput
                            id="lead-logist-phone"
                            placeholder="+7 900 000-00-00"
                            value={form.logist_phone}
                            onChange={(e) => set("logist_phone", e.target.value)}
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
                    </div>
                  </FormGroup>

                  {!isNew && (
                    <div ref={notebookRef}>
                      <Notebook tabs={notebookTabs} active={tab} onSelect={setTab} />
                    </div>
                  )}
                </>
              )}
            </FormSheet>
          </FormSheetBg>
        </div>

        {!isNew && (
          <div className="w-full shrink-0 bg-white lg:w-[33%] lg:max-w-[520px] lg:overflow-y-auto">
            <Chatter
              timeline={timelineQ.data ?? []}
              onSubmit={(b) => noteMut.mutate(b)}
              attachments={attachmentsQ.data ?? []}
              uploading={uploadMut.isPending}
              onUpload={(file) => uploadMut.mutate(file)}
              onDownload={downloadAttachment}
              onDeleteAttachment={(a) => deleteAttachmentMut.mutate(a.id)}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
