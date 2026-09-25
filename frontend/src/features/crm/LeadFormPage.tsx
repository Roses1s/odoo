import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell, ControlPanel } from "@/app/layout/AppShell";
import { api } from "@/shared/api/client";
import { apiErrorMessage } from "@/shared/lib/http";
import { innChecksumOk, normalizeInn } from "@/shared/lib/inn";
import type { Lead, Stage, Tag, Shipment, TimelineEntry } from "@/shared/types";
import { Button } from "@/shared/ui/button";
import { Chatter } from "@/shared/ui/chatter";
import { FormSection } from "@/shared/ui/form-section";
import { FormSkeleton } from "@/shared/ui/skeleton";

function results<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "results" in data) return (data as { results: T[] }).results;
  return [];
}

function Statusbar({
  stages,
  current,
  onSelect,
}: {
  stages: Stage[];
  current?: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex w-full overflow-x-auto">
      {stages.map((s, i) => {
        const idx = stages.findIndex((x) => x.id === current);
        const active = s.id === current;
        const done = i < idx;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={`relative min-h-9 flex-1 px-3 py-2 text-center text-xs font-medium ${
              active ? "bg-odoo-primary text-white" : done ? "bg-[#875A7B] text-white" : "bg-[#E9ECEF] text-odoo-text-muted"
            }`}
            style={{
              clipPath:
                i === 0
                  ? "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)"
                  : "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)",
              marginLeft: i === 0 ? 0 : -10,
            }}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
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

export function LeadFormPage() {
  const { id } = useParams();
  const isNew = id === "new" || !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (leadQ.data) {
      setForm({
        name: leadQ.data.name,
        inn: leadQ.data.inn,
        logist_email: leadQ.data.logist_email || "",
        logist_contact: leadQ.data.logist_contact || "",
        expected_revenue: String(leadQ.data.expected_revenue),
        priority: leadQ.data.priority,
        stage: leadQ.data.stage,
        tag_ids: leadQ.data.tags?.map((t) => t.id) ?? [],
      });
    } else if (stagesQ.data?.[0] && isNew && !form.stage) {
      setForm((f) => ({ ...f, stage: stagesQ.data![0].id }));
    }
  }, [leadQ.data, stagesQ.data, isNew, form.stage]);

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
      qc.invalidateQueries({ queryKey: ["leads"] });
      navigate(`/crm/leads/${lead.id}`);
    },
    onError: (e: unknown) => setError(apiErrorMessage(e, "Ошибка сохранения")),
  });

  const noteMut = useMutation({
    mutationFn: (body: string) => api.post(`/crm/leads/${id}/notes/`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timeline", id] }),
  });

  function set<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const archive = useMutation({
    mutationFn: () => api.delete(`/crm/leads/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      navigate("/crm");
    },
  });

  return (
    <AppShell>
      <ControlPanel title={form.name || "Новый лид"}>
        <Button variant="secondary" onClick={() => navigate("/crm")}>
          Назад
        </Button>
        {!isNew && (
          <Button variant="ghost" onClick={() => archive.mutate()}>
            Архив
          </Button>
        )}
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Сохранить
        </Button>
      </ControlPanel>
      <div className="flex min-h-[calc(100vh-140px)] flex-col lg:flex-row">
        <div className="flex-1 p-4 lg:w-[67%]">
          <Statusbar
            stages={stagesQ.data ?? []}
            current={form.stage}
            onSelect={(sid) => {
              set("stage", sid);
              if (!isNew) void api.patch(`/crm/leads/${id}/`, { stage: sid }).then(() => qc.invalidateQueries({ queryKey: ["leads"] }));
            }}
          />
          {leadQ.isLoading && !isNew ? (
            <div className="mt-6">
              <FormSkeleton />
            </div>
          ) : (
            <div className="mt-6 max-w-3xl">
              {error && <p className="mb-3 text-sm text-odoo-danger">{error}</p>}
              <FormSection title="Основная информация">
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Название компании</span>
                  <input
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">ИНН</span>
                  <input
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.inn}
                    onChange={(e) => set("inn", e.target.value)}
                  />
                </label>
              </FormSection>
              <FormSection title="Контактные данные">
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Email логиста</span>
                  <input
                    type="email"
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.logist_email}
                    onChange={(e) => set("logist_email", e.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Контакт логиста</span>
                  <input
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.logist_contact}
                    onChange={(e) => set("logist_contact", e.target.value)}
                  />
                </label>
              </FormSection>
              <FormSection title="Сделка">
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Сумма</span>
                  <input
                    type="number"
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.expected_revenue}
                    onChange={(e) => set("expected_revenue", e.target.value)}
                  />
                </label>
                <div>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Приоритет</span>
                  <div className="flex gap-1 text-lg text-odoo-warning">
                    {[1, 2, 3].map((n) => (
                      <button key={n} type="button" onClick={() => set("priority", form.priority === n ? 0 : n)}>
                        {form.priority >= n ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Теги</span>
                  <div className="flex flex-wrap gap-1">
                    {(tagsQ.data ?? []).map((t) => {
                      const on = form.tag_ids.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            set(
                              "tag_ids",
                              on ? form.tag_ids.filter((x) => x !== t.id) : [...form.tag_ids, t.id],
                            )
                          }
                          className={`rounded px-2 py-0.5 text-[11px] ${on ? "bg-odoo-primary text-white" : "bg-odoo-bg text-odoo-text-muted"}`}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </FormSection>

              {!isNew && (
                <div className="mt-6">
                  <h4 className="mb-3 border-b border-odoo-border-light pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-odoo-text-muted">
                    Заявки ({shipsQ.data?.length ?? 0})
                  </h4>
                  <Button
                    variant="secondary"
                    className="mb-2"
                    onClick={() => navigate(`/shipments/new?lead=${id}`)}
                  >
                    + Создать заявку
                  </Button>
                  <table className="w-full text-sm">
                    <thead className="bg-odoo-bg text-xs font-semibold uppercase text-odoo-text-muted">
                      <tr>
                        <th className="p-2 text-left">№</th>
                        <th className="p-2 text-left">Маршрут</th>
                        <th className="p-2 text-left">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(shipsQ.data ?? []).map((s) => (
                        <tr key={s.id} className="border-b border-odoo-border-light hover:bg-odoo-bg">
                          <td className="p-2">
                            <Link className="text-odoo-primary" to={`/shipments/${s.id}`}>
                              {s.id}
                            </Link>
                          </td>
                          <td className="p-2">{s.route}</td>
                          <td className="p-2">{s.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        {!isNew && (
          <div className="w-full border-t border-odoo-border-light lg:w-[33%] lg:border-l lg:border-t-0">
            <Chatter timeline={timelineQ.data ?? []} onSubmit={(b) => noteMut.mutate(b)} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
