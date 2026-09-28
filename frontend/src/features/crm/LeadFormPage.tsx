import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileText, Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell, ControlPanel } from "@/app/layout/AppShell";
import { useAuthStore } from "@/features/auth/store";
import { api } from "@/shared/api/client";
import { apiErrorMessage, unwrapList } from "@/shared/lib/http";
import { innChecksumOk, normalizeInn } from "@/shared/lib/inn";
import { ownerInitials, ownerLabel } from "@/shared/lib/owner";
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
  FormTitle,
  InnerGroup,
  Notebook,
  OdooInput,
} from "@/shared/ui/odoo-form";
import { FilePreview } from "@/shared/ui/file-preview";
import { FormSkeleton } from "@/shared/ui/skeleton";
import { empty, normalized, toForm, type FormState } from "./lead-form/form-state";
import { TagsField } from "./lead-form/TagsField";
import { useLeadAttachments } from "./lead-form/useLeadAttachments";

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
  const files = useLeadAttachments(id, !isNew);

  const stagesQ = useQuery({
    queryKey: ["stages"],
    queryFn: async () => unwrapList<Stage>((await api.get("/crm/stages/")).data),
  });
  const tagsQ = useQuery({
    queryKey: ["tags"],
    queryFn: async () => unwrapList<Tag>((await api.get("/crm/tags/")).data),
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
    queryFn: async () => unwrapList<Shipment>((await api.get(`/leads/${id}/shipments/`)).data),
  });

  // Record pager ("N / M" with prev/next), like the Odoo control panel.
  // A dedicated endpoint reports position/total/neighbours without pulling
  // hundreds of fully serialised leads just to read off an id column.
  const pagerQ = useQuery({
    queryKey: ["lead-pager", id],
    enabled: !isNew,
    staleTime: 15_000,
    queryFn: async () =>
      (
        await api.get<{
          position: number;
          total: number;
          prev_id: number | null;
          next_id: number | null;
        }>(`/crm/leads/${id}/pager/`)
      ).data,
  });
  const pagerPosition = pagerQ.data?.position ?? 0;
  const pagerTotal = pagerQ.data?.total ?? 0;
  const pagerPrevId = pagerQ.data?.prev_id ?? null;
  const pagerNextId = pagerQ.data?.next_id ?? null;

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
    mutationFn: ({ body, files }: { body: string; files: File[] }) => {
      const data = new FormData();
      data.append("body", body);
      for (const file of files) data.append("files", file);
      return api.post(`/crm/leads/${id}/notes/`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timeline", id] });
      qc.invalidateQueries({ queryKey: ["lead-attachments", id] });
    },
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
                  <th className="w-[80px] bg-odoo-bg px-2 py-1.5 pl-4 text-left font-medium text-odoo-text shadow-[inset_0_-1px_0_rgb(var(--odoo-border))] lg:pl-6">
                    №
                  </th>
                  <th className="bg-odoo-bg px-2 py-1.5 text-left font-medium text-odoo-text shadow-[inset_0_-1px_0_rgb(var(--odoo-border))]">
                    Маршрут
                  </th>
                  <th className="w-[180px] bg-odoo-bg px-2 py-1.5 pr-4 text-left font-medium text-odoo-text shadow-[inset_0_-1px_0_rgb(var(--odoo-border))] lg:pr-6">
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
                  <tr
                    key={s.id}
                    className="border-b border-odoo-border-light hover:bg-odoo-surface-hover"
                  >
                    <td className="px-2 py-1 pl-4 lg:pl-6">
                      <Link className="text-odoo-action hover:underline" to={`/shipments/${s.id}`}>
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
                className="text-[13px] text-odoo-action hover:underline"
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
                  <div className="absolute left-0 top-6 z-50 min-w-[180px] rounded-[3px] border border-odoo-border bg-odoo-surface py-1 shadow-lg">
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
              onClick={() =>
                notebookRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              className="inline-flex h-[34px] items-center gap-2 rounded-[4px] border border-odoo-border bg-odoo-surface px-2.5 transition-colors hover:bg-odoo-bg"
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
          !isNew && pagerQ.data ? (
            <span className="mr-1 flex items-center gap-1">
              <span className="whitespace-nowrap text-[13px] text-odoo-text-muted [font-variant-numeric:tabular-nums]">
                {pagerPosition} / {pagerTotal}
              </span>
              <span className="inline-flex h-7 overflow-hidden rounded-[4px] border border-odoo-border bg-odoo-surface">
                <button
                  type="button"
                  aria-label="Предыдущий лид"
                  disabled={!pagerPrevId}
                  onClick={() => pagerPrevId && navigate(`/crm/leads/${pagerPrevId}`)}
                  className="inline-flex w-7 items-center justify-center text-odoo-text-muted transition-colors hover:bg-odoo-bg disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Следующий лид"
                  disabled={!pagerNextId}
                  onClick={() => pagerNextId && navigate(`/crm/leads/${pagerNextId}`)}
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
                          className="h-[30px] rounded-[4px] border border-odoo-border bg-odoo-surface px-3 text-[13px] text-odoo-text transition-colors hover:bg-odoo-bg disabled:opacity-60"
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
                              <span
                                className="truncate"
                                title={leadQ.data?.assigned_to_email || owner}
                              >
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
          <div className="w-full shrink-0 bg-odoo-surface lg:w-[33%] lg:max-w-[520px] lg:overflow-y-auto">
            <Chatter
              timeline={timelineQ.data ?? []}
              onSubmit={(body, _mode, files) => noteMut.mutate({ body, files })}
              posting={noteMut.isPending}
              composerError={
                noteMut.error
                  ? apiErrorMessage(noteMut.error, "Не удалось сохранить запись")
                  : undefined
              }
              attachments={files.attachments}
              uploading={files.isUploading}
              attachmentError={files.error}
              onUpload={files.upload}
              onPreview={files.openPreview}
              onLoadAttachment={files.load}
              onDownload={files.download}
              onDeleteAttachment={(a) => files.remove(a.id)}
            />
          </div>
        )}
      </div>

      {files.preview && (
        <FilePreview
          file={files.preview.file}
          url={files.preview.url}
          text={files.preview.text}
          loading={files.preview.loading}
          error={files.preview.error}
          onClose={files.closePreview}
          onDownload={() => files.download(files.preview!.file)}
        />
      )}
    </AppShell>
  );
}
