import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell, Breadcrumb, Toolbar } from "@/app/layout/AppShell";
import { api } from "@/shared/api/client";
import type { Lead, Shipment, TimelineEntry } from "@/shared/types";
import { Button } from "@/shared/ui/button";
import { Chatter } from "@/shared/ui/chatter";
import { FormSection } from "@/shared/ui/form-section";
import { FormSkeleton } from "@/shared/ui/skeleton";

function results<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "results" in data) return (data as { results: T[] }).results;
  return [];
}

interface Carrier {
  id: number;
  name: string;
  inn: string;
}

const STATUSES = ["new", "in_progress", "in_transit", "delivered", "cancelled"] as const;
const STATUS_LABEL: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  in_transit: "В пути",
  delivered: "Доставлена",
  cancelled: "Отменена",
};

const empty = {
  lead: 0,
  city_loading: "",
  city_unloading: "",
  address_loading: "",
  address_unloading: "",
  contact_loading_name: "",
  contact_loading_phone: "",
  contact_unloading_name: "",
  contact_unloading_phone: "",
  carrier: null as number | null,
  transport_type: "tent",
  cargo_weight: "",
  cargo_volume: "",
  comment: "",
};

export function ShipmentFormPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [carrierQ, setCarrierQ] = useState("");
  const [error, setError] = useState("");

  const leadsQ = useQuery({
    queryKey: ["leads"],
    queryFn: async () => results<Lead>((await api.get("/crm/leads/?page_size=200")).data),
  });
  const carriersQ = useQuery({
    queryKey: ["carriers"],
    queryFn: async () => results<Carrier>((await api.get("/carriers/")).data),
  });
  const shipQ = useQuery({
    queryKey: ["shipment", id],
    enabled: !isNew,
    queryFn: async () => (await api.get(`/shipments/${id}/`)).data,
  });

  const leadId = form.lead || Number(sp.get("lead") || 0);
  const selectedLead = useMemo(
    () => (leadsQ.data ?? []).find((l) => l.id === leadId),
    [leadsQ.data, leadId],
  );

  useEffect(() => {
    if (sp.get("lead") && isNew) {
      setForm((f) => ({ ...f, lead: Number(sp.get("lead")) }));
    }
  }, [sp, isNew]);

  useEffect(() => {
    if (selectedLead && isNew && !form.contact_loading_phone) {
      setForm((f) => ({
        ...f,
        contact_loading_name: selectedLead.name,
        contact_loading_phone: selectedLead.logist_contact || "",
      }));
    }
  }, [selectedLead, isNew, form.contact_loading_phone]);

  useEffect(() => {
    if (shipQ.data) {
      const s = shipQ.data as Record<string, unknown>;
      setForm((f) => ({
        ...f,
        ...Object.fromEntries(Object.keys(empty).map((k) => [k, s[k] ?? (empty as never)[k as keyof typeof empty]])),
        cargo_weight: String(s.cargo_weight ?? ""),
        cargo_volume: String(s.cargo_volume ?? ""),
      }));
    }
  }, [shipQ.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        cargo_weight: form.cargo_weight || null,
        cargo_volume: form.cargo_volume || null,
      };
      if (isNew) return (await api.post("/shipments/", payload)).data as Shipment;
      return (await api.patch(`/shipments/${id}/`, payload)).data as Shipment;
    },
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["shipments"] });
      navigate(`/shipments/${s.id}`);
    },
    onError: () => setError("Не удалось сохранить заявку"),
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => api.patch(`/shipments/${id}/status/`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipment", id] }),
  });

  function set<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const filteredCarriers = (carriersQ.data ?? []).filter((c) =>
    c.name.toLowerCase().includes(carrierQ.toLowerCase()),
  );

  const timeline: TimelineEntry[] = [];

  return (
    <AppShell>
      <Breadcrumb items={["Заявки", isNew ? "Новая" : `#${id}`]} />
      <Toolbar>
        <Button variant="secondary" onClick={() => navigate("/shipments")}>
          Назад
        </Button>
        {!isNew && selectedLead && (
          <Link to={`/crm/leads/${selectedLead.id}`} className="text-sm text-odoo-primary">
            Лид: {selectedLead.name}
          </Link>
        )}
        <span className="ml-auto" />
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Сохранить
        </Button>
      </Toolbar>
      <div className="flex min-h-[calc(100vh-140px)] flex-col lg:flex-row">
        <div className="flex-1 p-4">
          {!isNew && (
            <div className="mb-4 flex flex-wrap gap-1">
              {STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => statusMut.mutate(st)}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    (shipQ.data as Shipment | undefined)?.status === st
                      ? "bg-odoo-primary text-white"
                      : "bg-odoo-bg text-odoo-text-muted"
                  }`}
                >
                  {STATUS_LABEL[st]}
                </button>
              ))}
            </div>
          )}
          {shipQ.isLoading && !isNew ? (
            <FormSkeleton />
          ) : (
            <div className="max-w-3xl">
              {error && <p className="mb-3 text-sm text-odoo-danger">{error}</p>}
              <FormSection title="Лид">
                <label className="col-span-2">
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Компания</span>
                  <select
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.lead || ""}
                    onChange={(e) => set("lead", Number(e.target.value))}
                  >
                    <option value="">Выберите лид</option>
                    {(leadsQ.data ?? []).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
              </FormSection>
              <FormSection title="Маршрут">
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Город погрузки</span>
                  <input
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.city_loading}
                    onChange={(e) => set("city_loading", e.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Город выгрузки</span>
                  <input
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.city_unloading}
                    onChange={(e) => set("city_unloading", e.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Адрес погрузки</span>
                  <input
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.address_loading}
                    onChange={(e) => set("address_loading", e.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Адрес выгрузки</span>
                  <input
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.address_unloading}
                    onChange={(e) => set("address_unloading", e.target.value)}
                  />
                </label>
              </FormSection>
              <FormSection title="Контакты на погрузке">
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Контактное лицо</span>
                  <input
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.contact_loading_name}
                    onChange={(e) => set("contact_loading_name", e.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Телефон</span>
                  <input
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.contact_loading_phone}
                    onChange={(e) => set("contact_loading_phone", e.target.value)}
                  />
                </label>
              </FormSection>
              <FormSection title="Контакты на выгрузке">
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Контактное лицо</span>
                  <input
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.contact_unloading_name}
                    onChange={(e) => set("contact_unloading_name", e.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Телефон</span>
                  <input
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.contact_unloading_phone}
                    onChange={(e) => set("contact_unloading_phone", e.target.value)}
                  />
                </label>
              </FormSection>
              <FormSection title="Перевозчик и груз">
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Перевозчик</span>
                  <input
                    className="mb-1 w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    placeholder="Поиск..."
                    value={carrierQ}
                    onChange={(e) => setCarrierQ(e.target.value)}
                  />
                  <select
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.carrier ?? ""}
                    onChange={(e) => set("carrier", e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">—</option>
                    {filteredCarriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Тип транспорта</span>
                  <select
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.transport_type}
                    onChange={(e) => set("transport_type", e.target.value)}
                  >
                    <option value="ft_20">Фура 20т</option>
                    <option value="ft_40">Фура 40т</option>
                    <option value="ref">Рефрижератор</option>
                    <option value="tent">Тент</option>
                    <option value="gazel">Газель</option>
                    <option value="other">Другое</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Вес</span>
                  <input
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.cargo_weight}
                    onChange={(e) => set("cargo_weight", e.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Объём</span>
                  <input
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    value={form.cargo_volume}
                    onChange={(e) => set("cargo_volume", e.target.value)}
                  />
                </label>
                <label className="col-span-1 md:col-span-2">
                  <span className="mb-1 block text-xs font-medium uppercase text-odoo-text-muted">Комментарий</span>
                  <textarea
                    className="w-full rounded border border-odoo-border px-2.5 py-1.5 text-sm"
                    rows={3}
                    value={form.comment}
                    onChange={(e) => set("comment", e.target.value)}
                  />
                </label>
              </FormSection>
            </div>
          )}
        </div>
        {!isNew && (
          <div className="w-full lg:w-[360px]">
            <Chatter timeline={timeline} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
