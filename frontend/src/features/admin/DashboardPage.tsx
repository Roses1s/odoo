import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/shared/api/client";

interface Stats {
  leads_total: number;
  leads_archived: number;
  shipments_total: number;
  users_total: number;
  funnel: { id: number; name: string; count: number; revenue: number }[];
}

export function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await api.get<Stats>("/admin/stats/")).data,
  });

  return (
    <div>
      <h2 className="mb-4 text-odoo-text">Дашборд</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Лиды", data?.leads_total],
          ["Архив", data?.leads_archived],
          ["Заявки", data?.shipments_total],
          ["Пользователи", data?.users_total],
        ].map(([label, val]) => (
          <div key={String(label)} className="rounded-md border border-odoo-border-light bg-white p-4 shadow-sm">
            <div className="text-xs uppercase text-odoo-text-muted">{label}</div>
            <div className="mt-1 text-xl font-semibold">{val ?? "—"}</div>
          </div>
        ))}
      </div>
      <div className="h-72 rounded-md border border-odoo-border-light bg-white p-4">
        <h3 className="mb-2">Воронка</h3>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data?.funnel ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#714B67" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
